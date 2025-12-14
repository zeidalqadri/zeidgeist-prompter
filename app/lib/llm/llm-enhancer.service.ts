/**
 * LLM Enhancer Service
 *
 * High-level orchestration service for prompt enhancement
 * Integrates safety validation, context optimization, provider management,
 * and cost-aware optimization.
 */

import { LLMProviderFactory } from './llm-provider.service';
import { EnhancementRequest, EnhancementResponse, CostMetrics } from './types';
import { SafetyValidator } from '../enhanced-architecture/safety-validator';
import { AdvancedContextManager } from '../enhanced-architecture/context-manager';
import { MetricsCalculator } from '../enhanced-architecture/metrics-calculator';
import { CostAwareOptimizer, OptimizationResult } from '../enhanced-architecture/cost-optimizer';
import { CostOptimizationConfig, DEFAULT_COST_CONFIG, createCostConfig } from '../enhanced-architecture/cost-config';
import { AdaptiveEnhancer } from '../learning/adaptive-enhancer';
import { withDatabase } from '../db';
import { enhancementLogs } from '../db/schema';
import { traceLLMRequest, addSpanAttributes } from '../observability/tracing';
import { logger, createLogger } from '../observability/logger';
import { recordLLMRequest, recordError, recordLatency } from '../observability/metrics';

export class LLMEnhancerService {
  private safetyValidator: SafetyValidator;
  private contextManager: AdvancedContextManager;
  private metricsCalculator: MetricsCalculator;
  private adaptiveEnhancer: AdaptiveEnhancer;
  private costOptimizer: CostAwareOptimizer;

  constructor() {
    this.safetyValidator = new SafetyValidator();
    this.contextManager = new AdvancedContextManager();
    this.metricsCalculator = new MetricsCalculator();
    this.adaptiveEnhancer = new AdaptiveEnhancer();
    this.costOptimizer = new CostAwareOptimizer();
  }

