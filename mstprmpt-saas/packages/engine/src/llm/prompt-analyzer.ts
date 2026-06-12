/**
 * Prompt Analyzer
 *
 * Analyzes prompt complexity, patterns, and characteristics to enable
 * intelligent model selection across all LLM providers.
 *
 * Extended with reasoning strategy detection (Phase 2: Automatic Module Selection)
 *
 * Ported from legacy system and enhanced for multi-provider support.
 */

import { ReasoningStrategy, StrategyDetectionResult } from './reasoning-strategy';
import { detectStrategy, StrategyDetector } from './strategy-detector';

export type PromptComplexity = 'simple' | 'moderate' | 'complex';

export interface PromptAnalysis {
  complexity: PromptComplexity;
  totalLength: number;
  hasComplexPatterns: boolean;
  estimatedTokens: number;
  taskType?: string;
}

/**
 * Extended analysis including reasoning strategy
 */
export interface PromptAnalysisWithStrategy extends PromptAnalysis {
  /** Detected reasoning strategy */
  strategy: ReasoningStrategy;

  /** Strategy detection confidence */
  strategyConfidence: number;

  /** Full strategy detection result */
  strategyDetection: StrategyDetectionResult;
}

/**
 * Analyze prompt complexity and characteristics
 */
export function analyzePrompt(prompt: string, context?: string): PromptAnalysis {
  const totalLength = prompt.length + (context?.length || 0);
  const complexity = assessPromptComplexity(prompt);
  const hasComplexPatterns = checkComplexPatterns(prompt);
  const estimatedTokens = estimateTokenCount(totalLength);

  return {
    complexity,
    totalLength,
    hasComplexPatterns,
    estimatedTokens,
    taskType: detectTaskType(prompt)
  };
}

/**
 * Assess prompt complexity for model selection
 * Ported from legacy /functions/_shared/llm-enhancer.ts lines 723-735
 */
export function assessPromptComplexity(prompt: string): PromptComplexity {
  // Simple: basic transformations, short prompts
  if (prompt.length < 100 && !checkComplexPatterns(prompt)) {
    return 'simple';
  }

  // Complex: technical content, multiple requirements, long prompts
  if (prompt.length > 500 || checkComplexPatterns(prompt)) {
    return 'complex';
  }

  return 'moderate';
}

/**
 * Check for complex patterns requiring advanced processing
 * Ported from legacy /functions/_shared/llm-enhancer.ts lines 738-748
 */
export function checkComplexPatterns(prompt: string): boolean {
  const complexPatterns = [
    /\b(analysis|evaluation|comparison|synthesis)\b/i,
    /\b(step-by-step|methodology|framework|strategy)\b/i,
    /\b(requirements|specifications|criteria|constraints)\b/i,
    /\b(technical|professional|academic|scientific)\b/i,
    /[0-9]+\s*(steps|phases|sections|parts)/i,
    /\b(comprehensive|detailed|thorough|in-depth)\b/i,
    /\b(multi-step|multi-phase|multiple aspects)\b/i
  ];

  return complexPatterns.some(pattern => pattern.test(prompt));
}

/**
 * Detect task type for specialized optimization
 */
export function detectTaskType(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();

  // Classification tasks
  if (hasPatterns(lowerPrompt, ['classify', 'categorize', 'label', 'tag', 'type of', 'which category'])) {
    return 'classification';
  }

  // Summarization tasks
  if (hasPatterns(lowerPrompt, ['summarize', 'summary', 'brief', 'overview', 'key points', 'tldr'])) {
    return 'summarization';
  }

  // Evaluation tasks
  if (hasPatterns(lowerPrompt, ['evaluate', 'assess', 'review', 'rate', 'score', 'judge'])) {
    return 'evaluation';
  }

  // Analysis tasks
  if (hasPatterns(lowerPrompt, ['analyze', 'analysis', 'examine', 'investigate', 'research', 'study'])) {
    return 'analysis';
  }

  // Creative tasks
  if (hasPatterns(lowerPrompt, ['create', 'design', 'write', 'compose', 'generate', 'brainstorm'])) {
    return 'creative';
  }

  // Code/Technical tasks
  if (hasPatterns(lowerPrompt, ['code', 'function', 'algorithm', 'implement', 'debug', 'optimize'])) {
    return 'technical';
  }

  return 'general';
}

/**
 * Check for specific patterns in text
 */
function hasPatterns(text: string, patterns: string[]): boolean {
  return patterns.some(pattern => text.includes(pattern));
}

/**
 * Estimate token count (rough approximation)
 * Average: 1 token ≈ 4 characters for English text
 */
export function estimateTokenCount(length: number): number {
  return Math.ceil(length / 4);
}

/**
 * Select model tier based on complexity and length
 */
export function selectModelTier(
  complexity: PromptComplexity,
  totalLength: number,
  lengthThresholds = { simple: 500, moderate: 2000 }
): 'small' | 'medium' | 'large' {
  // Use small models for simple, short prompts
  if (complexity === 'simple' && totalLength < lengthThresholds.simple) {
    return 'small';
  }

  // Use medium models for moderate complexity
  if (complexity === 'moderate' && totalLength < lengthThresholds.moderate) {
    return 'medium';
  }

  // Use large models for complex tasks or long content
  return 'large';
}

