/**
 * Dual-Mode History API
 * Supports both IP-based (legacy) and User-based (new) isolation
 * POST/GET /api/engineer/history
 */

import { createDb, promptHistory, NewPromptHistory } from "../../_shared/db"
import { getOptimizedDb, executeWithRetry } from "../../_shared/db-pool"
import { desc, sql, eq, and, isNull } from "drizzle-orm"
import { CloudflareAuthService } from "../../_shared/auth-service-workers"
import { 
  validatePrivacyAccess, 
  logPrivacyEvent, 
  isSharedNetwork,
  getSecurityHeaders,
  generateSessionFingerprint 
} from "../../_shared/privacy-guard"
import { monitorRequest, privacyMonitor } from "../../_shared/privacy-monitor"

// Feature flags for migration control
function getFeatures(env: any) {
  return {
    USER_AUTH_ENABLED: env.USER_AUTH_ENABLED === 'true',
    IP_FALLBACK_ENABLED: env.IP_FALLBACK_ENABLED !== 'false',
    DUAL_MODE_ENABLED: env.DUAL_MODE_ENABLED === 'true',
    FORCE_USER_AUTH: env.FORCE_USER_AUTH === 'true'
  };
}

interface RequestContext {
  userId?: string;
  email?: string;
  ipAddress: string;
  userAgent: string;
  sessionFingerprint: string;
  isAuthenticated: boolean;
  authMethod: 'USER' | 'IP' | 'NONE';
}

// Handle CORS preflight requests
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      ...getSecurityHeaders(),
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

/**
 * GET /api/engineer/history - Retrieve user's history with dual-mode support
 */
