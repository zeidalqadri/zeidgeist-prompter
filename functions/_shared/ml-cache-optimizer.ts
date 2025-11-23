/**
 * ML-Based Cache Optimizer
 *
 * Uses learning patterns and usage statistics to optimize caching strategy:
 * - Predicts which prompts should be cached longer
 * - Identifies patterns that benefit from caching
 * - Adjusts TTL based on usage frequency and confidence
 */

import { LLMCacheManager } from "./cache-manager"
import { getOptimizedDb } from "./db-pool"
import { enhancementLogs } from "../_shared/db"
import { desc, sql, gt, and, eq } from "drizzle-orm"

export interface CacheOptimizationMetrics {
  promptHash: string
  usageFrequency: number
  avgConfidence: number
  avgProcessingTime: number
  lastUsed: Date
  recommendedTTL: number
  shouldPrefetch: boolean
}

export class MLCacheOptimizer {
  private cacheManager: LLMCacheManager

  constructor(kv: KVNamespace) {
    this.cacheManager = new LLMCacheManager(kv)
  }

  /**
   * Analyze usage patterns and recommend cache strategies
   */
  async analyzeUsagePatterns(env: any): Promise<CacheOptimizationMetrics[]> {
    const db = getOptimizedDb(env)
    if (!db) {
      console.log('[MLCacheOptimizer] Database not available')
      return []
    }

    // Analyze last 7 days of data
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    try {
      // Get aggregated metrics per unique prompt
      const metrics = await db
        .select({
          promptHash: sql<string>`MD5(original_prompt)`,
          usageCount: sql<number>`COUNT(*)`,
          avgProcessingTime: sql<number>`AVG(processing_time)`,
          lastUsed: sql<Date>`MAX(created_at)`,
          source: sql<string>`source`
        })
        .from(enhancementLogs as any)
        .where(gt((enhancementLogs as any).createdAt, sevenDaysAgo))
        .groupBy(sql`MD5(original_prompt)`, sql`source`)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(100)

      // Calculate optimization recommendations
      const optimizations: CacheOptimizationMetrics[] = metrics.map(m => {
        const frequency = m.usageCount
        const avgTime = m.avgProcessingTime || 1000

        // Calculate recommended TTL based on usage patterns
        const baseTTL = 900 // 15 minutes
        let recommendedTTL = baseTTL

        // High frequency prompts get longer cache
        if (frequency > 10) {
          recommendedTTL = 3600 // 1 hour
        } else if (frequency > 5) {
          recommendedTTL = 1800 // 30 minutes
        }

        // Expensive prompts (slow processing) get longer cache
        if (avgTime > 5000) {
          recommendedTTL *= 2
        }

        // Recent usage increases TTL
        const hoursSinceLastUse = (Date.now() - new Date(m.lastUsed).getTime()) / (1000 * 60 * 60)
        if (hoursSinceLastUse < 1) {
          recommendedTTL *= 1.5
        }

        // Should we prefetch this?
        const shouldPrefetch = frequency > 5 && hoursSinceLastUse < 24

        return {
          promptHash: m.promptHash,
          usageFrequency: frequency,
          avgConfidence: 0.8, // Placeholder - would come from learning system
          avgProcessingTime: avgTime,
          lastUsed: new Date(m.lastUsed),
          recommendedTTL: Math.min(recommendedTTL, 7200), // Cap at 2 hours
          shouldPrefetch
        }
      })

      console.log(`[MLCacheOptimizer] Analyzed ${optimizations.length} patterns`)
      return optimizations
    } catch (error) {
      console.error('[MLCacheOptimizer] Error analyzing patterns:', error)
      return []
    }
  }

  /**
   * Get optimal TTL for a given prompt based on ML predictions
   */
  async getOptimalTTL(
    prompt: string,
    env: any,
    defaultTTL: number = 900
  ): Promise<number> {
    try {
      const promptHash = this.hashPrompt(prompt)

      // Check if we have optimization data for this prompt pattern
      const optimizationKey = `opt:${promptHash}`
      const optimization = await this.cacheManager.get<CacheOptimizationMetrics>(
        optimizationKey,
        { preferKV: true }
      )

      if (optimization) {
        console.log(`[MLCacheOptimizer] Using optimized TTL: ${optimization.recommendedTTL}s for prompt`)
        return optimization.recommendedTTL
      }

      // Fallback to default
      return defaultTTL
    } catch (error) {
      console.error('[MLCacheOptimizer] Error getting optimal TTL:', error)
      return defaultTTL
    }
  }

  /**
   * Update cache optimization metadata
   */
  async updateOptimizationMetadata(env: any): Promise<void> {
    try {
      console.log('[MLCacheOptimizer] Updating optimization metadata...')

      const optimizations = await this.analyzeUsagePatterns(env)

      // Store optimization data for quick lookup
      for (const opt of optimizations) {
        const key = `opt:${opt.promptHash}`
        await this.cacheManager.set(key, opt, {
          ttl: 86400, // 24 hours
          tags: ['optimization-metadata']
        })
      }

      console.log(`[MLCacheOptimizer] Updated ${optimizations.length} optimization entries`)
    } catch (error) {
      console.error('[MLCacheOptimizer] Error updating optimization metadata:', error)
    }
  }

  /**
   * Identify prompts that should be prefetched
   */
  async getPrefe tchCandidates(env: any): Promise<string[]> {
    const optimizations = await this.analyzeUsagePatterns(env)

    return optimizations
      .filter(opt => opt.shouldPrefetch)
      .sort((a, b) => b.usageFrequency - a.usageFrequency)
      .slice(0, 20) // Top 20 candidates
      .map(opt => opt.promptHash)
  }

  /**
   * Calculate cache efficiency score
   */
  async calculateCacheEfficiency(env: any): Promise<{
    hitRate: number
    avgLatencyReduction: number
    costSavings: number
  }> {
    const stats = await this.cacheManager.getStats()

    // Calculate metrics
    const hitRate = stats.hitRate

    // Estimate latency reduction (cache hit ~50ms vs LLM call ~2000ms)
    const cacheLatency = 50
    const llmLatency = 2000
    const avgLatencyReduction = stats.hits * (llmLatency - cacheLatency)

    // Estimate cost savings (rough estimate: $0.01 per LLM call)
    const costPerLLMCall = 0.01
    const costSavings = stats.hits * costPerLLMCall

    return {
      hitRate,
      avgLatencyReduction,
      costSavings
    }
  }

  /**
   * Simple hash function for prompt
   */
  private hashPrompt(prompt: string): string {
    const normalized = prompt.toLowerCase().trim()
    let hash = 0
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }
}

/**
 * Scheduled function to update cache optimizations
 */
export async function updateCacheOptimizations(env: any, context: any): Promise<void> {
  if (!env.CACHE_STORAGE) {
    console.log('[MLCacheOptimizer] Cache storage not configured')
    return
  }

  const optimizer = new MLCacheOptimizer(env.CACHE_STORAGE)

  try {
    await optimizer.updateOptimizationMetadata(env)

    const efficiency = await optimizer.calculateCacheEfficiency(env)
    console.log('[MLCacheOptimizer] Cache efficiency:', {
      hitRate: `${(efficiency.hitRate * 100).toFixed(2)}%`,
      latencyReduction: `${efficiency.avgLatencyReduction}ms total`,
      costSavings: `$${efficiency.costSavings.toFixed(2)}`
    })
  } catch (error) {
    console.error('[MLCacheOptimizer] Error in scheduled optimization:', error)
  }
}
