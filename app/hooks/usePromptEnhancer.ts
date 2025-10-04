/**
 * usePromptEnhancer Hook
 *
 * Custom hook for prompt enhancement logic
 */

import { useState, useCallback } from 'react';
import { promptService, PromptEngineerService } from '../lib/prompt/prompt-engineer.service';

export interface UsePromptEnhancerResult {
  enhance: (prompt: string, context?: string, isRefinement?: boolean) => Promise<string>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  enhancementSource: string | null;
  enhancementTime: number | null;
}

export function usePromptEnhancer(
  service: PromptEngineerService = promptService
): UsePromptEnhancerResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enhancementSource, setEnhancementSource] = useState<string | null>(null);
  const [enhancementTime, setEnhancementTime] = useState<number | null>(null);

  const enhance = useCallback(
    async (prompt: string, context?: string, isRefinement: boolean = false): Promise<string> => {
      // Validate inputs
      const promptValidation = PromptEngineerService.validatePrompt(prompt);
      if (!promptValidation.valid) {
        setError(promptValidation.error || 'Invalid prompt');
        return '';
      }

      if (context) {
        const contextValidation = PromptEngineerService.validateContext(context);
        if (!contextValidation.valid) {
          setError(contextValidation.error || 'Invalid context');
          return '';
        }
      }

      setIsLoading(true);
      setError(null);
      setEnhancementSource(null);
      setEnhancementTime(null);

      try {
        const result = await service.enhancePrompt(prompt, context, isRefinement);

        setEnhancementSource(result.metadata?.source || null);
        setEnhancementTime(result.metadata?.processingTime || null);

        return result.enhanced;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to enhance prompt';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [service]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    enhance,
    isLoading,
    error,
    clearError,
    enhancementSource,
    enhancementTime
  };
}
