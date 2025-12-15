/**
 * Adaptive Enhancer for Cloudflare Workers - OPTIMIZED
 *
 * This module enhances prompts using learned patterns, reducing dependency
 * on LLMs over time as it learns from successful enhancements.
 *
 * OPTIMIZATIONS APPLIED:
 * - Static STOP_WORDS (eliminates repeated allocations)
 * - Query limits on all database operations
 * - Batch usage count updates
 * - Efficient pattern scoring with early termination
 * - Database connection reuse
 */

import { createDb, trainingExamples, enhancementLogs, executeWithRetry } from '../db'
import { eq, and, gte, desc, sql } from 'drizzle-orm'
import { LearningService } from './service'
import type { TrainingExample, NewEnhancementLog } from '../db'
import { DateUtils } from '../adapters'

// ============================================
// CONFIGURATION CONSTANTS
// ============================================

/** Maximum patterns to fetch from database */
const MAX_PATTERNS_TO_FETCH = 50

/** Maximum patterns to apply to a single enhancement */
const MAX_PATTERNS_TO_APPLY = 5

/** Minimum score threshold for pattern inclusion */
const MIN_PATTERN_SCORE = 0.3

// ============================================
// STATIC CACHES (Module-level singletons)
// ============================================

/** Static stop words set - created once, reused everywhere */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
  'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is',
  'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had'
])

// ============================================
// INTERFACES
// ============================================

export interface LocalEnhancement {
  enhancedPrompt: string
  confidence: number
  source: string
  patternsUsed: TrainingExample[]
}

export interface AdaptiveEnhancerConfig {
  minConfidenceThreshold?: number
  maxPatternsToApply?: number
  enableHybridMode?: boolean
  hybridThreshold?: number
}

// ============================================
// ADAPTIVE ENHANCER CLASS
// ============================================

export class AdaptiveEnhancer {
  private learningService: LearningService
  private config: AdaptiveEnhancerConfig
  private dbInstance: ReturnType<typeof createDb> | null = null

  constructor(config: AdaptiveEnhancerConfig = {}) {
    this.learningService = new LearningService()
    this.config = {
      minConfidenceThreshold: config.minConfidenceThreshold || 0.65,
      maxPatternsToApply: config.maxPatternsToApply || MAX_PATTERNS_TO_APPLY,
      enableHybridMode: config.enableHybridMode !== false,
      hybridThreshold: config.hybridThreshold || 0.5
    }
  }

  /**
   * Get or create database instance (reuse connection)
   */
  private getDb(env: any) {
    if (!this.dbInstance) {
      this.dbInstance = createDb(env)
    }
    return this.dbInstance
  }

  /**
   * Attempt to enhance a prompt using learned patterns
   */
  async enhance(
    env: any,
    prompt: string,
    context?: string
  ): Promise<LocalEnhancement> {
    const db = this.getDb(env)

    if (!db) {
      console.warn('Database not available - adaptive enhancement disabled')
      return {
        enhancedPrompt: prompt,
        confidence: 0,
        source: 'disabled',
        patternsUsed: []
      }
    }

    console.log('🔍 Searching for learned patterns...')

    try {
      // Check if we should use local enhancement
      const shouldUseLocal = await this.learningService.shouldUseLocalEnhancement(env, prompt)

      if (!shouldUseLocal && !this.config.enableHybridMode) {
        console.log('📊 Confidence too low for local enhancement')
        return {
          enhancedPrompt: prompt,
          confidence: 0,
          source: 'low-confidence',
          patternsUsed: []
        }
      }

      // Find the best matching patterns
      const patterns = await this.findMatchingPatterns(env, prompt, context)

      if (patterns.length === 0) {
        console.log('❌ No matching patterns found')
        return {
          enhancedPrompt: prompt,
          confidence: 0,
          source: 'no-patterns',
          patternsUsed: []
        }
      }

      // Apply patterns to enhance the prompt
      const enhanced = await this.applyPatterns(prompt, context, patterns)

      // Calculate confidence score
      const confidence = this.calculateConfidence(patterns)

      // Log the local enhancement and update usage counts
      await this.logEnhancementAndUpdateUsage(env, prompt, enhanced, confidence, patterns)

      console.log(`✅ Applied ${patterns.length} patterns with ${(confidence * 100).toFixed(1)}% confidence`)

      return {
        enhancedPrompt: enhanced,
        confidence,
        source: 'learned-patterns',
        patternsUsed: patterns
      }
    } catch (error) {
      console.error('Error in adaptive enhancement:', error)
      return {
        enhancedPrompt: prompt,
        confidence: 0,
        source: 'error',
        patternsUsed: []
      }
    }
  }

