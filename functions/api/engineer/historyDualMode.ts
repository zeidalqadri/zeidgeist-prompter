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

// Feature flags for migration control with sensible defaults
function getFeatures(env: any) {
  return {
    // Default: false - Don't require user auth, allow anonymous access
    USER_AUTH_ENABLED: env.USER_AUTH_ENABLED === 'true' || false,

    // Default: true - Allow IP-based fallback for anonymous users
    IP_FALLBACK_ENABLED: env.IP_FALLBACK_ENABLED === 'false' ? false : true,

    // Default: true - Enable both auth methods for smooth migration
    DUAL_MODE_ENABLED: env.DUAL_MODE_ENABLED === 'false' ? false : true,

    // Default: false - Don't force authentication
    FORCE_USER_AUTH: env.FORCE_USER_AUTH === 'true' || false
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
export async function onRequestOptions(context?: any): Promise<Response> {
  const req: Request | undefined = context?.request
  const origin = req?.headers.get('Origin') || undefined
  return new Response(null, {
    status: 200,
    headers: {
      ...getSecurityHeaders(origin),
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

  try {
    // Monitor request for security analytics
    monitorRequest(request, context)
  } catch (err) {
    console.error('Monitoring failed:', err)
  }

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '0')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
  const offset = page * limit
  const debug = url.searchParams.get('debug') === 'true'

  // Extract request context
  let requestContext: RequestContext
  try {
    requestContext = await extractRequestContext(request, env)
  } catch (err) {
    console.error('Failed to extract request context:', err)
    return new Response(JSON.stringify({
      error: "Failed to process request",
      ...(process.env.NODE_ENV === 'development' && {
        debug: err instanceof Error ? err.message : 'Unknown error'
      })
    }), {
      status: 500,
      headers: {
        ...getSecurityHeaders(request.headers.get('Origin') || undefined),
        'Content-Type': 'application/json'
      }
    })
  }
  
  const corsHeaders = {
    ...getSecurityHeaders(request.headers.get('Origin') || undefined),
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store',
    'X-Auth-Method': requestContext.authMethod,
    'X-Dual-Mode': getFeatures(env).DUAL_MODE_ENABLED ? 'enabled' : 'disabled'
  }

  try {
    // Validate database connection
    if (!env?.DATABASE_URL) {
      console.error("Database configuration missing: DATABASE_URL not found in environment")
      return new Response(JSON.stringify({
        error: "Database connection not configured. Please check environment variables.",
        details: "DATABASE_URL is missing from environment configuration"
      }), {
        status: 503,
        headers: corsHeaders
      })
    }

    // Get database connection with error handling
    let db
    try {
      db = getOptimizedDb(env)
    } catch (dbError) {
      console.error("Failed to create database connection:", dbError)
      return new Response(JSON.stringify({
        error: "Failed to connect to database",
        details: dbError instanceof Error ? dbError.message : "Unknown database error"
      }), {
        status: 503,
        headers: corsHeaders
      })
    }
    
    // Determine isolation strategy based on request context
    const isolationResult = await determineIsolationStrategy(requestContext, env)
    
    if (!isolationResult.allowed) {
      // Log privacy violation attempt (non-blocking)
      logPrivacyEvent({
        timestamp: new Date(),
        action: 'denied',
        resource: '/api/engineer/history',
        requesterId: requestContext.ipAddress,
        reason: isolationResult.reason
      }).catch(err => console.error('Privacy logging failed:', err))

      return new Response(JSON.stringify({
        error: isolationResult.reason,
        requiresAuth: isolationResult.requiresAuth,
        migrationRequired: isolationResult.migrationRequired
      }), {
        status: isolationResult.requiresAuth ? 401 : 403,
        headers: corsHeaders
      })
    }

    // First test if we can access the table at all (in debug mode)
    if (debug) {
      console.log("DEBUG: Testing database access with simple query")
      try {
        const testQuery = await db.execute('SELECT 1 as test FROM prompt_history LIMIT 1')
        console.log("DEBUG: Test query successful:", testQuery)
      } catch (testError) {
        console.error("DEBUG: Test query failed:", testError)
        return new Response(JSON.stringify({
          error: "Database table access failed",
          debug: {
            message: testError instanceof Error ? testError.message : 'Unknown error',
            query: 'SELECT 1 as test FROM prompt_history LIMIT 1',
            hint: 'Check if prompt_history table exists in the database'
          }
        }), {
          status: 500,
          headers: corsHeaders
        })
      }
    }

    // Execute appropriate query based on isolation method
    let history: any[] = []
    let totalCountResult: any[] = []

    try {
      if (debug) {
        console.log("DEBUG: Executing main query with authMethod:", requestContext.authMethod)
        console.log("DEBUG: Request context:", {
          authMethod: requestContext.authMethod,
          ipAddress: requestContext.ipAddress,
          userId: requestContext.userId || 'none',
          isAuthenticated: requestContext.isAuthenticated
        })
      }

      const result = await executeWithRetry(async () => {
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
          if (debug) {
            console.log("DEBUG: Using IP-based query for IP:", requestContext.ipAddress)
          }

          // Simplified queries to handle empty table case
          try {
            // First try to get the history records - simplified without isNull check
            const historyQuery = db
              .select()
              .from(promptHistory)
              .where(eq(promptHistory.ipAddress, requestContext.ipAddress))
              .orderBy(desc(promptHistory.timestamp))
              .limit(limit)
              .offset(offset)

            // Then get the count
            const countQuery = db
              .select({ count: sql<number>`count(*)` })
              .from(promptHistory)
              .where(eq(promptHistory.ipAddress, requestContext.ipAddress))

            return Promise.all([historyQuery, countQuery])
          } catch (err) {
            console.error("DEBUG: Failed to build query:", err)
            // Return empty results if query fails
            return [[], [{ count: 0 }]]
          }
        }
      })

      history = result[0] || []
      totalCountResult = result[1] || [{ count: 0 }]

      if (debug) {
        console.log("DEBUG: Query successful, found", history.length, "records")
      }

    } catch (queryError) {
      console.error("DEBUG: Query execution failed:", queryError)
      if (debug) {
        return new Response(JSON.stringify({
          error: "Query execution failed",
          debug: {
            message: queryError instanceof Error ? queryError.message : 'Unknown error',
            stack: queryError instanceof Error ? queryError.stack : undefined,
            authMethod: requestContext.authMethod,
            ipAddress: requestContext.ipAddress,
            hint: 'Check database connection and table schema'
          }
        }), {
          status: 500,
          headers: corsHeaders
        })
      }
      throw queryError  // Re-throw to be caught by outer try-catch
    }

    const totalCount = totalCountResult[0]?.count || 0
    const hasMore = offset + history.length < totalCount
    const totalPages = Math.ceil(totalCount / limit)

    // Log successful access (non-blocking)
    logPrivacyEvent({
      timestamp: new Date(),
      action: 'access',
      resource: '/api/engineer/history',
      requesterId: requestContext.ipAddress,
      dataOwnerId: requestContext.userId || requestContext.ipAddress
    }).catch(err => console.error('Privacy logging failed:', err))

    // Transform data for client response
    const items = history.map((item: any) => {
      let safeMetadata: any = undefined
      if (item.metadata) {
        try {
          safeMetadata = JSON.parse(item.metadata)
        } catch (e) {
          console.warn('Invalid metadata JSON in prompt_history row; sending without metadata')
          safeMetadata = undefined
        }
      }

      // Normalize timestamp to ISO string safely
      let isoTimestamp: string
      try {
        const ts: any = item.timestamp
        const d = ts instanceof Date ? ts : new Date(ts)
        isoTimestamp = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
      } catch {
        isoTimestamp = new Date().toISOString()
      }

      return {
        original: item.original,
        refined: item.refined,
        context: item.context || undefined,
        timestamp: isoTimestamp,
        metadata: safeMetadata,
      }
    })

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

    // Log detailed error information
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    }
    console.error("Error details:", errorDetails)

    // Track system error (safely)
    try {
      privacyMonitor.trackViolation(requestContext.ipAddress, 'SYSTEM_ERROR', {
        endpoint: '/api/engineer/history',
        error: errorDetails.message
      })
    } catch (monitorError) {
      console.error("Failed to track error:", monitorError)
    }

    // Include debug info if debug parameter is set
    const debugInfo = debug ? {
      debug: {
        ...errorDetails,
        env: {
          hasDatabaseUrl: !!env?.DATABASE_URL,
          nodeEnv: process.env.NODE_ENV || 'production'
        }
      }
    } : {}

    return new Response(JSON.stringify({
      error: "Failed to fetch history. Please try again.",
      retryAfter: 5,
      ...debugInfo
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

  try {
    monitorRequest(request, context)
  } catch (err) {
    console.error('Monitoring failed:', err)
  }

  // Extract request context
  let requestContext: RequestContext
  try {
    requestContext = await extractRequestContext(request, env)
  } catch (err) {
    console.error('Failed to extract request context:', err)
    return new Response(JSON.stringify({
      error: "Failed to process request",
      ...(process.env.NODE_ENV === 'development' && {
        debug: err instanceof Error ? err.message : 'Unknown error'
      })
    }), {
      status: 500,
      headers: {
        ...getSecurityHeaders(request.headers.get('Origin') || undefined),
        'Content-Type': 'application/json'
      }
    })
  }
  
  const corsHeaders = {
    ...getSecurityHeaders(request.headers.get('Origin') || undefined),
    'Content-Type': 'application/json',
    'X-Auth-Method': requestContext.authMethod
  }

  try {
    // Validate database connection
    if (!env?.DATABASE_URL) {
      console.error("Database configuration missing: DATABASE_URL not found in environment")
      return new Response(JSON.stringify({
        error: "Database connection not configured. Please check environment variables.",
        details: "DATABASE_URL is missing from environment configuration"
      }), {
        status: 503,
        headers: corsHeaders
      })
    }

    // Create database connection with error handling
    let db
    try {
      db = createDb(env)
    } catch (dbError) {
      console.error("Failed to create database connection:", dbError)
      return new Response(JSON.stringify({
        error: "Failed to connect to database",
        details: dbError instanceof Error ? dbError.message : "Unknown database error"
      }), {
        status: 503,
        headers: corsHeaders
      })
    }

    const body = await request.json() as any
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

    // Log privacy event (non-blocking)
    logPrivacyEvent({
      timestamp: new Date(),
      action: 'access',
      resource: '/api/engineer/history',
      requesterId: requestContext.ipAddress,
      dataOwnerId: requestContext.userId || requestContext.ipAddress
    }).catch(err => console.error('Privacy logging failed:', err))

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

    // Log detailed error information
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    }
    console.error("Error details:", errorDetails)

    return new Response(JSON.stringify({
      error: "Failed to store history. Please try again.",
      ...(process.env.NODE_ENV === 'development' && { debug: errorDetails })
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

  let sessionFingerprint = 'unknown'
  try {
    sessionFingerprint = await generateSessionFingerprint(request)
  } catch (err) {
    console.error('Failed to generate session fingerprint:', err)
  }
  
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
