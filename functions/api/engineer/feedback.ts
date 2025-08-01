import { createDb, feedback, NewFeedback } from "../../_shared/db"

// Handle CORS preflight requests
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://aipromptise.pages.dev',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  try {
    const db = createDb(env)
    const body = await request.json()
    const { original, refined, wasSuccessful, feedbackText } = body

    if (!original || !refined || typeof wasSuccessful !== 'boolean') {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: corsHeaders
      })
    }

    // Get request metadata
    const userAgent = request.headers.get('user-agent') || null
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'

    // Create new feedback record with aligned schema
    const newFeedback: NewFeedback = {
      originalPrompt: original,
      enhancedPrompt: refined,
      wasSuccessful: wasSuccessful,
      feedbackText: feedbackText || null,
      userAgent,
      ipAddress
    }

    // Store feedback in database
    await db.insert(feedback).values(newFeedback)

    // Log feedback for monitoring
    console.log('Feedback stored in database:', {
      wasSuccessful,
      originalLength: original.length,
      refinedLength: refined.length,
      hasFeedback: !!feedbackText,
      ipAddress: ipAddress.substring(0, 10) + '...', // Partial IP for privacy
      timestamp: new Date().toISOString()
    })

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Feedback received successfully" 
    }), {
      headers: corsHeaders
    })
  } catch (error) {
    console.error("Error storing feedback in database:", error)
    return new Response(JSON.stringify({ error: "Failed to process feedback" }), {
      status: 500,
      headers: corsHeaders
    })
  }
}