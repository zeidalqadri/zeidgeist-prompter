/**
 * LLM-based Prompt Enhancer (Refactored)
 *
 * Thin facade over the new service-oriented architecture.
 * Maintains backward compatibility with existing code.
 */

import { LLMEnhancerService } from './llm/llm-enhancer.service';
import { db, enhancementLogs, feedback } from './db';
import { eq, desc } from 'drizzle-orm';
import { LearningService } from './learning/learning-service';

// Singleton service instance
let enhancerService: LLMEnhancerService | null = null;

function getEnhancerService(): LLMEnhancerService {
  if (!enhancerService) {
    enhancerService = new LLMEnhancerService();
  }
  return enhancerService;
}

/**
 * Enhanced prompt generation using service architecture
 *
 * @param rawPrompt - The original prompt to enhance
 * @param context - Optional context information
 * @param isRefinement - Whether this is a refinement of a previous enhancement
 * @param env - Cloudflare environment (for database access)
 * @returns Enhanced prompt string
 */
export async function enhancePrompt(
  rawPrompt: string,
  context: string = "",
  isRefinement: boolean = false,
  env?: any
): Promise<string> {
  const service = getEnhancerService();
  const result = await service.enhance(rawPrompt, context, isRefinement, env);
  return result.enhancedPrompt;
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
  const service = getEnhancerService();
  return service.getMetrics(env);
}

// Export types for external use
export type { EnhancementResponse, ProviderSource } from './llm/types';
