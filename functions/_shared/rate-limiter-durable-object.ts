/**
 * Durable Object Rate Limiter
 *
 * Provides true distributed rate limiting with in-memory speed at the edge.
 * Uses Cloudflare Durable Objects for consistent state across all Workers.
 *
 * Advantages over KV-only approach:
 * - Sub-millisecond response times (in-memory state)
 * - Strong consistency (no eventual consistency issues)
 * - Automatic state persistence
 * - Per-client isolation
 */

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDuration?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  blocked?: boolean;
}

interface RateLimitState {
  count: number;
  firstRequest: number;
  violations: number;
  blockedUntil?: number;
}

// Default rate limits for different endpoints
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  '/api/engineer': { windowMs: 60000, maxRequests: 10, blockDuration: 300000 },
  '/api/engineer/feedback': { windowMs: 60000, maxRequests: 5, blockDuration: 600000 },
  '/api/engineer/history': { windowMs: 60000, maxRequests: 20 },
  '/api/learning/status': { windowMs: 60000, maxRequests: 5 },
  '/api/learning/trigger': { windowMs: 300000, maxRequests: 1, blockDuration: 900000 },
  '/api/auth/login': { windowMs: 900000, maxRequests: 5, blockDuration: 1800000 },
  '/api/auth/register': { windowMs: 3600000, maxRequests: 3, blockDuration: 3600000 },
  '/api/extension/download': { windowMs: 86400000, maxRequests: 5, blockDuration: 86400000 },
  'default': { windowMs: 60000, maxRequests: 30 }
};

/**
 * Durable Object class for rate limiting
 * Each instance handles rate limiting for a specific client IP
 */
