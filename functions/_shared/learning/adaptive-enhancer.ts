/**
 * Adaptive Enhancer for Cloudflare Workers
 *
 * This module enhances prompts using learned patterns, reducing dependency
 * on LLMs over time as it learns from successful enhancements.
 * Fully compatible with Cloudflare Workers runtime.
 */

import { createDb, trainingExamples, enhancementLogs } from '../db'
import { eq, and, gte, desc, sql } from 'drizzle-orm'
import { LearningService } from './service'
import type { TrainingExample, NewEnhancementLog } from '../db'

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

export class AdaptiveEnhancer {
  private learningService: LearningService
  private config: AdaptiveEnhancerConfig

  constructor(config: AdaptiveEnhancerConfig = {}) {
    this.learningService = new LearningService()
    this.config = {
      minConfidenceThreshold: config.minConfidenceThreshold || 0.65,
      maxPatternsToApply: config.maxPatternsToApply || 5,
      enableHybridMode: config.enableHybridMode !== false,
      hybridThreshold: config.hybridThreshold || 0.5
    }
  }

  /**
   * Attempt to enhance a prompt using learned patterns
   */
  async enhance(
    env: any,
    prompt: string,
    context?: string
  ): Promise<LocalEnhancement> {
    const db = createDb(env)

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

      // Log the local enhancement
      await this.logEnhancement(env, prompt, enhanced, confidence, patterns)

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
   */
  private async findMatchingPatterns(
    env: any,
    prompt: string,
    context?: string
  ): Promise<TrainingExample[]> {
    const db = createDb(env)
    if (!db) return []

    const promptKeywords = this.extractKeywords(prompt)
    const contextKeywords = context ? this.extractKeywords(context) : []
    const allKeywords = [...new Set([...promptKeywords, ...contextKeywords])]

    try {
      // Get all active patterns
      const patterns = await db
        .select()
        .from(trainingExamples)
        .where(
          and(
            eq(trainingExamples.isActive, true),
            gte(trainingExamples.quality, 60)
          )
        )
        .orderBy(desc(trainingExamples.quality))
        .limit(50)

      // Score and filter patterns
      const scoredPatterns = patterns.map((pattern: TrainingExample) => ({
        pattern,
        score: this.scorePattern(pattern, allKeywords, prompt)
      }))
        .filter((item: { pattern: TrainingExample; score: number }) => item.score > 0.3)
        .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
        .slice(0, this.config.maxPatternsToApply!)
        .map((item: { pattern: TrainingExample }) => item.pattern)

      return scoredPatterns
    } catch (error) {
      console.error('Failed to find matching patterns:', error)
      return []
    }
  }

  /**
   * Score a pattern based on relevance to the prompt
   */
  private scorePattern(
    pattern: TrainingExample,
    keywords: string[],
    prompt: string
  ): number {
    let score = 0

    // Keyword matching
    const patternKeywords = (pattern.keywords || '').split(',').map(k => k.trim().toLowerCase())
    const keywordMatches = keywords.filter(k => patternKeywords.includes(k.toLowerCase())).length
    score += (keywordMatches / Math.max(keywords.length, 1)) * 0.4

    // Similarity in prompt length
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

    // Simple transformation extraction
    // This is a simplified version - could be enhanced with more sophisticated NLP
    const rawWords = raw.toLowerCase().split(/\s+/)
    const enhancedWords = enhanced.toLowerCase().split(/\s+/)

    // Find added words/phrases
    const addedWords = enhancedWords.filter(w => !rawWords.includes(w))
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
        // Add content if it doesn't exist
        if (!prompt.toLowerCase().includes(transformation.content.toLowerCase())) {
          return `${prompt} ${transformation.content}`
        }
        break

      case 'structure':
        if (transformation.pattern === 'add-colon-separation' && !prompt.includes(':')) {
          // Add structure with colons
          const sentences = prompt.split(/[.!?]+/).filter(s => s.trim())
          if (sentences.length > 1) {
            return sentences[0] + ':\n' + sentences.slice(1).join('. ')
          }
        }
        if (transformation.pattern === 'add-line-breaks' && !prompt.includes('\n')) {
          // Add line breaks for better readability
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
    // Check if context is already integrated
    if (prompt.toLowerCase().includes(context.toLowerCase().substring(0, 20))) {
      return prompt
    }

    // Integrate context based on prompt structure
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

    // Average quality of patterns used
    const avgQuality = patterns.reduce((sum, p) => sum + (p.quality || 0), 0) / patterns.length

    // Boost confidence based on number of patterns
    const patternBoost = Math.min(patterns.length * 0.1, 0.3)

    // Calculate final confidence
    const confidence = (avgQuality / 100) * 0.7 + patternBoost

    return Math.min(confidence, 0.95) // Cap at 95%
  }

  /**
   * Log the enhancement for analytics
   */
  private async logEnhancement(
    env: any,
    original: string,
    enhanced: string,
    confidence: number,
    patterns: TrainingExample[]
  ): Promise<void> {
    const db = createDb(env)
    if (!db) return

    try {
      const log: NewEnhancementLog = {
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

      await db.insert(enhancementLogs).values(log)

      // Update usage count for patterns
      for (const pattern of patterns) {
        await db
          .update(trainingExamples)
          .set({
            usageCount: sql`${trainingExamples.usageCount} + 1`,
            updatedAt: new Date()
          })
          .where(eq(trainingExamples.id, pattern.id))
      }
    } catch (error) {
      console.error('Failed to log enhancement:', error)
    }
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
      'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is',
      'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had'
    ])

    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
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
    const db = createDb(env)
    if (!db) return null

    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      const stats = await db
        .select({
          totalLocal: sql<number>`count(*) filter (where source = 'local')`,
          totalLLM: sql<number>`count(*) filter (where source != 'local')`,
          avgProcessingTime: sql<number>`avg(processing_time)`
        })
        .from(enhancementLogs)
        .where(gte(enhancementLogs.createdAt, oneWeekAgo))

      return stats[0]
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