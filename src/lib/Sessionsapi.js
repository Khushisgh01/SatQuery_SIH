import { supabase } from './SupabaseClient';

/* ------------------------------------------------------------------ */
/* sessionsApi — translates between chat.jsx's in-memory session/       */
/* message shape and the normalized Supabase tables. Nothing in         */
/* chat.jsx's rendering code needs to change; it just calls these       */
/* instead of only touching local state.                                */
/* ------------------------------------------------------------------ */

/* ---------- reading ---------- */

// Lightweight list for the sidebar — no messages yet, loaded on demand
// when a session is actually opened (see fetchSessionMessages).
export async function fetchSessionList(userId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, title, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data.map((s) => ({ id: s.id, title: s.title, messages: null })); // null = not yet loaded
}

// Full message history for one session, reconstructed into the exact
// shape chat.jsx already renders (see MessageBubble/ImageStage/report).
export async function fetchSessionMessages(sessionId) {
  const { data: rows, error } = await supabase
    .from('messages')
    .select(
      `id, role, model, body_text, sequence, confidence, response_time_s, change_percent, change_mask_url,
       primary_class, primary_confidence, requested_date, sentinel1_date, location,
       message_images ( id, storage_path, capture_date, sequence ),
       detections ( id, label, confidence, area_km2, bbox ),
       change_regions ( id, label, bbox ),
       fusion_results ( id, label, confidence, sequence )`
    )
    .eq('session_id', sessionId)
    .order('sequence', { ascending: true });
  if (error) throw error;

  return rows.map((r) => {
    const images = (r.message_images || [])
      .sort((a, b) => a.sequence - b.sequence)
      .map((img) => ({
        id: img.id,
        url: publicImageUrl(img.storage_path),
        date: img.capture_date || '',
      }));

    const base = { id: r.id, role: r.role, text: r.body_text, images };

    if (r.role === 'user') return base;

    return {
      ...base,
      model: r.model,
      confidence: r.confidence,
      responseTime: r.response_time_s != null ? String(r.response_time_s) : undefined,
      changePercent: r.change_percent ?? undefined,
      changeMaskUrl: r.change_mask_url ?? undefined,
      // Fusion (Model 3) fields — see model3API.js for the shape these
      // come from. Previously never saved or reconstructed, so reloading
      // a fusion session showed an empty result card.
      primaryClass: r.primary_class ?? undefined,
      primaryConfidence: r.primary_confidence ?? undefined,
      requestedDate: r.requested_date ?? undefined,
      sentinel1Date: r.sentinel1_date ?? undefined,
      location: r.location ?? undefined,
      detections: r.detections?.length
        ? r.detections.map((d) => ({
            id: d.id,
            label: d.label,
            confidence: d.confidence,
            area: d.area_km2 != null ? String(d.area_km2) : undefined,
            ...d.bbox,
          }))
        : undefined,
      changeRegions: r.change_regions?.length
        ? r.change_regions.map((c) => ({ id: c.id, label: c.label, ...c.bbox }))
        : undefined,
      fusionResults: r.fusion_results?.length
        ? [...r.fusion_results]
            .sort((a, b) => a.sequence - b.sequence)
            .map((f) => ({ id: f.id, label: f.label, confidence: f.confidence }))
        : undefined,
    };
  });
}

export function publicImageUrl(storagePath) {
  const { data } = supabase.storage.from('chat-images').getPublicUrl(storagePath);
  return data.publicUrl;
}

/* ---------- writing ---------- */

export async function createSessionRow(userId, title) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: userId, title })
    .select('id, title')
    .single();
  if (error) throw error;
  return data;
}

export async function updateSessionTitle(sessionId, title) {
  const { error } = await supabase.from('sessions').update({ title }).eq('id', sessionId);
  if (error) throw error;
}

