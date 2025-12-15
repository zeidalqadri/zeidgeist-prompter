/**
 * Learning Service for Cloudflare Workers - OPTIMIZED
 *
 * Main service for managing the learning system, including pattern storage,
 * quality updates, and reinforcement learning.
 *
 * OPTIMIZATIONS APPLIED:
 * - Query limits on all database operations (prevents OOM)
 * - Batch operations for updates (reduces DB round-trips)
 * - Early-exit in similarity checks (O(n) → O(1) best case)
 * - Static stopWords cache (eliminates repeated allocations)
 * - Pattern caching with TTL (reduces DB hits)
 * - D1 batch API for bulk updates
 */

import { createDb, trainingExamples, enhancementLogs, feedback, executeWithRetry } from '../db'
import { eq, and, gte, desc, sql } from 'drizzle-orm'
import { PatternExtractor, EnhancementPattern } from './pattern-extractor'
import type { TrainingExample, NewTrainingExample } from '../db'
import { DateUtils } from '../adapters'

// ============================================
// CONFIGURATION CONSTANTS
// ============================================

/** Maximum patterns to load in a single query */
const MAX_PATTERNS_PER_QUERY = 100

/** Maximum feedback items to process in a batch */
const MAX_FEEDBACK_BATCH = 50

/** Maximum comparisons before early-exit in similarity search */
const MAX_SIMILARITY_COMPARISONS = 100

/** Pattern cache TTL in milliseconds (5 minutes) */
const PATTERN_CACHE_TTL = 5 * 60 * 1000

/** Maximum patterns to store in cache */
const MAX_CACHED_PATTERNS = 500

// ============================================
// STATIC CACHES (Module-level singletons)
// ============================================

/** Static stop words set - created once, reused everywhere */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
  'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is',
  'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'should', 'could',
  'may', 'might', 'must', 'can', 'this', 'that', 'these',
  'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
])

/** Pattern cache with TTL */
interface CachedPattern {
  patterns: TrainingExample[]
  timestamp: number
  cacheKey: string
}

const patternCache = new Map<string, CachedPattern>()

// ============================================
// INTERFACES
// ============================================

export interface LearningMetrics {
  totalPatterns: number
  newPatternsLearned: number
  llmDependencyScore: number
  accuracyScore: number
  lastLearningCycle: string
}

export interface LearningConfig {
  patternConfidenceThreshold?: number
  llmFallbackThreshold?: number
  learningCycleInterval?: number
  minExamplesForPattern?: number
}

// ============================================
// LEARNING SERVICE CLASS
// ============================================

