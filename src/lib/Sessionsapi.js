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
      `id, role, model, body_text, sequence, confidence, response_time_s, change_percent,
       message_images ( id, storage_path, capture_date, sequence ),
       detections ( id, label, confidence, area_km2, bbox ),
       change_regions ( id, label, bbox )`
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
  const { data: row, error } = await supabase
    .from('messages')
    .insert({
      session_id: sessionId,
      role: 'agent',
      model: reply.model,
      body_text: reply.text,
      sequence,
      confidence: reply.confidence,
      response_time_s: reply.responseTime,
      change_percent: reply.changePercent ?? null,
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

  await touchSession(sessionId);
  return row.id;
}

export async function saveReport({ sessionId, generatedBy, refId }) {
  const { error } = await supabase
    .from('reports')
    .insert({ session_id: sessionId, generated_by: generatedBy, ref_id: refId });
  if (error) throw error;
}