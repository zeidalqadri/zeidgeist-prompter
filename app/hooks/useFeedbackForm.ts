/**
 * useFeedbackForm Hook
 *
 * Custom hook for feedback submission logic
 */

import { useState, useCallback } from 'react';
import { promptService, PromptEngineerService, FeedbackData } from '../lib/prompt/prompt-engineer.service';

export interface UseFeedbackFormResult {
  submitFeedback: (data: FeedbackData) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
  reset: () => void;
}

export function useFeedbackForm(
  service: PromptEngineerService = promptService
): UseFeedbackFormResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitFeedback = useCallback(
    async (data: FeedbackData) => {
      // Validate feedback data
      if (!data.originalPrompt || !data.enhancedPrompt) {
        setError('Missing required feedback data');
        return;
      }

      if (data.score < 1 || data.score > 5) {
        setError('Score must be between 1 and 5');
        return;
      }

      setIsSubmitting(true);
      setError(null);
      setSuccess(false);

      try {
        await service.submitFeedback(data);
        setSuccess(true);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to submit feedback';
        setError(errorMessage);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [service]
  );

  const reset = useCallback(() => {
    setIsSubmitting(false);
    setError(null);
    setSuccess(false);
  }, []);

  return {
    submitFeedback,
    isSubmitting,
    error,
    success,
    reset
  };
}