// ============================================
// STRATEGY-AWARE ANALYSIS (Phase 2)
// ============================================

/**
 * Analyze prompt with reasoning strategy detection
 *
 * Extends basic analysis with automatic module selection
 */
export function analyzePromptWithStrategy(
  prompt: string,
  context?: string
): PromptAnalysisWithStrategy {
  // Get base analysis
  const baseAnalysis = analyzePrompt(prompt, context);

  // Detect reasoning strategy
  const strategyDetection = detectStrategy(prompt, context);

  return {
    ...baseAnalysis,
    strategy: strategyDetection.strategy,
    strategyConfidence: strategyDetection.confidence,
    strategyDetection
  };
}

/**
 * Get recommended strategy based on task type and complexity
 *
 * Maps task types to appropriate reasoning strategies
 */
export function getRecommendedStrategy(
  taskType: string,
  complexity: PromptComplexity
): ReasoningStrategy {
  // Task type to strategy mapping
  const taskStrategyMap: Record<string, ReasoningStrategy> = {
    // PoT strategies
    'technical': complexity === 'complex' ? 'pot' : 'cot',
    'calculation': 'pot',

    // CoT strategies
    'analysis': 'cot',
    'evaluation': 'cot',
    'comparison': 'cot',

    // ReAct strategies
    'research': 'react',
    'verification': 'react',

    // Default to predict or CoT based on complexity
    'classification': 'predict',
    'summarization': complexity === 'simple' ? 'predict' : 'cot',
    'creative': complexity === 'complex' ? 'cot' : 'predict',
    'general': complexity === 'complex' ? 'cot' : 'predict'
  };

  return taskStrategyMap[taskType] || (complexity === 'simple' ? 'predict' : 'cot');
}

/**
 * Select model tier considering both complexity and strategy
 *
 * Some strategies benefit from larger models
 */
export function selectModelTierWithStrategy(
  complexity: PromptComplexity,
  totalLength: number,
  strategy: ReasoningStrategy,
  lengthThresholds = { simple: 500, moderate: 2000 }
): 'small' | 'medium' | 'large' {
  // Get base tier
  let tier = selectModelTier(complexity, totalLength, lengthThresholds);

  // Upgrade tier for complex reasoning strategies
  if (strategy === 'pot' || strategy === 'react') {
    // These strategies benefit from larger models
    if (tier === 'small') tier = 'medium';
  }

  if (strategy === 'cot' && complexity === 'complex') {
    // Complex CoT needs larger models
    tier = 'large';
  }

  return tier;
}

/**
 * Quick strategy detection for simple use cases
 */
export function quickDetectStrategy(prompt: string): ReasoningStrategy {
  return detectStrategy(prompt).strategy;
}

/**
 * Check if a prompt would benefit from explicit reasoning steps
 */
export function shouldShowReasoningSteps(
  strategy: ReasoningStrategy,
  confidence: number
): boolean {
  // Predict strategy never shows steps
  if (strategy === 'predict') return false;

  // Other strategies show steps if confidence is high enough
  return confidence >= 0.5;
}

// ============================================
// DYNAMIC MAX TOKENS CALCULATION
// ============================================

/**
 * Configuration for dynamic max tokens calculation
 */
export interface MaxTokensConfig {
  /** Calculated max tokens for API request */
  maxTokens: number;
  /** Ratio used for calculation */
  outputRatio: number;
  /** Estimated input tokens */
  inputTokens: number;
}

/**
 * Calculate dynamic max_tokens based on prompt analysis
 *
 * Formula: maxTokens = clamp(inputTokens * outputRatio, minTokens, maxTokens)
 * - Simple prompts: 1.5x ratio
 * - Moderate prompts: 2.0x ratio
 * - Complex prompts: 2.5x ratio
 *
 * @param analysis - Prompt analysis result
 * @param options - Optional overrides for min/max/base ratio
 */
export function calculateDynamicMaxTokens(
  analysis: PromptAnalysis,
  options?: {
    minTokens?: number;
    maxTokens?: number;
    baseRatio?: number;
  }
): MaxTokensConfig {
  const {
    minTokens = 512,
    maxTokens = 4096,
    baseRatio = 1.5
  } = options || {};

  // Calculate output ratio based on complexity
  let outputRatio = baseRatio;

  if (analysis.complexity === 'complex') {
    outputRatio = 2.5;
  } else if (analysis.complexity === 'moderate') {
    outputRatio = 2.0;
  }

  // Task type adjustments - technical/analysis tasks need more output
  if (analysis.taskType === 'technical' || analysis.taskType === 'analysis') {
    outputRatio = Math.max(outputRatio, 2.2);
  } else if (analysis.taskType === 'creative') {
    outputRatio = Math.max(outputRatio, 2.0);
  }

  // Complex patterns need more output
  if (analysis.hasComplexPatterns) {
    outputRatio *= 1.2;
  }

  // Calculate target tokens
  const inputTokens = analysis.estimatedTokens;
  let targetTokens = Math.ceil(inputTokens * outputRatio);

  // Apply bounds
  targetTokens = Math.max(minTokens, targetTokens);
  targetTokens = Math.min(maxTokens, targetTokens);

  return {
    maxTokens: targetTokens,
    outputRatio,
    inputTokens
  };
}
