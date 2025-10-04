/**
 * usePromptHistory Hook
 *
 * Custom hook for managing prompt history
 */

import { useState, useEffect, useCallback } from 'react';
import { promptService, PromptEngineerService, HistoryItem } from '../lib/prompt/prompt-engineer.service';

export interface UsePromptHistoryResult {
  history: HistoryItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addToHistory: (item: HistoryItem) => void;
  clearHistory: () => void;
  expandedItems: Set<number>;
  toggleExpand: (index: number) => void;
}

export function usePromptHistory(
  autoLoad: boolean = true,
  limit: number = 20,
  service: PromptEngineerService = promptService
): UsePromptHistoryResult {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const items = await service.getHistory(limit);
      setHistory(items);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load history';
      setError(errorMessage);
      console.error('[usePromptHistory] Failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [limit, service]);

  const addToHistory = useCallback((item: HistoryItem) => {
    setHistory(prev => [item, ...prev]);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setExpandedItems(new Set());
  }, []);

  const toggleExpand = useCallback((index: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      refresh();
    }
  }, [autoLoad, refresh]);

  return {
    history,
    isLoading,
    error,
    refresh,
    addToHistory,
    clearHistory,
    expandedItems,
    toggleExpand
  };
}
