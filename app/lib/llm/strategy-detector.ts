/**
 * Strategy Detector
 *
 * Detects the optimal reasoning strategy for a given prompt
 * using pattern matching and heuristics.
 *
 * Part of Phase 2: Automatic Module Selection
 */

import {
  ReasoningStrategy,
  StrategyDetectionResult,
  STRATEGY_DETECTION_PATTERNS,
  STRATEGY_DESCRIPTIONS,
  DetectionPatterns
} from './reasoning-strategy';

/**
 * Configuration for strategy detection
 */
export interface DetectionConfig {
  /** Minimum confidence threshold to return a detected strategy */
  minConfidence: number;

  /** Default strategy when no pattern matches */
  defaultStrategy: ReasoningStrategy;

  /** Weight for keyword matches (0.0 to 1.0) */
  keywordWeight: number;

  /** Weight for regex pattern matches (0.0 to 1.0) */
  regexWeight: number;

  /** Weight for structural pattern matches (0.0 to 1.0) */
  structuralWeight: number;

  /** Enable detailed logging */
  debug: boolean;
}

/**
 * Default detection configuration
 */
export const DEFAULT_DETECTION_CONFIG: DetectionConfig = {
  minConfidence: 0.3,
  defaultStrategy: 'predict',
  keywordWeight: 0.4,
  regexWeight: 0.35,
  structuralWeight: 0.25,
  debug: false
};

/**
 * Internal scoring result for a strategy
 */
interface StrategyScore {
  strategy: ReasoningStrategy;
  keywordScore: number;
  regexScore: number;
  structuralScore: number;
  negativeScore: number;
  totalScore: number;
  matchedPatterns: string[];
}

/**
 * Strategy Detector class
 *
 * Analyzes prompts and detects the optimal reasoning strategy
 */
export class StrategyDetector {
  private config: DetectionConfig;

  constructor(config: Partial<DetectionConfig> = {}) {
    this.config = { ...DEFAULT_DETECTION_CONFIG, ...config };
  }

  /**
   * Detect the optimal reasoning strategy for a prompt
   *
   * @param prompt - The input prompt to analyze
   * @param context - Optional context for additional analysis
   * @returns Detection result with strategy and confidence
   */
  detect(prompt: string, context?: string): StrategyDetectionResult {
    const fullText = context ? `${prompt} ${context}` : prompt;
    const normalizedText = fullText.toLowerCase().trim();

    // Score each strategy
    const scores: StrategyScore[] = [];

    for (const strategy of ['predict', 'cot', 'pot', 'react'] as ReasoningStrategy[]) {
      const patterns = STRATEGY_DETECTION_PATTERNS[strategy];
      const score = this.scoreStrategy(normalizedText, fullText, patterns, strategy);
      scores.push(score);
    }

    // Sort by total score descending
    scores.sort((a, b) => b.totalScore - a.totalScore);

    const topScore = scores[0];
    const alternatives = scores.slice(1).map(s => ({
      strategy: s.strategy,
      confidence: this.normalizeScore(s.totalScore)
    }));

    // Apply minimum confidence threshold
    const confidence = this.normalizeScore(topScore.totalScore);
    const finalStrategy = confidence >= this.config.minConfidence
      ? topScore.strategy
      : this.config.defaultStrategy;

    const result: StrategyDetectionResult = {
      strategy: finalStrategy,
      confidence,
      matchedPatterns: topScore.matchedPatterns,
      rationale: this.generateRationale(topScore, confidence),
      alternatives
    };

    if (this.config.debug) {
      console.log('[StrategyDetector] Detection result:', {
        prompt: prompt.substring(0, 100),
        ...result,
        rawScores: scores.map(s => ({
          strategy: s.strategy,
          total: s.totalScore.toFixed(3),
          keyword: s.keywordScore.toFixed(3),
          regex: s.regexScore.toFixed(3),
          structural: s.structuralScore.toFixed(3)
        }))
      });
    }

    return result;
  }