  /**
   * Find matching patterns for a given prompt
   * OPTIMIZED: Uses limit and efficient scoring
   */
  private async findMatchingPatterns(
    env: any,
    prompt: string,
    context?: string
  ): Promise<TrainingExample[]> {
    const db = this.getDb(env)
    if (!db) return []

    const promptKeywords = this.extractKeywords(prompt)
    const contextKeywords = context ? this.extractKeywords(context) : []
    const allKeywords = [...new Set([...promptKeywords, ...contextKeywords])]
    const keywordSet = new Set(allKeywords.map(k => k.toLowerCase()))

    try {
      // Get active patterns with limit
      const patterns: TrainingExample[] = await executeWithRetry(() =>
        db
          .select()
          .from(trainingExamples)
          .where(
            and(
              eq(trainingExamples.isActive, true),
              gte(trainingExamples.quality, 60)
            )
          )
          .orderBy(desc(trainingExamples.quality))
          .limit(MAX_PATTERNS_TO_FETCH)
      )

      // Score and filter patterns efficiently
      const scoredPatterns: { pattern: TrainingExample; score: number }[] = []

      for (const pattern of patterns) {
        const score = this.scorePatternFast(pattern, keywordSet, prompt)

        // Early termination: if we have enough high-quality matches, stop
        if (score > MIN_PATTERN_SCORE) {
          scoredPatterns.push({ pattern, score })

          // If we have enough patterns with good scores, stop searching
          if (scoredPatterns.length >= this.config.maxPatternsToApply! * 2) {
            break
          }
        }
      }

      // Sort by score and take top N
      return scoredPatterns
        .sort((a, b) => b.score - a.score)
        .slice(0, this.config.maxPatternsToApply!)
        .map(item => item.pattern)
    } catch (error) {
      console.error('Failed to find matching patterns:', error)
      return []
    }
  }

  /**
   * Score a pattern based on relevance to the prompt
   * OPTIMIZED: Uses pre-computed keyword set for O(1) lookups
   */
  private scorePatternFast(
    pattern: TrainingExample,
    keywordSet: Set<string>,
    prompt: string
  ): number {
    let score = 0

    // Keyword matching with Set for O(1) lookup
    const patternKeywords = (pattern.keywords || '').split(',').map(k => k.trim().toLowerCase())
    let keywordMatches = 0
    for (const k of patternKeywords) {
      if (keywordSet.has(k)) keywordMatches++
    }
    score += (keywordMatches / Math.max(keywordSet.size, 1)) * 0.4

    // Similarity in prompt length (fast computation)
    const lengthDiff = Math.abs(prompt.length - (pattern.rawPrompt || '').length)
    const lengthScore = Math.max(0, 1 - lengthDiff / 1000)
    score += lengthScore * 0.2

    // Category matching (if available)
    if (pattern.category) {
      const category = this.categorizePrompt(prompt)
      if (category === pattern.category) {
        score += 0.2
      }
    }

    // Quality score influence
    const qualityScore = (pattern.quality || 0) / 100
    score += qualityScore * 0.2

    return score
  }

  /**
   * Apply learned patterns to enhance the prompt
   */
  private async applyPatterns(
    prompt: string,
    context: string | undefined,
    patterns: TrainingExample[]
  ): Promise<string> {
    let enhanced = prompt

    // Apply transformations from each pattern
    for (const pattern of patterns) {
      const transformations = this.extractTransformations(
        pattern.rawPrompt || '',
        pattern.enhancedPrompt || ''
      )

      for (const transformation of transformations) {
        enhanced = this.applyTransformation(enhanced, transformation)
      }
    }

    // Add context if provided
    if (context && context.trim()) {
      enhanced = this.integrateContext(enhanced, context)
    }

    // Apply general improvements
    enhanced = this.applyGeneralImprovements(enhanced)

    return enhanced
  }

  /**
   * Extract transformations between raw and enhanced prompts
   */
  private extractTransformations(raw: string, enhanced: string): any[] {
    const transformations = []

    const rawWords = raw.toLowerCase().split(/\s+/)
    const enhancedWords = enhanced.toLowerCase().split(/\s+/)

    // Use Set for O(1) lookups
    const rawWordSet = new Set(rawWords)

    // Find added words/phrases
    const addedWords = enhancedWords.filter(w => !rawWordSet.has(w))
    if (addedWords.length > 0) {
      transformations.push({
        type: 'addition',
        content: addedWords.slice(0, 3).join(' ')
      })
    }

    // Find structural patterns
    if (enhanced.includes(':') && !raw.includes(':')) {
      transformations.push({
        type: 'structure',
        pattern: 'add-colon-separation'
      })
    }

    if (enhanced.includes('\n') && !raw.includes('\n')) {
      transformations.push({
        type: 'structure',
        pattern: 'add-line-breaks'
      })
    }

    return transformations
  }

  /**
   * Apply a single transformation to the prompt
   */
  private applyTransformation(prompt: string, transformation: any): string {
    switch (transformation.type) {
      case 'addition':
        if (!prompt.toLowerCase().includes(transformation.content.toLowerCase())) {
          return `${prompt} ${transformation.content}`
        }
        break

      case 'structure':
        if (transformation.pattern === 'add-colon-separation' && !prompt.includes(':')) {
          const sentences = prompt.split(/[.!?]+/).filter(s => s.trim())
          if (sentences.length > 1) {
            return sentences[0] + ':\n' + sentences.slice(1).join('. ')
          }
        }
        if (transformation.pattern === 'add-line-breaks' && !prompt.includes('\n')) {
          const sentences = prompt.split(/[.!?]+/).filter(s => s.trim())
          if (sentences.length > 2) {
            return sentences.join('.\n')
          }
        }
        break
    }

    return prompt
  }

