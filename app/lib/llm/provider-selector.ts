/**
 * Provider Selector
 *
 * Dynamically orders LLM providers based on prompt analysis.
 * Complex prompts get routed to capable providers (Claude),
 * while simple prompts prefer fast/cheap providers (Mistral).
 */

import { ProviderSource, EnhancementRequest } from './types';
import {
  analyzePromptWithStrategy,
  PromptAnalysisWithStrategy,
  PromptComplexity
} from './prompt-analyzer';
import { PROVIDER_CAPABILITIES, getEnabledProviders } from './llm-config';
import { ReasoningStrategy } from './reasoning-strategy';

/**
 * Provider ranking with score and reasons
 */
export interface ProviderRanking {
  provider: ProviderSource;
  score: number;
  reasons: string[];
}

/**
 * Result of provider selection
 */
export interface SelectionResult {
  /** Providers ordered by score (highest first) */
  orderedProviders: ProviderSource[];
  /** Detailed rankings with scores */
  rankings: ProviderRanking[];
  /** Prompt analysis used for selection */
  analysis: PromptAnalysisWithStrategy;
}

/**
 * Score a single provider based on prompt analysis
 */
function scoreProvider(
  provider: ProviderSource,
  analysis: PromptAnalysisWithStrategy
): ProviderRanking {
  const capabilities = PROVIDER_CAPABILITIES[provider];
  if (!capabilities) {
    return { provider, score: 0, reasons: ['Unknown provider'] };
  }

  let score = 0;
  const reasons: string[] = [];

  // 1. Task type match (0-30 points)
  const taskScore = capabilities.taskScores[analysis.taskType || 'general'] ||
                    capabilities.taskScores.general ||
                    15;
  score += taskScore;
  reasons.push(`Task ${analysis.taskType}: +${taskScore}`);

  // 2. Complexity match (0-30 points)
  const complexityScore = getComplexityScore(capabilities.complexReasoning, analysis.complexity);
  score += complexityScore;
  reasons.push(`Complexity ${analysis.complexity}: +${complexityScore}`);

  // 3. Strategy match (0-20 points)
  const strategyScore = getStrategyScore(capabilities.complexReasoning, analysis.strategy);
  score += strategyScore;
  reasons.push(`Strategy ${analysis.strategy}: +${strategyScore}`);

  // 4. Speed bonus for simple tasks (0-10 points)
  if (analysis.complexity === 'simple') {
    const speedBonus = Math.round(capabilities.speed * 10);
    score += speedBonus;
    reasons.push(`Speed bonus: +${speedBonus}`);
  }

  return { provider, score, reasons };
}

/**
 * Calculate complexity score based on provider capability and prompt complexity
 */
function getComplexityScore(
  reasoningCapability: number,
  complexity: PromptComplexity
): number {
  if (complexity === 'complex') {
    // Complex tasks heavily reward high reasoning capability
    return Math.round(reasoningCapability * 30);
  } else if (complexity === 'moderate') {
    // Moderate tasks moderately reward reasoning capability
    return Math.round(reasoningCapability * 15);
  } else {
    // Simple tasks: all providers roughly equal, slight preference for fast ones
    return 10;
  }
}

/**
 * Calculate strategy score based on reasoning strategy requirements
 */
function getStrategyScore(
  reasoningCapability: number,
  strategy: ReasoningStrategy
): number {
  // CoT, PoT, and ReAct strategies benefit from higher reasoning capability
  if (strategy === 'cot' || strategy === 'pot' || strategy === 'react') {
    return Math.round(reasoningCapability * 20);
  }
  // Predict strategy doesn't need strong reasoning
  return 10;
}

/**
 * Select optimal provider order based on prompt analysis
 *
 * For complex prompts: Claude → DeepSeek → Mistral → local
 * For simple prompts: Mistral → DeepSeek → Claude → local
 *
 * @param request - Enhancement request with prompt and context
 * @returns Ordered list of providers and analysis details
 */
export function selectProviderOrder(request: EnhancementRequest): SelectionResult {
  // Analyze the prompt
  const analysis = analyzePromptWithStrategy(request.prompt, request.context);

  // Get enabled providers
  const enabledProviders = getEnabledProviders();

  // Score each provider
  const rankings: ProviderRanking[] = enabledProviders.map(provider => {
    return scoreProvider(provider, analysis);
  });

  // Sort by score descending
  rankings.sort((a, b) => b.score - a.score);

  console.log('[Provider Selector] Rankings:', {
    complexity: analysis.complexity,
    taskType: analysis.taskType,
    strategy: analysis.strategy,
    order: rankings.map(r => `${r.provider}(${r.score})`).join(' → ')
  });

  return {
    orderedProviders: rankings.map(r => r.provider),
    rankings,
    analysis
  };
}

/**
 * Quick check if prompt is complex enough to warrant Claude
 */
export function shouldUsePremiumProvider(request: EnhancementRequest): boolean {
  const analysis = analyzePromptWithStrategy(request.prompt, request.context);
  return analysis.complexity === 'complex' ||
         analysis.strategy === 'cot' ||
         analysis.strategy === 'pot' ||
         analysis.strategy === 'react';
}
