/**
 * Pattern Extractor for Cloudflare Workers
 *
 * This module extracts reusable patterns from successful LLM enhancements.
 * Fully compatible with Cloudflare Workers runtime - no Node.js dependencies.
 */

import { createDb, enhancementLogs, feedback, trainingExamples } from '../db'
import { eq, and, gte, sql } from 'drizzle-orm'

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

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - timeWindow)

    try {
      // Get successful enhancements with positive feedback
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

      return this.analyzeEnhancements(successfulEnhancements)
    } catch (error) {
      console.error('Failed to extract patterns:', error)
      return []
    }
  }

  /**
   * Extract transformations from a single enhancement
   * Used for real-time learning
   */
  extractTransformations(
    original: string,
    enhanced: string
  ): Transformation[] {
    const transformations: Transformation[] = []
    const originalWords = original.toLowerCase().split(/\s+/)
    const enhancedWords = enhanced.toLowerCase().split(/\s+/)

    const commonPhrases = this.findCommonPhrases(originalWords, enhancedWords)

    // Identify replacements
    for (let i = 0; i < originalWords.length; i++) {
      const word = originalWords[i]
      if (!enhancedWords.includes(word) && !commonPhrases.has(word)) {
        const context = originalWords.slice(
          Math.max(0, i - 2),
          Math.min(originalWords.length, i + 3)
        )
        const replacement = this.findReplacement(context, enhancedWords)

        if (replacement) {
          transformations.push({
            type: 'replacement',
            from: word,
            to: replacement,
            position: i,
          })
        }
      }
    }

    // Identify additions
    const addedWords = enhancedWords.filter(
      word => !originalWords.includes(word) && !commonPhrases.has(word)
    )

    for (const added of addedWords) {
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
      patternGroups.get(patternKey)!.push(pattern)
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
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
      'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is',
      'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'should', 'could',
      'may', 'might', 'must', 'can', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    ])

    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10)
  }

  /**
   * Generate a unique key for pattern grouping
   */
  private generatePatternKey(
    transformations: Transformation[],
    keywords: string[]
  ): string {
    const transformationTypes = transformations
      .map(t => t.type)
      .sort()
      .join('-')
    const keywordSet = keywords.slice(0, 3).sort().join('-')
    return `${transformationTypes}:${keywordSet}`
  }

  /**
   * Find common phrases between two word arrays
   */
  private findCommonPhrases(
    words1: string[],
    words2: string[]
  ): Set<string> {
    const common = new Set<string>()
    const words2Set = new Set(words2)

    for (const word of words1) {
      if (words2Set.has(word)) {
        common.add(word)
      }
    }

    return common
  }

  /**
   * Find replacement word in enhanced text based on context
   */
  private findReplacement(
    context: string[],
    enhancedWords: string[]
  ): string | null {
    for (let i = 0; i < enhancedWords.length; i++) {
      const enhancedContext = enhancedWords.slice(
        Math.max(0, i - 2),
        Math.min(enhancedWords.length, i + 3)
      )

      const similarity = this.contextSimilarity(context, enhancedContext)
      if (similarity > 0.6) {
        return enhancedWords[i]
      }
    }

    return null
  }

  /**
   * Calculate context similarity
   */
  private contextSimilarity(context1: string[], context2: string[]): number {
    const set1 = new Set(context1)
    const set2 = new Set(context2)
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])

    return union.size > 0 ? intersection.size / union.size : 0
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