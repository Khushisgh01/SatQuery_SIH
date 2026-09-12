const REMOTE_DEFAULT = 'https://satquery-model3-api.onrender.com';

export function model3ApiBase() {
  const env = import.meta.env.VITE_MODEL3_API_URL;
  if (env) return String(env).replace(/\/$/, '');
  // Same-origin proxy in Vite (see vite.config.js) — the Render API has no CORS.
  if (import.meta.env.DEV) return '/satquery-model3';
  return REMOTE_DEFAULT;
}

/**
 * Query Model 3 (Optical+SAR Fusion)
 * 
 * This model performs optical and SAR data fusion for enhanced analysis.
 * It takes a query and images and returns fusion results with confidence scores.
 * 
 * @param {string} query - The user's question/query
 * @param {Array} images - Array of image objects with { id, url, file, date }
 * @returns {Promise<Object>} - Response with model, confidence, responseTime, text, and fusionResults
 */
export async function queryModel3Fusion(query, images) {
  if (!images || images.length === 0) {
    return {
      model: 'fusion',
      confidence: 0,
      responseTime: '0.0',
      text: 'Attach satellite scenes (optical and/or SAR) for fusion analysis.',
      fusionResults: [],
    };
  }

  const t0 = performance.now();
  const form = new FormData();
  form.append('query', query);
  
  // Attach all images (can handle optical and SAR data)
  images.forEach((img, index) => {
    if (img.file) {
      form.append(`image_${index}`, img.file);
    }
  });

  try {
    const res = await fetch(`${model3ApiBase()}/model3/query`, {
      method: 'POST',
      body: form,
    });
    
    if (!res.ok) throw new Error(`Model 3 request failed (${res.status})`);
    
    const data = await res.json();
    const elapsed = ((performance.now() - t0) / 1000).toFixed(1);

    // Map the API response to the expected shape
    // Assuming the API returns something like:
    // { summary: string, confidence: number, results: [{ label, confidence, area, ... }] }
    const fusionResults = (data.results || []).map((r, i) => ({
      id: `fusion-${i}`,
      label: r.label || 'Fusion result',
      confidence: Math.round((r.confidence || 0) * 100),
      area: r.area != null ? String(r.area) : undefined,
      // Add any other fields your Model 3 API returns
      ...r,
    }));

    return {
      model: 'fusion',
      confidence: Math.round((data.confidence ?? 0.85) * 100),
      responseTime: elapsed,
      text: data.summary || `Fusion analysis complete. ${fusionResults.length} result${fusionResults.length === 1 ? '' : 's'} identified.`,
      fusionResults,
    };
  } catch (error) {
    console.error('Model 3 API error:', error);
    return {
      model: 'fusion',
      confidence: 0,
      responseTime: elapsed,
      text: 'Fusion analysis failed. Please try again.',
      fusionResults: [],
    };
  }
}
