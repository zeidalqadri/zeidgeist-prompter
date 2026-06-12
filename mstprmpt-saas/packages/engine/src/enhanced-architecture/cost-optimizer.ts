/**
 * Cost-Aware Prompt Optimizer
 *
 * Post-processing compression for prompt length optimization.
 * Applies various compression techniques while maintaining quality.
 *
 * Techniques:
 * 1. Remove redundant phrases
 * 2. Compress verbose constructions
 * 3. Consolidate repetitive structures
 * 4. Extract key points for aggressive compression
 */

import { LRUCache } from 'lru-cache';
import { CostOptimizationConfig, DEFAULT_COST_CONFIG } from './cost-config';
import { MetricsCalculator, CostAwareMetrics, CostComparisonMetrics } from './metrics-calculator';
import { estimateTokens } from './token-counter';

export interface OptimizationResult {
  /** The optimized prompt (or original if optimization failed/skipped) */
  optimizedPrompt: string;

  /** Metrics for the original prompt */
  originalMetrics: CostAwareMetrics;

  /** Metrics for the optimized prompt */
  optimizedMetrics: CostAwareMetrics;

  /** Whether compression was actually applied */
  compressionApplied: boolean;

  /** Number of tokens saved */
  tokensSaved: number;

  /** Percentage of tokens saved */
  percentageSaved: number;

  /** Reason if compression was not applied */
  reason?: string;

  /** Techniques that were applied */
  techniquesApplied: string[];
}

export class CostAwareOptimizer {
  private metricsCalculator: MetricsCalculator;
  private compressionCache: LRUCache<string, string>;

  // Verbose phrase simplifications
  private readonly verboseSimplifications: [RegExp, string][] = [
    [/in order to/gi, 'to'],
    [/at the present time/gi, 'now'],
    [/in the event that/gi, 'if'],
    [/due to the fact that/gi, 'because'],
    [/in spite of the fact that/gi, 'although'],
    [/it is important to note that/gi, 'note:'],
    [/please keep in mind that/gi, 'note:'],
    [/for the purpose of/gi, 'to'],
    [/in the process of/gi, 'while'],
    [/at this point in time/gi, 'now'],
    [/in the near future/gi, 'soon'],
    [/a large number of/gi, 'many'],
    [/a small number of/gi, 'few'],
    [/in light of the fact that/gi, 'since'],
    [/with regard to/gi, 'about'],
    [/with respect to/gi, 'regarding'],
    [/in accordance with/gi, 'per'],
    [/for the reason that/gi, 'because'],
    [/on the basis of/gi, 'based on'],
    [/in the case of/gi, 'for'],
    [/make sure to/gi, 'ensure'],
    [/be sure to/gi, 'ensure'],
    [/it should be noted that/gi, ''],
    [/it is worth mentioning that/gi, ''],
    [/needless to say/gi, ''],
  ];

  // Redundant phrase patterns
  private readonly redundantPatterns: RegExp[] = [
    /\s+/g,                           // Multiple spaces
    /\.{2,}/g,                        // Multiple periods
    /,\s*,/g,                         // Double commas
    /\n{3,}/g,                        // Excessive newlines
    /\s+\./g,                         // Space before period
    /\s+,/g,                          // Space before comma
  ];

  constructor() {
    this.metricsCalculator = new MetricsCalculator();
    this.compressionCache = new LRUCache<string, string>({
      max: 500,
      ttl: 1000 * 60 * 15 // 15 minute TTL
    });
  }

