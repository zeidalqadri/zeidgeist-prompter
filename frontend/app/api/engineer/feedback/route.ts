import { NextRequest, NextResponse } from "next/server"
import { processEnhancementFeedback } from "@/app/lib/llm-enhancer"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { originalPrompt, enhancedPrompt, wasSuccessful, feedback } = body

    if (!originalPrompt || !enhancedPrompt || wasSuccessful === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Process the feedback to improve our enhancer engine
    await processEnhancementFeedback(
      originalPrompt,
      enhancedPrompt,
      wasSuccessful,
      feedback
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing feedback:", error)
    return NextResponse.json(
      { error: "Failed to process feedback" },
      { status: 500 }
    )
  }
} 