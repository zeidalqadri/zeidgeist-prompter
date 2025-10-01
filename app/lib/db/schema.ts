import { pgTable, text, timestamp, boolean, integer, uuid, index } from 'drizzle-orm/pg-core'
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
}, (table) => ({
  // Email index for login performance (partial index for active users only)
  emailActiveIdx: index('idx_users_email_active').on(table.email).where(sql`is_active = true`),
  // Account lockout index for security
  lockedUntilIdx: index('idx_users_locked_until').on(table.lockedUntil).where(sql`locked_until IS NOT NULL AND locked_until > now()`)
}))

export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  userAgent: text('user_agent'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  isRevoked: boolean('is_revoked').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  lastAccessed: timestamp('last_accessed', { withTimezone: true }).notNull().default(sql`now()`)
}, (table) => ({
  // CRITICAL: Session validation index (called on EVERY authenticated request)
  tokenExpiresIdx: index('idx_user_sessions_token_expires').on(table.tokenHash, table.expiresAt).where(sql`is_revoked = false`),
  // User session listing
  userIdExpiresIdx: index('idx_user_sessions_user_id').on(table.userId, table.expiresAt).where(sql`is_revoked = false`),
  // Expired session cleanup
  expiresAtIdx: index('idx_user_sessions_expires_at').on(table.expiresAt).where(sql`is_revoked = false`)
}))

// Prompt history table for storing enhancement records
export const promptHistory = pgTable('prompt_history', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  original: text('original').notNull(),
  refined: text('refined').notNull(),
  context: text('context'),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().default(sql`now()`),
  metadata: text('metadata'), // JSON string for source, processing time, etc.
  userId: uuid('user_id').references(() => users.id), // GDPR-compliant user-based isolation
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`)
}, (table) => ({
  // CRITICAL: User-scoped prompt history (most common query pattern)
  userTimestampIdx: index('idx_prompt_history_user_timestamp').on(table.userId, table.timestamp).where(sql`user_id IS NOT NULL`),
  // GDPR compliance: User data export
  userCreatedAtIdx: index('idx_prompt_history_user_created_at').on(table.userId, table.createdAt).where(sql`user_id IS NOT NULL`)
}))

// Feedback table for storing user ratings and comments
export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  enhancementId: uuid('enhancement_id'),
  originalPrompt: text('original_prompt').notNull(),
  enhancedPrompt: text('enhanced_prompt').notNull(),
  wasSuccessful: boolean('was_successful').notNull(),
  score: integer('score').default(0),
  feedbackText: text('feedback_text'),
  userAgent: text('user_agent'),
  userId: uuid('user_id').references(() => users.id), // GDPR-compliant user-based isolation
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().default(sql`now()`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`)
}, (table) => ({
  // User-scoped feedback queries
  userTimestampIdx: index('idx_feedback_user_timestamp').on(table.userId, table.timestamp).where(sql`user_id IS NOT NULL`),
  // User feedback with success filtering
  userSuccessfulTimestampIdx: index('idx_feedback_user_successful_timestamp').on(table.userId, table.wasSuccessful, table.timestamp).where(sql`user_id IS NOT NULL`),
  // GDPR compliance: User data deletion
  userIdIdx: index('idx_feedback_user_id').on(table.userId).where(sql`user_id IS NOT NULL`)
}))

// Enhancement logs table for monitoring and analytics
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
}, (table) => ({
  // User-scoped analytics
  userTimestampIdx: index('idx_enhancement_logs_user_timestamp').on(table.userId, table.timestamp).where(sql`user_id IS NOT NULL`),
  // User-scoped with source filtering
  userSourceTimestampIdx: index('idx_enhancement_logs_user_source_timestamp').on(table.userId, table.source, table.timestamp).where(sql`user_id IS NOT NULL`),
  // GDPR compliance: User data deletion
  userIdIdx: index('idx_enhancement_logs_user_id').on(table.userId).where(sql`user_id IS NOT NULL`)
}))

// Centralized prompts repository tables
export const prompts = pgTable('prompts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  originalText: text('original_text').notNull(),
  textHash: text('text_hash').notNull(),
  categoryId: uuid('category_id'),
  latestVersion: integer('latest_version').notNull().default(1),
  totalUses: integer('total_uses').notNull().default(0),
  avgQualityScore: integer('avg_quality_score'),
  isPublic: boolean('is_public').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`)
}, (table) => ({
  // Deduplication via hash
  textHashIdx: index('idx_prompts_text_hash').on(table.textHash),
  // Public prompts discovery
  publicQualityIdx: index('idx_prompts_public_quality').on(table.isPublic, table.avgQualityScore).where(sql`is_public = true`),
  // Trending prompts
  totalUsesIdx: index('idx_prompts_total_uses').on(table.totalUses).where(sql`is_public = true`)
}))

export const promptVersions = pgTable('prompt_versions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  promptId: uuid('prompt_id').notNull(),
  versionNumber: integer('version_number').notNull(),
  enhancedText: text('enhanced_text').notNull(),
  enhancementSource: text('enhancement_source').notNull(),
  qualityScore: integer('quality_score'),
  metricsData: text('metrics_data'), // JSON
  isBaseline: boolean('is_baseline').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`)
}, (table) => ({
  // Version history retrieval
  promptIdVersionIdx: index('idx_prompt_versions_prompt_id_version').on(table.promptId, table.versionNumber),
  // Best version queries
  promptQualityIdx: index('idx_prompt_versions_prompt_quality').on(table.promptId, table.qualityScore)
}))

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
}, (table) => ({
  // Category-based retrieval for context-aware learning
  categoryQualityIdx: index('idx_training_examples_category_quality').on(table.category, table.quality).where(sql`is_active = true AND category IS NOT NULL`)
  // Note: Full-text search on keywords requires GIN index (defined in migration SQL)
}))

// Export types for TypeScript
export type PromptHistory = typeof promptHistory.$inferSelect
export type NewPromptHistory = typeof promptHistory.$inferInsert
export type Feedback = typeof feedback.$inferSelect
export type NewFeedback = typeof feedback.$inferInsert
export type EnhancementLog = typeof enhancementLogs.$inferSelect
export type NewEnhancementLog = typeof enhancementLogs.$inferInsert
export type TrainingExample = typeof trainingExamples.$inferSelect
export type NewTrainingExample = typeof trainingExamples.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type UserSession = typeof userSessions.$inferSelect
export type NewUserSession = typeof userSessions.$inferInsert