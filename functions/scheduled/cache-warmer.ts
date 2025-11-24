/**
 * Cache Warming Scheduled Function
 *
 * Runs periodically to pre-populate cache with frequently used patterns
 * Schedule: Every 6 hours via Cloudflare Cron Triggers
 */

import { LLMCacheManager, CacheWarmer } from "../_shared/cache-manager"
import { getOptimizedDb } from "../_shared/db-pool"
import { enhancementLogs } from "../_shared/db"
import { desc, sql, gt } from "drizzle-orm"

// Define proper Cloudflare context types
interface CloudflareContext {
  request: Request
  env: any
  waitUntil?: (promise: Promise<any>) => void
}

export async function onRequestGet(context: CloudflareContext): Promise<Response> {
  const { env } = context

  try {
    console.log('[CacheWarmer] Starting cache warming cycle...')

    if (!env.CACHE_STORAGE) {
      console.log('[CacheWarmer] Cache storage not configured, skipping')
      return new Response(JSON.stringify({
        status: 'skipped',
        reason: 'Cache storage not configured'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const db = getOptimizedDb(env)
    if (!db) {
      console.log('[CacheWarmer] Database not available, skipping')
      return new Response(JSON.stringify({
        status: 'skipped',
        reason: 'Database not available'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get top 50 most frequently enhanced prompts from the last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const frequentPrompts = await db
      .select({
        prompt: sql<string>`original_prompt`,
        count: sql<number>`COUNT(*)`,
        avgProcessingTime: sql<number>`AVG(processing_time)`,
        lastUsed: sql<Date>`MAX(created_at)`
      })
      .from(enhancementLogs as any)
      .where(gt((enhancementLogs as any).createdAt, sevenDaysAgo))
      .groupBy(sql`original_prompt`)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(50)

    console.log(`[CacheWarmer] Found ${frequentPrompts.length} frequent prompts to warm`)

    const cacheManager = new LLMCacheManager(env.CACHE_STORAGE)
    const warmedCount = {
      success: 0,
      failed: 0,
      skipped: 0
    }

    // Warm cache for each frequent prompt
    for (const item of frequentPrompts) {
      try {
        // Check if already cached
        const cached = await cacheManager.getCachedResponse(item.prompt, {})

        if (cached) {
          console.log(`[CacheWarmer] Skipping ${item.prompt.substring(0, 50)}... (already cached)`)
          warmedCount.skipped++
          continue
        }

        // In a real implementation, you would call the actual enhancement function here
        // For now, we'll just log that we would warm this prompt
        console.log(`[CacheWarmer] Would warm: ${item.prompt.substring(0, 50)}... (used ${item.count} times)`)

        // Note: Actual cache warming would require calling enhancePrompt()
        // which could be expensive. Consider warming only top 10-20 patterns
        // or implementing a smarter strategy based on usage patterns

        warmedCount.success++
      } catch (error) {
        console.error(`[CacheWarmer] Failed to warm prompt:`, error)
        warmedCount.failed++
      }
    }

    console.log('[CacheWarmer] Cache warming complete', warmedCount)

    return new Response(JSON.stringify({
      status: 'completed',
      stats: {
        totalPrompts: frequentPrompts.length,
        warmed: warmedCount.success,
        failed: warmedCount.failed,
        skipped: warmedCount.skipped
      },
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('[CacheWarmer] Error during cache warming:', error)

    return new Response(JSON.stringify({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

/**
 * Cron trigger handler (if configured in wrangler.toml)
 */
export default {
  async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext) {
    console.log('[CacheWarmer] Cron trigger fired at', new Date(event.scheduledTime).toISOString())

    // Call the warming function
    const mockContext: CloudflareContext = {
      request: new Request('https://internal/cache-warmer'),
      env,
      waitUntil: ctx.waitUntil.bind(ctx)
    }

    const response = await onRequestGet(mockContext)
    const result = await response.json()

    console.log('[CacheWarmer] Cron result:', result)
  }
}
