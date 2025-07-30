import { db, feedback, NewFeedback } from "../../../app/lib/db"
import { processEnhancementFeedback } from "../../../app/lib/llm-enhancer"

export default async function handler(request: Request): Promise<Response> {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const body = await request.json()
    const { original, refined, wasSuccessful, feedbackText } = body

    if (!original || !refined || typeof wasSuccessful !== 'boolean') {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get request metadata
    const userAgent = request.headers.get('user-agent') || null
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'

    // Create new feedback record
    const newFeedback: NewFeedback = {
      originalPrompt: original,
      enhancedPrompt: refined,
      wasSuccessful,
      feedbackText: feedbackText || null,
      userAgent,
      ipAddress
    }

    // Store feedback in database
    await db.insert(feedback).values(newFeedback)

    // Also process with existing function for compatibility
    await processEnhancementFeedback(original, refined, wasSuccessful, feedbackText)

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
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error("Error storing feedback in database:", error)
    return new Response(JSON.stringify({ error: "Failed to process feedback" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}