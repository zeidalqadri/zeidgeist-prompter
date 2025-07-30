import { pgTable, text, timestamp, boolean, integer, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// Prompt history table for storing enhancement records
export const promptHistory = pgTable('prompt_history', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  original: text('original').notNull(),
  refined: text('refined').notNull(),
  context: text('context'),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().default(sql`now()`),
  metadata: text('metadata'), // JSON string for source, processing time, etc.
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`)
})

// Feedback table for storing user ratings and comments
export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  originalPrompt: text('original_prompt').notNull(),
  enhancedPrompt: text('enhanced_prompt').notNull(),
  wasSuccessful: boolean('was_successful').notNull(),
  feedbackText: text('feedback_text'),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().default(sql`now()`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`)
})

// Enhancement logs table for monitoring and analytics
export const enhancementLogs = pgTable('enhancement_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  promptLength: integer('prompt_length').notNull(),
  hasContext: boolean('has_context').notNull(),
  isRefinement: boolean('is_refinement').notNull(),
  isExpansion: boolean('is_expansion').notNull(),
  repeatCount: integer('repeat_count').default(0),
  source: text('source').notNull(), // 'deepseek', 'mistral', 'gemini', 'local', 'fallback'
  processingTime: integer('processing_time'), // milliseconds
  wasIdentical: boolean('was_identical').default(false),
  hadError: boolean('had_error').default(false),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().default(sql`now()`)
})

// Training examples storage for dynamic learning
export const trainingExamples = pgTable('training_examples', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  rawPrompt: text('raw_prompt').notNull(),
  enhancedPrompt: text('enhanced_prompt').notNull(),
  context: text('context'),
  source: text('source').notNull(), // 'api', 'manual', 'feedback'
  quality: integer('quality').default(0), // Quality score based on feedback
  usageCount: integer('usage_count').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`)
})

// Export types for TypeScript
export type PromptHistory = typeof promptHistory.$inferSelect
export type NewPromptHistory = typeof promptHistory.$inferInsert
export type Feedback = typeof feedback.$inferSelect
export type NewFeedback = typeof feedback.$inferInsert
export type EnhancementLog = typeof enhancementLogs.$inferSelect
export type NewEnhancementLog = typeof enhancementLogs.$inferInsert
export type TrainingExample = typeof trainingExamples.$inferSelect
export type NewTrainingExample = typeof trainingExamples.$inferInsert