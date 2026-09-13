const REMOTE_DEFAULT = 'https://8002-gpu-t4-s-kkb-ass1c0-3v2vi2mcxnyuq-c.asia-southeast1-0.prod.colab.dev';

export function model2ApiBase() {
  const env = import.meta.env.VITE_BITCD_API_URL;
  if (env) {
    const url = String(env).replace(/\/$/, '');
    // If it's the full URL, return it as is; if it's a proxy path, return empty for dev
    if (url.startsWith('http')) return url;
    if (import.meta.env.DEV) return ''; // Use proxy in dev
    return url;
  }
  // For Colab API, always use the direct URL (no proxy needed)
  return REMOTE_DEFAULT;
}

/**
 * Query Model 2 (Change Detection - BIT-CD)
 * 
 * This model performs change detection between two satellite images.
 * It takes two uploaded images (before and after) and returns change detection results
 * including a change mask image URL.
 * 
 * @param {string} query - The user's question/query
 * @param {Array} images - Array of image objects with { id, url, file, date } (should be 2 images)
 * @returns {Promise<Object>} - Response with model, confidence, responseTime, text, changeRegions, changePercent, changeMaskUrl
 */
export async function queryModel2ChangeDetection(query, images) {
  if (!images || images.length < 2) {
    return {
      model: 'bitcd',
      confidence: 0,
      responseTime: '0.0',
      text: 'Change detection requires two satellite images (Before and After).',
      changeRegions: [],
      changePercent: 0,
    };
  }

  const t0 = performance.now();
  const form = new FormData();
  
  // Attach both images for change detection
  if (images[0]?.file) {
    form.append('image_before', images[0].file);
  }
  if (images[1]?.file) {
    form.append('image_after', images[1].file);
  }

  // Add query if provided (for user context)
  if (query && query.trim()) {
    form.append('query', query.trim());
  }

  try {
    const baseUrl = model2ApiBase();
    const endpoint = `${baseUrl}/detect-change`;
    
    const res = await fetch(endpoint, {
      method: 'POST',
      body: form,
    });
    
    if (!res.ok) throw new Error(`Model 2 request failed (${res.status})`);
    
    const data = await res.json();
    const elapsed = ((performance.now() - t0) / 1000).toFixed(1);

    // Map the API response to the expected shape
    // The API returns: { change_percentage, change_mask_url, description, etc. }
    const changeRegions = [];
    let changePercent = 0;
    let changeMaskUrl = null;
    
    // Extract change percentage
    if (data.change_percentage !== undefined) {
      changePercent = Math.round(data.change_percentage * 100);
    }
    
    // Extract change mask URL
    if (data.change_mask_url) {
      changeMaskUrl = data.change_mask_url;
    }
    
    // Create change regions if change was detected
    if (changePercent > 0) {
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
      confidence: changePercent > 0 ? 85 : 0,
      responseTime: elapsed,
      text: data.description || `Change detection complete. ${changePercent}% change detected.`,
      changeRegions,
      changePercent,
      changeMaskUrl,
      // Include raw API data for detailed display
      apiData: {
        changePercentage: data.change_percentage,
        changedPixels: data.changed_pixels,
        totalPixels: data.total_pixels,
        description: data.description,
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
