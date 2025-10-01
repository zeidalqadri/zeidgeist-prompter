/**
 * API key-based authentication for ZeidGeist AI Prompter
 * Uses distributed rate limiting via Cloudflare KV for production deployment
 *
 * DEPRECATED: The in-memory rate limiting has been replaced with distributed
 * rate limiting. See rate-limiter.ts for the new implementation.
 */

import {
  DistributedRateLimiter,
  getClientIdentifier,
  createRateLimitResponse,
  type RateLimitResult
} from './rate-limiter';

export interface AuthResult {
  success: boolean;
  error?: string;
  userId?: string;
}

// DEPRECATED: Legacy in-memory rate limiting - kept for backward compatibility
// Use DistributedRateLimiter instead
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

/**
 * Simple API key authentication with public endpoint support
 */
export function authenticateRequest(request: Request, env: any): AuthResult {
  // In development, allow unauthenticated access
  if (env.NODE_ENV === 'development') {
    return { success: true, userId: 'dev-user' };
  }

  // Only allow anonymous access to basic prompt enhancement endpoint
  const url = new URL(request.url);
  const isPublicEndpoint = url.pathname === '/api/engineer' || 
                          (url.pathname.includes('/api/engineer') && 
                           !url.pathname.includes('/history') && 
                           !url.pathname.includes('/feedback') &&
                           !url.pathname.includes('/admin') &&
                           !url.pathname.includes('/learning'));
  
  if (isPublicEndpoint) {
    return { success: true, userId: 'anonymous' };
  }

  const apiKey = request.headers.get('x-api-key') || request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return { success: false, error: 'API key required for this endpoint. Please include x-api-key header.' };
  }

  // Simple API key validation (in production, use proper key management)
  const validApiKeys = env.VALID_API_KEYS?.split(',') || [];
  
  if (validApiKeys.length === 0) {
    // No API keys configured - security violation, deny access
    return { success: false, error: 'Server configuration error: API authentication not properly configured' };
  }

  if (!validApiKeys.includes(apiKey)) {
    return { success: false, error: 'Invalid API key' };
  }

  return { success: true, userId: `user-${apiKey.slice(-8)}` };
}

/**
 * DEPRECATED: Legacy in-memory rate limiting function
 * Use checkRateLimitDistributed() instead
 *
 * This function is kept for backward compatibility but will not work correctly
 * in distributed Cloudflare Workers environments.
 *
 * @deprecated Use checkRateLimitDistributed() with KV namespace
 */
export function checkRateLimit(request: Request, endpoint: string): AuthResult {
  console.warn('DEPRECATED: checkRateLimit() uses in-memory storage and will not work in distributed environments. Use checkRateLimitDistributed() instead.');

  // Return success to avoid breaking existing code, but log warning
  return { success: true };
}

/**
 * Distributed rate limiting using Cloudflare KV
 * This is the recommended rate limiting approach for production
 */
export async function checkRateLimitDistributed(
  request: Request,
  endpoint: string,
  rateLimiterKV: KVNamespace
): Promise<{ allowed: boolean; result: RateLimitResult }> {
  const clientIdentifier = getClientIdentifier(request);
  const rateLimiter = new DistributedRateLimiter(rateLimiterKV);

  const result = await rateLimiter.checkRateLimit(clientIdentifier, endpoint);

  return {
    allowed: result.allowed,
    result
  };
}

/**
 * Combined authentication and rate limiting middleware
 *
 * @deprecated Use validateRequestWithKV() for distributed rate limiting
 */
export function validateRequest(request: Request, env: any, endpoint: string): AuthResult {
  console.warn('DEPRECATED: validateRequest() uses legacy rate limiting. Use validateRequestWithKV() instead.');

  // Skip deprecated rate limiting check
  // Check authentication
  const authResult = authenticateRequest(request, env);
  if (!authResult.success) {
    return authResult;
  }

  return { success: true, userId: authResult.userId };
}

/**
 * Combined authentication and distributed rate limiting middleware
 * This is the recommended validation approach for production
 */
export async function validateRequestWithKV(
  request: Request,
  env: any,
  endpoint: string,
  rateLimiterKV: KVNamespace
): Promise<{ success: boolean; userId?: string; error?: string; rateLimitResult?: RateLimitResult }> {
  // Check rate limiting first
  const { allowed, result } = await checkRateLimitDistributed(request, endpoint, rateLimiterKV);

  if (!allowed) {
    return {
      success: false,
      error: result.blocked
        ? 'Rate limit exceeded. Temporarily blocked due to repeated violations.'
        : `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
      rateLimitResult: result
    };
  }

  // Then check authentication
  const authResult = authenticateRequest(request, env);
  if (!authResult.success) {
    return {
      success: false,
      error: authResult.error,
      rateLimitResult: result
    };
  }

  return {
    success: true,
    userId: authResult.userId,
    rateLimitResult: result
  };
}

/**
 * Create standardized error response for auth failures
 */
export function createAuthErrorResponse(error: string, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({
    error: 'Authentication failed',
    message: error,
    timestamp: new Date().toISOString()
  }), {
    status: 401,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

/**
 * DEPRECATED: No longer needed with KV-based rate limiting
 * KV automatically handles expiration via TTL
 *
 * @deprecated KV handles cleanup automatically
 */
export function cleanupRateLimitStore(): void {
  // No-op - kept for backward compatibility
  console.warn('DEPRECATED: cleanupRateLimitStore() is no longer needed with KV-based rate limiting.');
}

/**
 * Legacy cleanup function - kept for reference
 */
function legacyCleanup(): void {
  const now = Date.now();
  const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}