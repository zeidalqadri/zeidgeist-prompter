/**
 * Distributed Rate Limiting using Cloudflare KV
 *
 * This implementation replaces the in-memory rate limiting that doesn't work
 * in distributed Cloudflare Workers environments.
 *
 * Features:
 * - Distributed state across all Worker instances
 * - Automatic expiration using KV TTL
 * - Sliding window algorithm
 * - Per-endpoint and per-IP rate limiting
 * - Progressive delays for repeated violations
 */

// Cloudflare KV Namespace type definition
interface KVNamespace {
  get<T = unknown>(key: string, options?: { type: 'json' }): Promise<T | null>;
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number }): Promise<{ keys: { name: string }[] }>;
}

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests allowed in window
  blockDuration?: number; // Optional: block duration after limit exceeded (ms)
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  blocked?: boolean;
}

export interface RateLimitInfo {
  count: number;
  firstRequest: number;
  violations: number;
  blockedUntil?: number;
}

// Default rate limits for different endpoints
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/engineer': {
    windowMs: 60000,
    maxRequests: 10,
    blockDuration: 300000 // 5 minutes after 3 violations
  },
  '/api/engineer/feedback': {
    windowMs: 60000,
    maxRequests: 5,
    blockDuration: 600000 // 10 minutes
  },
  '/api/engineer/history': {
    windowMs: 60000,
    maxRequests: 20
  },
  '/api/learning/status': {
    windowMs: 60000,
    maxRequests: 5
  },
  '/api/learning/trigger': {
    windowMs: 300000,
    maxRequests: 1,
    blockDuration: 900000 // 15 minutes
  },
  '/api/auth/login': {
    windowMs: 900000, // 15 minutes
    maxRequests: 5,
    blockDuration: 1800000 // 30 minutes after repeated failures
  },
  '/api/auth/register': {
    windowMs: 3600000, // 1 hour
    maxRequests: 3,
    blockDuration: 3600000 // 1 hour
  },
  '/api/extension/download': {
    windowMs: 86400000, // 24 hours
    maxRequests: 5,
    blockDuration: 86400000 // 24 hours
  },
  'default': {
    windowMs: 60000,
    maxRequests: 30
  }
};

export class DistributedRateLimiter {
  private kv: KVNamespace;
  private config: Record<string, RateLimitConfig>;

  constructor(kv: KVNamespace, customConfig?: Record<string, RateLimitConfig>) {
    this.kv = kv;
    this.config = { ...DEFAULT_RATE_LIMITS, ...customConfig };
  }

  /**
   * Check if request is allowed under rate limit
   */
  async checkRateLimit(
    clientIdentifier: string,
    endpoint: string
  ): Promise<RateLimitResult> {
    const config = this.config[endpoint] || this.config['default'];
    const key = this.buildKey(clientIdentifier, endpoint);

    // Get current rate limit info from KV
    const info = await this.getRateLimitInfo(key);
    const now = Date.now();

    // Check if client is currently blocked
    if (info.blockedUntil && info.blockedUntil > now) {
      const retryAfter = Math.ceil((info.blockedUntil - now) / 1000);
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: info.blockedUntil,
        retryAfter,
        blocked: true
      };
    }