  /**
   * Optimize a prompt for cost while maintaining quality
   *
   * @param enhancedPrompt - The prompt to optimize
   * @param config - Cost optimization configuration
   * @returns Optimization result with metrics
   */
  async optimize(
    enhancedPrompt: string,
    config: CostOptimizationConfig = DEFAULT_COST_CONFIG
  ): Promise<OptimizationResult> {
    const originalMetrics = this.metricsCalculator.calculateCostAwareMetrics(
      enhancedPrompt,
      config.lambda
    );

    // If lambda is 0 or post-processing disabled, skip optimization
    if (config.lambda === 0 || !config.enablePostProcessing) {
      return {
        optimizedPrompt: enhancedPrompt,
        originalMetrics,
        optimizedMetrics: originalMetrics,
        compressionApplied: false,
        tokensSaved: 0,
        percentageSaved: 0,
        reason: config.lambda === 0
          ? 'Lambda is 0 (max quality mode)'
          : 'Post-processing disabled',
        techniquesApplied: []
      };
    }

    // Check cache
    const cacheKey = this.getCacheKey(enhancedPrompt, config.lambda);
    const cached = this.compressionCache.get(cacheKey);
    if (cached) {
      const cachedMetrics = this.metricsCalculator.calculateCostAwareMetrics(cached, config.lambda);
      return {
        optimizedPrompt: cached,
        originalMetrics,
        optimizedMetrics: cachedMetrics,
        compressionApplied: true,
        tokensSaved: originalMetrics.tokenCount - cachedMetrics.tokenCount,
        percentageSaved: this.calculatePercentage(originalMetrics.tokenCount, cachedMetrics.tokenCount),
        techniquesApplied: ['cached']
      };
    }

    // Apply compression techniques based on lambda intensity
    const techniquesApplied: string[] = [];
    let optimized = enhancedPrompt;

    // Technique 1: Always apply - Remove redundancy
    optimized = this.removeRedundancy(optimized);
    techniquesApplied.push('redundancy_removal');

    // Technique 2: Lambda >= 0.005 - Compress verbose phrases
    if (config.lambda >= 0.005) {
      optimized = this.compressVerbose(optimized);
      techniquesApplied.push('verbose_compression');
    }

    // Technique 3: Lambda >= 0.010 - Consolidate structures
    if (config.lambda >= 0.010) {
      optimized = this.consolidateStructures(optimized);
      techniquesApplied.push('structure_consolidation');
    }

    // Technique 4: Lambda >= 0.015 - Aggressive compression
    if (config.lambda >= 0.015) {
      optimized = this.aggressiveCompression(optimized);
      techniquesApplied.push('aggressive_compression');
    }

    // Calculate optimized metrics
    const optimizedMetrics = this.metricsCalculator.calculateCostAwareMetrics(
      optimized,
      config.lambda
    );

    // Verify quality threshold maintained
    if (optimizedMetrics.overall < config.minQualityThreshold) {
      return {
        optimizedPrompt: enhancedPrompt,
        originalMetrics,
        optimizedMetrics: originalMetrics,
        compressionApplied: false,
        tokensSaved: 0,
        percentageSaved: 0,
        reason: `Quality dropped below threshold (${config.minQualityThreshold})`,
        techniquesApplied
      };
    }

    // Check compression ratio limit
    const compressionRatio = (originalMetrics.tokenCount - optimizedMetrics.tokenCount) / originalMetrics.tokenCount;
    if (compressionRatio > config.maxCompressionRatio) {
      // Apply less aggressive compression
      optimized = this.removeRedundancy(enhancedPrompt);
      optimized = this.compressVerbose(optimized);

      const lessAggressiveMetrics = this.metricsCalculator.calculateCostAwareMetrics(optimized, config.lambda);

      if (lessAggressiveMetrics.overall >= config.minQualityThreshold) {
        this.compressionCache.set(cacheKey, optimized);
        return {
          optimizedPrompt: optimized,
          originalMetrics,
          optimizedMetrics: lessAggressiveMetrics,
          compressionApplied: true,
          tokensSaved: originalMetrics.tokenCount - lessAggressiveMetrics.tokenCount,
          percentageSaved: this.calculatePercentage(originalMetrics.tokenCount, lessAggressiveMetrics.tokenCount),
          techniquesApplied: ['redundancy_removal', 'verbose_compression']
        };
      }

      return {
        optimizedPrompt: enhancedPrompt,
        originalMetrics,
        optimizedMetrics: originalMetrics,
        compressionApplied: false,
        tokensSaved: 0,
        percentageSaved: 0,
        reason: `Compression exceeded max ratio (${config.maxCompressionRatio * 100}%)`,
        techniquesApplied
      };
    }

    // Cache and return successful optimization
    this.compressionCache.set(cacheKey, optimized);

    return {
      optimizedPrompt: optimized,
      originalMetrics,
      optimizedMetrics,
      compressionApplied: true,
      tokensSaved: originalMetrics.tokenCount - optimizedMetrics.tokenCount,
      percentageSaved: this.calculatePercentage(originalMetrics.tokenCount, optimizedMetrics.tokenCount),
      techniquesApplied
    };
  }

