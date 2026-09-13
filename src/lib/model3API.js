const REMOTE_DEFAULT = 'https://satquery-model3-api.onrender.com';

export function model3ApiBase() {
  const env = import.meta.env.VITE_MODEL3_API_URL;
  if (env) return String(env).replace(/\/$/, '');
  // Same-origin proxy in Vite (see vite.config.js) — the Render API has no CORS.
  if (import.meta.env.DEV) return '/satquery-model3';
  return REMOTE_DEFAULT;
}

/**
 * Convert a DD-MM-YYYY date (as typed by the user) to the YYYY-MM-DD
 * format the Model 3 API expects. Already-ISO (YYYY-MM-DD) dates pass
 * through unchanged.
 */
function toApiDate(value) {
  if (!value) return '';
  const parts = String(value).trim().split('-');

  // Already YYYY-MM-DD
  if (parts.length === 3 && parts[0].length === 4) return value.trim();

  // DD-MM-YYYY
  if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
    const [dd, mm, yyyy] = parts;
    return `${yyyy}-${mm}-${dd}`;
  }

  return value.trim();
}

/**
 * Query Model 3 (Optical+SAR Fusion)
 *
 * Model 3 does NOT take uploaded images. It fuses optical + SAR
 * (Sentinel-2 + Sentinel-1 style) imagery server-side for a single
 * latitude/longitude/date and returns a ranked list of predicted
 * classes plus which SAR pass was used.
 *
 * @param {Object} input
 * @param {number|string} input.latitude
 * @param {number|string} input.longitude
 * @param {string} input.date - DD-MM-YYYY or YYYY-MM-DD
 * @returns {Promise<Object>} - {
 *   model, confidence, responseTime, text,
 *   primaryClass, primaryConfidence,
 *   fusionResults, location, requestedDate, sentinel1Date
 * }
 */
export async function queryModel3Fusion({ latitude, longitude, date } = {}) {
  if (latitude === undefined || latitude === null || latitude === '') {
    return {
      model: 'fusion',
      confidence: 0,
      responseTime: '0.0',
      primaryClass: null,
      primaryConfidence: 0,
      text: 'Please provide latitude for fusion analysis.',
      fusionResults: [],
    };
  }
  if (longitude === undefined || longitude === null || longitude === '') {
    return {
      model: 'fusion',
      confidence: 0,
      responseTime: '0.0',
      primaryClass: null,
      primaryConfidence: 0,
      text: 'Please provide longitude for fusion analysis.',
      fusionResults: [],
    };
  }
  if (!date) {
    return {
      model: 'fusion',
      confidence: 0,
      responseTime: '0.0',
      primaryClass: null,
      primaryConfidence: 0,
      text: 'Please provide a date for fusion analysis.',
      fusionResults: [],
    };
  }

  const payload = {
    latitude: Number(latitude),
    longitude: Number(longitude),
    date: toApiDate(date),
  };

  const t0 = performance.now();

  try {
    const res = await fetch(`${model3ApiBase()}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Model 3 request failed (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    // Backend proxy (if any) wraps the real payload as { model, result }.
    const result = data?.result ?? data;
    const elapsed = ((performance.now() - t0) / 1000).toFixed(1);

    // Normalize the ranked-class list, whatever field name the API used.
    let predictions =
      (Array.isArray(result?.top5) && result.top5) ||
      (Array.isArray(result?.predictions) && result.predictions) ||
      (Array.isArray(result?.top_5) && result.top_5) ||
      [];

    predictions = predictions
      .map((item) => ({
        class: item?.class ?? item?.label ?? item?.name ?? 'Unknown',
        probability: Number(item?.probability ?? item?.confidence ?? item?.score ?? 0),
      }))
      .slice(0, 5);

    // primaryClass / primaryProbability are kept separate from the ranked
    // list on purpose — the API's own top-level fields are the source of
    // truth for "the" prediction, predictions[0] is only a fallback.
    const primaryClass =
      result?.primary_class ??
      result?.primaryClass ??
      result?.class ??
      result?.label ??
      predictions[0]?.class ??
      'Unknown';

    const primaryProbability = Number(
      result?.primary_probability ??
        result?.primaryProbability ??
        result?.confidence ??
        predictions[0]?.probability ??
        0
    );

    if (predictions.length === 0 && primaryClass !== 'Unknown') {
      predictions = [{ class: primaryClass, probability: primaryProbability }];
    }

    const asPercent = (p) => Math.round(p > 1 ? p : p * 100);

    // Map onto the { id, label, confidence, area } shape the chat UI
    // already renders for fusionResults (see chat.jsx).
    const fusionResults = predictions.map((p, i) => ({
      id: `fusion-${i}`,
      label: p.class,
      confidence: asPercent(p.probability),
    }));

    const primaryConfidence = asPercent(primaryProbability);

    return {
      model: 'fusion',
      confidence: primaryConfidence,
      responseTime: elapsed,

      // Separate, independent fields — chat.jsx renders these as two
      // distinct rows (Primary Prediction / Confidence Score) instead of
      // parsing them back out of a sentence.
      primaryClass,
      primaryConfidence,

      // Kept short/neutral on purpose so the UI isn't forced to reuse it
      // as the primary-class label.
      text: 'Optical+SAR fusion analysis complete.',

      fusionResults,
      location: result?.location,
      requestedDate: result?.requested_date ?? result?.requestedDate ?? payload.date,
      sentinel1Date: result?.sentinel1_date ?? result?.sentinel1Date,
    };
  } catch (error) {
    console.error('Model 3 API error:', error);
    const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
    return {
      model: 'fusion',
      confidence: 0,
      responseTime: elapsed,
      primaryClass: null,
      primaryConfidence: 0,
      text: 'Fusion analysis failed. Please try again.',
      fusionResults: [],
    };
  }
}