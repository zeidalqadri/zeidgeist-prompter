import type { HistoryItem, Settings, StorageSchema } from './types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from './constants';

/**
 * Storage wrapper for Chrome extension storage API
 */
export const storage = {
  /**
   * Get history items from storage
   */
  async getHistory(): Promise<HistoryItem[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    return result[STORAGE_KEYS.HISTORY] || [];
  },

  /**
   * Add a new item to history
   */
  async addToHistory(item: Omit<HistoryItem, 'id'>): Promise<HistoryItem> {
    const history = await this.getHistory();
    const settings = await this.getSettings();

    const newItem: HistoryItem = {
      ...item,
      id: crypto.randomUUID(),
    };

    // Keep most recent items within limit
    const maxItems = settings.maxHistoryItems || 100;
    const updatedHistory = [newItem, ...history].slice(0, maxItems);

    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: updatedHistory });
    return newItem;
  },

  /**
   * Remove an item from history
   */
  async removeFromHistory(id: string): Promise<void> {
    const history = await this.getHistory();
    const updatedHistory = history.filter(item => item.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: updatedHistory });
  },

  /**
   * Clear all history
   */
  async clearHistory(): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: [] });
  },

  /**
   * Get settings from storage
   */
  async getSettings(): Promise<Settings> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return {
      ...DEFAULT_SETTINGS,
      ...result[STORAGE_KEYS.SETTINGS],
    };
  },

  /**
   * Update settings
   */
  async updateSettings(updates: Partial<Settings>): Promise<Settings> {
    const current = await this.getSettings();
    const updated = { ...current, ...updates };
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
    return updated;
  },

  /**
   * Get last session state
   */
  async getLastSession(): Promise<StorageSchema['lastSession'] | null> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.LAST_SESSION);
    return result[STORAGE_KEYS.LAST_SESSION] || null;
  },

  /**
   * Save last session state
   */
  async saveLastSession(session: StorageSchema['lastSession']): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.LAST_SESSION]: session });
  },

  /**
   * Clear last session
   */
  async clearLastSession(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEYS.LAST_SESSION);
  },
};
