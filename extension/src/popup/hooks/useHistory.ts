import { useState, useEffect, useCallback } from 'react';
import type { HistoryItem } from '@/shared/types';
import { storage } from '@/shared/storage';

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await storage.getHistory();
      setHistory(items);
    } catch (err) {
      setError('Failed to load history');
      console.error('Error loading history:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const addToHistory = useCallback(async (item: Omit<HistoryItem, 'id'>) => {
    try {
      const newItem = await storage.addToHistory(item);
      setHistory(prev => [newItem, ...prev]);
      return newItem;
    } catch (err) {
      setError('Failed to add to history');
      console.error('Error adding to history:', err);
      throw err;
    }
  }, []);

  const removeFromHistory = useCallback(async (id: string) => {
    try {
      await storage.removeFromHistory(id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError('Failed to remove from history');
      console.error('Error removing from history:', err);
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      await storage.clearHistory();
      setHistory([]);
    } catch (err) {
      setError('Failed to clear history');
      console.error('Error clearing history:', err);
    }
  }, []);

  return {
    history,
    isLoading,
    error,
    loadHistory,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}
