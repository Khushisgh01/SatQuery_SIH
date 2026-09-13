let uidCounter = 0;
export const uid = (prefix) => `${prefix}-${Date.now()}-${uidCounter++}`;

const UI_KEY = 'satquery:ui';

export function createSession() {
  return { id: uid('session'), title: 'New session', messages: [] };
}

export function isPersistedSessionId(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function deriveTitle(text) {
  const clean = text.trim().replace(/\s+/g, ' ');
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
    id: 'geochat',
    name: 'VQA',
    hint: 'Ask a question about one scene',
    images: 1,
  },
  {
    id: 'grounding',
    name: 'Grounding',
    hint: 'Locate objects in one scene',
    images: 1,
  },
  {
    id: 'bitcd',
    name: 'Change detection',
    hint: 'Compare two dated scenes',
    images: 2,
  },
  {
    id: 'fusion',
    name: 'Optical+SAR Fusion',
    hint: 'Fuse optical and SAR data for enhanced analysis',
    images: 1,
  },
];
