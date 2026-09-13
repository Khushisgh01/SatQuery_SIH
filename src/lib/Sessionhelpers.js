let uidCounter = 0;
export const uid = (prefix) => `${prefix}-${Date.now()}-${uidCounter++}`;

const UI_KEY = 'satquery:ui';

export function createSession() {
  return { id: uid('session'), title: 'New session', messages: [] };
}

export function isPersistedSessionId(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// Turns a message's text into a short sidebar title. Some models (e.g.
// bitcd, which sends '' as `text` on purpose — see chat.jsx) never have
// a typed query, so `text` can legitimately be empty. In that case we
// fall back to `fallback` instead of returning '' — an empty title is
// what caused the blank/untitled sidebar entries, and it gets written
// to Supabase permanently the moment the session is created.
export function deriveTitle(text, fallback = 'New session') {
  const clean = (text || '').trim().replace(/\s+/g, ' ');
  if (!clean) return fallback;
  return clean.length > 34 ? `${clean.slice(0, 34)}…` : clean;
}

export function readPersistedUi() {
  try {
    const raw = sessionStorage.getItem(UI_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function persistUi(patch) {
  try {
    const next = { ...readPersistedUi(), ...patch };
    sessionStorage.setItem(UI_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
}

export const MODEL_OPTIONS = [
  {
    id: 'bitcd',
    name: 'Change detection',
    hint: 'Compare two dated scenes',
    images: 2,
  },
  {
    id: 'fusion',
    name: 'Optical+SAR Fusion',
    hint: 'Enter latitude, longitude and date — no image needed',
    images: 0,
  },
  {
    id: 'geochat',
    name: 'VQA',
    hint: 'Ask a question about one scene',
    images: 1,
  },
];