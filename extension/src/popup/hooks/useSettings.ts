import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '@/shared/types';
import { storage } from '@/shared/storage';
import { DEFAULT_SETTINGS } from '@/shared/constants';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedSettings = await storage.getSettings();
      setSettings(loadedSettings);
    } catch (err) {
      setError('Failed to load settings');
      console.error('Error loading settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    try {
      const updated = await storage.updateSettings(updates);
      setSettings(updated);
      return updated;
    } catch (err) {
      setError('Failed to update settings');
      console.error('Error updating settings:', err);
      throw err;
    }
  }, []);

  const resetSettings = useCallback(async () => {
    try {
      const reset = await storage.updateSettings(DEFAULT_SETTINGS);
      setSettings(reset);
      return reset;
    } catch (err) {
      setError('Failed to reset settings');
      console.error('Error resetting settings:', err);
      throw err;
    }
  }, []);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    resetSettings,
    loadSettings,
  };
}
