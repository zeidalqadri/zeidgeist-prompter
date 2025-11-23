/**
 * Cloudflare Analytics Integration
 *
 * Exposes custom metrics for monitoring:
 * - Cache performance
 * - LLM usage statistics
 * - Provider performance
 * - Error rates
 * - Response times
 */

import { LLMCacheManager } from "../../_shared/cache-manager"
import { MLCacheOptimizer } from "../../_shared/ml-cache-optimizer"
import { getProviderOptimizer } from "../../_shared/provider-optimizer"
import { getOptimizedDb } from "../../_shared/db-pool"
import { enhancementLogs } from "../../_shared/db"
import { sql, gte } from "drizzle-orm"

export async function onRequestGet(context: any): Promise<Response> {
  const { env } = context

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  try {
    const metrics = await gatherMetrics(env)

    return new Response(JSON.stringify(metrics, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Cache-Control': 'public, max-age=60' // Cache for 1 minute
      }
    })
  } catch (error) {
    console.error('[Metrics] Error gathering metrics:', error)

    return new Response(JSON.stringify({
      error: 'Failed to gather metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: corsHeaders
    })
  }
}

export async function onRequestOptions(context: any): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}

/**
 * Gather comprehensive metrics
 */
async function gatherMetrics(env: any) {
  const metrics: any = {
    timestamp: new Date().toISOString(),
    cache: {},
    providers: {},
    performance: {},
    usage: {},
    errors: {}
  }

  // Cache metrics
  if (env.CACHE_STORAGE) {
    try {
      const cacheManager = new LLMCacheManager(env.CACHE_STORAGE)
      const cacheStats = await cacheManager.getStats()

      const optimizer = new MLCacheOptimizer(env.CACHE_STORAGE)
      const efficiency = await optimizer.calculateCacheEfficiency(env)

      metrics.cache = {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: (cacheStats.hitRate * 100).toFixed(2) + '%',
        total: cacheStats.hits + cacheStats.misses,
        latencyReduction: `${efficiency.avgLatencyReduction}ms`,
        estimatedCostSavings: `$${efficiency.costSavings.toFixed(2)}`
      }
    } catch (error) {
      console.error('[Metrics] Error gathering cache metrics:', error)
      metrics.cache.error = 'Failed to gather cache metrics'
    }
  }

  // Provider metrics
  try {
    const providerOptimizer = getProviderOptimizer()
    const providerMetrics = await providerOptimizer.getProviderMetrics(env)

    metrics.providers = providerMetrics.map(p => ({
      name: p.provider,
      successRate: (p.successRate * 100).toFixed(2) + '%',
      avgResponseTime: `${p.avgResponseTime.toFixed(0)}ms`,
      totalRequests: p.totalRequests,
      errorRate: (p.errorRate * 100).toFixed(2) + '%',
      score: p.score.toFixed(2)
    }))
  } catch (error) {
    console.error('[Metrics] Error gathering provider metrics:', error)
    metrics.providers.error = 'Failed to gather provider metrics'
  }

  // Performance metrics (last 24 hours)
  const db = getOptimizedDb(env)
  if (db) {
    try {
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)

      const perfStats = await db
        .select({
          totalRequests: sql<number>`COUNT(*)`,
          avgProcessingTime: sql<number>`AVG(processing_time)`,
          p50ProcessingTime: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY processing_time)`,
          p95ProcessingTime: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY processing_time)`,
          p99ProcessingTime: sql<number>`PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY processing_time)`,
          errorCount: sql<number>`SUM(CASE WHEN had_error = true THEN 1 ELSE 0 END)`
        })
        .from(enhancementLogs as any)
        .where(gte((enhancementLogs as any).createdAt, oneDayAgo))

      const stats = perfStats[0]
      if (stats) {
        metrics.performance = {
          totalRequests: stats.totalRequests,
          avgResponseTime: `${(stats.avgProcessingTime || 0).toFixed(0)}ms`,
          p50ResponseTime: `${(stats.p50ProcessingTime || 0).toFixed(0)}ms`,
          p95ResponseTime: `${(stats.p95ProcessingTime || 0).toFixed(0)}ms`,
          p99ResponseTime: `${(stats.p99ProcessingTime || 0).toFixed(0)}ms`,
          errorCount: stats.errorCount,
          errorRate: stats.totalRequests > 0
            ? `${((stats.errorCount / stats.totalRequests) * 100).toFixed(2)}%`
            : '0%'
        }
      }

      // Usage metrics
      const usageStats = await db
        .select({
          localEnhancements: sql<number>`SUM(CASE WHEN source = 'local' THEN 1 ELSE 0 END)`,
          llmEnhancements: sql<number>`SUM(CASE WHEN source IN ('claude', 'openai', 'mistral', 'moonshot', 'gemini') THEN 1 ELSE 0 END)`,
          hybridEnhancements: sql<number>`SUM(CASE WHEN source = 'hybrid' THEN 1 ELSE 0 END)`,
          cachedEnhancements: sql<number>`SUM(CASE WHEN source = 'cache' THEN 1 ELSE 0 END)`
        })
        .from(enhancementLogs as any)
        .where(gte((enhancementLogs as any).createdAt, oneDayAgo))

      const usage = usageStats[0]
      if (usage) {
        const total = usage.localEnhancements + usage.llmEnhancements +
                     usage.hybridEnhancements + usage.cachedEnhancements

        metrics.usage = {
          total,
          local: usage.localEnhancements,
          llm: usage.llmEnhancements,
          hybrid: usage.hybridEnhancements,
          cached: usage.cachedEnhancements,
          localPercentage: total > 0 ? `${((usage.localEnhancements / total) * 100).toFixed(2)}%` : '0%',
          llmDependency: total > 0 ? `${((usage.llmEnhancements / total) * 100).toFixed(2)}%` : '0%'
        }
      }
    } catch (error) {
      console.error('[Metrics] Error gathering performance metrics:', error)
      metrics.performance.error = 'Failed to gather performance metrics'
    }
  }

  return metrics
}

/**
 * Prometheus-compatible metrics endpoint
 */
export async function onRequestGetPrometheus(context: any): Promise<Response> {
  const { env } = context

  try {
    const metrics = await gatherMetrics(env)

    // Convert to Prometheus format
    let prometheusMetrics = '# HELP cache_hit_rate Cache hit rate percentage\n'
    prometheusMetrics += '# TYPE cache_hit_rate gauge\n'
    prometheusMetrics += `cache_hit_rate ${parseFloat(metrics.cache.hitRate) || 0}\n\n`

    prometheusMetrics += '# HELP total_requests_24h Total requests in last 24 hours\n'
    prometheusMetrics += '# TYPE total_requests_24h counter\n'
    prometheusMetrics += `total_requests_24h ${metrics.performance.totalRequests || 0}\n\n`

    prometheusMetrics += '# HELP avg_response_time_ms Average response time in milliseconds\n'
    prometheusMetrics += '# TYPE avg_response_time_ms gauge\n'
    prometheusMetrics += `avg_response_time_ms ${parseFloat(metrics.performance.avgResponseTime) || 0}\n\n`

    prometheusMetrics += '# HELP error_rate Error rate percentage\n'
    prometheusMetrics += '# TYPE error_rate gauge\n'
    prometheusMetrics += `error_rate ${parseFloat(metrics.performance.errorRate) || 0}\n\n`

    return new Response(prometheusMetrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4'
      }
    })
  } catch (error) {
    return new Response('# Error gathering metrics\n', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}