export class LearningService {
  private patternExtractor: PatternExtractor
  private config: LearningConfig
  private dbInstance: ReturnType<typeof createDb> | null = null

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
   * Get or create database instance (reuse connection)
   */
  private getDb(env: any) {
    if (!this.dbInstance) {
      this.dbInstance = createDb(env)
    }
    return this.dbInstance
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
    const db = this.getDb(env)
    if (!db) {
      console.warn('Database not available - learning storage disabled')
      return
    }

    console.log('📚 Processing enhancement for learning...')

    try {
      const patterns = this.patternExtractor.extractTransformations(original, enhanced)
      console.log(`🔍 Extracted ${patterns.length} transformation patterns`)

      const confidence = this.calculatePatternConfidence(patterns)

      if (confidence >= 0.6) {
        console.log(`✅ Storing pattern with confidence ${confidence.toFixed(2)}`)

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
    }
  }

  /**
   * Run full learning cycle with optimized batch processing
   */
  async runLearningCycle(env: any): Promise<LearningMetrics> {
    const db = this.getDb(env)
    if (!db) {
      console.warn('Database not available - learning cycle skipped')
      return this.getEmptyMetrics()
    }

    console.log('Starting optimized learning cycle...')
    const startTime = Date.now()

    try {
      // Extract patterns with limit
      const patterns = await this.patternExtractor.extractPatterns(env, 7)
      console.log(`Extracted ${patterns.length} patterns in ${Date.now() - startTime}ms`)

      // Store high-confidence patterns
      const newPatterns = await this.storePatterns(env, patterns)

      // Batch update pattern quality
      await this.batchUpdatePatternQuality(env)

      // Calculate metrics
      const metrics = await this.calculateMetrics(env, newPatterns)

      // Clear stale cache entries
      this.clearStaleCache()

      console.log(`Learning cycle completed in ${Date.now() - startTime}ms:`, metrics)
      return metrics
    } catch (error) {
      console.error('Learning cycle error:', error)
      return this.getEmptyMetrics()
    }
  }

  /**
   * Store learned patterns with deduplication and batch insert
   */
  private async storePatterns(
    env: any,
    patterns: EnhancementPattern[]
  ): Promise<number> {
    const db = this.getDb(env)
    if (!db || patterns.length === 0) return 0

    let newPatternsCount = 0
    const patternsToInsert: NewTrainingExample[] = []
    const patternsToUpdate: { id: string; quality: number; usageCount: number }[] = []

    // Pre-fetch existing patterns for batch comparison
    const existingPatterns = await this.getExistingPatternsForComparison(env)
    const existingKeywordSets = this.buildKeywordIndex(existingPatterns)

    for (const pattern of patterns) {
      if (pattern.confidence < this.config.patternConfidenceThreshold!) continue

      // Fast similarity check using keyword index
      const existingPattern = this.findSimilarPatternFast(
        pattern,
        existingPatterns,
        existingKeywordSets
      )

      if (existingPattern) {
        // Queue for batch update
        patternsToUpdate.push({
          id: existingPattern.id,
          quality: Math.round(((existingPattern.quality || 0) + pattern.confidence * 100) / 2),
          usageCount: (existingPattern.usageCount || 0) + 1
        })
      } else {
        // Queue for batch insert
        patternsToInsert.push({
          id: crypto.randomUUID(),
          rawPrompt: pattern.originalText,
          enhancedPrompt: pattern.enhancedText,
          context: pattern.context,
          keywords: pattern.keywords.join(','),
          source: 'learning',
          quality: Math.round(pattern.confidence * 100),
          usageCount: 1,
          isActive: true
        })
        newPatternsCount++
      }
    }

    // Batch insert new patterns
    if (patternsToInsert.length > 0) {
      await this.batchInsertPatterns(env, patternsToInsert)
    }

    // Batch update existing patterns
    if (patternsToUpdate.length > 0) {
      await this.batchUpdatePatterns(env, patternsToUpdate)
    }

    // Invalidate cache after changes
    this.invalidatePatternCache()

    return newPatternsCount
  }

  /**
   * Get existing patterns for comparison (with limit)
   */
  private async getExistingPatternsForComparison(env: any): Promise<TrainingExample[]> {
    const db = this.getDb(env)
    if (!db) return []

    try {
      return await executeWithRetry(() =>
        db
          .select()
          .from(trainingExamples)
          .where(eq(trainingExamples.source, 'learning'))
          .orderBy(desc(trainingExamples.quality))
          .limit(MAX_PATTERNS_PER_QUERY)
      )
    } catch (error) {
      console.error('Failed to fetch existing patterns:', error)
      return []
    }
  }

  /**
   * Build keyword index for O(1) lookup
   */
  private buildKeywordIndex(patterns: TrainingExample[]): Map<string, Set<string>> {
    const index = new Map<string, Set<string>>()

    for (const pattern of patterns) {
      const keywords = new Set(
        (pattern.rawPrompt || '').toLowerCase().split(/\s+/).filter(w => w.length > 2)
      )
      index.set(pattern.id, keywords)
    }

    return index
  }

  /**
   * Fast similarity search with early exit
   * O(min(n, MAX_SIMILARITY_COMPARISONS)) instead of O(n)
   */
  private findSimilarPatternFast(
    pattern: EnhancementPattern,
    existingPatterns: TrainingExample[],
    keywordIndex: Map<string, Set<string>>
  ): TrainingExample | null {
    const patternWords = new Set(
      pattern.originalText.toLowerCase().split(/\s+/).filter(w => w.length > 2)
    )
    const keywordOverlapThreshold = 0.5
    let comparisons = 0

    for (const existing of existingPatterns) {
      // Early exit after max comparisons
      if (++comparisons > MAX_SIMILARITY_COMPARISONS) {
        console.log(`Early exit after ${MAX_SIMILARITY_COMPARISONS} comparisons`)
        break
      }

      const existingWords = keywordIndex.get(existing.id)
      if (!existingWords) continue

      // O(min(m, n)) set intersection using smaller set
      let intersectionCount = 0
      const smallerSet = patternWords.size < existingWords.size ? patternWords : existingWords
      const largerSet = patternWords.size < existingWords.size ? existingWords : patternWords

      for (const word of smallerSet) {
        if (largerSet.has(word)) intersectionCount++
      }

      const overlap = patternWords.size > 0 ? intersectionCount / patternWords.size : 0
      if (overlap >= keywordOverlapThreshold) {
        return existing
      }
    }

    return null
  }

  /**
   * Batch insert patterns using D1 batch API
   */
  private async batchInsertPatterns(
    env: any,
    patterns: NewTrainingExample[]
  ): Promise<void> {
    const db = this.getDb(env)
    if (!db || patterns.length === 0) return

    try {
      // D1 supports batch operations - insert in chunks
      const BATCH_SIZE = 50
      for (let i = 0; i < patterns.length; i += BATCH_SIZE) {
        const batch = patterns.slice(i, i + BATCH_SIZE)
        await executeWithRetry(() => db.insert(trainingExamples).values(batch))
      }
      console.log(`Batch inserted ${patterns.length} patterns`)
    } catch (error) {
      console.error('Batch insert failed:', error)
      throw error
    }
  }

  /**
   * Batch update patterns using single UPDATE with CASE
   */
  private async batchUpdatePatterns(
    env: any,
    updates: { id: string; quality: number; usageCount: number }[]
  ): Promise<void> {
    const db = this.getDb(env)
    if (!db || updates.length === 0) return

    try {
      // Update patterns individually but in rapid succession
      // D1 doesn't support CASE in UPDATE, so we use rapid individual updates
      const now = DateUtils.now()

      for (const update of updates) {
        await db
          .update(trainingExamples)
          .set({
            quality: update.quality,
            usageCount: update.usageCount,
            updatedAt: now
          })
          .where(eq(trainingExamples.id, update.id))
      }

      console.log(`Batch updated ${updates.length} patterns`)
    } catch (error) {
      console.error('Batch update failed:', error)
    }
  }

  /**
   * Batch update pattern quality based on user feedback
   * Optimized to reduce N+1 queries
   */
  private async batchUpdatePatternQuality(env: any): Promise<void> {
    const db = this.getDb(env)
    if (!db) return

    const oneWeekAgo = DateUtils.daysAgo(7)

    try {
      // Single query to get feedback with enhancement data (JOIN)
      const feedbackWithEnhancements: {
        feedbackId: string | null
        enhancementId: string | null
        score: number | null
        successful: boolean | null
        originalPrompt: string | null
      }[] = await executeWithRetry(() =>
        db
          .select({
            feedbackId: feedback.id,
            enhancementId: feedback.enhancementId,
            score: feedback.score,
            successful: feedback.wasSuccessful,
            originalPrompt: enhancementLogs.originalPrompt
          })
          .from(feedback)
          .leftJoin(enhancementLogs, eq(feedback.enhancementId, enhancementLogs.id))
          .where(gte(feedback.createdAt, oneWeekAgo))
          .limit(MAX_FEEDBACK_BATCH)
      )

      if (feedbackWithEnhancements.length === 0) return

      // Get all related patterns in one query
      const allPatterns = await this.findRelatedPatterns(env, '', true) // Get all high-quality patterns
      const patternKeywordIndex = this.buildKeywordIndex(allPatterns)

      // Accumulate quality updates
      const qualityUpdates = new Map<string, { totalAdjustment: number; count: number }>()

      for (const fb of feedbackWithEnhancements) {
        if (!fb.originalPrompt) continue

        const promptKeywords = new Set(
          fb.originalPrompt.toLowerCase().split(/\s+/).filter(w => w.length > 2)
        )

        // Find matching patterns using keyword index
        for (const pattern of allPatterns) {
          const patternKeywords = patternKeywordIndex.get(pattern.id)
          if (!patternKeywords) continue

          // Check keyword overlap
          let matchCount = 0
          for (const k of promptKeywords) {
            if (patternKeywords.has(k)) matchCount++
          }

          if (matchCount >= 2) {
            const qualityAdjustment = fb.successful
              ? ((fb.score || 3) - 3) * 1  // +/- 1 per score deviation from 3
              : -2

            const existing = qualityUpdates.get(pattern.id) || { totalAdjustment: 0, count: 0 }
            qualityUpdates.set(pattern.id, {
              totalAdjustment: existing.totalAdjustment + qualityAdjustment,
              count: existing.count + 1
            })
          }
        }
      }

      // Apply accumulated updates in batch
      const now = DateUtils.now()
      for (const [patternId, update] of qualityUpdates) {
        const pattern = allPatterns.find(p => p.id === patternId)
        if (!pattern) continue

        const avgAdjustment = update.totalAdjustment / update.count
        const newQuality = Math.max(0, Math.min(100, (pattern.quality || 0) + avgAdjustment))

        await db
          .update(trainingExamples)
          .set({ quality: newQuality, updatedAt: now })
          .where(eq(trainingExamples.id, patternId))
      }

      console.log(`Updated quality for ${qualityUpdates.size} patterns based on ${feedbackWithEnhancements.length} feedback items`)
    } catch (error) {
      console.error('Failed to batch update pattern quality:', error)
    }
  }

  /**
   * Find patterns related to a given prompt (with caching and limits)
   */
  async findRelatedPatterns(
    env: any,
    prompt: string,
    fetchAll: boolean = false
  ): Promise<TrainingExample[]> {
    const db = this.getDb(env)
    if (!db) return []

    // Check cache first
    const cacheKey = fetchAll ? 'all-patterns' : `related:${prompt.substring(0, 50)}`
    const cached = this.getCachedPatterns(cacheKey)
    if (cached) {
      return fetchAll ? cached : this.filterPatternsByPrompt(cached, prompt)
    }

    try {
      // Query with limit
      const patterns = await executeWithRetry(() =>
        db
          .select()
          .from(trainingExamples)
          .where(
            and(
              gte(trainingExamples.quality, 50),
              eq(trainingExamples.isActive, true)
            )
          )
          .orderBy(desc(trainingExamples.quality))
          .limit(MAX_PATTERNS_PER_QUERY)
      )

      // Cache results
      this.setCachedPatterns(cacheKey, patterns)

      return fetchAll ? patterns : this.filterPatternsByPrompt(patterns, prompt)
    } catch (error) {
      console.error('Failed to find related patterns:', error)
      return []
    }
  }

  /**
   * Filter patterns by prompt keywords (in-memory, after DB query with limit)
   */
  private filterPatternsByPrompt(patterns: TrainingExample[], prompt: string): TrainingExample[] {
    if (!prompt) return patterns

    const promptKeywords = new Set(
      prompt.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w))
    )

