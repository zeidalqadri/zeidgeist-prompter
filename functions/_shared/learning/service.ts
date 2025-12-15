/**
 * Learning Service for Cloudflare Workers
 *
 * Main service for managing the learning system, including pattern storage,
 * quality updates, and reinforcement learning.
 * Fully compatible with Cloudflare Workers runtime.
 */

import { createDb, trainingExamples, enhancementLogs, feedback } from '../db'
import { eq, and, gte, desc, sql } from 'drizzle-orm'
import { PatternExtractor, EnhancementPattern } from './pattern-extractor'
import type { TrainingExample, NewTrainingExample } from '../db'
import { DateUtils } from '../adapters'

export interface LearningMetrics {
  totalPatterns: number
  newPatternsLearned: number
  llmDependencyScore: number
  accuracyScore: number
  lastLearningCycle: string  // ISO date string for D1 compatibility
}

export interface LearningConfig {
  patternConfidenceThreshold?: number
  llmFallbackThreshold?: number
  learningCycleInterval?: number
  minExamplesForPattern?: number
}

export class LearningService {
  private patternExtractor: PatternExtractor
  private config: LearningConfig

  constructor(config: LearningConfig = {}) {
    this.patternExtractor = new PatternExtractor()
    this.config = {
      patternConfidenceThreshold: config.patternConfidenceThreshold || 0.55,
      llmFallbackThreshold: config.llmFallbackThreshold || 0.4,
      learningCycleInterval: config.learningCycleInterval || 24 * 60 * 60 * 1000,
      minExamplesForPattern: config.minExamplesForPattern || 2
    }
  }

  /**
   * Store successful enhancement for real-time learning
   */
  async storeSuccessfulEnhancement(
    env: any,
    original: string,
    enhanced: string,
    source: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const db = createDb(env)
    if (!db) {
      console.warn('Database not available - learning storage disabled')
      return
    }

    console.log('📚 Processing enhancement for learning...')

    try {
      // Extract patterns immediately from this single enhancement
      const patterns = this.patternExtractor.extractTransformations(original, enhanced)
      console.log(`🔍 Extracted ${patterns.length} transformation patterns`)

      // Calculate initial confidence
      const confidence = this.calculatePatternConfidence(patterns)

      if (confidence >= 0.6) {
        console.log(`✅ Storing pattern with confidence ${confidence.toFixed(2)}`)

        // Create enhancement pattern
        const pattern: EnhancementPattern = {
          originalText: original,
          enhancedText: enhanced,
          context: metadata.context || '',
          keywords: this.extractKeywords(original),
          transformations: patterns,
          confidence
        }

        await this.storePatterns(env, [pattern])
      }

      console.log('✅ Real-time learning complete')
    } catch (error) {
      console.error('Error in real-time learning:', error)
      // Don't throw - this is non-critical
    }
  }

  /**
   * Run full learning cycle
   */
  async runLearningCycle(env: any): Promise<LearningMetrics> {
    const db = createDb(env)
    if (!db) {
      console.warn('Database not available - learning cycle skipped')
      return {
        totalPatterns: 0,
        newPatternsLearned: 0,
        llmDependencyScore: 1,
        accuracyScore: 0,
        lastLearningCycle: DateUtils.now()
      }
    }

    console.log('Starting learning cycle...')

    // Extract patterns from recent successful enhancements
    const patterns = await this.patternExtractor.extractPatterns(env, 7)

    // Store high-confidence patterns
    const newPatterns = await this.storePatterns(env, patterns)

    // Update existing patterns based on feedback
    await this.updatePatternQuality(env)

    // Calculate metrics
    const metrics = await this.calculateMetrics(env, newPatterns)

    console.log('Learning cycle completed:', metrics)
    return metrics
  }

  /**
   * Store learned patterns in the database
   */
  private async storePatterns(
    env: any,
    patterns: EnhancementPattern[]
  ): Promise<number> {
    const db = createDb(env)
    if (!db) return 0

    let newPatternsCount = 0

    for (const pattern of patterns) {
      if (pattern.confidence < this.config.patternConfidenceThreshold!) continue

      try {
        // Check if similar pattern exists
        const existingPattern = await this.findSimilarPattern(env, pattern)

        if (existingPattern) {
          // Update existing pattern
          await this.updatePattern(env, existingPattern.id, pattern)
        } else {
          // Create new pattern
          const newExample: NewTrainingExample = {
            id: crypto.randomUUID(),
            rawPrompt: pattern.originalText,
            enhancedPrompt: pattern.enhancedText,
            context: pattern.context,
            keywords: pattern.keywords.join(','),
            source: 'learning',
            quality: Math.round(pattern.confidence * 100),
            usageCount: 1,
            isActive: true
          }

          await db.insert(trainingExamples).values(newExample)
          newPatternsCount++
        }
      } catch (error) {
        console.error('Failed to store pattern:', error)
      }
    }

    return newPatternsCount
  }

