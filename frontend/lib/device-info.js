/**
 * Device information utilities for user identification without login
 */

/**
 * Collects basic device information for fingerprinting
 * @returns {string} A string of device information
 */
export function getDeviceInfo() {
  const info = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  
  return Object.values(info).join('-');
}

/**
 * Adds device information to request headers
 * @param {Object} options - Fetch options
 * @returns {Object} Updated fetch options
 */
export function addDeviceInfoToRequest(options = {}) {
  // Create headers if they don't exist
  if (!options.headers) {
    options.headers = {};
  }
  
  // Add device info to headers
  options.headers['X-Device-Info'] = getDeviceInfo();
  
  return options;
}

/**
 * Fetch with device information included
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export async function fetchWithDeviceInfo(url, options = {}) {
  return fetch(url, addDeviceInfoToRequest(options));
} 