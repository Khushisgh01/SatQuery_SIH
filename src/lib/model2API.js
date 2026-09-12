const REMOTE_DEFAULT = 'https://sih-satquery.onrender.com';

export function model2ApiBase() {
  const env = import.meta.env.VITE_BITCD_API_URL;
  if (env) {
    const url = String(env).replace(/\/$/, '');
    // If it's the full URL, return it as is; if it's a proxy path, return empty for dev
    if (url.startsWith('http')) return url;
    if (import.meta.env.DEV) return ''; // Use proxy in dev
    return url;
  }
  // Same-origin proxy in Vite (see vite.config.js) — the Render API has no CORS.
  if (import.meta.env.DEV) return ''; // Use direct /api path in dev
  return REMOTE_DEFAULT;
}

/**
 * Query Model 2 (Change Detection - BIT-CD)
 * 
 * This model performs change detection between two satellite images at the same location
 * but different timeframes using coordinates and dates instead of uploaded images.
 * 
 * @param {string} query - The user's question/query (kept for compatibility but not used)
 * @param {Object} params - Object with { latitude, longitude, before_date, after_date, max_cloud_cover }
 * @returns {Promise<Object>} - Response with model, confidence, responseTime, text, changeRegions, changePercent
 */
export async function queryModel2ChangeDetection(query, params) {
  const { latitude, longitude, before_date, after_date, max_cloud_cover = 20 } = params || {};

  if (!latitude || !longitude || !before_date || !after_date) {
    return {
      model: 'bitcd',
      confidence: 0,
      responseTime: '0.0',
      text: 'Change detection requires latitude, longitude, before_date, and after_date.',
      changeRegions: [],
      changePercent: 0,
    };
  }

  const t0 = performance.now();

  try {
    const baseUrl = model2ApiBase();
    const endpoint = baseUrl ? `${baseUrl}/api/detect-change` : '/api/detect-change';
    
    const requestBody = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      before_date,
      after_date,
      max_cloud_cover: parseInt(max_cloud_cover),
    };

    // Add query if provided (for user context)
    if (query && query.trim()) {
      requestBody.query = query.trim();
    }
    
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    
    if (!res.ok) throw new Error(`Model 2 request failed (${res.status})`);
    
    const data = await res.json();
    const elapsed = ((performance.now() - t0) / 1000).toFixed(1);

    // Map the API response to the expected shape
    // The API returns: { status, location, dates, change_detection, spatial_analysis, explanation }
    const changeRegions = [];
    let changePercent = 0;
    
    // Extract change percentage from the response
    if (data.change_detection?.change_percentage !== undefined) {
      changePercent = Math.round(data.change_detection.change_percentage * 100);
    } else if (data.spatial_analysis?.change_percentage !== undefined) {
      changePercent = Math.round(data.spatial_analysis.change_percentage * 100);
    }
    
    // Create change regions if change was detected
    if (data.change_detection?.change_detected && data.spatial_analysis?.number_of_regions) {
      for (let i = 0; i < data.spatial_analysis.number_of_regions; i++) {
        changeRegions.push({
          id: `chg-${i}`,
          label: `Change region ${i + 1}`,
          top: 50, // Default positions since API doesn't provide bounding boxes
          left: 50,
          width: 10,
          height: 10,
        });
      }
    }
    
    // If no regions but change detected, add a general region
    if (data.change_detection?.change_detected && changeRegions.length === 0) {
      changeRegions.push({
        id: `chg-0`,
        label: 'Detected changes',
        top: 50,
        left: 50,
        width: 20,
        height: 20,
      });
    }

    return {
      model: 'bitcd',
      confidence: data.status === 'success' ? 85 : 0,
      responseTime: elapsed,
      text: data.explanation || `Change detection complete. ${changeRegions.length} change region${changeRegions.length === 1 ? '' : 's'} identified.`,
      changeRegions,
      changePercent,
      // Include raw API data for detailed display
      apiData: {
        status: data.status,
        location: data.location,
        dates: data.dates,
        changeDetection: data.change_detection,
        spatialAnalysis: data.spatial_analysis,
      },
    };
  } catch (error) {
    console.error('Model 2 API error:', error);
    return {
      model: 'bitcd',
      confidence: 0,
      responseTime: elapsed,
      text: 'Change detection failed. Please try again.',
      changeRegions: [],
      changePercent: 0,
    };
  }
}