async function touchSession(sessionId) {
  await supabase.from('sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);
}

// Uploads each pending image (a File, kept alongside the blob preview
// URL in local state) to Storage under <userId>/<sessionId>/<name>.
async function uploadImages(userId, sessionId, images) {
  const uploaded = [];
  for (const img of images) {
    if (!img.file) continue; // already-persisted image (rare: re-sent message)
    const path = `${userId}/${sessionId}/${img.id}-${img.file.name}`;
    const { error } = await supabase.storage.from('chat-images').upload(path, img.file, {
      upsert: false,
    });
    if (error) throw error;
    uploaded.push({ ...img, storage_path: path });
  }
  return uploaded;
}

// Persists a user message. Returns nothing the UI needs — the message
// already exists optimistically in local state.
export async function saveUserMessage({ userId, sessionId, sequence, message }) {
  const uploaded = await uploadImages(userId, sessionId, message.images);

  const { data: row, error } = await supabase
    .from('messages')
    .insert({
      session_id: sessionId,
      role: 'user',
      body_text: message.text,
      sequence,
    })
    .select('id')
    .single();
  if (error) throw error;

  if (uploaded.length) {
    const { error: imgErr } = await supabase.from('message_images').insert(
      uploaded.map((img, i) => ({
        message_id: row.id,
        storage_path: img.storage_path,
        capture_date: img.date || null,
        sequence: i,
      }))
    );
    if (imgErr) throw imgErr;
  }

  await touchSession(sessionId);
  return { messageId: row.id, uploadedImages: uploaded };
}

// Persists an agent reply. `uploadedImages` is passed through from
// saveUserMessage since the agent message reuses the same uploaded
// files (no re-upload) — we just link a second message_images row set
// to this message's id.
export async function saveAgentMessage({ sessionId, sequence, reply, uploadedImages }) {
  // reply.responseTime comes in as a string (e.g. "8.4", see modelAPI.js).
  // Coerce it to a real number for the numeric response_time_s column
  // instead of inserting the raw string — relying on Postgres/PostgREST
  // to silently cast it is what created the type-mismatch risk.
  const responseTimeSeconds = Number(reply.responseTime);

  const { data: row, error } = await supabase
    .from('messages')
    .insert({
      session_id: sessionId,
      role: 'agent',
      model: reply.model,
      body_text: reply.text,
      sequence,
      confidence: reply.confidence,
      response_time_s: Number.isFinite(responseTimeSeconds) ? responseTimeSeconds : null,
      change_percent: reply.changePercent ?? null,
      change_mask_url: reply.changeMaskUrl ?? null,
      // Fusion (Model 3) fields — previously dropped entirely, which is
      // why a fusion result disappeared on reload/reopen. See
      // model3API.js's queryModel3Fusion() for where these come from.
      primary_class: reply.primaryClass ?? null,
      primary_confidence: reply.primaryConfidence ?? null,
      requested_date: reply.requestedDate || null,
      sentinel1_date: reply.sentinel1Date || null,
      location: reply.location ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;

  if (uploadedImages?.length) {
    const { error: imgErr } = await supabase.from('message_images').insert(
      uploadedImages.map((img, i) => ({
        message_id: row.id,
        storage_path: img.storage_path,
        capture_date: img.date || null,
        sequence: i,
      }))
    );
    if (imgErr) throw imgErr;
  }

  if (reply.detections?.length) {
    const { error: detErr } = await supabase.from('detections').insert(
      reply.detections.map((d) => ({
        message_id: row.id,
        label: d.label,
        confidence: d.confidence,
        area_km2: d.area,
        bbox: { top: d.top, left: d.left, width: d.width, height: d.height },
      }))
    );
    if (detErr) throw detErr;
  }

  if (reply.changeRegions?.length) {
    const { error: regErr } = await supabase.from('change_regions').insert(
      reply.changeRegions.map((r) => ({
        message_id: row.id,
        label: r.label,
        bbox: { top: r.top, left: r.left, width: r.width, height: r.height },
      }))
    );
    if (regErr) throw regErr;
  }

  if (reply.fusionResults?.length) {
    const { error: fusErr } = await supabase.from('fusion_results').insert(
      reply.fusionResults.map((f, i) => ({
        message_id: row.id,
        label: f.label,
        confidence: f.confidence,
        sequence: i,
      }))
    );
    if (fusErr) throw fusErr;
  }

  await touchSession(sessionId);
  return row.id;
}

export async function saveReport({ sessionId, generatedBy, refId }) {
  const { error } = await supabase
    .from('reports')
    .insert({ session_id: sessionId, generated_by: generatedBy, ref_id: refId });
  if (error) throw error;
}

/* ---------- deleting ---------- */

// Deletes a session and everything under it: uploaded images in Storage,
// then messages and their child rows (message_images, detections,
// change_regions, fusion_results), then reports, then the session row
// itself. Children are deleted explicitly rather than relying solely on
// `on delete cascade` so this works even if a cascade constraint is
// missing on any one table.
export async function deleteSession(sessionId, userId) {
  // Best-effort Storage cleanup — a failure here shouldn't block deleting
  // the session's data rows.
  if (userId) {
    try {
      const prefix = `${userId}/${sessionId}`;
      const { data: files } = await supabase.storage.from('chat-images').list(prefix);
      if (files?.length) {
        await supabase.storage.from('chat-images').remove(files.map((f) => `${prefix}/${f.name}`));
      }
    } catch {
      /* non-fatal */
    }
  }

  const { data: msgRows, error: msgSelectErr } = await supabase
    .from('messages')
    .select('id')
    .eq('session_id', sessionId);
  if (msgSelectErr) throw msgSelectErr;

  const messageIds = (msgRows || []).map((m) => m.id);
  if (messageIds.length) {
    const { error: fusErr } = await supabase.from('fusion_results').delete().in('message_id', messageIds);
    if (fusErr) throw fusErr;
    const { error: detErr } = await supabase.from('detections').delete().in('message_id', messageIds);
    if (detErr) throw detErr;
    const { error: regErr } = await supabase.from('change_regions').delete().in('message_id', messageIds);
    if (regErr) throw regErr;
    const { error: imgErr } = await supabase.from('message_images').delete().in('message_id', messageIds);
    if (imgErr) throw imgErr;
  }

  const { error: reportErr } = await supabase.from('reports').delete().eq('session_id', sessionId);
  if (reportErr) throw reportErr;

  const { error: msgErr } = await supabase.from('messages').delete().eq('session_id', sessionId);
  if (msgErr) throw msgErr;

  const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
  if (error) throw error;
}