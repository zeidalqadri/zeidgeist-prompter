import { NextRequest, NextResponse } from "next/server"
import { db, promptHistory, NewPromptHistory } from "../../../lib/db"
import { desc } from "drizzle-orm"

export async function GET() {
  try {
    // Fetch recent history from database
    const history = await db
      .select()
      .from(promptHistory)
      .orderBy(desc(promptHistory.timestamp))
      .limit(50)

    // Transform to match existing frontend format
    const items = history.map(item => ({
      original: item.original,
      refined: item.refined,
      context: item.context || undefined,
      timestamp: item.timestamp,
      metadata: item.metadata ? JSON.parse(item.metadata) : undefined
    }))

    return NextResponse.json({ items })
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

    return NextResponse.json({ 
      success: true, 
      message: "History item stored successfully" 
    })
  } catch (error) {
    console.error("Error storing history in database:", error)
    return NextResponse.json(
      { error: "Failed to store history" },
      { status: 500 }
    )
  }
}