import { db, promptHistory, NewPromptHistory } from "../../_shared/db"
import { desc } from "drizzle-orm"

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'GET') {
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

      return new Response(JSON.stringify({ items }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error("Error fetching history:", error)
      return new Response(JSON.stringify({ error: "Failed to fetch history" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json()
      const { original, refined, context, timestamp, metadata } = body

      if (!original || !refined) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
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
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error("Error storing history in database:", error)
      return new Response(JSON.stringify({ error: "Failed to store history" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  // Method not allowed
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  })
}