/**
 * Cache Health & Stats Endpoint
 *
 * Returns cache statistics and health metrics
 */

import { LLMCacheManager } from "../../_shared/cache-manager"

export async function onRequestGet(context: any): Promise<Response> {
  const { env } = context

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  try {
    if (!env.CACHE_STORAGE) {
      return new Response(JSON.stringify({
        status: 'disabled',
        message: 'Cache storage not configured'
      }), {
        status: 200,
        headers: corsHeaders
      })
    }

    const cacheManager = new LLMCacheManager(env.CACHE_STORAGE)
    const stats = await cacheManager.getStats()

    return new Response(JSON.stringify({
      status: 'healthy',
      stats: {
        hits: stats.hits,
        misses: stats.misses,
        hitRate: (stats.hitRate * 100).toFixed(2) + '%',
        total: stats.hits + stats.misses
      },
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: corsHeaders
    })
  } catch (error) {
    console.error('[CacheHealth] Error:', error)

    return new Response(JSON.stringify({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
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
