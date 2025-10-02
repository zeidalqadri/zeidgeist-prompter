import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { pgTable, text, timestamp, boolean, integer, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// User authentication tables (defined first for foreign key references)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  passwordHash: text('password_hash').notNull(),
  emailVerified: boolean('email_verified').default(false),
  mfaEnabled: boolean('mfa_enabled').default(false),
  mfaSecret: text('mfa_secret'),
  isActive: boolean('is_active').default(true),
  lastLogin: timestamp('last_login', { withTimezone: true }),
  loginAttempts: integer('login_attempts').default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  metadata: text('metadata'), // JSON string
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`)
})

export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  isRevoked: boolean('is_revoked').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  lastAccessed: timestamp('last_accessed', { withTimezone: true }).notNull().default(sql`now()`)
})

// Database schema definitions for Cloudflare Functions - aligned with main app
export const promptHistory = pgTable('prompt_history', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  original: text('original').notNull(),
  refined: text('refined').notNull(),
  context: text('context'),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().default(sql`now()`),
  metadata: text('metadata'), // JSON string for source, processing time, etc.
  ipAddress: text('ip_address'), // Store user's IP for history isolation (legacy)
  userId: uuid('user_id').references(() => users.id), // User-based isolation (new)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`)
})

export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  enhancementId: uuid('enhancement_id'),
  originalPrompt: text('original_prompt').notNull(),
  enhancedPrompt: text('enhanced_prompt').notNull(),
  wasSuccessful: boolean('was_successful').notNull(),
  score: integer('score').default(0),
  feedbackText: text('feedback_text'),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'), // Legacy
  userId: uuid('user_id').references(() => users.id), // User-based isolation (new)
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().default(sql`now()`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`)
})

export const enhancementLogs = pgTable('enhancement_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  originalPrompt: text('original_prompt'),
  enhancedPrompt: text('enhanced_prompt'),
  promptLength: integer('prompt_length').notNull(),
  hasContext: boolean('has_context').notNull(),
  isRefinement: boolean('is_refinement').notNull(),
  isExpansion: boolean('is_expansion').notNull(),
  repeatCount: integer('repeat_count').default(0),
  source: text('source').notNull(), // 'deepseek', 'mistral', 'gemini', 'local', 'fallback'
  enhancementModel: text('enhancement_model'),
  responseTime: integer('response_time'), // milliseconds
  processingTime: integer('processing_time'), // milliseconds
  wasIdentical: boolean('was_identical').default(false),
  hadError: boolean('had_error').default(false),
  context: text('context'),
  userId: uuid('user_id').references(() => users.id), // User-based isolation (new)
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().default(sql`now()`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`)
})

// Database connection factory
export function createDb(env: Record<string, string>) {
  const databaseUrl = env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  // Create Neon HTTP client
  const sql = neon(databaseUrl)

  // Create Drizzle instance with schema
  return drizzle(sql, { 
    schema: {
      users,
      userSessions,
      promptHistory,
      feedback,
      enhancementLogs,
      dsarRequests,
      trainingExamples
    }
  })
}

// For backward compatibility - will be removed
export const db = {
  insert: () => { throw new Error('Use createDb(env) instead') },
  select: () => { throw new Error('Use createDb(env) instead') }
}

// GDPR/CCPA Data Subject Access Request table
export const dsarRequests = pgTable('dsar_requests', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  requestType: text('request_type').notNull(), // 'access', 'deletion', 'rectification'
  status: text('status').notNull().default('pending'), // 'pending', 'processing', 'completed', 'rejected'
  requestData: text('request_data'), // JSON string with request details
  responseData: text('response_data'), // JSON string with response
  adminNotes: text('admin_notes'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`)
})

// Training examples storage for dynamic learning
export const trainingExamples = pgTable('training_examples', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  rawPrompt: text('raw_prompt').notNull(),
  enhancedPrompt: text('enhanced_prompt').notNull(),
  context: text('context'),
  category: text('category'),
  keywords: text('keywords'),
  source: text('source').notNull(), // 'api', 'manual', 'feedback'
  quality: integer('quality').default(0), // Quality score based on feedback
  usageCount: integer('usage_count').default(0),
  metadata: text('metadata'), // JSON string for additional data
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`)
})

// Export types for TypeScript - aligned with main app
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type UserSession = typeof userSessions.$inferSelect
export type NewUserSession = typeof userSessions.$inferInsert
export type PromptHistory = typeof promptHistory.$inferSelect
export type NewPromptHistory = typeof promptHistory.$inferInsert
export type Feedback = typeof feedback.$inferSelect
export type NewFeedback = typeof feedback.$inferInsert
export type EnhancementLog = typeof enhancementLogs.$inferSelect
export type NewEnhancementLog = typeof enhancementLogs.$inferInsert
export type DsarRequest = typeof dsarRequests.$inferSelect
export type NewDsarRequest = typeof dsarRequests.$inferInsert
export type TrainingExample = typeof trainingExamples.$inferSelect
export type NewTrainingExample = typeof trainingExamples.$inferInsert