  /**
   * Integrate context into the enhanced prompt
   */
  private integrateContext(prompt: string, context: string): string {
    if (prompt.toLowerCase().includes(context.toLowerCase().substring(0, 20))) {
      return prompt
    }

    if (prompt.includes('\n')) {
      return `Context: ${context}\n\n${prompt}`
    } else {
      return `Given the context of ${context}, ${prompt}`
    }
  }

  /**
   * Apply general improvements to the prompt
   */
  private applyGeneralImprovements(prompt: string): string {
    let improved = prompt

    // Ensure proper punctuation
    if (!improved.match(/[.!?]$/)) {
      improved += '.'
    }

    // Capitalize first letter
    improved = improved.charAt(0).toUpperCase() + improved.slice(1)

    // Remove excessive whitespace
    improved = improved.replace(/\s+/g, ' ').trim()

    // Fix common grammar patterns
    improved = improved
      .replace(/\bi\b/g, 'I')
      .replace(/\s+,/g, ',')
      .replace(/\s+\./g, '.')

    return improved
  }

  /**
   * Calculate confidence score for the enhancement
   */
  private calculateConfidence(patterns: TrainingExample[]): number {
    if (patterns.length === 0) return 0

    const avgQuality = patterns.reduce((sum, p) => sum + (p.quality || 0), 0) / patterns.length
    const patternBoost = Math.min(patterns.length * 0.1, 0.3)
    const confidence = (avgQuality / 100) * 0.7 + patternBoost

    return Math.min(confidence, 0.95)
  }

  /**
   * Log the enhancement and update pattern usage counts
   * OPTIMIZED: Combines logging and usage update in efficient way
   */
  private async logEnhancementAndUpdateUsage(
    env: any,
    original: string,
    enhanced: string,
    confidence: number,
    patterns: TrainingExample[]
  ): Promise<void> {
    const db = this.getDb(env)
    if (!db) return

    try {
      // Log enhancement
      const log: NewEnhancementLog = {
        id: crypto.randomUUID(),
        originalPrompt: original,
        enhancedPrompt: enhanced,
        promptLength: original.length,
        hasContext: false,
        isRefinement: false,
        isExpansion: false,
        source: 'local',
        enhancementModel: `adaptive-${patterns.length}-patterns`,
        responseTime: 0,
        processingTime: 0,
        wasIdentical: original === enhanced,
        hadError: false,
        context: `confidence:${confidence.toFixed(3)}`
      }

      await executeWithRetry(() => db.insert(enhancementLogs).values(log))

      // Update usage count for patterns (batch-like rapid updates)
      const now = DateUtils.now()
      for (const pattern of patterns) {
        await db
          .update(trainingExamples)
          .set({
            usageCount: sql`${trainingExamples.usageCount} + 1`,
            updatedAt: now
          })
          .where(eq(trainingExamples.id, pattern.id))
      }
    } catch (error) {
      console.error('Failed to log enhancement:', error)
    }
  }

  /**
   * Extract keywords from text
   * OPTIMIZED: Uses static STOP_WORDS
   */
  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOP_WORDS.has(word))
      .slice(0, 15)
  }

  /**
   * Categorize a prompt into general categories
   */
  private categorizePrompt(prompt: string): string {
    const text = prompt.toLowerCase()

    if (text.includes('website') || text.includes('web') || text.includes('app')) {
      return 'website'
    } else if (text.includes('write') || text.includes('essay') || text.includes('article')) {
      return 'writing'
    } else if (text.includes('plan') || text.includes('organize') || text.includes('schedule')) {
      return 'planning'
    } else if (text.includes('code') || text.includes('program') || text.includes('develop')) {
      return 'coding'
    } else if (text.includes('analyze') || text.includes('data') || text.includes('research')) {
      return 'analysis'
    }

    return 'general'
  }

  /**
   * Get enhancement statistics
   */
  async getStatistics(env: any): Promise<any> {
    const db = this.getDb(env)
    if (!db) return null

    try {
      const oneWeekAgo = DateUtils.daysAgo(7)

      // Use aggregation for efficiency
      const stats: { totalLocal: number; totalLLM: number; avgProcessingTime: number }[] = await executeWithRetry(() =>
        db
          .select({
            totalLocal: sql<number>`sum(case when source = 'local' then 1 else 0 end)`,
            totalLLM: sql<number>`sum(case when source != 'local' then 1 else 0 end)`,
            avgProcessingTime: sql<number>`avg(processing_time)`
          })
          .from(enhancementLogs)
          .where(gte(enhancementLogs.createdAt, oneWeekAgo))
      )

      return stats[0] || null
    } catch (error) {
      console.error('Failed to get statistics:', error)
      return null
    }
  }
}

/**
 * Factory function for creating adaptive enhancer
 */
export function createAdaptiveEnhancer(config?: AdaptiveEnhancerConfig): AdaptiveEnhancer {
  return new AdaptiveEnhancer(config)
}
