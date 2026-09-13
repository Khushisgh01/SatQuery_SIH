import { decideModel } from './modelRouting';

/* ------------------------------------------------------------------ */
/* Mock data — stands in for a real model's output. Every export here  */
/* is DEV-ONLY: modelApi.js falls back to these per-model, only when    */
/* that specific model's real endpoint isn't configured, so you can     */
/* wire up your three real models one at a time without breaking the    */
/* others mid-integration. Nothing in this file should be imported      */
/* from anywhere except modelApi.js.                                    */
/* ------------------------------------------------------------------ */

let uidCounter = 0;
const uid = (prefix) => `${prefix}-${Date.now()}-${uidCounter++}`;

const LABEL_RULES = [
  { test: /water|river|lake|flood|wetland|channel/i, label: 'Water body' },
  { test: /building|structure|settlement|urban|roof/i, label: 'Structure' },
  { test: /road|highway|path|track/i, label: 'Road segment' },
  { test: /vehicle|car|truck|convoy/i, label: 'Vehicle' },
  { test: /vegetation|tree|forest|crop|farm|field/i, label: 'Vegetation patch' },
];

const CHANGE_LABELS = [
  'New structure',
  'Vegetation loss',
  'Water extent change',
  'Built-up expansion',
  'Bare-soil exposure',
];

const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));

function pickLabel(query) {
  const hit = LABEL_RULES.find((r) => r.test.test(query));
  return hit ? hit.label : 'Region of interest';
}

function makeDetections(query) {
  const label = pickLabel(query);
  const count = randInt(2, 4);
  return Array.from({ length: count }, (_, i) => ({
    id: uid('det'),
    label: count > 1 ? `${label} ${i + 1}` : label,
    confidence: randInt(82, 97),
    area: rand(0.3, 3.4).toFixed(1),
    top: rand(8, 52),
    left: rand(5, 58),
    width: rand(16, 30),
    height: rand(16, 28),
  }));
}

function makeChangeRegions() {
  const count = randInt(1, 3);
  const used = new Set();
  return Array.from({ length: count }, () => {
    let label;
    do {
      label = CHANGE_LABELS[randInt(0, CHANGE_LABELS.length - 1)];
    } while (used.has(label) && used.size < CHANGE_LABELS.length);
    used.add(label);
    return {
      id: uid('chg'),
      label,
      top: rand(10, 55),
      left: rand(45, 75),
      width: rand(14, 26),
      height: rand(14, 26),
    };
  });
}

const GEOCHAT_OPENERS = [
  'This scene shows',
  'The imagery indicates',
  'Across the visible extent,',
  'Reviewing the frame,',
];
const GEOCHAT_BODIES = [
  'a mixed land-cover pattern with clear boundaries between built-up and vegetated zones.',
  'moderate cloud interference in the upper-left quadrant, though the primary area of interest is unobstructed.',
  'a drainage network running through the central band, with denser cover along its margins.',
  'signs of recent surface disturbance consistent with either construction or seasonal flooding.',
];

function generateGeoChatAnswer(query) {
  const opener = GEOCHAT_OPENERS[randInt(0, GEOCHAT_OPENERS.length - 1)];
  const body = GEOCHAT_BODIES[randInt(0, GEOCHAT_BODIES.length - 1)];
  return `${opener} ${body}`;
}

// Simulates network latency so the UI's "thinking" state has something
// to show, whether or not any real model is wired up yet.
function withSimulatedLatency(result, [minMs, maxMs]) {
  return new Promise((resolve) => setTimeout(() => resolve(result), rand(minMs, maxMs)));
}

export function mockGeoChat(query) {
  const result = {
    model: 'geochat',
    confidence: randInt(86, 97),
    responseTime: rand(0.8, 2.6).toFixed(1),
    text: generateGeoChatAnswer(query),
  };
  return withSimulatedLatency(result, [800, 2600]);
}

export function mockGrounding(query) {
  const detections = makeDetections(query);
  const confidence = Math.round(
    detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length
  );
  const result = {
    model: 'grounding',
    confidence,
    responseTime: rand(1.2, 4.4).toFixed(1),
    text: `Found ${detections.length} ${detections[0].label.replace(/ \d+$/, '').toLowerCase()}${
      detections.length > 1 ? 's' : ''
    }.`,
    detections,
  };
  return withSimulatedLatency(result, [1200, 4400]);
}

export function mockBitCD(query, images) {
  const regions = makeChangeRegions();
  const changePercent = randInt(3, 24);
  const result = {
    model: 'bitcd',
    confidence: randInt(80, 95),
    responseTime: rand(2.1, 6.5).toFixed(1),
    text: `${regions[0].label} detected. Change extent increased by ${changePercent}%. ${
      regions.length
    } distinct change region${regions.length > 1 ? 's' : ''} identified.`,
    changeRegions: regions,
    changePercent,
    changeMaskUrl: null, // Mock doesn't provide real mask
    apiData: {
      changedPixels: randInt(1000, 50000),
      totalPixels: 1048576,
      description: result.text,
    },
  };
  return withSimulatedLatency(result, [2100, 6500]);
}

// Convenience for fully-mocked mode (no real endpoints configured at all).
export async function mockGenerateReply(query, images) {
  const model = decideModel(query, images);
  if (model === 'grounding') return mockGrounding(query);
  if (model === 'bitcd') return mockBitCD(query, images);
  return mockGeoChat(query);
}