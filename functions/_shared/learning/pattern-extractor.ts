/**
 * Pattern Extractor for Cloudflare Workers - OPTIMIZED
 *
 * This module extracts reusable patterns from successful LLM enhancements.
 *
 * OPTIMIZATIONS APPLIED:
 * - Static STOP_WORDS (eliminates repeated allocations)
 * - Set.has() instead of Array.includes() (O(1) vs O(n))
 * - Query limits on database operations
 * - Pre-computed word sets for faster comparisons
 * - Limited pattern group sizes to prevent memory growth
 */

import { createDb, enhancementLogs, feedback } from '../db'
import { eq, and, gte } from 'drizzle-orm'
import { DateUtils } from '../adapters'

// ============================================
// CONFIGURATION CONSTANTS
// ============================================

/** Maximum enhancements to process per extraction */
const MAX_ENHANCEMENTS_TO_PROCESS = 200

/** Maximum patterns per group (prevents unbounded growth) */
const MAX_PATTERNS_PER_GROUP = 50

/** Maximum transformations to extract per enhancement */
const MAX_TRANSFORMATIONS_PER_ENHANCEMENT = 20

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

// ============================================
// INTERFACES
// ============================================

export interface EnhancementPattern {
  originalText: string
  enhancedText: string
  context: string
  keywords: string[]
  transformations: Transformation[]
  confidence: number
}

interface Transformation {
  type: 'replacement' | 'addition' | 'removal' | 'restructure'
  from: string
  to: string
  position?: number
}

// ============================================
// PATTERN EXTRACTOR CLASS
// ============================================

export class PatternExtractor {
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.55
  private readonly MIN_EXAMPLES_FOR_PATTERN = 2

  /**
   * Extract patterns from successful LLM enhancements
   * @param env - Cloudflare Workers environment containing DATABASE_URL
   */
  async extractPatterns(env: any, timeWindow: number = 7): Promise<EnhancementPattern[]> {
    const db = createDb(env)
    if (!db) {
      console.warn('Database not available - pattern extraction disabled')
      return []
    }

    const startDate = DateUtils.daysAgo(timeWindow)

    try {
      // Get successful enhancements with positive feedback (WITH LIMIT)
      const successfulEnhancements = await db
        .select({
          original: enhancementLogs.originalPrompt,
          enhanced: enhancementLogs.enhancedPrompt,
          context: enhancementLogs.context,
          feedbackScore: feedback.score,
        })
        .from(enhancementLogs)
        .leftJoin(
          feedback,
          and(
            eq(feedback.enhancementId, enhancementLogs.id),
            eq(feedback.wasSuccessful, true)
          )
        )
        .where(
          and(
            gte(enhancementLogs.createdAt, startDate),
            gte(feedback.score, 4)
          )
        )
        .limit(MAX_ENHANCEMENTS_TO_PROCESS)

      console.log(`Processing ${successfulEnhancements.length} enhancements for pattern extraction`)
      return this.analyzeEnhancements(successfulEnhancements)
    } catch (error) {
      console.error('Failed to extract patterns:', error)
      return []
    }
  }

  /**
   * Extract transformations from a single enhancement
   * Used for real-time learning
   * OPTIMIZED: Uses Set for O(1) lookups instead of Array.includes()
   */
  extractTransformations(
    original: string,
    enhanced: string
  ): Transformation[] {
    const transformations: Transformation[] = []
    const originalWords = original.toLowerCase().split(/\s+/)
    const enhancedWords = enhanced.toLowerCase().split(/\s+/)

    // Pre-compute Sets for O(1) lookup
    const originalWordSet = new Set(originalWords)
    const enhancedWordSet = new Set(enhancedWords)

    const commonPhrases = this.findCommonPhrasesFast(originalWordSet, enhancedWordSet)

    // Identify replacements (with limit)
    let transformationCount = 0
    for (let i = 0; i < originalWords.length && transformationCount < MAX_TRANSFORMATIONS_PER_ENHANCEMENT; i++) {
      const word = originalWords[i]

      // Use Set.has() instead of Array.includes() - O(1) vs O(n)
      if (!enhancedWordSet.has(word) && !commonPhrases.has(word)) {
        const context = originalWords.slice(
          Math.max(0, i - 2),
          Math.min(originalWords.length, i + 3)
        )
        const replacement = this.findReplacementFast(context, enhancedWords, enhancedWordSet)

        if (replacement) {
          transformations.push({
            type: 'replacement',
            from: word,
            to: replacement,
            position: i,
          })
          transformationCount++
        }
      }
    }

    // Identify additions (with limit)
    const addedWords: string[] = []
    for (const word of enhancedWords) {
      if (transformationCount >= MAX_TRANSFORMATIONS_PER_ENHANCEMENT) break
      // Use Set.has() instead of Array.includes()
      if (!originalWordSet.has(word) && !commonPhrases.has(word)) {
        addedWords.push(word)
      }
    }

    for (const added of addedWords.slice(0, 10)) { // Limit additions
      transformations.push({
        type: 'addition',
        from: '',
        to: added,
      })
    }

    return transformations
  }

