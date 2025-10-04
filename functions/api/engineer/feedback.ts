import { createDb, feedback, NewFeedback } from "../../_shared/db"

// Handle CORS preflight requests
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://mstprmpt.zeidgeist.com',
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
    const body = await request.json() as any
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

    // PHASE 8: Feedback Integration - Update pattern confidence based on feedback
    try {
      const { createLearningService } = await import('../../_shared/learning')
      const learningService = createLearningService()

      if (wasSuccessful) {
        // Positive feedback - reinforce patterns
        const score = body.score || 4 // Default to 4 if not provided
        console.log(`👍 Positive feedback (score: ${score}) - reinforcing patterns`);

        context.waitUntil(
          learningService.reinforcePatterns(env, original, score)
            .catch(err => console.error('Failed to reinforce patterns:', err))
        )
      } else {
        // Negative feedback - penalize patterns
        const score = body.score || 2 // Default to 2 if not provided
        console.log(`👎 Negative feedback (score: ${score}) - penalizing patterns`);

        // Note: penalizePatterns method needs to be added to the Worker-compatible service
        // For now, we'll just log negative feedback
        console.log('Pattern penalization pending implementation in Worker-compatible service');
      }
    } catch (learningError) {
      // Non-critical error - don't fail the request
      console.error('Failed to update pattern confidence (non-critical):', learningError)
    }

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