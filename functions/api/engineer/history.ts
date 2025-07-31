import { createDb, promptHistory, NewPromptHistory } from "../../_shared/db"
import { desc } from "drizzle-orm"

// Handle CORS preflight requests
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function onRequestGet(context: any): Promise<Response> {
  const { request, env } = context
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  try {
    console.log("Debug: Environment variables available:", Object.keys(env || {}))
    console.log("Debug: DATABASE_URL present:", !!env?.DATABASE_URL)
    console.log("Debug: DATABASE_URL length:", env?.DATABASE_URL?.length || 0)
    
    if (!env?.DATABASE_URL) {
      console.error("Debug: DATABASE_URL not found in environment")
      return new Response(JSON.stringify({ error: "Database configuration missing" }), {
        status: 500,
        headers: corsHeaders
      })
    }

    console.log("Debug: Creating database connection...")
    const db = createDb(env)
    console.log("Debug: Database connection created successfully")
    
    console.log("Debug: Executing database query...")
    // Fetch recent history from database
    const history = await db
      .select()
      .from(promptHistory)
      .orderBy(desc(promptHistory.timestamp))
      .limit(50)

    console.log("Debug: Query executed successfully, records found:", history.length)

    // Transform to match existing frontend format
    const items = history.map(item => ({
      original: item.original,
      refined: item.refined,
      context: item.context || undefined,
      timestamp: item.timestamp,
      metadata: item.metadata ? JSON.parse(item.metadata) : undefined
    }))

    console.log("Debug: Data transformation completed, returning", items.length, "items")
    return new Response(JSON.stringify({ items }), {
      headers: corsHeaders
    })
  } catch (error) {
    console.error("Error fetching history:", error)
    console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error)
    console.error("Error message:", error instanceof Error ? error.message : String(error))
    console.error("Error stack:", error instanceof Error ? error.stack : undefined)
    
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
      details: error instanceof Error ? error.message : String(error) 
    }), {
      status: 500,
      headers: corsHeaders
    })
  }
}

export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
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

    // Create new history record
    const newHistory: NewPromptHistory = {
      original,
      refined,
      context: context || null,
      timestamp: new Date(timestamp || Date.now()),
      metadata: metadata ? JSON.stringify(metadata) : null
    }

    // Insert into database
    await db.insert(promptHistory).values(newHistory)

    // Log for monitoring
    console.log('History item stored in database:', {
      originalLength: original.length,
      refinedLength: refined.length,
      hasContext: !!context,
      timestamp: newHistory.timestamp?.toISOString() || new Date().toISOString()
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