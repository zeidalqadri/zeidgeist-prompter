/**
 * Predictive Prefetching System
 *
 * Analyzes user patterns and prefetches likely next requests:
 * - Sequential prompt patterns
 * - Time-based usage patterns
 * - User session analysis
 */

import { LLMCacheManager } from "./cache-manager"
import { getOptimizedDb } from "./db-pool"
import { enhancementLogs } from "../_shared/db"
import { desc, sql, and, gte } from "drizzle-orm"

export interface PrefetchPattern {
  promptSequence: string[]
  confidence: number
  frequency: number
  avgTimeBetween: number // milliseconds
}

export class PredictivePrefetcher {
  private cacheManager: LLMCacheManager
  private patterns: Map<string, PrefetchPattern> = new Map()

  constructor(kv: KVNamespace) {
    this.cacheManager = new LLMCacheManager(kv)
  }

  /**
   * Learn sequential patterns from historical data
   */
  async learnPatterns(env: any): Promise<void> {
    const db = getOptimizedDb(env)
    if (!db) {
      console.log('[Prefetcher] Database not available')
      return
    }

    try {
      console.log('[Prefetcher] Learning sequential patterns...')

      // Get recent enhancement sequences (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const recentLogs = await db
        .select()
        .from(enhancementLogs as any)
        .where(gte((enhancementLogs as any).createdAt, sevenDaysAgo))
        .orderBy(desc((enhancementLogs as any).createdAt))
        .limit(1000)

      // Analyze sequences (simplified approach)
      // In production, you'd want more sophisticated sequence mining
      const sequences = this.extractSequences(recentLogs, 2) // Pairs of prompts

      console.log(`[Prefetcher] Found ${sequences.length} sequential patterns`)

      // Store top patterns
      sequences.slice(0, 50).forEach(pattern => {
        const key = pattern.promptSequence[0] // First prompt in sequence
        this.patterns.set(key, pattern)
      })

      console.log(`[Prefetcher] Learned ${this.patterns.size} prefetch patterns`)
    } catch (error) {
      console.error('[Prefetcher] Error learning patterns:', error)
    }
  }

  /**
   * Predict next prompts based on current prompt
   */
  async predictNext(currentPrompt: string): Promise<string[]> {
    const normalizedPrompt = this.normalizePrompt(currentPrompt)
    const pattern = this.patterns.get(normalizedPrompt)

    if (!pattern) {
      return []
    }

    // Return next prompts in sequence (excluding current)
    return pattern.promptSequence.slice(1)
  }

  /**
   * Prefetch likely next requests
   */
  async prefetchNext(
    currentPrompt: string,
    env: any,
    enhancer: (prompt: string) => Promise<string>
  ): Promise<void> {
    try {
      const nextPrompts = await this.predictNext(currentPrompt)

      if (nextPrompts.length === 0) {
        console.log('[Prefetcher] No prefetch candidates found')
        return
      }

      console.log(`[Prefetcher] Prefetching ${nextPrompts.length} likely next prompts`)

      // Prefetch in background
      const prefetchPromises = nextPrompts.map(async (prompt) => {
        try {
          // Check if already cached
          const cached = await this.cacheManager.getCachedResponse(prompt, {})
          if (cached) {
            console.log(`[Prefetcher] ${prompt.substring(0, 30)}... already cached`)
            return
          }

          // Fetch and cache
          console.log(`[Prefetcher] Prefetching: ${prompt.substring(0, 30)}...`)
          const result = await enhancer(prompt)

          await this.cacheManager.cacheResponse(prompt, result, {
            temperature: 0.7,
            confidenceScore: 0.8 // Lower confidence for prefetched items
          })

          console.log(`[Prefetcher] Prefetched and cached: ${prompt.substring(0, 30)}...`)
        } catch (error) {
          console.error(`[Prefetcher] Failed to prefetch prompt:`, error)
        }
      })

      await Promise.all(prefetchPromises)
    } catch (error) {
      console.error('[Prefetcher] Error in prefetch:', error)
    }
  }

  /**
   * Extract sequential patterns from logs
   */
  private extractSequences(
    logs: any[],
    sequenceLength: number
  ): PrefetchPattern[] {
    const sequenceMap = new Map<string, {
      sequence: string[]
      count: number
      times: number[]
    }>()

    // Slide through logs to find sequences
    for (let i = 0; i < logs.length - sequenceLength + 1; i++) {
      const sequence = logs.slice(i, i + sequenceLength)
        .map(log => this.normalizePrompt(log.originalPrompt || ''))
        .filter(p => p.length > 0)

      if (sequence.length < sequenceLength) continue

      const key = sequence.join('|||')

      if (!sequenceMap.has(key)) {
        sequenceMap.set(key, {
          sequence,
          count: 0,
          times: []
        })
      }

      const entry = sequenceMap.get(key)!
      entry.count++

      // Track time between prompts
      if (i > 0) {
        const timeDiff = new Date(logs[i].createdAt).getTime() -
                        new Date(logs[i - 1].createdAt).getTime()
        entry.times.push(timeDiff)
      }
    }

    // Convert to patterns
    const patterns: PrefetchPattern[] = []

    sequenceMap.forEach((value, key) => {
      const avgTime = value.times.length > 0
        ? value.times.reduce((sum, t) => sum + t, 0) / value.times.length
        : 0

      // Calculate confidence based on frequency and consistency
      const frequency = value.count
      const timeConsistency = value.times.length > 0
        ? 1 - (this.standardDeviation(value.times) / avgTime)
        : 0

      const confidence = Math.min(1, (frequency / 10) * 0.7 + timeConsistency * 0.3)

      if (confidence >= 0.3) { // Minimum confidence threshold
        patterns.push({
          promptSequence: value.sequence,
          confidence,
          frequency,
          avgTimeBetween: avgTime
        })
      }
    })

    // Sort by confidence and frequency
    patterns.sort((a, b) => {
      const scoreA = a.confidence * 0.7 + (a.frequency / 100) * 0.3
      const scoreB = b.confidence * 0.7 + (b.frequency / 100) * 0.3
      return scoreB - scoreA
    })

    return patterns
  }

  /**
   * Normalize prompt for pattern matching
   */
  private normalizePrompt(prompt: string): string {
    return prompt.toLowerCase().trim().substring(0, 100) // First 100 chars
  }

  /**
   * Calculate standard deviation
   */
  private standardDeviation(values: number[]): number {
    if (values.length === 0) return 0

    const avg = values.reduce((sum, v) => sum + v, 0) / values.length
    const squareDiffs = values.map(v => Math.pow(v - avg, 2))
    const avgSquareDiff = squareDiffs.reduce((sum, v) => sum + v, 0) / values.length

    return Math.sqrt(avgSquareDiff)
  }
}