export async function onRequestGet(context: any): Promise<Response> {
  const { request, env } = context
  
  // Monitor request for security analytics
  monitorRequest(request, context)
  
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '0')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
  const offset = page * limit
  
  // Extract request context
  const requestContext = await extractRequestContext(request, env)
  
  const corsHeaders = {
    ...getSecurityHeaders(),
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store',
    'X-Auth-Method': requestContext.authMethod,
    'X-Dual-Mode': getFeatures(env).DUAL_MODE_ENABLED ? 'enabled' : 'disabled'
  }

  try {
    // Validate database connection
    if (!env?.DATABASE_URL) {
      console.error("Database configuration missing")
      return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), {
        status: 503,
        headers: corsHeaders
      })
    }

    // Get database connection
    const db = getOptimizedDb(env)
    
    // Determine isolation strategy based on request context
    const isolationResult = await determineIsolationStrategy(requestContext, env)
    
    if (!isolationResult.allowed) {
      // Log privacy violation attempt
      await logPrivacyEvent({
        timestamp: new Date(),
        action: 'denied',
        resource: '/api/engineer/history',
        requesterId: requestContext.ipAddress,
        reason: isolationResult.reason
      })
      
      return new Response(JSON.stringify({
        error: isolationResult.reason,
        requiresAuth: isolationResult.requiresAuth,
        migrationRequired: isolationResult.migrationRequired
      }), {
        status: isolationResult.requiresAuth ? 401 : 403,
        headers: corsHeaders
      })
    }

    // Execute appropriate query based on isolation method
    const [history, totalCountResult] = await executeWithRetry(async () => {
      if (requestContext.authMethod === 'USER') {
        // User-based isolation (new method)
        return Promise.all([
          db
            .select()
            .from(promptHistory)
            .where(eq(promptHistory.userId, requestContext.userId!))
            .orderBy(desc(promptHistory.timestamp))
            .limit(limit)
            .offset(offset),
          
          db
            .select({ count: sql<number>`count(*)` })
            .from(promptHistory)
            .where(eq(promptHistory.userId, requestContext.userId!))
        ])
      } else {
        // IP-based isolation (legacy method)
        return Promise.all([
          db
            .select()
            .from(promptHistory)
            .where(and(
              eq(promptHistory.ipAddress, requestContext.ipAddress),
              isNull(promptHistory.userId) // Only unlinked records
            ))
            .orderBy(desc(promptHistory.timestamp))
            .limit(limit)
            .offset(offset),
          
          db
            .select({ count: sql<number>`count(*)` })
            .from(promptHistory)
            .where(and(
              eq(promptHistory.ipAddress, requestContext.ipAddress),
              isNull(promptHistory.userId)
            ))
        ])
      }
    })

    const totalCount = totalCountResult[0]?.count || 0
    const hasMore = offset + history.length < totalCount
    const totalPages = Math.ceil(totalCount / limit)
    
    // Log successful access
    await logPrivacyEvent({
      timestamp: new Date(),
      action: 'access',
      resource: '/api/engineer/history',
      requesterId: requestContext.ipAddress,
      dataOwnerId: requestContext.userId || requestContext.ipAddress
    })

    // Transform data for client response
    const items = history.map((item: any) => ({
      original: item.original,
      refined: item.refined,
      context: item.context || undefined,
      timestamp: item.timestamp ? item.timestamp.toISOString() : new Date().toISOString(),
      metadata: item.metadata ? JSON.parse(item.metadata) : undefined
    }))

    // Include migration prompt for IP-based users if applicable
    const response: any = { 
      items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore,
        hasPrevious: page > 0
      }
    }

    // Add migration prompt for IP-based users
    if (requestContext.authMethod === 'IP' && getFeatures(env).USER_AUTH_ENABLED) {
      response.migrationPrompt = {
        message: "Create an account to secure your data and access from any device",
        benefits: [
          "Secure access from multiple devices",
          "Better privacy protection",
          "Two-factor authentication",
          "Preserved history across sessions"
        ],
        action: {
          url: "/auth/register",
          text: "Create Account"
        }
      }
    }

    return new Response(JSON.stringify(response), {
      headers: corsHeaders
    })

  } catch (error) {
    console.error("Error fetching history:", error)
    
    // Track system error
    privacyMonitor.trackViolation(requestContext.ipAddress, 'SYSTEM_ERROR', {
      endpoint: '/api/engineer/history',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return new Response(JSON.stringify({ 
      error: "Failed to fetch history. Please try again.",
      retryAfter: 5
    }), {
      status: 500,
      headers: corsHeaders
    })
  }
}

/**
 * POST /api/engineer/history - Store new history entry with dual-mode support
 */
export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context
  
  monitorRequest(request, context)
  
  // Extract request context
  const requestContext = await extractRequestContext(request, env)
  
  const corsHeaders = {
    ...getSecurityHeaders(),
    'Content-Type': 'application/json',
    'X-Auth-Method': requestContext.authMethod
  }

  try {
    const db = createDb(env)
    const body = await request.json()
    const { original, refined, context, timestamp, metadata } = body

    // Validate required fields
    if (!original || !refined) {
      return new Response(JSON.stringify({ 
        error: "Missing required fields: original and refined prompts" 
      }), {
        status: 400,
        headers: corsHeaders
      })
    }

    // Determine isolation strategy
    const isolationResult = await determineIsolationStrategy(requestContext, env)
    
    if (!isolationResult.allowed) {
      return new Response(JSON.stringify({
        error: isolationResult.reason,
        requiresAuth: isolationResult.requiresAuth
      }), {
        status: isolationResult.requiresAuth ? 401 : 403,
        headers: corsHeaders
      })
    }

    // Create new history record with appropriate isolation
    const newHistory: NewPromptHistory = {
      original,
      refined,
      context: context || null,
      timestamp: new Date(timestamp || Date.now()),
      metadata: metadata ? JSON.stringify(metadata) : null,
      userId: requestContext.userId || null,
      ipAddress: requestContext.ipAddress
    }

    // Insert into database
    await db.insert(promptHistory).values(newHistory)

    // Log for monitoring and audit
    console.log('History item stored:', {
      authMethod: requestContext.authMethod,
      userId: requestContext.userId || 'anonymous',
      ipAddress: requestContext.ipAddress,
      originalLength: original.length,
      refinedLength: refined.length,
      hasContext: !!context,
      timestamp: newHistory.timestamp?.toISOString()
    })

    // Log privacy event
    await logPrivacyEvent({
      timestamp: new Date(),
      action: 'access',
      resource: '/api/engineer/history',
      requesterId: requestContext.ipAddress,
      dataOwnerId: requestContext.userId || requestContext.ipAddress
    })

    const response: any = { 
      success: true, 
      message: "History item stored successfully",
      authMethod: requestContext.authMethod
    }

    // Add migration prompt for IP users
    if (requestContext.authMethod === 'IP' && getFeatures(env).USER_AUTH_ENABLED) {
      response.migrationPrompt = {
        message: "Your data is saved! Create an account to keep it secure.",
        action: { url: "/auth/register", text: "Secure My Data" }
      }
    }

    return new Response(JSON.stringify(response), {
      headers: corsHeaders
    })

  } catch (error) {
    console.error("Error storing history:", error)
    
    return new Response(JSON.stringify({ 
      error: "Failed to store history. Please try again." 
    }), {
      status: 500,
      headers: corsHeaders
    })
  }
}