  /**
   * Score a strategy against the prompt
   */
  private scoreStrategy(
    normalizedText: string,
    originalText: string,
    patterns: DetectionPatterns,
    strategy: ReasoningStrategy
  ): StrategyScore {
    const matchedPatterns: string[] = [];

    // Keyword matching
    let keywordMatches = 0;
    for (const keyword of patterns.keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        keywordMatches++;
        matchedPatterns.push(`keyword:${keyword}`);
      }
    }
    const keywordScore = patterns.keywords.length > 0
      ? (keywordMatches / patterns.keywords.length) * this.config.keywordWeight
      : 0;

    // Regex pattern matching
    let regexMatches = 0;
    for (const pattern of patterns.regexPatterns) {
      if (pattern.test(originalText)) {
        regexMatches++;
        matchedPatterns.push(`regex:${pattern.source.substring(0, 30)}`);
      }
    }
    const regexScore = patterns.regexPatterns.length > 0
      ? (regexMatches / patterns.regexPatterns.length) * this.config.regexWeight
      : 0;

    // Structural pattern matching
    let structuralMatches = 0;
    for (const pattern of patterns.structuralPatterns) {
      if (pattern.test(originalText)) {
        structuralMatches++;
        matchedPatterns.push(`structural:${pattern.name}`);
      }
    }
    const structuralScore = patterns.structuralPatterns.length > 0
      ? (structuralMatches / patterns.structuralPatterns.length) * this.config.structuralWeight
      : 0;

    // Negative pattern penalty
    let negativeMatches = 0;
    for (const pattern of patterns.negativePatterns) {
      if (normalizedText.includes(pattern.toLowerCase())) {
        negativeMatches++;
      }
    }
    const negativeScore = patterns.negativePatterns.length > 0
      ? (negativeMatches / patterns.negativePatterns.length) * 0.3
      : 0;

    const totalScore = Math.max(0, keywordScore + regexScore + structuralScore - negativeScore);

    return {
      strategy,
      keywordScore,
      regexScore,
      structuralScore,
      negativeScore,
      totalScore,
      matchedPatterns
    };
  }

  /**
   * Normalize score to 0-1 range
   */
  private normalizeScore(score: number): number {
    // Max possible score is sum of weights
    const maxScore = this.config.keywordWeight + this.config.regexWeight + this.config.structuralWeight;
    return Math.min(1, score / maxScore);
  }

  /**
   * Generate human-readable rationale for the detection
   */
  private generateRationale(score: StrategyScore, confidence: number): string {
    const description = STRATEGY_DESCRIPTIONS[score.strategy];
    const patternCount = score.matchedPatterns.length;

    if (confidence < this.config.minConfidence) {
      return `Low confidence detection (${(confidence * 100).toFixed(0)}%). Using default strategy: ${this.config.defaultStrategy}`;
    }

    if (patternCount === 0) {
      return `No specific patterns matched. Using ${description.name} as default.`;
    }

    const topPatterns = score.matchedPatterns.slice(0, 3).map(p => {
      const [type, value] = p.split(':');
      return value || type;
    });

    return `Detected ${description.name} (${(confidence * 100).toFixed(0)}% confidence) based on: ${topPatterns.join(', ')}`;
  }

  /**
   * Quick detection for simple use cases
   */
  quickDetect(prompt: string): ReasoningStrategy {
    return this.detect(prompt).strategy;
  }

  /**
   * Batch detection for multiple prompts
   */
  batchDetect(prompts: string[]): StrategyDetectionResult[] {
    return prompts.map(prompt => this.detect(prompt));
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<DetectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): DetectionConfig {
    return { ...this.config };
  }
}

/**
 * Singleton instance for simple usage
 */
let defaultDetector: StrategyDetector | null = null;

/**
 * Get or create the default detector instance
 */
export function getStrategyDetector(config?: Partial<DetectionConfig>): StrategyDetector {
  if (!defaultDetector || config) {
    defaultDetector = new StrategyDetector(config);
  }
  return defaultDetector;
}

/**
 * Quick detection helper function
 */
export function detectStrategy(prompt: string, context?: string): StrategyDetectionResult {
  return getStrategyDetector().detect(prompt, context);
}

/**
 * Quick strategy selection helper
 */
export function selectStrategy(prompt: string): ReasoningStrategy {
  return getStrategyDetector().quickDetect(prompt);
}