export class RateLimiterDO {
  private state: DurableObjectState;
  private endpoints: Map<string, RateLimitState>;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.endpoints = new Map();
  }

  /**
   * Handle incoming fetch requests
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const endpoint = url.searchParams.get('endpoint') || 'default';
    const action = url.searchParams.get('action') || 'check';

    try {
      switch (action) {
        case 'check':
          return await this.checkRateLimit(endpoint);
        case 'reset':
          return await this.resetRateLimit(endpoint);
        case 'status':
          return await this.getRateLimitStatus(endpoint);
        default:
          return new Response(JSON.stringify({ error: 'Unknown action' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
      }
    } catch (error) {
      console.error('Rate limiter DO error:', error);
      return new Response(JSON.stringify({ error: 'Rate limit check failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Check if request is allowed and increment counter
   */
  private async checkRateLimit(endpoint: string): Promise<Response> {
    const config = RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS['default'];
    const now = Date.now();

    // Load state from storage if not in memory
    let state = this.endpoints.get(endpoint);
    if (!state) {
      state = await this.state.storage.get<RateLimitState>(`endpoint:${endpoint}`) || {
        count: 0,
        firstRequest: now,
        violations: 0
      };
      this.endpoints.set(endpoint, state);
    }

    // Check if client is blocked
    if (state.blockedUntil && state.blockedUntil > now) {
      const retryAfter = Math.ceil((state.blockedUntil - now) / 1000);
      return this.jsonResponse({
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: state.blockedUntil,
        retryAfter,
        blocked: true
      });
    }

    // Check if we're in a new time window
    const windowStart = now - config.windowMs;
    if (state.firstRequest < windowStart) {
      // New window - reset count
      state = {
        count: 1,
        firstRequest: now,
        violations: state.violations
      };
      this.endpoints.set(endpoint, state);
      await this.state.storage.put(`endpoint:${endpoint}`, state);

      return this.jsonResponse({
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      });
    }

    // Within existing window - check limit
    if (state.count >= config.maxRequests) {
      const violations = state.violations + 1;
      const shouldBlock = config.blockDuration && violations >= 3;

      state = {
        ...state,
        violations,
        blockedUntil: shouldBlock ? now + config.blockDuration! : undefined
      };
      this.endpoints.set(endpoint, state);
      await this.state.storage.put(`endpoint:${endpoint}`, state);

      const resetTime = state.firstRequest + config.windowMs;
      const retryAfter = shouldBlock
        ? Math.ceil(config.blockDuration! / 1000)
        : Math.ceil((resetTime - now) / 1000);

      return this.jsonResponse({
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime,
        retryAfter,
        blocked: Boolean(shouldBlock)
      });
    }

    // Under limit - increment count
    state = {
      ...state,
      count: state.count + 1
    };
    this.endpoints.set(endpoint, state);
    await this.state.storage.put(`endpoint:${endpoint}`, state);

    return this.jsonResponse({
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - state.count,
      resetTime: state.firstRequest + config.windowMs
    });
  }

  /**
   * Reset rate limit for an endpoint
   */
  private async resetRateLimit(endpoint: string): Promise<Response> {
    this.endpoints.delete(endpoint);
    await this.state.storage.delete(`endpoint:${endpoint}`);
    return this.jsonResponse({ reset: true, endpoint });
  }

  /**
   * Get rate limit status without incrementing
   */
  private async getRateLimitStatus(endpoint: string): Promise<Response> {
    const config = RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS['default'];
    const now = Date.now();

    let state = this.endpoints.get(endpoint);
    if (!state) {
      state = await this.state.storage.get<RateLimitState>(`endpoint:${endpoint}`) || {
        count: 0,
        firstRequest: now,
        violations: 0
      };
    }

    if (state.blockedUntil && state.blockedUntil > now) {
      return this.jsonResponse({
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: state.blockedUntil,
        retryAfter: Math.ceil((state.blockedUntil - now) / 1000),
        blocked: true
      });
    }

    const windowStart = now - config.windowMs;
    const isNewWindow = state.firstRequest < windowStart;

    return this.jsonResponse({
      allowed: isNewWindow || state.count < config.maxRequests,
      limit: config.maxRequests,
      remaining: isNewWindow ? config.maxRequests : Math.max(0, config.maxRequests - state.count),
      resetTime: state.firstRequest + config.windowMs
    });
  }

  private jsonResponse(data: any): Response {
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Durable Object Namespace stub type
 */
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

interface DurableObjectState {
  storage: DurableObjectStorage;
}

interface DurableObjectStorage {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
}

/**
 * Helper class to interact with the Rate Limiter Durable Object
 * Use this in your API endpoints
 */
export class DurableObjectRateLimiter {
  private namespace: DurableObjectNamespace;

  constructor(namespace: DurableObjectNamespace) {
    this.namespace = namespace;
  }

  /**
   * Check rate limit for a client/endpoint combination
   */
  async checkRateLimit(clientId: string, endpoint: string): Promise<RateLimitResult> {
    // Create a unique Durable Object ID for each client
    const id = this.namespace.idFromName(clientId);
    const stub = this.namespace.get(id);

    const url = new URL('https://rate-limiter.internal');
    url.searchParams.set('endpoint', endpoint);
    url.searchParams.set('action', 'check');

    const response = await stub.fetch(new Request(url.toString()));
    return await response.json() as RateLimitResult;
  }

  /**
   * Reset rate limit for a client/endpoint
   */
  async resetRateLimit(clientId: string, endpoint: string): Promise<void> {
    const id = this.namespace.idFromName(clientId);
    const stub = this.namespace.get(id);

    const url = new URL('https://rate-limiter.internal');
    url.searchParams.set('endpoint', endpoint);
    url.searchParams.set('action', 'reset');

    await stub.fetch(new Request(url.toString()));
  }

  /**
   * Get rate limit status without incrementing
   */
  async getRateLimitStatus(clientId: string, endpoint: string): Promise<RateLimitResult> {
    const id = this.namespace.idFromName(clientId);
    const stub = this.namespace.get(id);

    const url = new URL('https://rate-limiter.internal');
    url.searchParams.set('endpoint', endpoint);
    url.searchParams.set('action', 'status');

    const response = await stub.fetch(new Request(url.toString()));
    return await response.json() as RateLimitResult;
  }
}

/**
 * Extract client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIP = request.headers.get('x-real-ip');

  if (cfConnectingIP) return cfConnectingIP;
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
  if (xRealIP) return xRealIP;

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

// Export the Durable Object class for Cloudflare Workers
export { RateLimiterDO as RateLimiter };