/**
 * Extract and validate request context (user or IP-based)
 */
async function extractRequestContext(request: Request, env: any): Promise<RequestContext> {
  const ipAddress = request.headers.get('cf-connecting-ip') || 
                   request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
  
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const sessionFingerprint = await generateSessionFingerprint(request)
  
  // Try to authenticate user if token provided
  const authHeader = request.headers.get('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ') && getFeatures(env).USER_AUTH_ENABLED) {
    try {
      const token = authHeader.substring(7)
      const authService = new CloudflareAuthService(env)
      const user = await authService.validateToken(token)
      
      if (user) {
        return {
          userId: user.id,
          email: user.email,
          ipAddress,
          userAgent,
          sessionFingerprint,
          isAuthenticated: true,
          authMethod: 'USER'
        }
      }
    } catch (error) {
      console.warn('Token validation failed:', error)
    }
  }
  
  // Fall back to IP-based context
  return {
    ipAddress,
    userAgent,
    sessionFingerprint,
    isAuthenticated: false,
    authMethod: 'IP'
  }
}

/**
 * Determine isolation strategy based on request context and feature flags
 */
async function determineIsolationStrategy(
  requestContext: RequestContext, 
  env: any
): Promise<{
  allowed: boolean;
  reason?: string;
  requiresAuth?: boolean;
  migrationRequired?: boolean;
}> {
  // If user is authenticated, always use user-based isolation
  if (requestContext.isAuthenticated && requestContext.userId) {
    return { allowed: true }
  }
  
  const features = getFeatures(env);
  
  // If user auth is forced, require authentication
  if (features.FORCE_USER_AUTH) {
    return {
      allowed: false,
      reason: "User authentication is required. Please log in or create an account.",
      requiresAuth: true
    }
  }
  
  // If dual mode is disabled and user auth is enabled, require auth
  if (!features.DUAL_MODE_ENABLED && features.USER_AUTH_ENABLED) {
    return {
      allowed: false,
      reason: "Account required. IP-based access has been deprecated.",
      requiresAuth: true,
      migrationRequired: true
    }
  }
  
  // If IP fallback is disabled, require user auth
  if (!features.IP_FALLBACK_ENABLED) {
    return {
      allowed: false,
      reason: "User authentication is required.",
      requiresAuth: true
    }
  }
  
  // Check for suspicious IP patterns
  if (requestContext.ipAddress === 'unknown') {
    return {
      allowed: false,
      reason: "Unable to identify request source. Please ensure proper network configuration."
    }
  }
  
  // Validate IP access with privacy guard
  const privacyCheck = validatePrivacyAccess(
    {
      userId: requestContext.ipAddress, // Use IP as user ID for legacy check
      ipAddress: requestContext.ipAddress
    },
    requestContext.ipAddress
  )
  
  if (!privacyCheck.isValid) {
    privacyMonitor.trackViolation(requestContext.ipAddress, 'PRIVACY_VIOLATION', {
      reason: privacyCheck.reason,
      riskScore: privacyCheck.riskScore
    })
    
    return {
      allowed: false,
      reason: privacyCheck.reason || "Access denied for security reasons"
    }
  }
  
  // Allow IP-based access with warnings for shared networks
  if (isSharedNetwork(requestContext.ipAddress)) {
    console.warn(`Shared network access detected: ${requestContext.ipAddress}`)
    privacyMonitor.trackSharedNetworkAccess(requestContext.ipAddress)
  }
  
  return { allowed: true }
}