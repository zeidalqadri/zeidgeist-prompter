/**
 * Token Counter Utility
 *
 * Provides accurate token estimation for cost-aware optimization.
 * Uses GPT-style tokenization heuristics with LRU caching for performance.
 */

import { LRUCache } from 'lru-cache';

export interface TokenEstimate {
  tokens: number;
  characters: number;
  words: number;
  estimatedCost: {
    inputCost: number;  // USD estimate for input tokens
    description: string;
  };
}

/**
 * Singleton token counter with LRU cache
 */
export class TokenCounter {
  private static instance: TokenCounter;
  private cache: LRUCache<string, number>;

  // Average cost per 1K tokens across common providers (rough estimate)
  private static readonly AVG_COST_PER_1K_TOKENS = 0.002; // $0.002 per 1K tokens

  private constructor() {
    this.cache = new LRUCache<string, number>({
      max: 2000,
      ttl: 1000 * 60 * 30 // 30 minute TTL
    });
  }

  static getInstance(): TokenCounter {
    if (!TokenCounter.instance) {
      TokenCounter.instance = new TokenCounter();
    }
    return TokenCounter.instance;
  }

  /**
   * Estimate token count for text
   *
   * Uses GPT-4 style estimation:
   * - ~4 characters per token on average
   * - Adjusted for common patterns (punctuation, numbers)
   */
  estimateTokens(text: string): number {
    if (!text || text.trim().length === 0) {
      return 0;
    }

    // Check cache first
    const cacheKey = this.getCacheKey(text);
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // Calculate token estimate
    const tokens = this.calculateTokens(text);
    this.cache.set(cacheKey, tokens);

    return tokens;
  }

  /**
   * Get detailed token estimate with cost information
   */
  getDetailedEstimate(text: string): TokenEstimate {
    const tokens = this.estimateTokens(text);
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const characters = text.length;
    const inputCost = (tokens / 1000) * TokenCounter.AVG_COST_PER_1K_TOKENS;

    return {
      tokens,
      characters,
      words,
      estimatedCost: {
        inputCost,
        description: `~$${inputCost.toFixed(6)} (${tokens} tokens @ $${TokenCounter.AVG_COST_PER_1K_TOKENS}/1K)`
      }
    };
  }

  /**
   * Calculate tokens saved between original and optimized text
   */
  calculateSavings(original: string, optimized: string): {
    originalTokens: number;
    optimizedTokens: number;
    tokensSaved: number;
    percentageSaved: number;
    costSaved: number;
  } {
    const originalTokens = this.estimateTokens(original);
    const optimizedTokens = this.estimateTokens(optimized);
    const tokensSaved = originalTokens - optimizedTokens;
    const percentageSaved = originalTokens > 0
      ? (tokensSaved / originalTokens) * 100
      : 0;
    const costSaved = (tokensSaved / 1000) * TokenCounter.AVG_COST_PER_1K_TOKENS;

    return {
      originalTokens,
      optimizedTokens,
      tokensSaved,
      percentageSaved: Math.round(percentageSaved * 10) / 10,
      costSaved
    };
  }

  /**
   * Core token calculation logic
   *
   * Based on GPT tokenization patterns:
   * - Words are typically 0.75 tokens on average
   * - Punctuation adds ~0.25 tokens each
   * - Numbers are treated as ~0.5 tokens per sequence
   * - Special characters and whitespace have their own patterns
   */
  private calculateTokens(text: string): number {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    // Count punctuation marks
    const punctuation = (text.match(/[.!?,;:'"()\[\]{}<>@#$%^&*\-_+=|\\\/]/g) || []).length;

    // Count number sequences
    const numbers = (text.match(/\d+/g) || []).length;

    // Count special patterns that tend to be their own tokens
    const specialPatterns = (text.match(/\n|\t|  +/g) || []).length;

    // Calculate token estimate
    // Base: words * 0.75 (average word is less than 1 token)
    // Add punctuation * 0.25 (most punctuation is part of previous token)
    // Add numbers * 0.5 (numbers are roughly half a token each)
    // Add special patterns * 0.5
    let tokens = Math.ceil(
      wordCount * 0.75 +
      punctuation * 0.25 +
      numbers * 0.5 +
      specialPatterns * 0.5
    );

    // Minimum 1 token for non-empty text
    return Math.max(tokens, 1);
  }

  /**
   * Generate cache key for text
   * Uses length and hash-like substring for efficiency
   */
  private getCacheKey(text: string): string {
    const len = text.length;
    const sample = text.substring(0, 50) + text.substring(Math.max(0, len - 50));
    return `${len}:${sample}`;
  }

  /**
   * Clear the token cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: 2000
    };
  }
}

// Convenience function for direct usage
export function estimateTokens(text: string): number {
  return TokenCounter.getInstance().estimateTokens(text);
}

export function getDetailedTokenEstimate(text: string): TokenEstimate {
  return TokenCounter.getInstance().getDetailedEstimate(text);
}

export function calculateTokenSavings(original: string, optimized: string) {
  return TokenCounter.getInstance().calculateSavings(original, optimized);
}
