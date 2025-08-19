import { createDb, promptHistory, NewPromptHistory } from "../../_shared/db"
import { getOptimizedDb, executeWithRetry } from "../../_shared/db-pool"
import { desc, sql, eq } from "drizzle-orm"
import { 
  validatePrivacyAccess, 
  logPrivacyEvent, 
  isSharedNetwork,
  getSecurityHeaders,
  generateSessionFingerprint 
} from "../../_shared/privacy-guard"

// Handle CORS preflight requests
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://mstprmpt.zeidgeist.com',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function onRequestGet(context: any): Promise<Response> {
  const { request, env } = context
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '0')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100) // Max 100 per page
  const offset = page * limit
  
  // Get client IP address for filtering
  const clientIP = request.headers.get('cf-connecting-ip') || 
                   request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
  
  // Enhanced privacy checks
  const sessionFingerprint = await generateSessionFingerprint(request)
  const isFromSharedNetwork = isSharedNetwork(clientIP)
  
  // Log access attempt for audit
  await logPrivacyEvent({
    timestamp: new Date(),
    action: 'access',
    resource: '/api/engineer/history',
    requesterId: clientIP,
    reason: isFromSharedNetwork ? 'shared-network-detected' : undefined
  })
  
  // Generate cache key for this specific request (including IP and session for isolation)
  const cacheKey = `history_${clientIP}_${sessionFingerprint}_${page}_${limit}`
  
  const corsHeaders = {
    ...getSecurityHeaders(),
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store', // Prevent caching of user data
    'ETag': `W/"${cacheKey}"`
  }

  try {
    // Database connection validation
    
    if (!env?.DATABASE_URL) {
      console.error("Debug: DATABASE_URL not found in environment")
      return new Response(JSON.stringify({ error: "Database configuration missing" }), {
        status: 500,
        headers: corsHeaders
      })
    }

    // Creating optimized database connection with pooling
    const db = getOptimizedDb(env)
    // Database connection successful
    
    // Executing database query with pagination, IP filtering, and retry logic
    const [history, totalCountResult] = await executeWithRetry(async () => {
      return Promise.all([
        db
          .select()
          .from(promptHistory)
          .where(eq(promptHistory.ipAddress, clientIP))
          .orderBy(desc(promptHistory.timestamp))
          .limit(limit)
          .offset(offset),
        
        // Get total count for pagination info (filtered by IP)
        db
          .select({ count: sql<number>`count(*)` })
          .from(promptHistory)
          .where(eq(promptHistory.ipAddress, clientIP))
      ])
    })

    const totalCount = totalCountResult[0]?.count || 0
    const hasMore = offset + history.length < totalCount
    const totalPages = Math.ceil(totalCount / limit)
    
    // Query executed successfully

    // Transform to match existing frontend format
    const items = history.map((item: any) => ({
      original: item.original,
      refined: item.refined,
      context: item.context || undefined,
      timestamp: item.timestamp ? item.timestamp.toISOString() : new Date().toISOString(),
      metadata: item.metadata ? JSON.parse(item.metadata) : undefined
    }))

    // Data transformation completed
    return new Response(JSON.stringify({ 
      items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore,
        hasPrevious: page > 0
      }
    }), {
      headers: corsHeaders
    })
  } catch (error) {
    console.error("Error fetching history:", error)
    // Error details logged for debugging
    
    let errorMessage = "Failed to fetch history"
    const errorMsg = error instanceof Error ? error.message : String(error)
    if (errorMsg.includes("connect")) {
      errorMessage = "Database connection failed"
    } else if (errorMsg.includes("does not exist")) {
      errorMessage = "Database table not found"
    } else if (errorMsg.includes("authentication")) {
      errorMessage = "Database authentication failed"
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      // Error details removed for security 
    }), {
      status: 500,
      headers: corsHeaders
    })
  }
}

export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context
  
  // Get client IP address for storing with history
  const clientIP = request.headers.get('cf-connecting-ip') || 
                   request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://mstprmpt.zeidgeist.com',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  try {
    const db = createDb(env)
    const body = await request.json()
    const { original, refined, context, timestamp, metadata } = body

    if (!original || !refined) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: corsHeaders
      })
    }

    // Create new history record with IP address
    const newHistory: NewPromptHistory = {
      original,
      refined,
      context: context || null,
      timestamp: new Date(timestamp || Date.now()),
      metadata: metadata ? JSON.stringify(metadata) : null,
      ipAddress: clientIP
    }

    // Insert into database
    await db.insert(promptHistory).values(newHistory)

    // Log for monitoring
    console.log('History item stored in database:', {
      originalLength: original.length,
      refinedLength: refined.length,
      hasContext: !!context,
      timestamp: newHistory.timestamp?.toISOString() || new Date().toISOString(),
      ipAddress: clientIP
    })

    return new Response(JSON.stringify({ 
      success: true, 
      message: "History item stored successfully" 
    }), {
      headers: corsHeaders
    })
  } catch (error) {
    console.error("Error storing history in database:", error)
    return new Response(JSON.stringify({ error: "Failed to store history" }), {
      status: 500,
      headers: corsHeaders
    })
  }
}