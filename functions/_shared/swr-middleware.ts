/// <reference types="@cloudflare/workers-types" />
/**
 * Stale-While-Revalidate Middleware
 *
 * Implements SWR pattern for API responses:
 * 1. Return cached data immediately if available (even if stale)
 * 2. Revalidate in background
 * 3. Update cache for next request
 */

import { EdgeCacheManager, CacheConfig } from "./cache-manager"

export interface SWRConfig extends CacheConfig {
  revalidate: (request: Request, env: any) => Promise<Response>
  shouldRevalidate?: (age: number) => boolean
  onRevalidate?: (newData: any) => void
}

export class SWRMiddleware {
  private cacheManager: EdgeCacheManager

  constructor(kv: KVNamespace) {
    this.cacheManager = new EdgeCacheManager(kv, 'swr-cache')
  }

  /**
   * Handle request with SWR pattern
   */
  async handleRequest(
    request: Request,
    env: any,
    context: any,
    config: SWRConfig
  ): Promise<Response> {
    const cacheKey = this.getCacheKey(request)

    try {
      // Try to get cached data
      const cached = await this.cacheManager.get<{
        response: any
        headers: Record<string, string>
      }>(cacheKey)

      if (cached) {
        const age = Date.now() - (cached as any).timestamp
        const maxAge = config.ttl * 1000
        const swrWindow = (config.swr || 0) * 1000

        // Within fresh window - return immediately
        if (age < maxAge) {
          console.log(`[SWR] Fresh cache hit: ${cacheKey}`)
          return this.buildResponse(cached.response, {
            ...cached.headers,
            'X-Cache': 'HIT',
            'X-Cache-Age': Math.floor(age / 1000).toString()
          })
        }

        // Within SWR window - return stale data, revalidate in background
        if (age < maxAge + swrWindow) {
          console.log(`[SWR] Stale cache hit, revalidating: ${cacheKey}`)

          // Return stale data immediately
          const staleResponse = this.buildResponse(cached.response, {
            ...cached.headers,
            'X-Cache': 'STALE',
            'X-Cache-Age': Math.floor(age / 1000).toString()
          })

          // Revalidate in background
          context.waitUntil(
            this.revalidate(request, env, config, cacheKey)
          )

          return staleResponse
        }

        // Beyond SWR window - must revalidate synchronously
        console.log(`[SWR] Cache expired, revalidating synchronously: ${cacheKey}`)
      }

      // No cache or expired - fetch fresh data
      console.log(`[SWR] Cache miss, fetching fresh: ${cacheKey}`)
      const freshResponse = await config.revalidate(request, env)
      const responseData = await freshResponse.clone().json()

      // Cache the fresh response
      await this.cacheManager.set(cacheKey, {
        response: responseData,
        headers: this.extractHeaders(freshResponse)
      }, config)

      return freshResponse
    } catch (error) {
      console.error(`[SWR] Error handling request:`, error)
      // Fallback to direct revalidation
      return config.revalidate(request, env)
    }
  }

  /**
   * Revalidate cache in background
   */
  private async revalidate(
    request: Request,
    env: any,
    config: SWRConfig,
    cacheKey: string
  ): Promise<void> {
    try {
      console.log(`[SWR] Background revalidation started: ${cacheKey}`)
      const freshResponse = await config.revalidate(request, env)
      const responseData = await freshResponse.json()

      // Update cache
      await this.cacheManager.set(cacheKey, {
        response: responseData,
        headers: this.extractHeaders(freshResponse)
      }, config)

      // Call onRevalidate callback if provided
      if (config.onRevalidate) {
        config.onRevalidate(responseData)
      }

      console.log(`[SWR] Background revalidation complete: ${cacheKey}`)
    } catch (error) {
      console.error(`[SWR] Background revalidation failed: ${cacheKey}`, error)
    }
  }

  /**
   * Generate cache key from request
   */
  private getCacheKey(request: Request): string {
    const url = new URL(request.url)
    const path = url.pathname
    const searchParams = Array.from(url.searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&')

    return `${request.method}:${path}${searchParams ? '?' + searchParams : ''}`
  }

  /**
   * Extract response headers
   */
  private extractHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      headers[key] = value
    })
    return headers
  }

  /**
   * Build response from cached data
   */
  private buildResponse(data: any, headers: Record<string, string>): Response {
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    })
  }
}

/**
 * SWR Wrapper for API endpoints
 */
export function withSWR(
  handler: (request: Request, env: any, context: any) => Promise<Response>,
  config: Omit<SWRConfig, 'revalidate'>
) {
  return async (context: any): Promise<Response> => {
    const { request, env } = context

    if (!env.CACHE_STORAGE) {
      // No cache available, call handler directly
      return handler(request, env, context)
    }

    const swr = new SWRMiddleware(env.CACHE_STORAGE)

    return swr.handleRequest(request, env, context, {
      ...config,
      revalidate: (req, e) => handler(req, e, context)
    })
  }
}
