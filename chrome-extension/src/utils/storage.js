import { STORAGE_KEYS, DEFAULT_SETTINGS } from './config.js';

export class StorageManager {
  constructor() {
    this.initializeStorage();
  }
  
  async initializeStorage() {
    const settings = await this.getSettings();
    if (!settings || Object.keys(settings).length === 0) {
      await this.updateSettings(DEFAULT_SETTINGS);
    }
  }
  
  async getHistory(limit = 10) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.HISTORY], (result) => {
        const history = result[STORAGE_KEYS.HISTORY] || [];
        resolve(history.slice(0, limit));
      });
    });
  }
  
  async addToHistory(entry) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.HISTORY], async (result) => {
        const history = result[STORAGE_KEYS.HISTORY] || [];
        const settings = await this.getSettings();
        
        history.unshift({
          ...entry,
          id: crypto.randomUUID(),
          timestamp: entry.timestamp || new Date().toISOString()
        });
        
        if (history.length > settings.historyLimit) {
          history.splice(settings.historyLimit);
        }
        
        chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history }, resolve);
      });
    });
  }
  
  async clearHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.remove([STORAGE_KEYS.HISTORY], resolve);
    });
  }
  
  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([STORAGE_KEYS.SETTINGS], (result) => {
        resolve(result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS);
      });
    });
  }
  
  async updateSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: settings }, resolve);
    });
  }
  
  async getCachedEnhancement(prompt) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.CACHE], (result) => {
        const cache = result[STORAGE_KEYS.CACHE] || {};
        const key = this.hashPrompt(prompt);
        const cached = cache[key];
        
        if (cached && Date.now() - cached.timestamp < DEFAULT_SETTINGS.cacheExpiry) {
          resolve(cached.data);
        } else {
          resolve(null);
        }
      });
    });
  }
  
  async setCachedEnhancement(prompt, enhancement) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.CACHE], (result) => {
        const cache = result[STORAGE_KEYS.CACHE] || {};
        const key = this.hashPrompt(prompt);
        
        cache[key] = {
          data: enhancement,
          timestamp: Date.now()
        };
        
        this.cleanExpiredCache(cache);
        
        chrome.storage.local.set({ [STORAGE_KEYS.CACHE]: cache }, resolve);
      });
    });
  }
  
  cleanExpiredCache(cache) {
    const now = Date.now();
    Object.keys(cache).forEach(key => {
      if (now - cache[key].timestamp > DEFAULT_SETTINGS.cacheExpiry) {
        delete cache[key];
      }
    });
  }
  
  hashPrompt(prompt) {
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }
  
  async getAuthToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.AUTH_TOKEN], (result) => {
        resolve(result[STORAGE_KEYS.AUTH_TOKEN] || null);
      });
    });
  }
  
  async setAuthToken(token) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEYS.AUTH_TOKEN]: token }, resolve);
    });
  }
}