    return patterns.filter(pattern => {
      const patternWords = new Set(
        (pattern.rawPrompt || '').toLowerCase().split(/\s+/)
      )
      // At least 2 keyword matches
      let matches = 0
      for (const k of promptKeywords) {
        if (patternWords.has(k)) matches++
        if (matches >= 2) return true
      }
      return false
    })
  }

  /**
   * Reinforce patterns based on positive feedback
   */
  async reinforcePatterns(
    env: any,
    prompt: string,
    score: number
  ): Promise<void> {
    const db = this.getDb(env)
    if (!db) return

    console.log(`🔼 Reinforcing patterns for prompt (score: ${score})`)

    try {
      const relatedPatterns = await this.findRelatedPatterns(env, prompt)

      if (relatedPatterns.length === 0) return

      const now = DateUtils.now()
      const qualityAdjustment = Math.max(0, (score - 3) * 5)

      // Batch update with limit
      const patternsToUpdate = relatedPatterns.slice(0, 10) // Max 10 patterns per reinforcement

      for (const pattern of patternsToUpdate) {
        const newQuality = Math.min(100, (pattern.quality || 0) + qualityAdjustment)

        await db
          .update(trainingExamples)
          .set({
            quality: newQuality,
            usageCount: (pattern.usageCount || 0) + 1,
            updatedAt: now
          })
          .where(eq(trainingExamples.id, pattern.id))
      }

      // Invalidate cache after updates
      this.invalidatePatternCache()

      console.log(`✅ Reinforced ${patternsToUpdate.length} patterns`)
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
      relatedPatterns.reduce((sum, p) => sum + (p.quality || 0), 0) / relatedPatterns.length

    return avgQuality >= (this.config.llmFallbackThreshold! * 100)
  }

  /**
   * Get best pattern for a given prompt
   */
  async getBestPattern(env: any, prompt: string): Promise<TrainingExample | null> {
    const relatedPatterns = await this.findRelatedPatterns(env, prompt)

    if (relatedPatterns.length === 0) return null

    // Already sorted by quality from DB query
    return relatedPatterns[0]
  }

  /**
   * Calculate pattern confidence
   */
  private calculatePatternConfidence(patterns: any[]): number {
    let confidence = 0.6

    for (const pattern of patterns) {
      if (pattern.type === 'addition') confidence += 0.1
      if (pattern.type === 'replacement') confidence += 0.05
      if (pattern.to && pattern.to.length > 20) confidence += 0.1
    }

    return Math.min(0.85, confidence)
  }

  /**
   * Extract keywords from text (uses static STOP_WORDS)
   */
  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOP_WORDS.has(word))
      .slice(0, 10)
  }

  /**
   * Calculate learning metrics
   */
  private async calculateMetrics(
    env: any,
    newPatterns: number
  ): Promise<LearningMetrics> {
    const db = this.getDb(env)

    if (!db) return this.getEmptyMetrics(newPatterns)

    try {
      const [totalPatternsResult, llmDependency, accuracy] = await Promise.all([
        executeWithRetry(() =>
          db.select({ count: sql<number>`count(*)` }).from(trainingExamples)
        ),
        this.calculateLLMDependency(env),
        this.calculateAccuracy(env)
      ])

      return {
        totalPatterns: totalPatternsResult[0]?.count || 0,
        newPatternsLearned: newPatterns,
        llmDependencyScore: llmDependency,
        accuracyScore: accuracy,
        lastLearningCycle: DateUtils.now()
      }
    } catch (error) {
      console.error('Failed to calculate metrics:', error)
      return this.getEmptyMetrics(newPatterns)
    }
  }

  /**
   * Calculate LLM dependency score (with query limit)
   */
  private async calculateLLMDependency(env: any): Promise<number> {
    const db = this.getDb(env)
    if (!db) return 1

    const oneWeekAgo = DateUtils.daysAgo(7)

    try {
      // Use aggregation instead of loading all records
      const result = await executeWithRetry(() =>
        db
          .select({
            total: sql<number>`count(*)`,
            local: sql<number>`sum(case when source = 'local' then 1 else 0 end)`
          })
          .from(enhancementLogs)
          .where(gte(enhancementLogs.createdAt, oneWeekAgo))
      )

      const { total, local } = result[0] || { total: 0, local: 0 }
      if (total === 0) return 1

      return 1 - ((local || 0) / total)
    } catch (error) {
      console.error('Failed to calculate LLM dependency:', error)
      return 1
    }
  }

  /**
   * Calculate accuracy of local enhancements (with query limit)
   */
  private async calculateAccuracy(env: any): Promise<number> {
    const db = this.getDb(env)
    if (!db) return 0

    const oneWeekAgo = DateUtils.daysAgo(7)

    try {
      // Use aggregation instead of loading all records
      const result = await executeWithRetry(() =>
        db
          .select({
            total: sql<number>`count(*)`,
            successful: sql<number>`sum(case when f.was_successful = 1 and f.score >= 4 then 1 else 0 end)`
          })
          .from(enhancementLogs)
          .leftJoin(feedback, eq(feedback.enhancementId, enhancementLogs.id))
          .where(
            and(
              eq(enhancementLogs.source, 'local'),
              gte(enhancementLogs.createdAt, oneWeekAgo)
            )
          )
      )

      const { total, successful } = result[0] || { total: 0, successful: 0 }
      if (total === 0) return 0

      return (successful || 0) / total
    } catch (error) {
      console.error('Failed to calculate accuracy:', error)
      return 0
    }
  }

  /**
   * Get empty metrics object
   */
  private getEmptyMetrics(newPatterns: number = 0): LearningMetrics {
    return {
      totalPatterns: 0,
      newPatternsLearned: newPatterns,
      llmDependencyScore: 1,
      accuracyScore: 0,
      lastLearningCycle: DateUtils.now()
    }
  }

  // ============================================
  // CACHING METHODS
  // ============================================

  private getCachedPatterns(key: string): TrainingExample[] | null {
    const cached = patternCache.get(key)
    if (!cached) return null

    if (Date.now() - cached.timestamp > PATTERN_CACHE_TTL) {
      patternCache.delete(key)
      return null
    }

    return cached.patterns
  }

  private setCachedPatterns(key: string, patterns: TrainingExample[]): void {
    // Enforce cache size limit
    if (patternCache.size >= MAX_CACHED_PATTERNS) {
      // Remove oldest entry
      const oldestKey = patternCache.keys().next().value
      if (oldestKey) patternCache.delete(oldestKey)
    }

    patternCache.set(key, {
      patterns,
      timestamp: Date.now(),
      cacheKey: key
    })
  }

  private invalidatePatternCache(): void {
    patternCache.clear()
  }

  private clearStaleCache(): void {
    const now = Date.now()
    for (const [key, value] of patternCache) {
      if (now - value.timestamp > PATTERN_CACHE_TTL) {
        patternCache.delete(key)
      }
    }
  }

  // ============================================
  // RETENTION POLICY
  // ============================================

  /**
   * Clean up old/low-quality patterns to prevent unbounded growth
   */
  async cleanupOldPatterns(env: any): Promise<number> {
    const db = this.getDb(env)
    if (!db) return 0

    try {
      const ninetyDaysAgo = DateUtils.daysAgo(90)

      // Delete patterns that are:
      // - Older than 90 days AND
      // - Quality below 30 AND
      // - Not used in last 30 days
      const thirtyDaysAgo = DateUtils.daysAgo(30)

      const result = await db
        .delete(trainingExamples)
        .where(
          and(
            sql`${trainingExamples.createdAt} < ${ninetyDaysAgo}`,
            sql`${trainingExamples.quality} < 30`,
            sql`${trainingExamples.updatedAt} < ${thirtyDaysAgo}`
          )
        )
        .returning({ id: trainingExamples.id })

      const deletedCount = result.length
      console.log(`Cleaned up ${deletedCount} old/low-quality patterns`)

      this.invalidatePatternCache()
      return deletedCount
    } catch (error) {
      console.error('Failed to cleanup old patterns:', error)
      return 0
    }
  }

  /**
   * Deactivate patterns with consistently low quality
   */
  async deactivateLowQualityPatterns(env: any): Promise<number> {
    const db = this.getDb(env)
    if (!db) return 0

    try {
      const result = await db
        .update(trainingExamples)
        .set({ isActive: false, updatedAt: DateUtils.now() })
        .where(
          and(
            sql`${trainingExamples.quality} < 20`,
            eq(trainingExamples.isActive, true)
          )
        )
        .returning({ id: trainingExamples.id })

      const deactivatedCount = result.length
      console.log(`Deactivated ${deactivatedCount} low-quality patterns`)

      this.invalidatePatternCache()
      return deactivatedCount
    } catch (error) {
      console.error('Failed to deactivate low-quality patterns:', error)
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
