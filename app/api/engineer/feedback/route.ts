import { NextRequest, NextResponse } from "next/server"
import { db, feedback, NewFeedback } from "../../../lib/db"
import { processEnhancementFeedback } from "../../../lib/llm-enhancer"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { original, refined, wasSuccessful, feedbackText } = body

    if (!original || !refined || typeof wasSuccessful !== 'boolean') {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
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

    return NextResponse.json({ 
      success: true, 
      message: "Feedback received successfully" 
    })
  } catch (error) {
    console.error("Error storing feedback in database:", error)
    return NextResponse.json(
      { error: "Failed to process feedback" },
      { status: 500 }
    )
  }
}