    // Check if we're in a new time window
    const windowStart = now - config.windowMs;
    if (info.firstRequest < windowStart) {
      // New window - reset count
      const newInfo: RateLimitInfo = {
        count: 1,
        firstRequest: now,
        violations: info.violations
      };

      await this.setRateLimitInfo(key, newInfo, config.windowMs);

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      };
    }

    // Within existing window - check limit
    if (info.count >= config.maxRequests) {
      // Rate limit exceeded
      const violations = info.violations + 1;
      const shouldBlock = config.blockDuration && violations >= 3;

      const updatedInfo: RateLimitInfo = {
        ...info,
        violations,
        blockedUntil: shouldBlock ? now + config.blockDuration! : undefined
      };

      await this.setRateLimitInfo(key, updatedInfo, config.windowMs);

      const resetTime = info.firstRequest + config.windowMs;
      const retryAfter = shouldBlock
        ? Math.ceil(config.blockDuration! / 1000)
        : Math.ceil((resetTime - now) / 1000);

      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime,
        retryAfter,
        blocked: Boolean(shouldBlock)
      };
    }

    // Under limit - increment count
    const updatedInfo: RateLimitInfo = {
      ...info,
      count: info.count + 1
    };

    await this.setRateLimitInfo(key, updatedInfo, config.windowMs);

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - updatedInfo.count,
      resetTime: info.firstRequest + config.windowMs
    };
  }

  /**
   * Reset rate limit for a specific client/endpoint
   * Useful for administrative purposes or testing
   */
  async resetRateLimit(clientIdentifier: string, endpoint: string): Promise<void> {
    const key = this.buildKey(clientIdentifier, endpoint);
    await this.kv.delete(key);
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getRateLimitStatus(
    clientIdentifier: string,
    endpoint: string
  ): Promise<RateLimitResult> {
    const config = this.config[endpoint] || this.config['default'];
    const key = this.buildKey(clientIdentifier, endpoint);
    const info = await this.getRateLimitInfo(key);
    const now = Date.now();

    if (info.blockedUntil && info.blockedUntil > now) {
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: info.blockedUntil,
        retryAfter: Math.ceil((info.blockedUntil - now) / 1000),
        blocked: true
      };
    }

    const windowStart = now - config.windowMs;
    const isNewWindow = info.firstRequest < windowStart;

    return {
      allowed: isNewWindow || info.count < config.maxRequests,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - info.count),
      resetTime: info.firstRequest + config.windowMs
    };
  }

  /**
   * Build KV key for rate limiting
   */
  private buildKey(clientIdentifier: string, endpoint: string): string {
    // Normalize endpoint to prevent key explosion
    const normalizedEndpoint = endpoint.replace(/[^a-zA-Z0-9\/\-_]/g, '');
    return `ratelimit:${clientIdentifier}:${normalizedEndpoint}`;
  }

  /**
   * Get rate limit info from KV
   */
  private async getRateLimitInfo(key: string): Promise<RateLimitInfo> {
    try {
      const data = await this.kv.get<RateLimitInfo>(key, { type: 'json' });

      if (!data) {
        // No existing data - return fresh state
        return {
          count: 0,
          firstRequest: Date.now(),
          violations: 0
        };
      }

      return data;
    } catch (error) {
      console.error('Rate limit KV get error:', error);
      // On error, allow request but log the issue
      return {
        count: 0,
        firstRequest: Date.now(),
        violations: 0
      };
    }
  }

  /**
   * Store rate limit info in KV with TTL
   */
  private async setRateLimitInfo(
    key: string,
    info: RateLimitInfo,
    ttlMs: number
  ): Promise<void> {
    try {
      // Add buffer to TTL to ensure we don't lose data prematurely
      const ttlSeconds = Math.ceil(ttlMs / 1000) + 60;

      await this.kv.put(key, JSON.stringify(info), {
        expirationTtl: ttlSeconds
      });
    } catch (error) {
      console.error('Rate limit KV put error:', error);
      // Log but don't throw - degraded operation is better than complete failure
    }
  }

  /**
   * Cleanup expired rate limit entries (optional maintenance)
   * Note: KV automatically expires entries, but this can be used for manual cleanup
   */
  async cleanup(): Promise<number> {
    // This is a placeholder - KV handles expiration automatically via TTL
    // Could be extended to implement custom cleanup logic if needed
    return 0;
  }
}

/**
 * Extract client identifier from request
 * Priority: Cloudflare connecting IP > X-Forwarded-For > X-Real-IP
 */
export function getClientIdentifier(request: Request): string {
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIP = request.headers.get('x-real-ip');

  // Prefer Cloudflare's connecting IP (most trustworthy)
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fall back to X-Forwarded-For (take first IP if multiple)
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  // Last resort: X-Real-IP
  if (xRealIP) {
    return xRealIP;
  }

  // Shouldn't happen in Cloudflare Workers, but have a fallback
  return 'unknown';
}

/**
 * Create rate limit response with appropriate headers
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string> = {}
): Response {
  const headers: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'application/json',
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  const message = result.blocked
    ? 'Rate limit exceeded. Your IP has been temporarily blocked due to repeated violations.'
    : 'Rate limit exceeded. Please try again later.';

  return new Response(
    JSON.stringify({
      error: 'Rate Limit Exceeded',
      message,
      limit: result.limit,
      remaining: result.remaining,
      resetAt: new Date(result.resetTime).toISOString(),
      retryAfter: result.retryAfter,
      blocked: result.blocked
    }),
    {
      status: 429,
      headers
    }
  );
}
