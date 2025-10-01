/**
 * LLM Enhancer Service
 *
 * High-level orchestration service for prompt enhancement
 * Integrates safety validation, context optimization, and provider management
 */

import { LLMProviderFactory } from './llm-provider.service';
import { EnhancementRequest, EnhancementResponse } from './types';
import { SafetyValidator } from '../enhanced-architecture/safety-validator';
import { AdvancedContextManager } from '../enhanced-architecture/context-manager';
import { MetricsCalculator } from '../enhanced-architecture/metrics-calculator';
import { AdaptiveEnhancer } from '../learning/adaptive-enhancer';
import { withDatabase } from '../db';
import { enhancementLogs } from '../db/schema';

export class LLMEnhancerService {
  private safetyValidator: SafetyValidator;
  private contextManager: AdvancedContextManager;
  private metricsCalculator: MetricsCalculator;
  private adaptiveEnhancer: AdaptiveEnhancer;

  constructor() {
    this.safetyValidator = new SafetyValidator();
    this.contextManager = new AdvancedContextManager();
    this.metricsCalculator = new MetricsCalculator();
    this.adaptiveEnhancer = new AdaptiveEnhancer();
  }

  /**
   * Main enhancement method
   */
  async enhance(
    rawPrompt: string,
    context: string = '',
    isRefinement: boolean = false,
    env?: any
  ): Promise<string> {
    // Validate input
    if (!rawPrompt || rawPrompt.trim() === '') {
      return '';
    }

    let promptString = String(rawPrompt).trim();
    const contextString = context ? String(context).trim() : '';

    // Step 1: Safety validation
    const safetyResult = this.safetyValidator.validateSafety(promptString, contextString);

    if (!safetyResult.isSafe) {
      console.warn('[LLM Enhancer] Safety validation failed:', safetyResult.checks);

      if (safetyResult.requiresHumanReview) {
        throw new Error('Prompt requires human review due to safety concerns');
      }

      if (safetyResult.sanitizedPrompt) {
        console.log('[LLM Enhancer] Using sanitized prompt');
        promptString = safetyResult.sanitizedPrompt;
      }
    }

    // Step 2: Context optimization
    const contextChunks = [];
    if (contextString) {
      contextChunks.push({
        id: 'user-context',
        content: contextString,
        type: 'context' as const,
        priority: 0.8,
        tokens: contextString.split(' ').length,
        metadata: { source: 'user-provided' }
      });
    }

    const optimizedContext = await this.contextManager.optimizeContext(contextChunks);
    const processedContext = optimizedContext.chunks.map(c => c.content).join(' ');

    // Step 3: Try adaptive enhancer first (learned patterns)
    const adaptiveResult = await this.adaptiveEnhancer.enhance(promptString);

    if (adaptiveResult.source === 'learned' && adaptiveResult.confidence >= 0.8) {
      console.log('[LLM Enhancer] Using learned pattern with high confidence:', adaptiveResult.confidence);

      // Store successful enhancement
      if (env) {
        await this.storeEnhancement(env, promptString, processedContext, adaptiveResult.enhanced, 'local');
      }

      return adaptiveResult.enhanced;
    }

    // Step 4: Use external provider with fallback chain
    const request: EnhancementRequest = {
      prompt: promptString,
      context: processedContext,
      isRefinement
    };

    try {
      const response = await LLMProviderFactory.enhanceWithFallback(request);

      // Calculate quality metrics
      const enhancementMetrics = this.metricsCalculator.comparePrompts(
        promptString,
        response.enhancedPrompt
      );

      console.log(`[LLM Enhancer] Enhancement complete via ${response.source}:`, {
        type: enhancementMetrics.enhancementType,
        improvement: `${enhancementMetrics.improvementScore}%`,
        processingTime: response.metadata?.processingTime
      });

      // Store enhancement for learning
      if (env) {
        await this.storeEnhancement(
          env,
          promptString,
          processedContext,
          response.enhancedPrompt,
          response.source,
          response.metadata?.processingTime
        );
      }

      return response.enhancedPrompt;
    } catch (error) {
      console.error('[LLM Enhancer] All providers failed:', error);

      // Last resort: return generic enhancement
      return this.generateGenericEnhancement(promptString);
    }
  }

  /**
   * Store enhancement example for training
   */
  private async storeEnhancement(
    env: any,
    originalPrompt: string,
    context: string,
    enhancedPrompt: string,
    source: string,
    processingTime?: number
  ): Promise<void> {
    try {
      await withDatabase(env, async (db) => {
        await db.insert(enhancementLogs).values({
          originalPrompt,
          enhancedPrompt,
          promptLength: originalPrompt.length,
          hasContext: !!context,
          isRefinement: false,
          isExpansion: false,
          source,
          enhancementModel: source,
          responseTime: processingTime || 0,
          context: JSON.stringify({ context }),
          createdAt: new Date()
        });
      });
    } catch (error) {
      console.error('[LLM Enhancer] Failed to store enhancement:', error);
    }
  }

  /**
   * Generate generic enhancement as last resort
   */
  private generateGenericEnhancement(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();

    // Website content
    if (lowerPrompt.includes('website') || lowerPrompt.includes('site')) {
      return `${prompt}. Include sections for services, about information, contact details, testimonials, and a clean modern design.`;
    }

    // Writing content
    if (lowerPrompt.includes('write') || lowerPrompt.includes('essay') || lowerPrompt.includes('article')) {
      return `${prompt} with a clear structure including introduction, main points with supporting evidence, and a strong conclusion.`;
    }

    // Default enhancement
    return `${prompt}. Ensure it includes comprehensive content, clear organization, professional presentation, and specific details.`;
  }

  /**
   * Get enhancement metrics
   */
  async getMetrics(env: any): Promise<Record<string, unknown>> {
    // TODO: Implement metrics aggregation from database
    return {
      totalEnhancements: 0,
      providerUsage: {},
      averageProcessingTime: 0
    };
  }
}
