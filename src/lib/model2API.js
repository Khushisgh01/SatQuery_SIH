const REMOTE_DEFAULT = 'https://sih-satquery.onrender.com';

export function model2ApiBase() {
  const env = import.meta.env.VITE_BITCD_API_URL;
  if (env) {
    const url = String(env).replace(/\/$/, '');
    // If it's the full URL, return it as is; if it's a proxy path, return empty for dev
    if (url.startsWith('http')) return url;
    if (import.meta.meta.env.DEV) return ''; // Use proxy in dev
    return url;
  }
  // For sih-satquery.onrender.com, use proxy in dev to handle CORS
  if (import.meta.env.DEV) return ''; // Use proxy path in dev
  return REMOTE_DEFAULT;
}

/**
 * Query Model 2 (Change Detection - BIT-CD)
 * 
 * This model performs change detection between two satellite images.
 * It takes two uploaded images (before and after) and returns change detection results
 * including a change mask image URL.
 * 
 * @param {string} query - The user's question/query (optional, can be empty)
 * @param {Array} images - Array of image objects with { id, url, file, date } (should be 2 images)
 * @returns {Promise<Object>} - Response with model, confidence, responseTime, text, changeRegions, changePercent, changeMaskUrl
 */
export async function queryModel2ChangeDetection(query, images) {
  if (!images || images.length < 2) {
    return {
      model: 'bitcd',
      responseTime: '0.0',
      text: 'Change detection requires two satellite images (Before and After).',
      changeRegions: [],
      changePercent: 0,
      changeMaskUrl: null,
    };
  }

  const t0 = performance.now();
  const form = new FormData();
  
  // Attach both images for change detection
  if (images[0]?.file) {
    form.append('before_image', images[0].file);
  }
  if (images[1]?.file) {
    form.append('after_image', images[1].file);
  }

  // No query parameter - only images are sent

  try {
    const baseUrl = model2ApiBase();
    const endpoint = baseUrl ? `${baseUrl}/api/detect-change` : '/api/detect-change';
    
    const res = await fetch(endpoint, {
      method: 'POST',
      body: form,
    });
    
    if (!res.ok) throw new Error(`Model 2 request failed (${res.status})`);
    
    const data = await res.json();
    const elapsed = ((performance.now() - t0) / 1000).toFixed(1);

    // Log the full API response for debugging
    console.log('Model 2 API response:', data);
    console.log('Response keys:', Object.keys(data));

    // Map the API response to the expected shape
    // The API returns: { change_percentage, change_mask, explanation, etc. }
    const changeRegions = [];
    let changePercent = 0;
    let changeMaskUrl = null;
    
    // Extract change percentage
    if (data.change_percentage !== undefined) {
      changePercent = Math.round(data.change_percentage * 100);
    }
    
    // Extract change mask - check all possible locations
    // 1. Direct field
    if (data.change_mask) {
      changeMaskUrl = data.change_mask;
    }
    
    // 2. Alternative field names
    if (!changeMaskUrl && data.mask) {
      changeMaskUrl = data.mask;
    }
    
    if (!changeMaskUrl && data.change_mask_url) {
      changeMaskUrl = data.change_mask_url;
    }
    
    if (!changeMaskUrl && data.mask_url) {
      changeMaskUrl = data.mask_url;
    }
    
    // 3. Nested in change_detection object
    if (!changeMaskUrl && data.change_detection?.change_mask) {
      changeMaskUrl = data.change_detection.change_mask;
    }
    
    if (!changeMaskUrl && data.change_detection?.mask) {
      changeMaskUrl = data.change_detection.mask;
    }
    
    // 4. Nested in spatial_analysis object
    if (!changeMaskUrl && data.spatial_analysis?.change_mask) {
      changeMaskUrl = data.spatial_analysis.change_mask;
    }
    
    // 5. Check visualizations object
    if (!changeMaskUrl && data.visualizations) {
      console.log('Visualizations object found:', data.visualizations);
      console.log('Visualizations type:', typeof data.visualizations);
      console.log('Visualizations keys:', typeof data.visualizations === 'object' ? Object.keys(data.visualizations) : 'N/A');
      
      if (data.visualizations.change_mask) {
        changeMaskUrl = data.visualizations.change_mask;
      }
      if (!changeMaskUrl && data.visualizations.mask) {
        changeMaskUrl = data.visualizations.mask;
      }
      if (!changeMaskUrl && data.visualizations.mask_url) {
        changeMaskUrl = data.visualizations.mask_url;
      }
      if (!changeMaskUrl && data.visualizations.change_mask_url) {
        changeMaskUrl = data.visualizations.change_mask_url;
      }
      // Check if visualizations has a data field
      if (!changeMaskUrl && data.visualizations.data) {
        changeMaskUrl = data.visualizations.data;
      }
      // Check if visualizations itself is the mask string
      if (!changeMaskUrl && typeof data.visualizations === 'string') {
        changeMaskUrl = data.visualizations;
      }
      // Check all keys in visualizations for any base64 string
      if (!changeMaskUrl && typeof data.visualizations === 'object') {
        for (const key in data.visualizations) {
          const value = data.visualizations[key];
          if (typeof value === 'string' && (value.startsWith('data:image') || value.startsWith('iVBOR'))) {
            changeMaskUrl = value.startsWith('data:') ? value : `data:image/png;base64,${value}`;
            console.log('Found mask in visualizations.' + key + ':', changeMaskUrl.substring(0, 50) + '...');
            break;
          }
        }
      }
    }
    
    // 6. Check if it's base64 encoded string
    if (changeMaskUrl && typeof changeMaskUrl === 'string' && !changeMaskUrl.startsWith('http') && !changeMaskUrl.startsWith('data:')) {
      // Assume it's base64
      changeMaskUrl = `data:image/png;base64,${changeMaskUrl}`;
    }
    
    console.log('Extracted change mask URL:', changeMaskUrl);
    
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
      responseTime: elapsed,
      text: data.explanation || `Change detection complete. ${changePercent}% change detected.`,
      changeRegions,
      changePercent,
      changeMaskUrl,
      // Include raw API data for detailed display
      apiData: {
        changePercentage: data.change_percentage,
        changedPixels: data.changed_pixels,
        totalPixels: data.total_pixels,
        description: data.explanation,
      },
    };
  } catch (error) {
    console.error('Model 2 API error:', error);
    return {
      model: 'bitcd',
      responseTime: elapsed,
      text: 'Change detection failed. Please try again.',
      changeRegions: [],
      changePercent: 0,
      changeMaskUrl: null,
    };
  }
}
