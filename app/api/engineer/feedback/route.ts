import { NextRequest, NextResponse } from "next/server"
import { processEnhancementFeedback } from "../../../lib/llm-enhancer"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { original, refined, wasSuccessful, feedback } = body

    if (!original || !refined || typeof wasSuccessful !== 'boolean') {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Process the feedback using the existing function
    await processEnhancementFeedback(original, refined, wasSuccessful, feedback)

    // Log feedback for monitoring
    console.log('Feedback received:', {
      wasSuccessful,
      originalLength: original.length,
      refinedLength: refined.length,
      hasFeedback: !!feedback,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({ 
      success: true, 
      message: "Feedback received successfully" 
    })
  } catch (error) {
    console.error("Error processing feedback:", error)
    return NextResponse.json(
      { error: "Failed to process feedback" },
      { status: 500 }
    )
  }
}