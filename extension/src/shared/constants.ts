import type { Settings } from './types';

export const API_BASE_URL = 'https://mstprmpt.zeidgeist.com';

export const API_ENDPOINTS = {
  ENGINEER: '/api/engineer',
  HISTORY: '/api/engineer/history',
  PROVIDER_PREFERENCE: '/api/tweak/provider-preference',
} as const;

export const DEFAULT_SETTINGS: Settings = {
  providerMode: 'auto',
  preferredProvider: undefined,
  floatingButton: 'on-focus',
  syncHistory: true,
  keyboardShortcuts: true,
  apiBaseUrl: API_BASE_URL,
  maxHistoryItems: 100,
};

export const SUPPORTED_PROVIDERS = [
  'deepseek',
  'mistral',
  'gemini',
  'claude',
  'openai',
  'moonshot',
] as const;

export type SupportedProvider = typeof SUPPORTED_PROVIDERS[number];

export const PROMPT_LIMITS = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 10000,
  MAX_CONTEXT_LENGTH: 20000,
} as const;

export const STORAGE_KEYS = {
  HISTORY: 'history',
  SETTINGS: 'settings',
  LAST_SESSION: 'lastSession',
} as const;

export const UI_CONSTANTS = {
  POPUP_WIDTH: 400,
  POPUP_MIN_HEIGHT: 300,
  TOAST_DURATION: 3000,
  DEBOUNCE_DELAY: 300,
} as const;
