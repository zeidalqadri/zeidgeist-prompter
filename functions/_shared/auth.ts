/**
 * Simple API key-based authentication for ZeidGeist AI Prompter
 * Provides basic rate limiting and access control for production deployment
 */

export interface AuthResult {
  success: boolean;
  error?: string;
  userId?: string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// Default rate limits
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/engineer': { windowMs: 60000, maxRequests: 10 }, // 10 requests per minute
  '/api/engineer/feedback': { windowMs: 60000, maxRequests: 5 }, // 5 feedback per minute
  '/api/engineer/history': { windowMs: 60000, maxRequests: 20 }, // 20 history requests per minute
  '/api/learning/status': { windowMs: 60000, maxRequests: 5 }, // 5 status checks per minute
  '/api/learning/trigger': { windowMs: 300000, maxRequests: 1 }, // 1 trigger per 5 minutes
};

// Simple in-memory rate limiting (for production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple API key authentication
 */
export function authenticateRequest(request: Request, env: any): AuthResult {
  // In development, allow unauthenticated access
  if (env.NODE_ENV === 'development') {
    return { success: true, userId: 'dev-user' };
  }

  const apiKey = request.headers.get('x-api-key') || request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return { success: false, error: 'API key required. Please include x-api-key header.' };
  }

  // Simple API key validation (in production, use proper key management)
  const validApiKeys = env.VALID_API_KEYS?.split(',') || [];
  
  if (validApiKeys.length === 0) {
    // If no API keys configured, allow access (for backward compatibility)
    return { success: true, userId: 'anonymous' };
  }

  if (!validApiKeys.includes(apiKey)) {
    return { success: false, error: 'Invalid API key' };
  }

  return { success: true, userId: `user-${apiKey.slice(-8)}` };
}

/**
 * Rate limiting based on IP address and endpoint
 */
export function checkRateLimit(request: Request, endpoint: string): AuthResult {
  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   request.headers.get('cf-connecting-ip') || 
                   'unknown';

  const rateLimitKey = `${clientIP}:${endpoint}`;
  const config = RATE_LIMITS[endpoint] || { windowMs: 60000, maxRequests: 30 };
  const now = Date.now();

  // Get or create rate limit entry
  let entry = rateLimitStore.get(rateLimitKey);
  
  if (!entry || now > entry.resetTime) {
    // Reset window
    entry = { count: 0, resetTime: now + config.windowMs };
    rateLimitStore.set(rateLimitKey, entry);
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    const resetIn = Math.ceil((entry.resetTime - now) / 1000);
    return { 
      success: false, 
      error: `Rate limit exceeded. Try again in ${resetIn} seconds.` 
    };
  }

  // Increment counter
  entry.count++;
  
  return { success: true };
}

/**
 * Combined authentication and rate limiting middleware
 */
export function validateRequest(request: Request, env: any, endpoint: string): AuthResult {
  // Check rate limiting first
  const rateLimitResult = checkRateLimit(request, endpoint);
  if (!rateLimitResult.success) {
    return rateLimitResult;
  }

  // Then check authentication
  const authResult = authenticateRequest(request, env);
  if (!authResult.success) {
    return authResult;
  }

  return { success: true, userId: authResult.userId };
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
 * Clean up old rate limit entries (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}