  /**
   * Find similar existing pattern
   */
  private async findSimilarPattern(
    env: any,
    pattern: EnhancementPattern
  ): Promise<TrainingExample | null> {
    const db = createDb(env)
    if (!db) return null

    const keywordOverlapThreshold = 0.5

    try {
      const existingPatterns = await db
        .select()
        .from(trainingExamples)
        .where(eq(trainingExamples.source, 'learning'))

      for (const existing of existingPatterns) {
        const existingWords = new Set<string>(
          (existing.rawPrompt || '').toLowerCase().split(/\s+/)
        )
        const patternWords = new Set<string>(
          pattern.originalText.toLowerCase().split(/\s+/)
        )

        const intersection = new Set<string>(
          [...existingWords].filter(x => patternWords.has(x))
        )
        const overlap = patternWords.size > 0 ? intersection.size / patternWords.size : 0

        if (overlap >= keywordOverlapThreshold) {
          return existing
        }
      }
    } catch (error) {
      console.error('Failed to find similar pattern:', error)
    }

    return null
  }

  /**
   * Update existing pattern with new information
   */
  private async updatePattern(
    env: any,
    patternId: string,
    newPattern: EnhancementPattern
  ): Promise<void> {
    const db = createDb(env)
    if (!db) return

    try {
      const existing = await db
        .select()
        .from(trainingExamples)
        .where(eq(trainingExamples.id, patternId))
        .limit(1)

      if (existing.length === 0) return

      const currentPattern = existing[0]
      const updatedQuality = Math.round(
        ((currentPattern.quality || 0) + newPattern.confidence * 100) / 2
      )
      const updatedUsageCount = (currentPattern.usageCount || 0) + 1

      await db
        .update(trainingExamples)
        .set({
          quality: updatedQuality,
          usageCount: updatedUsageCount,
          updatedAt: DateUtils.now()
        })
        .where(eq(trainingExamples.id, patternId))
    } catch (error) {
      console.error('Failed to update pattern:', error)
    }
  }

  /**
   * Update pattern quality based on user feedback
   */
  private async updatePatternQuality(env: any): Promise<void> {
    const db = createDb(env)
    if (!db) return

    const oneWeekAgo = DateUtils.daysAgo(7)

    try {
      const recentFeedback = await db
        .select({
          enhancementId: feedback.enhancementId,
          score: feedback.score,
          successful: feedback.wasSuccessful,
        })
        .from(feedback)
        .where(gte(feedback.createdAt, oneWeekAgo))

      for (const fb of recentFeedback) {
        if (!fb.enhancementId) continue

        // Get the enhancement details
        const enhancement = await db
          .select()
          .from(enhancementLogs)
          .where(eq(enhancementLogs.id, fb.enhancementId))
          .limit(1)

        if (enhancement.length === 0) continue

        // Find and update related patterns
        const relatedPatterns = await this.findRelatedPatterns(
          env,
          enhancement[0].originalPrompt || ''
        )

        for (const pattern of relatedPatterns) {
          const qualityAdjustment = fb.successful
            ? ((fb.score || 3) - 3) * 0.1
            : -0.2

          const newQuality = Math.max(
            0,
            Math.min(100, (pattern.quality || 0) + qualityAdjustment * 10)
          )

          await db
            .update(trainingExamples)
            .set({ quality: newQuality, updatedAt: DateUtils.now() })
            .where(eq(trainingExamples.id, pattern.id))
        }
      }
    } catch (error) {
      console.error('Failed to update pattern quality:', error)
    }
  }

  /**
   * Find patterns related to a given prompt
   */
  async findRelatedPatterns(
    env: any,
    prompt: string
  ): Promise<TrainingExample[]> {
    const db = createDb(env)
    if (!db) return []

    const promptKeywords = prompt
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2)