  /**
   * Main enhancement method with cost-aware optimization
   *
   * @param rawPrompt - The raw prompt to enhance
   * @param context - Optional context
   * @param isRefinement - Whether this is a refinement of an existing prompt
   * @param env - Environment variables (Cloudflare Workers)
   * @param costConfig - Optional cost optimization configuration
   * @returns Enhanced prompt and metadata
   */
  async enhance(
    rawPrompt: string,
    context: string = '',
    isRefinement: boolean = false,
    env?: any,
    costConfig?: Partial<CostOptimizationConfig>
  ): Promise<{ enhancedPrompt: string; costMetrics?: CostMetrics }> {
    const log = createLogger({ operation: 'enhance_prompt' });
    const startTime = Date.now();

    // Set environment source for Cloudflare Workers
    if (env) {
      const { setEnvironmentSource } = await import('./llm-config');
      setEnvironmentSource(env);
      log.info('Environment source set for Cloudflare Workers', {
        hasDeepSeek: !!env.DEEPSEEK_API_KEY,
        hasMistral: !!env.MISTRAL_API_KEY,
        hasGemini: !!env.GEMINI_API_KEY
      });
    }

    // Build effective cost config
    const effectiveCostConfig = createCostConfig(costConfig || {});

    // Validate input
    if (!rawPrompt || rawPrompt.trim() === '') {
      return { enhancedPrompt: '' };
    }

    let promptString = String(rawPrompt).trim();
    const contextString = context ? String(context).trim() : '';

    log.info('Starting prompt enhancement', {
      promptLength: promptString.length,
      hasContext: !!contextString,
      isRefinement
    });

    // Step 1: Safety validation
    const safetyResult = this.safetyValidator.validateSafety(promptString, contextString);

    if (!safetyResult.isSafe) {
      log.warn('Safety validation failed', { checks: safetyResult.checks });
      recordError('prompt_enhancement', 'safety_validation_failed');

      if (safetyResult.requiresHumanReview) {
        throw new Error('Prompt requires human review due to safety concerns');
      }

      if (safetyResult.sanitizedPrompt) {
        log.info('Using sanitized prompt');
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
      const duration = Date.now() - startTime;
      log.info('Using learned pattern with high confidence', {
        confidence: adaptiveResult.confidence,
        duration
      });

      recordLatency('prompt_enhancement', duration, { source: 'learned_pattern' });
      recordLLMRequest('local', 'learned_pattern', duration, true);

      // Apply cost optimization to learned pattern result
      const optimizationResult = await this.costOptimizer.optimize(
        adaptiveResult.enhanced,
        effectiveCostConfig
      );

      const finalPrompt = optimizationResult.compressionApplied
        ? optimizationResult.optimizedPrompt
        : adaptiveResult.enhanced;

      // Store successful enhancement
      if (env) {
        await this.storeEnhancement(env, promptString, processedContext, finalPrompt, 'local');
      }

      return {
        enhancedPrompt: finalPrompt,
        costMetrics: {
          originalTokens: optimizationResult.originalMetrics.tokenCount,
          optimizedTokens: optimizationResult.optimizedMetrics.tokenCount,
          tokensSaved: optimizationResult.tokensSaved,
          percentageSaved: optimizationResult.percentageSaved,
          qualityScore: optimizationResult.optimizedMetrics.overall,
          optimizationScore: optimizationResult.optimizedMetrics.optimizationScore,
          compressionApplied: optimizationResult.compressionApplied,
          lambdaUsed: effectiveCostConfig.lambda
        }
      };
    }

    // Step 4: Use external provider with fallback chain
    const request: EnhancementRequest = {
      prompt: promptString,
      context: processedContext,
      isRefinement
    };

    try {
      const response = await traceLLMRequest(
        'enhancer',
        'prompt-enhancement',
        async () => {
          return await LLMProviderFactory.enhanceWithFallback(request);
        }
      );

      const duration = Date.now() - startTime;

      // Calculate quality metrics
      const enhancementMetrics = this.metricsCalculator.comparePrompts(
        promptString,
        response.enhancedPrompt
      );

      log.info('Enhancement complete', {
        source: response.source,
        enhancementType: enhancementMetrics.enhancementType,
        improvementScore: enhancementMetrics.improvementScore,
        duration
      });

      recordLatency('prompt_enhancement', duration, { source: response.source });
      recordLLMRequest(
        response.source,
        'prompt-enhancement',
        response.metadata?.processingTime || duration,
        true
      );

      // Step 5: Apply cost-aware optimization to enhanced prompt
      const optimizationResult = await this.costOptimizer.optimize(
        response.enhancedPrompt,
        effectiveCostConfig
      );

      const finalPrompt = optimizationResult.compressionApplied
        ? optimizationResult.optimizedPrompt
        : response.enhancedPrompt;

      log.info('Cost optimization applied', {
        compressionApplied: optimizationResult.compressionApplied,
        tokensSaved: optimizationResult.tokensSaved,
        percentageSaved: optimizationResult.percentageSaved,
        lambda: effectiveCostConfig.lambda
      });

      // Store enhancement for learning
      if (env) {
        await this.storeEnhancement(
          env,
          promptString,
          processedContext,
          finalPrompt,
          response.source,
          response.metadata?.processingTime
        );
      }

      return {
        enhancedPrompt: finalPrompt,
        costMetrics: {
          originalTokens: optimizationResult.originalMetrics.tokenCount,
          optimizedTokens: optimizationResult.optimizedMetrics.tokenCount,
          tokensSaved: optimizationResult.tokensSaved,
          percentageSaved: optimizationResult.percentageSaved,
          qualityScore: optimizationResult.optimizedMetrics.overall,
          optimizationScore: optimizationResult.optimizedMetrics.optimizationScore,
          compressionApplied: optimizationResult.compressionApplied,
          lambdaUsed: effectiveCostConfig.lambda
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error('All providers failed', error as Error, { duration });
      recordError('prompt_enhancement', 'all_providers_failed');
      recordLatency('prompt_enhancement', duration, { source: 'failed' });

      // Last resort: return generic enhancement
      const genericEnhancement = this.generateGenericEnhancement(promptString);
      return { enhancedPrompt: genericEnhancement };
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
   * Aggregates real-time metrics from in-memory store
   */
  async getMetrics(env: any): Promise<Record<string, unknown>> {
    const { getMetricsJSON } = await import('@/app/lib/observability/metrics');
    const rawMetrics = getMetricsJSON() as any;

    // Aggregate LLM metrics
    const llmRequests = rawMetrics.counters.filter((c: any) =>
      c.name === 'llm_requests_total'
    );

    const providerUsage: Record<string, number> = {};
    let totalEnhancements = 0;

    llmRequests.forEach((counter: any) => {
      const provider = counter.labels?.provider || 'unknown';
      providerUsage[provider] = (providerUsage[provider] || 0) + counter.value;
      totalEnhancements += counter.value;
    });

    // Calculate average processing time from histogram
    const latencyHistograms = rawMetrics.histograms.filter((h: any) =>
      h.name === 'prompt_enhancement_duration_ms'
    );

    let averageProcessingTime = 0;
    if (latencyHistograms.length > 0) {
      const totalSum = latencyHistograms.reduce((sum: number, h: any) => sum + h.sum, 0);
      const totalCount = latencyHistograms.reduce((count: number, h: any) => count + h.count, 0);
      averageProcessingTime = totalCount > 0 ? totalSum / totalCount : 0;
    }

    return {
      totalEnhancements,
      providerUsage,
      averageProcessingTime: Math.round(averageProcessingTime)
    };
  }
}
