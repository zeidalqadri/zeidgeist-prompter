import { useReducer, useCallback } from 'react';
import type { RefactorResponse } from '@/shared/types';
import { apiClient, ApiError } from '@/shared/api-client';
import { storage } from '@/shared/storage';

interface RefactorState {
  rawPrompt: string;
  refactoredPrompt: string;
  isLoading: boolean;
  error: string | null;
  source: string | null;
  model: string | null;
  requestedProvider: string | null;
  processingTime: number | null;
  copied: boolean;
}

type RefactorAction =
  | { type: 'SET_RAW_PROMPT'; payload: string }
  | { type: 'SET_REFACTORED'; payload: RefactorResponse }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_COPIED'; payload: boolean }
  | { type: 'RESET' };

const initialState: RefactorState = {
  rawPrompt: '',
  refactoredPrompt: '',
  isLoading: false,
  error: null,
  source: null,
  model: null,
  requestedProvider: null,
  processingTime: null,
  copied: false,
};

function refactorReducer(state: RefactorState, action: RefactorAction): RefactorState {
  switch (action.type) {
    case 'SET_RAW_PROMPT':
      return { ...state, rawPrompt: action.payload, error: null };
    case 'SET_REFACTORED':
      return {
        ...state,
        refactoredPrompt: action.payload.result,
        source: action.payload.metadata?.source || null,
        model: action.payload.metadata?.model || null,
        requestedProvider: action.payload.metadata?.requestedProvider || null,
        processingTime: action.payload.metadata?.processingTime || null,
        isLoading: false,
        error: null,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, error: null };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_COPIED':
      return { ...state, copied: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useRefactor() {
  const [state, dispatch] = useReducer(refactorReducer, initialState);

  const setRawPrompt = useCallback((prompt: string) => {
    dispatch({ type: 'SET_RAW_PROMPT', payload: prompt });
  }, []);

  const refactor = useCallback(async (context?: string) => {
    if (!state.rawPrompt.trim()) {
      dispatch({ type: 'SET_ERROR', payload: 'Please enter a prompt to refactor' });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const settings = await storage.getSettings();
      const response = await apiClient.refactorPrompt(
        {
          prompt: state.rawPrompt,
          context,
          provider: settings.providerMode === 'manual' ? settings.preferredProvider : undefined,
        },
        settings.apiBaseUrl
      );

      dispatch({ type: 'SET_REFACTORED', payload: response });

      // Save to history if sync is enabled
      if (settings.syncHistory) {
        await storage.addToHistory({
          original: state.rawPrompt,
          refactored: response.result,
          context,
          timestamp: Date.now(),
          metadata: response.metadata,
        });
      }

      // Save session state
      await storage.saveLastSession({
        rawPrompt: state.rawPrompt,
        refactoredPrompt: response.result,
        timestamp: Date.now(),
      });
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : 'Failed to refactor prompt. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: message });
    }
  }, [state.rawPrompt]);

  const copyToClipboard = useCallback(async () => {
    if (!state.refactoredPrompt) return;

    try {
      await navigator.clipboard.writeText(state.refactoredPrompt);
      dispatch({ type: 'SET_COPIED', payload: true });
      setTimeout(() => dispatch({ type: 'SET_COPIED', payload: false }), 2000);
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to copy to clipboard' });
    }
  }, [state.refactoredPrompt]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    state,
    setRawPrompt,
    refactor,
    copyToClipboard,
    reset,
  };
}