    try {
      const patterns = await db
        .select()
        .from(trainingExamples)
        .where(gte(trainingExamples.quality, 50))

      return patterns.filter((pattern: any) => {
        const patternWords = new Set(
          pattern.rawPrompt.toLowerCase().split(/\s+/)
        )
        return promptKeywords.some(k => patternWords.has(k))
      })
    } catch (error) {
      console.error('Failed to find related patterns:', error)
      return []
    }
  }

  /**
   * Reinforce patterns based on positive feedback
   */
  async reinforcePatterns(
    env: any,
    prompt: string,
    score: number
  ): Promise<void> {
    const db = createDb(env)
    if (!db) return

    console.log(`🔼 Reinforcing patterns for prompt (score: ${score})`)

    try {
      const relatedPatterns = await this.findRelatedPatterns(env, prompt)

      for (const pattern of relatedPatterns) {
        const qualityAdjustment = Math.max(0, (score - 3) * 5)
        const newQuality = Math.min(100, (pattern.quality || 0) + qualityAdjustment)

        await db
          .update(trainingExamples)
          .set({
            quality: newQuality,
            usageCount: (pattern.usageCount || 0) + 1,
            updatedAt: DateUtils.now()
          })
          .where(eq(trainingExamples.id, pattern.id))

        console.log(`✅ Reinforced pattern ${pattern.id}: ${pattern.quality} → ${newQuality}`)
      }

      console.log(`✅ Reinforced ${relatedPatterns.length} patterns`)
    } catch (error) {
      console.error('Error reinforcing patterns:', error)
    }
  }

  /**
   * Check if system should use local enhancement instead of LLM
   */
  async shouldUseLocalEnhancement(env: any, prompt: string): Promise<boolean> {
    const relatedPatterns = await this.findRelatedPatterns(env, prompt)

    if (relatedPatterns.length === 0) return false

    const avgQuality =
      relatedPatterns.reduce((sum: number, p: any) => sum + (p.quality || 0), 0) /
      relatedPatterns.length

    return avgQuality >= (this.config.llmFallbackThreshold! * 100)
  }

  /**
   * Get best pattern for a given prompt
   */
  async getBestPattern(env: any, prompt: string): Promise<TrainingExample | null> {
    const relatedPatterns = await this.findRelatedPatterns(env, prompt)

    if (relatedPatterns.length === 0) return null

    // Sort by quality score and usage count
    relatedPatterns.sort((a: any, b: any) => {
      const scoreA = (a.quality || 0) * 0.7 + ((a.usageCount || 0) / 100) * 0.3
      const scoreB = (b.quality || 0) * 0.7 + ((b.usageCount || 0) / 100) * 0.3
      return scoreB - scoreA
    })

    return relatedPatterns[0]
  }

  /**
   * Calculate pattern confidence
   */
  private calculatePatternConfidence(patterns: any[]): number {
    let confidence = 0.6 // Base confidence

    // Boost confidence for specific transformations
    for (const pattern of patterns) {
      if (pattern.type === 'addition') {
        confidence += 0.1
      }
      if (pattern.type === 'replacement') {
        confidence += 0.05
      }
      if (pattern.to && pattern.to.length > 20) {
        confidence += 0.1
      }
    }

    // Cap at 0.85 for initial patterns
    return Math.min(0.85, confidence)
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
      'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is',
    ])

    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10)
  }

  /**
   * Calculate learning metrics
   */
  private async calculateMetrics(
    env: any,
    newPatterns: number
  ): Promise<LearningMetrics> {
    const db = createDb(env)

    if (!db) {
      return {
        totalPatterns: 0,
        newPatternsLearned: newPatterns,
        llmDependencyScore: 1,
        accuracyScore: 0,
        lastLearningCycle: DateUtils.now()
      }
    }

    try {
      // Get total patterns
      const totalPatternsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(trainingExamples)
      const totalPatterns = totalPatternsResult[0]?.count || 0

      // Calculate LLM dependency score
      const llmDependency = await this.calculateLLMDependency(env)

      // Calculate accuracy score
      const accuracy = await this.calculateAccuracy(env)

      return {
        totalPatterns,
        newPatternsLearned: newPatterns,
        llmDependencyScore: llmDependency,
        accuracyScore: accuracy,
        lastLearningCycle: DateUtils.now(),
      }
    } catch (error) {
      console.error('Failed to calculate metrics:', error)
      return {
        totalPatterns: 0,
        newPatternsLearned: newPatterns,
        llmDependencyScore: 1,
        accuracyScore: 0,
        lastLearningCycle: DateUtils.now()
      }
    }
  }

  /**
   * Calculate how dependent the system is on LLMs
   */
  private async calculateLLMDependency(env: any): Promise<number> {
    const db = createDb(env)
    if (!db) return 1

    const oneWeekAgo = DateUtils.daysAgo(7)

    try {
      const recentEnhancements = await db
        .select({
          source: enhancementLogs.source,
        })
        .from(enhancementLogs)
        .where(gte(enhancementLogs.createdAt, oneWeekAgo))

      if (recentEnhancements.length === 0) return 1

      const localEnhancements = recentEnhancements.filter(
        (e: any) => e.source === 'local'
      ).length

      return 1 - (localEnhancements / recentEnhancements.length)
    } catch (error) {
      console.error('Failed to calculate LLM dependency:', error)
      return 1
    }
  }

  /**
   * Calculate accuracy of local enhancements
   */
  private async calculateAccuracy(env: any): Promise<number> {
    const db = createDb(env)
    if (!db) return 0

    const oneWeekAgo = DateUtils.daysAgo(7)

    try {
      const localEnhancementsWithFeedback = await db
        .select({
          successful: feedback.wasSuccessful,
          score: feedback.score,
        })
        .from(enhancementLogs)
        .leftJoin(feedback, eq(feedback.enhancementId, enhancementLogs.id))
        .where(
          and(
            eq(enhancementLogs.source, 'local'),
            gte(enhancementLogs.createdAt, oneWeekAgo)
          )
        )

      if (localEnhancementsWithFeedback.length === 0) return 0

      const successfulCount = localEnhancementsWithFeedback.filter(
        (e: any) => e.successful === true && (e.score || 0) >= 4
      ).length

      return successfulCount / localEnhancementsWithFeedback.length
    } catch (error) {
      console.error('Failed to calculate accuracy:', error)
      return 0
    }
  }
}

/**
 * Factory function for creating learning service
 */
export function createLearningService(config?: LearningConfig): LearningService {
  return new LearningService(config)
}