  /**
   * Analyze enhancements to identify reusable patterns
   */
  private analyzeEnhancements(
    enhancements: Array<{
      original: string | null
      enhanced: string | null
      context: string | null
      feedbackScore: number | null
    }>
  ): EnhancementPattern[] {
    const patterns: EnhancementPattern[] = []
    const patternGroups = new Map<string, EnhancementPattern[]>()

    for (const enhancement of enhancements) {
      if (!enhancement.original || !enhancement.enhanced) continue

      const transformations = this.extractTransformations(
        enhancement.original,
        enhancement.enhanced
      )

      const keywords = this.extractKeywords(enhancement.original)
      const patternKey = this.generatePatternKey(transformations, keywords)

      const pattern: EnhancementPattern = {
        originalText: enhancement.original,
        enhancedText: enhancement.enhanced,
        context: enhancement.context || '',
        keywords,
        transformations,
        confidence: (enhancement.feedbackScore || 0) / 5,
      }

      if (!patternGroups.has(patternKey)) {
        patternGroups.set(patternKey, [])
      }

      const group = patternGroups.get(patternKey)!
      // Limit group size to prevent memory growth
      if (group.length < MAX_PATTERNS_PER_GROUP) {
        group.push(pattern)
      }
    }

    // Filter patterns that appear frequently enough
    for (const [_key, group] of patternGroups) {
      if (group.length >= this.MIN_EXAMPLES_FOR_PATTERN) {
        const avgConfidence =
          group.reduce((sum, p) => sum + p.confidence, 0) / group.length

        if (avgConfidence >= this.MIN_CONFIDENCE_THRESHOLD) {
          patterns.push(this.mergePatterns(group))
        }
      }
    }

    return patterns
  }

  /**
   * Extract keywords from text for pattern matching
   * OPTIMIZED: Uses static STOP_WORDS set
   */
  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOP_WORDS.has(word))
      .slice(0, 10)
  }

  /**
   * Generate a unique key for pattern grouping
   * OPTIMIZED: Removed unnecessary sort for simple key generation
   */
  private generatePatternKey(
    transformations: Transformation[],
    keywords: string[]
  ): string {
    // Use Set for deduplication instead of sort
    const transformationTypes = [...new Set(transformations.map(t => t.type))].join('-')
    const keywordSet = keywords.slice(0, 3).join('-')
    return `${transformationTypes}:${keywordSet}`
  }

  /**
   * Find common phrases between two word sets
   * OPTIMIZED: Takes Sets directly, O(min(m,n)) instead of O(m*n)
   */
  private findCommonPhrasesFast(
    words1Set: Set<string>,
    words2Set: Set<string>
  ): Set<string> {
    const common = new Set<string>()

    // Iterate over smaller set for efficiency
    const [smallerSet, largerSet] = words1Set.size < words2Set.size
      ? [words1Set, words2Set]
      : [words2Set, words1Set]

    for (const word of smallerSet) {
      if (largerSet.has(word)) {
        common.add(word)
      }
    }

    return common
  }

  /**
   * Find replacement word in enhanced text based on context
   * OPTIMIZED: Uses pre-computed Set for O(1) lookups
   */
  private findReplacementFast(
    context: string[],
    enhancedWords: string[],
    enhancedWordSet: Set<string>
  ): string | null {
    // Early exit if context words aren't in enhanced text
    let contextMatches = 0
    for (const word of context) {
      if (enhancedWordSet.has(word)) contextMatches++
    }
    if (contextMatches < 2) return null

    // Find replacement with limited search
    const maxSearchPositions = Math.min(enhancedWords.length, 100)
    for (let i = 0; i < maxSearchPositions; i++) {
      const enhancedContext = enhancedWords.slice(
        Math.max(0, i - 2),
        Math.min(enhancedWords.length, i + 3)
      )

      const similarity = this.contextSimilarityFast(context, enhancedContext)
      if (similarity > 0.6) {
        return enhancedWords[i]
      }
    }

    return null
  }

  /**
   * Calculate context similarity
   * OPTIMIZED: More efficient set operations
   */
  private contextSimilarityFast(context1: string[], context2: string[]): number {
    if (context1.length === 0 || context2.length === 0) return 0

    const set1 = new Set(context1)
    const set2 = new Set(context2)

    // Count intersection efficiently
    let intersectionCount = 0
    const [smallerSet, largerSet] = set1.size < set2.size ? [set1, set2] : [set2, set1]

    for (const word of smallerSet) {
      if (largerSet.has(word)) intersectionCount++
    }

    // Union size = set1.size + set2.size - intersection
    const unionSize = set1.size + set2.size - intersectionCount

    return unionSize > 0 ? intersectionCount / unionSize : 0
  }

  /**
   * Merge similar patterns into a single pattern
   */
  private mergePatterns(patterns: EnhancementPattern[]): EnhancementPattern {
    const avgConfidence =
      patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length

    const allKeywords = new Set<string>()
    const allTransformations = new Map<string, Transformation>()

    for (const pattern of patterns) {
      pattern.keywords.forEach(k => allKeywords.add(k))
      pattern.transformations.forEach(t => {
        const key = `${t.type}-${t.from}-${t.to}`
        allTransformations.set(key, t)
      })
    }

    return {
      originalText: patterns[0].originalText,
      enhancedText: patterns[0].enhancedText,
      context: patterns[0].context,
      keywords: Array.from(allKeywords),
      transformations: Array.from(allTransformations.values()),
      confidence: avgConfidence,
    }
  }
}

/**
 * Factory function for creating pattern extractor
 */
export function createPatternExtractor(): PatternExtractor {
  return new PatternExtractor()
}
