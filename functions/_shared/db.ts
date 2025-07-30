import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core'

// Database schema definitions for Cloudflare Functions
export const promptHistory = pgTable('prompt_history', {
  id: serial('id').primaryKey(),
  original: text('original').notNull(),
  refined: text('refined').notNull(),
  context: text('context'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  metadata: text('metadata'), // JSON string
})

export const feedback = pgTable('feedback', {
  id: serial('id').primaryKey(),
  original: text('original').notNull(),
  refined: text('refined').notNull(),
  wasSuccessful: text('was_successful').notNull(), // 'yes' or 'no'
  feedbackText: text('feedback_text'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
})

export const enhancementLogs = pgTable('enhancement_logs', {
  id: serial('id').primaryKey(),
  original: text('original').notNull(),
  enhanced: text('enhanced').notNull(),
  source: text('source').notNull(), // 'deepseek', 'mistral', 'gemini', 'local'
  processingTime: text('processing_time'), // milliseconds as string
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
})

// Lazy database connection
let _db: ReturnType<typeof drizzle> | null = null

function getDb() {
  if (!_db) {
    // Get database URL from environment variable
    const databaseUrl = process.env.DATABASE_URL

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required')
    }

    // Create Neon HTTP client
    const sql = neon(databaseUrl)

    // Create Drizzle instance with schema
    _db = drizzle(sql, { 
      schema: {
        promptHistory,
        feedback,
        enhancementLogs
      }
    })
  }
  
  return _db
}

// Export lazy database connection
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>]
  }
})

// Types for inserts
export type NewPromptHistory = typeof promptHistory.$inferInsert
export type NewFeedback = typeof feedback.$inferInsert
export type NewEnhancementLog = typeof enhancementLogs.$inferInsert