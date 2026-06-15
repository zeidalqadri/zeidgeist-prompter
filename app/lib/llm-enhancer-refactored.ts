/**
 * LLM Enhancer - Refactored Version Wrapper
 *
 * This wraps the refactored LLM system from /app/lib/llm/ for use in Cloudflare Functions
 * Provides backward compatibility with the legacy enhancer interface
 *
 * IMPORTANT: ALL imports must be dynamic to ensure proper environment initialization
 * No static imports allowed to avoid module loading before environment is available
 */

// Type imports are safe as they don't execute code
import type { EnhancementRequest, EnhancementResponse } from './llm/types';
import { db, enhancementLogs, feedback } from './db';
import { eq, desc } from 'drizzle-orm';
import { LearningService } from './learning/learning-service';

export interface ProviderPreferences {
  selectionMode?: 'random' | 'forced' | 'custom';
  forcedProvider?: string;
  excludedProviders: string[];
}

/**
 * Enhanced prompt with provider preferences and test mode support
 */
export async function enhancePrompt(
  prompt: string,
  context?: string,
  options: {
    isRefinement?: boolean;
    isExpansion?: boolean;
    repeatCount?: number;
    env?: Record<string, string>;
    providerPreferences?: ProviderPreferences | null;
    testProvider?: string | null;
    forcedProvider?: string;
  } = {}
): Promise<EnhancementResponse> {
  const {
    isRefinement = false,
    env = {},
    providerPreferences,
    testProvider,
    forcedProvider
  } = options;

  // Dynamically import ALL modules to avoid static initialization
  const { setEnvironmentSource } = await import('./llm/llm-config');

  // Set environment source for Cloudflare Workers
  // Note: Cloudflare env bindings have non-enumerable secrets, so we can't use Object.keys()
  if (env) {
    setEnvironmentSource(env);
  }

  // Import provider factory and circuit breaker cleanup
  const { LLMProviderFactory } = await import('./llm/llm-provider.service');
  const { CircuitBreakerFactory } = await import('./resilience/circuit-breaker');

  // Clear cached providers AND circuit breakers to force re-initialization.
  // Without shutdownAll(), stale breakers accumulate failure stats across
  // requests and eventually trip OPEN, blocking all external providers.
  LLMProviderFactory.clearProviders();
  CircuitBreakerFactory.shutdownAll();

  // Validate forced provider against known provider names
  const VALID_PROVIDERS = ['claude', 'openai', 'deepseek', 'mistral', 'moonshot', 'gemini'] as const;
  type ValidProvider = typeof VALID_PROVIDERS[number];
  const validatedForcedProvider = forcedProvider && VALID_PROVIDERS.includes(forcedProvider as ValidProvider)
    ? (forcedProvider as import('./llm/types').ProviderSource)
    : undefined;

  if (forcedProvider && !validatedForcedProvider) {
    console.warn(`[LLM Enhancer] Invalid forced provider '${forcedProvider}', ignoring`);
  }

  // Build the enhancement request
  const request: EnhancementRequest = {
    prompt,
    context: context || '',
    isRefinement,
    forcedProvider: validatedForcedProvider
  };

  try {
    const response = await LLMProviderFactory.enhanceWithFallback(request);
    return response;
  } catch (error) {
    // Fallback to local enhancement with detailed error info
    return {
      enhancedPrompt: prompt + '. (All LLM providers failed - using local enhancement)',
      source: 'local',
      metadata: {
        processingTime: 0,
        fallbackReason: 'all_providers_failed',
        errorDetails: error instanceof Error ? error.message : String(error)
      }
    } as EnhancementResponse;
  }
}

/**
 * Feedback processing for continuous improvement
 *
 * @param originalPrompt - The original prompt
 * @param enhancedPrompt - The enhanced prompt
 * @param wasSuccessful - Whether the enhancement was successful
 * @param feedbackText - Optional feedback text
 * @param score - Numeric score (1-5)
 */
export async function processEnhancementFeedback(
  originalPrompt: string,
  enhancedPrompt: string,
  wasSuccessful: boolean,
  feedbackText?: string,
  score: number = wasSuccessful ? 5 : 1
): Promise<void> {
  try {
    // Find the enhancement log entry
    const logs = await db
      .select()
      .from(enhancementLogs)
      .where(eq(enhancementLogs.originalPrompt, originalPrompt))
      .orderBy(desc(enhancementLogs.createdAt))
      .limit(1);

    if (logs.length > 0) {
      // Store feedback in database
      await db.insert(feedback).values({
        enhancementId: logs[0].id,
        originalPrompt: originalPrompt,
        enhancedPrompt: enhancedPrompt,
        wasSuccessful: wasSuccessful,
        score: score,
        feedbackText: feedbackText,
        createdAt: new Date(),
      });

      // If positive feedback, trigger immediate pattern extraction
      if (wasSuccessful && score >= 4) {
        const learningService = new LearningService();
        // Extract pattern from this specific enhancement
        await learningService.runLearningCycle();
      }
    }

    console.log('[LLM Enhancer] Enhancement feedback stored:', {
      originalPrompt,
      wasSuccessful,
      score,
      feedback: feedbackText
    });
  } catch (error) {
    console.error('[LLM Enhancer] Error processing enhancement feedback:', error);
  }
}

/**
 * Get enhancement metrics
 */
export async function getEnhancementMetrics(env: any): Promise<Record<string, unknown>> {
  const { LLMEnhancerService } = await import('./llm/llm-enhancer.service');
  const service = new LLMEnhancerService();
  return service.getMetrics(env);
}

// Export types for external use
export type { EnhancementResponse, ProviderSource } from './llm/types';
