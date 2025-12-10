/**
 * Hybrid Rate Limiter
 *
 * Provides a unified rate limiting interface that:
 * 1. Uses Durable Objects when available (strongly consistent, sub-ms)
 * 2. Falls back to KV (eventually consistent, but works on Pages)
 *
 * This allows a gradual migration path:
 * - Start with KV-only (works immediately on Pages)
 * - Add DO Worker + service binding for better consistency
 * - Hybrid gracefully handles either configuration
 */

import {
  DistributedRateLimiter,
  getClientIdentifier as getClientId,
  createRateLimitResponse as createRateLimitResp,
  type RateLimitResult,
  type RateLimitConfig,
  DEFAULT_RATE_LIMITS
} from './rate-limiter';

import {
  DurableObjectRateLimiter,
  RATE_LIMIT_CONFIGS as DO_RATE_LIMITS
} from './rate-limiter-durable-object';

// Re-export utilities
export { getClientId as getClientIdentifier };
export { createRateLimitResp as createRateLimitResponse };
export type { RateLimitResult, RateLimitConfig };

// KV Namespace type
interface KVNamespace {
  get<T = unknown>(key: string, options?: { type: 'json' }): Promise<T | null>;
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

// Durable Object Namespace type
interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

interface DurableObjectId {
  toString(): string;
}

interface DurableObjectStub {
  fetch(request: Request): Promise<Response>;
}

export interface HybridRateLimiterEnv {
  CACHE_STORAGE?: KVNamespace;
  RATE_LIMITER?: DurableObjectNamespace;
}

/**
 * Hybrid Rate Limiter
 *
 * Tries Durable Objects first (if available) for strong consistency,
 * falls back to KV for eventual consistency.
 */
export class HybridRateLimiter {
  private doLimiter: DurableObjectRateLimiter | null = null;
  private kvLimiter: DistributedRateLimiter | null = null;
  private preferDO: boolean;

  constructor(env: HybridRateLimiterEnv, preferDO: boolean = true) {
    this.preferDO = preferDO;

    // Initialize Durable Objects limiter if available
    if (env.RATE_LIMITER) {
      this.doLimiter = new DurableObjectRateLimiter(env.RATE_LIMITER);
    }

    // Initialize KV limiter if available (used as fallback or primary)
    if (env.CACHE_STORAGE) {
      this.kvLimiter = new DistributedRateLimiter(env.CACHE_STORAGE);
    }
  }

  /**
   * Check if rate limit is exceeded
   * Returns result with allowed: true/false and rate limit info
   */
  async checkRateLimit(
    clientIdentifier: string,
    endpoint: string
  ): Promise<RateLimitResult> {
    // Try Durable Objects first if preferred and available
    if (this.preferDO && this.doLimiter) {
      try {
        return await this.doLimiter.checkRateLimit(clientIdentifier, endpoint);
      } catch (error) {
        console.warn('Durable Object rate limiter failed, falling back to KV:', error);
        // Fall through to KV
      }
    }

    // Use KV limiter
    if (this.kvLimiter) {
      try {
        return await this.kvLimiter.checkRateLimit(clientIdentifier, endpoint);
      } catch (error) {
        console.error('KV rate limiter failed:', error);
        // On complete failure, allow the request but log
        return this.createAllowedResult(endpoint);
      }
    }

    // No rate limiter available - allow request
    console.warn('No rate limiter available');
    return this.createAllowedResult(endpoint);
  }

  /**
   * Get rate limit status without incrementing counter
   */
  async getRateLimitStatus(
    clientIdentifier: string,
    endpoint: string
  ): Promise<RateLimitResult> {
    if (this.preferDO && this.doLimiter) {
      try {
        return await this.doLimiter.getRateLimitStatus(clientIdentifier, endpoint);
      } catch (error) {
        console.warn('DO status check failed, falling back to KV:', error);
      }
    }

    if (this.kvLimiter) {
      try {
        return await this.kvLimiter.getRateLimitStatus(clientIdentifier, endpoint);
      } catch (error) {
        console.error('KV status check failed:', error);
        return this.createAllowedResult(endpoint);
      }
    }

    return this.createAllowedResult(endpoint);
  }

  /**
   * Reset rate limit for a client/endpoint
   */
  async resetRateLimit(
    clientIdentifier: string,
    endpoint: string
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.doLimiter) {
      promises.push(
        this.doLimiter.resetRateLimit(clientIdentifier, endpoint).catch(err => {
          console.warn('DO reset failed:', err);
        })
      );
    }

    if (this.kvLimiter) {
      promises.push(
        this.kvLimiter.resetRateLimit(clientIdentifier, endpoint).catch(err => {
          console.warn('KV reset failed:', err);
        })
      );
    }

    await Promise.all(promises);
  }

  /**
   * Check which rate limiter is being used
   */
  getActiveMode(): 'durable_objects' | 'kv' | 'none' {
    if (this.preferDO && this.doLimiter) return 'durable_objects';
    if (this.kvLimiter) return 'kv';
    return 'none';
  }

  /**
   * Check if rate limiter is available
   */
  isAvailable(): boolean {
    return this.doLimiter !== null || this.kvLimiter !== null;
  }

  /**
   * Create a default "allowed" result for when rate limiting fails
   */
  private createAllowedResult(endpoint: string): RateLimitResult {
    const config = DEFAULT_RATE_LIMITS[endpoint] || DEFAULT_RATE_LIMITS['default'];
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetTime: Date.now() + config.windowMs
    };
  }
}

/**
 * Create a hybrid rate limiter from environment
 */
export function createHybridRateLimiter(
  env: HybridRateLimiterEnv,
  preferDO: boolean = true
): HybridRateLimiter {
  return new HybridRateLimiter(env, preferDO);
}

/**
 * Rate limit middleware helper
 * Returns null if allowed, or Response if rate limited
 */
export async function checkRateLimitMiddleware(
  request: Request,
  env: HybridRateLimiterEnv,
  endpoint: string,
  corsHeaders: Record<string, string> = {}
): Promise<Response | null> {
  const limiter = createHybridRateLimiter(env);

  if (!limiter.isAvailable()) {
    console.warn('Rate limiting not configured');
    return null; // Allow if not configured
  }

  const clientId = getClientId(request);
  const result = await limiter.checkRateLimit(clientId, endpoint);

  if (!result.allowed) {
    return createRateLimitResp(result, corsHeaders);
  }

  return null; // Allowed
}