  /**
   * Remove redundant whitespace and punctuation
   */
  private removeRedundancy(text: string): string {
    let result = text;

    // Apply redundant patterns
    result = result.replace(/\s+/g, ' '); // Multiple spaces to single
    result = result.replace(/\.{2,}/g, '.'); // Multiple periods
    result = result.replace(/,\s*,/g, ','); // Double commas
    result = result.replace(/\n{3,}/g, '\n\n'); // Max 2 newlines
    result = result.replace(/\s+\./g, '.'); // Space before period
    result = result.replace(/\s+,/g, ','); // Space before comma

    return result.trim();
  }

  /**
   * Compress verbose constructions
   */
  private compressVerbose(text: string): string {
    let result = text;

    for (const [pattern, replacement] of this.verboseSimplifications) {
      result = result.replace(pattern, replacement);
    }

    // Clean up any double spaces created by replacements
    result = result.replace(/\s+/g, ' ').trim();

    return result;
  }

  /**
   * Consolidate repetitive structures
   */
  private consolidateStructures(text: string): string {
    let result = text;

    // Consolidate repeated list markers
    result = result.replace(/(\n[-•*]\s+.*?)(\n[-•*]\s+){5,}/g, (match) => {
      const items = match.split(/\n[-•*]\s+/).filter(s => s.trim());
      if (items.length > 5) {
        return items.slice(0, 4).map(i => `\n• ${i.trim()}`).join('') + '\n• ...and more';
      }
      return match;
    });

    // Consolidate repeated numbered items
    result = result.replace(/(\n\d+\.\s+.*?)(\n\d+\.\s+){5,}/g, (match) => {
      const items = match.split(/\n\d+\.\s+/).filter(s => s.trim());
      if (items.length > 5) {
        return items.slice(0, 4).map((i, idx) => `\n${idx + 1}. ${i.trim()}`).join('') + '\n5. ...and more';
      }
      return match;
    });

    return result;
  }

  /**
   * Aggressive compression for high lambda values
   */
  private aggressiveCompression(text: string): string {
    let result = text;

    // Remove parenthetical clarifications
    result = result.replace(/\s*\([^)]+\)\s*/g, ' ');

    // Shorten "such as X, Y, and Z" lists
    result = result.replace(/such as [^.]+/gi, (match) => {
      const items = match.split(/,\s*and\s*|,\s*/);
      if (items.length > 3) {
        return items.slice(0, 2).join(', ') + ', etc.';
      }
      return match;
    });

    // Remove "please" and other politeness markers
    result = result.replace(/\bplease\b\s*/gi, '');

    // Shorten common phrases
    result = result.replace(/in addition to that/gi, 'also');
    result = result.replace(/on the other hand/gi, 'however');
    result = result.replace(/as a result of this/gi, 'thus');
    result = result.replace(/at the same time/gi, 'also');

    // Remove filler phrases
    result = result.replace(/basically,?\s*/gi, '');
    result = result.replace(/essentially,?\s*/gi, '');
    result = result.replace(/actually,?\s*/gi, '');
    result = result.replace(/obviously,?\s*/gi, '');

    // Clean up
    result = result.replace(/\s+/g, ' ').trim();

    return result;
  }

  /**
   * Calculate percentage saved
   */
  private calculatePercentage(original: number, optimized: number): number {
    if (original === 0) return 0;
    return Math.round(((original - optimized) / original) * 1000) / 10;
  }

  /**
   * Generate cache key
   */
  private getCacheKey(text: string, lambda: number): string {
    const len = text.length;
    const sample = text.substring(0, 30) + text.substring(Math.max(0, len - 30));
    return `${lambda}:${len}:${sample}`;
  }

  /**
   * Clear the compression cache
   */
  clearCache(): void {
    this.compressionCache.clear();
  }
}

// Convenience function for direct usage
export async function optimizePrompt(
  prompt: string,
  config: CostOptimizationConfig = DEFAULT_COST_CONFIG
): Promise<OptimizationResult> {
  const optimizer = new CostAwareOptimizer();
  return optimizer.optimize(prompt, config);
}
