/**
 * AI Provider Selection Optimizer
 *
 * Intelligently selects AI providers based on:
 * - Historical performance metrics
 * - Success rates
 * - Response times
 * - Cost efficiency
 * - Current load/availability
 */

import { getOptimizedDb } from "./db-pool"
import { enhancementLogs } from "../_shared/db"
import { eq, and, gte, sql } from "drizzle-orm"

export interface ProviderMetrics {
  provider: string
  successRate: number
  avgResponseTime: number
  totalRequests: number
  errorRate: number
  lastUsed: Date
  score: number // 0-100, higher is better
}

export interface ProviderSelectionConfig {
  preferredProviders?: string[]
  excludeProviders?: string[]
  prioritizeSpeed?: boolean
  prioritizeCost?: boolean
  useLoadBalancing?: boolean
}

export class ProviderOptimizer {
  private metricsCache: Map<string, ProviderMetrics> = new Map()
  private cacheExpiry: number = 5 * 60 * 1000 // 5 minutes

  /**
   * Select optimal AI provider based on current metrics
   */
  async selectProvider(
    env: any,
    config: ProviderSelectionConfig = {}
  ): Promise<string> {
    try {
      const metrics = await this.getProviderMetrics(env)

      if (metrics.length === 0) {
        console.log('[ProviderOptimizer] No metrics available, using random selection')
        return this.getRandomProvider(config)
      }

      // Filter by preferences
      let candidates = metrics.filter(m => {
        if (config.excludeProviders?.includes(m.provider)) return false
        if (config.preferredProviders && config.preferredProviders.length > 0) {
          return config.preferredProviders.includes(m.provider)
        }
        return true
      })

      if (candidates.length === 0) {
        console.log('[ProviderOptimizer] No candidates after filtering, using random')
        return this.getRandomProvider(config)
      }

      // Calculate weighted scores
      candidates = candidates.map(m => ({
        ...m,
        score: this.calculateProviderScore(m, config)
      }))

      // Sort by score
      candidates.sort((a, b) => b.score - a.score)

      if (config.useLoadBalancing) {
        // Weighted random selection (top performers more likely)
        const selected = this.weightedRandomSelection(candidates)
        console.log(`[ProviderOptimizer] Selected ${selected.provider} (score: ${selected.score.toFixed(2)}, load balanced)`)
        return selected.provider
      } else {
        // Select best performer
        const best = candidates[0]
        console.log(`[ProviderOptimizer] Selected ${best.provider} (score: ${best.score.toFixed(2)})`)
        return best.provider
      }
    } catch (error) {
      console.error('[ProviderOptimizer] Error selecting provider:', error)
      return this.getRandomProvider(config)
    }
  }

  /**
   * Get provider performance metrics
   */
  async getProviderMetrics(env: any): Promise<ProviderMetrics[]> {
    // Check cache first
    const now = Date.now()
    const cachedMetrics = Array.from(this.metricsCache.values())

    if (cachedMetrics.length > 0 && cachedMetrics[0]) {
      const age = now - cachedMetrics[0].lastUsed.getTime()
      if (age < this.cacheExpiry) {
        console.log('[ProviderOptimizer] Using cached metrics')
        return cachedMetrics
      }
    }

    // Fetch from database
    const db = getOptimizedDb(env)
    if (!db) {
      console.log('[ProviderOptimizer] Database not available')
      return []
    }

    try {
      // Get metrics from last 24 hours
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)

      const results = await db
        .select({
          provider: sql<string>`source`,
          totalRequests: sql<number>`COUNT(*)`,
          successRequests: sql<number>`SUM(CASE WHEN had_error = false THEN 1 ELSE 0 END)`,
          errorRequests: sql<number>`SUM(CASE WHEN had_error = true THEN 1 ELSE 0 END)`,
          avgResponseTime: sql<number>`AVG(processing_time)`,
          lastUsed: sql<Date>`MAX(created_at)`
        })
        .from(enhancementLogs as any)
        .where(
          and(
            gte((enhancementLogs as any).createdAt, oneDayAgo),
            sql`source IN ('claude', 'openai', 'mistral', 'moonshot', 'gemini')`
          )
        )
        .groupBy(sql`source`)

      const metrics: ProviderMetrics[] = results.map(r => {
        const totalRequests = r.totalRequests || 1
        const successRequests = r.successRequests || 0
        const errorRequests = r.errorRequests || 0

        return {
          provider: r.provider,
          successRate: successRequests / totalRequests,
          avgResponseTime: r.avgResponseTime || 2000,
          totalRequests,
          errorRate: errorRequests / totalRequests,
          lastUsed: new Date(r.lastUsed),
          score: 0 // Will be calculated later
        }
      })

      // Update cache
      this.metricsCache.clear()
      metrics.forEach(m => this.metricsCache.set(m.provider, m))

      console.log(`[ProviderOptimizer] Fetched metrics for ${metrics.length} providers`)
      return metrics
    } catch (error) {
      console.error('[ProviderOptimizer] Error fetching metrics:', error)
      return []
    }
  }

  /**
   * Calculate provider score (0-100)
   */
  private calculateProviderScore(
    metrics: ProviderMetrics,
    config: ProviderSelectionConfig
  ): number {
    let score = 0

    // Success rate (40 points max)
    score += metrics.successRate * 40

    // Response time (30 points max, inverse relationship)
    const speedScore = Math.max(0, 30 - (metrics.avgResponseTime / 100))
    score += config.prioritizeSpeed ? speedScore * 1.5 : speedScore

    // Volume/reliability (20 points max)
    const volumeScore = Math.min(20, (metrics.totalRequests / 10) * 20)
    score += volumeScore

    // Error rate penalty (up to -20 points)
    score -= metrics.errorRate * 20

    // Recency bonus (10 points max)
    const hoursSinceLastUse = (Date.now() - metrics.lastUsed.getTime()) / (1000 * 60 * 60)
    const recencyScore = Math.max(0, 10 - hoursSinceLastUse)
    score += recencyScore

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Weighted random selection for load balancing
   */
  private weightedRandomSelection(providers: ProviderMetrics[]): ProviderMetrics {
    const totalScore = providers.reduce((sum, p) => sum + p.score, 0)
    let random = Math.random() * totalScore

    for (const provider of providers) {
      random -= provider.score
      if (random <= 0) {
        return provider
      }
    }

    return providers[0] // Fallback
  }

  /**
   * Get random provider (fallback)
   */
  private getRandomProvider(config: ProviderSelectionConfig): string {
    const allProviders = ['claude', 'openai', 'mistral', 'moonshot', 'gemini']

    let available = allProviders.filter(p => {
      if (config.excludeProviders?.includes(p)) return false
      if (config.preferredProviders && config.preferredProviders.length > 0) {
        return config.preferredProviders.includes(p)
      }
      return true
    })

    if (available.length === 0) {
      available = allProviders
    }

    return available[Math.floor(Math.random() * available.length)]
  }

  /**
   * Clear metrics cache
   */
  clearCache(): void {
    this.metricsCache.clear()
  }
}

/**
 * Global provider optimizer singleton
 */
let globalOptimizer: ProviderOptimizer | null = null

export function getProviderOptimizer(): ProviderOptimizer {
  if (!globalOptimizer) {
    globalOptimizer = new ProviderOptimizer()
  }
  return globalOptimizer
}
