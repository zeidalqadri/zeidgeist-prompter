/**
 * Cloudflare Edge Cache Manager
 *
 * Provides intelligent caching with:
 * - Cloudflare Cache API integration
 * - KV-based smart caching for LLM responses
 * - Stale-while-revalidate patterns
 * - Cache warming strategies
 */

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  swr?: number; // Stale-while-revalidate window in seconds
  tags?: string[]; // Cache tags for purging
  bypassCache?: boolean; // Skip cache for this request
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags?: string[];
}

export class EdgeCacheManager {
  constructor(
    private kv: KVNamespace,
    private cacheName: string = 'edge-cache'
  ) {}

  /**
   * Get cached response from Cloudflare Cache API
   * Falls back to KV storage if not in edge cache
   */
  async get<T>(
    key: string,
    options?: { preferKV?: boolean }
  ): Promise<T | null> {
    try {
      // Try edge cache first (unless preferKV is set)
      if (!options?.preferKV && typeof caches !== 'undefined') {
        const cache = await caches.open(this.cacheName);
        const cacheKey = this.buildCacheKey(key);
        const cached = await cache.match(cacheKey);

        if (cached) {
          const data = await cached.json();
          console.log(`[EdgeCache] HIT (Cache API): ${key}`);
          return data as T;
        }
      }

      // Fallback to KV storage
      const kvData = await this.kv.get<CacheEntry<T>>(key, { type: 'json' });

      if (kvData) {
        const now = Date.now();
        const age = now - kvData.timestamp;
        const isStale = age > kvData.ttl * 1000;

        if (!isStale) {
          console.log(`[EdgeCache] HIT (KV): ${key}`);
          return kvData.data;
        } else {
          console.log(`[EdgeCache] STALE (KV): ${key}, age: ${age}ms`);
          return null;
        }
      }

      console.log(`[EdgeCache] MISS: ${key}`);
      return null;
    } catch (error) {
      console.error(`[EdgeCache] Error getting cache for ${key}:`, error);
      return null;
    }
  }

  /**
   * Store response in both Cache API and KV
   */
  async set<T>(
    key: string,
    data: T,
    config: CacheConfig
  ): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: config.ttl,
        tags: config.tags,
      };

      // Store in KV with TTL
      await this.kv.put(key, JSON.stringify(entry), {
        expirationTtl: config.ttl + (config.swr || 0),
      });

      // Store in Cache API if available
      if (typeof caches !== 'undefined') {
        const cache = await caches.open(this.cacheName);
        const cacheKey = this.buildCacheKey(key);

        const response = new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': config.swr
              ? `public, max-age=${config.ttl}, stale-while-revalidate=${config.swr}`
              : `public, max-age=${config.ttl}`,
            'Cache-Tags': config.tags?.join(',') || '',
            'X-Cache-Timestamp': Date.now().toString(),
          },
        });

        await cache.put(cacheKey, response);
      }

      console.log(`[EdgeCache] SET: ${key}, TTL: ${config.ttl}s`);
    } catch (error) {
      console.error(`[EdgeCache] Error setting cache for ${key}:`, error);
    }
  }

  /**
   * Invalidate cache entry
   */
  async invalidate(key: string): Promise<void> {
    try {
      await this.kv.delete(key);

      if (typeof caches !== 'undefined') {
        const cache = await caches.open(this.cacheName);
        const cacheKey = this.buildCacheKey(key);
        await cache.delete(cacheKey);
      }

      console.log(`[EdgeCache] INVALIDATED: ${key}`);
    } catch (error) {
      console.error(`[EdgeCache] Error invalidating cache for ${key}:`, error);
    }
  }

  /**
   * Purge cache by tags
   */
  async purgeByTag(tag: string): Promise<void> {
    // Note: Cloudflare Enterprise feature
    // For now, we'll implement basic KV-based tag purging
    console.log(`[EdgeCache] Purge by tag not fully implemented: ${tag}`);
    // TODO: Implement custom tag tracking in KV if needed
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
  }> {
    try {
      const stats = await this.kv.get<{ hits: number; misses: number }>(
        '_cache_stats',
        { type: 'json' }
      );

      if (!stats) {
        return { hits: 0, misses: 0, hitRate: 0 };
      }

      const total = stats.hits + stats.misses;
      const hitRate = total > 0 ? stats.hits / total : 0;

      return {
        ...stats,
        hitRate,
      };
    } catch (error) {
      console.error('[EdgeCache] Error getting stats:', error);
      return { hits: 0, misses: 0, hitRate: 0 };
    }
  }

  /**
   * Update cache statistics
   */
  async recordCacheHit(hit: boolean): Promise<void> {
    try {
      const stats = await this.kv.get<{ hits: number; misses: number }>(
        '_cache_stats',
        { type: 'json' }
      );

      const newStats = {
        hits: (stats?.hits || 0) + (hit ? 1 : 0),
        misses: (stats?.misses || 0) + (hit ? 0 : 1),
      };

      await this.kv.put('_cache_stats', JSON.stringify(newStats), {
        expirationTtl: 86400, // 24 hours
      });
    } catch (error) {
      console.error('[EdgeCache] Error recording cache hit:', error);
    }
  }

  /**
   * Build cache key with namespace
   */
  private buildCacheKey(key: string): string {
    return `https://cache.internal/${this.cacheName}/${key}`;
  }
}

