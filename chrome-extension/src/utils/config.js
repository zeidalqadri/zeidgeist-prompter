export const API_CONFIG = {
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://mstprmpt.zeidgeist.com' 
    : 'http://localhost:3000',
  endpoints: {
    enhance: '/api/engineer',
    feedback: '/api/engineer/feedback',
    history: '/api/engineer/history',
    learning: '/api/learning/trigger'
  }
};

export const STORAGE_KEYS = {
  HISTORY: 'mstprmpt_history',
  SETTINGS: 'mstprmpt_settings',
  AUTH_TOKEN: 'mstprmpt_auth',
  CACHE: 'mstprmpt_cache'
};

export const DEFAULT_SETTINGS = {
  autoEnhance: false,
  showNotifications: true,
  historyLimit: 50,
  cacheExpiry: 3600000, // 1 hour
  theme: 'light',
  shortcuts: {
    enhance: 'Ctrl+Shift+E',
    copy: 'Ctrl+Shift+C',
    history: 'Ctrl+Shift+H'
  },
  enhancementOptions: {
    includeContext: true,
    preserveIntent: true,
    optimizeForModel: 'auto'
  }
};