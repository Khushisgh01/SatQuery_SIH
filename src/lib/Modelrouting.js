/**
 * Which model handles a given turn.
 *
 * The model the user explicitly picked (via the model selector) always
 * wins — there is no longer any hidden fallback that force-routes a
 * query to VQA just because an attached file happened to match a demo
 * filename pattern. If no model is selected, we fall back to a couple
 * of light heuristics: two images implies change detection, and a
 * "where/find/locate" style query implies grounding; otherwise VQA.
 *
 * `images` may be a count (legacy) or the pending-image array.
 */
export function decideModel(query, images, selectedModel) {
  if (selectedModel === 'geochat' || selectedModel === 'grounding' || selectedModel === 'bitcd' || selectedModel === 'fusion') {
    return selectedModel;
  }

  const imageCount = Array.isArray(images) ? images.length : Number(images) || 0;

  if (imageCount >= 2) return 'bitcd';
  if (/fusion|sar|radar|combine|merge|multi-sensor|optical/i.test(query)) {
    return 'fusion';
  }
  if (/where|find|detect|locate|how many|highlight|show me|point out/i.test(query)) {
    return 'grounding';
  }
  return 'geochat';
}
