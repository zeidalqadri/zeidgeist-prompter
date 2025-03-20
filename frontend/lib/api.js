/**
 * API utilities for the frontend
 */

import { fetchWithDeviceInfo } from './device-info';

// Get the API base URL from environment or use default
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

/**
 * Fetch history data from the API
 * @returns {Promise<Array>} Array of history items
 */
export async function fetchHistory() {
  try {
    const response = await fetchWithDeviceInfo(`${API_BASE_URL}/api/engineer/history`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch history: ${response.status}`);
    }
    
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching history:', error);
    return [];
  }
}

/**
 * Save a history item to the API
 * @param {Object} item - The history item to save
 * @returns {Promise<Object>} Response from the API
 */
export async function saveHistoryItem(item) {
  try {
    const response = await fetchWithDeviceInfo(`${API_BASE_URL}/api/engineer/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(item),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save history item: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving history item:', error);
    throw error;
  }
}

/**
 * Export history data in various formats
 * @param {string} format - The format to export (json, csv)
 * @returns {Promise<Object|Blob>} The exported data
 */
export async function exportHistory(format = 'json') {
  try {
    const response = await fetchWithDeviceInfo(`${API_BASE_URL}/api/engineer/export?format=${format}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to export history: ${response.status}`);
    }
    
    if (format === 'csv') {
      return await response.blob();
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error exporting history:', error);
    throw error;
  }
} 