import { NextRequest, NextResponse } from "next/server"

// In-memory storage for development (in production, use a database)
let promptHistory: Array<{
  original: string
  refined: string
  context?: string
  timestamp: Date
  metadata?: any
}> = []

export async function GET(request: NextRequest) {
  try {
    // Return the stored history
    return NextResponse.json({ 
      items: promptHistory.slice(0, 50) // Limit to last 50 items
    })
  } catch (error) {
    console.error("Error fetching history:", error)
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { original, refined, context, timestamp, metadata } = body

    if (!original || !refined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Store the history item
    const historyItem = {
      original,
      refined,
      context,
      timestamp: new Date(timestamp || Date.now()),
      metadata
    }

    // Add to the beginning of the array (most recent first)
    promptHistory.unshift(historyItem)

    // Keep only the last 100 items to prevent memory issues
    if (promptHistory.length > 100) {
      promptHistory = promptHistory.slice(0, 100)
    }

    // Log for monitoring
    console.log('History item stored:', {
      originalLength: original.length,
      refinedLength: refined.length,
      hasContext: !!context,
      timestamp: historyItem.timestamp.toISOString(),
      totalItems: promptHistory.length
    })

    return NextResponse.json({ 
      success: true, 
      message: "History item stored successfully" 
    })
  } catch (error) {
    console.error("Error storing history:", error)
    return NextResponse.json(
      { error: "Failed to store history" },
      { status: 500 }
    )
  }
}