/**
 * LLM Response Cache Manager
 * Specialized caching for AI provider responses
 */
export class LLMCacheManager extends EdgeCacheManager {
  constructor(kv: KVNamespace) {
    super(kv, 'llm-cache');
  }

  /**
   * Generate cache key from prompt and parameters
   */
  generateCacheKey(prompt: string, params: {
    provider?: string;
    model?: string;
    temperature?: number;
  }): string {
    const normalized = prompt.toLowerCase().trim();
    const hash = this.simpleHash(normalized);
    const provider = params.provider || 'default';
    const model = params.model || 'default';
    const temp = params.temperature || 0.7;

    return `llm:${provider}:${model}:${temp}:${hash}`;
  }

  /**
   * Get cached LLM response
   */
  async getCachedResponse(
    prompt: string,
    params: { provider?: string; model?: string; temperature?: number }
  ): Promise<string | null> {
    const key = this.generateCacheKey(prompt, params);
    const cached = await this.get<string>(key, { preferKV: true });

    if (cached) {
      await this.recordCacheHit(true);
      return cached;
    }

    await this.recordCacheHit(false);
    return null;
  }

  /**
   * Cache LLM response with smart TTL
   */
  async cacheResponse(
    prompt: string,
    response: string,
    params: {
      provider?: string;
      model?: string;
      temperature?: number;
      confidenceScore?: number;
    }
  ): Promise<void> {
    const key = this.generateCacheKey(prompt, params);

    // Smart TTL based on confidence score
    const baseTTL = 900; // 15 minutes
    const confidenceMultiplier = params.confidenceScore || 0.7;
    const ttl = Math.floor(baseTTL * (0.5 + confidenceMultiplier));

    await this.set(key, response, {
      ttl,
      swr: 300, // 5 minutes stale-while-revalidate
      tags: ['llm', params.provider || 'default'],
    });
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Cache warming utility
 * Pre-populates cache with frequently accessed data
 */
export class CacheWarmer {
  constructor(
    private cacheManager: EdgeCacheManager,
    private warmingPatterns: string[]
  ) {}

  /**
   * Warm cache with predefined patterns
   */
  async warmCache<T>(
    dataFetcher: (pattern: string) => Promise<T>,
    config: CacheConfig
  ): Promise<void> {
    console.log(`[CacheWarmer] Warming cache with ${this.warmingPatterns.length} patterns`);

    const promises = this.warmingPatterns.map(async (pattern) => {
      try {
        const data = await dataFetcher(pattern);
        await this.cacheManager.set(pattern, data, config);
      } catch (error) {
        console.error(`[CacheWarmer] Failed to warm ${pattern}:`, error);
      }
    });

    await Promise.all(promises);
    console.log('[CacheWarmer] Cache warming complete');
  }

  /**
   * Schedule periodic cache warming
   */
  scheduleWarming(intervalMs: number, callback: () => Promise<void>): void {
    setInterval(async () => {
      try {
        await callback();
      } catch (error) {
        console.error('[CacheWarmer] Scheduled warming failed:', error);
      }
    }, intervalMs);
  }
}
