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
  userAgent: text('user_agent'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  isRevoked: boolean('is_revoked').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  lastAccessed: timestamp('last_accessed', { withTimezone: true }).notNull().default(sql`now()`)
})

// Prompt history table for storing enhancement records
export const promptHistory = pgTable('prompt_history', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  original: text('original').notNull(),
  refined: text('refined').notNull(),
  context: text('context'),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().default(sql`now()`),
  metadata: text('metadata'), // JSON string for source, processing time, etc.
  ipAddress: text('ip_address'), // Store user's IP for legacy isolation
  userId: uuid('user_id').references(() => users.id), // GDPR-compliant user-based isolation
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`)
})

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
  ipAddress: text('ip_address'), // Legacy
  userId: uuid('user_id').references(() => users.id), // GDPR-compliant user-based isolation
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().default(sql`now()`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`)
})

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
})

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
})

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

// Extension downloads tracking table
export const extensionDownloads = pgTable('extension_downloads', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  extensionVersion: text('extension_version').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  referrer: text('referrer'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`)
})

// Audit logs table for comprehensive security logging
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  eventType: text('event_type').notNull(),
  eventCategory: text('event_category').notNull(),
  severity: text('severity').notNull(),
  action: text('action').notNull(),

  userId: uuid('user_id').references(() => users.id),
  userEmail: text('user_email'),
  userIpAddress: text('user_ip_address'),
  userAgent: text('user_agent'),
  sessionId: uuid('session_id'),

  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  resourceName: text('resource_name'),

  requestMethod: text('request_method'),
  requestPath: text('request_path'),
  requestQueryParams: text('request_query_params'), // JSON string
  requestHeaders: text('request_headers'), // JSON string

  responseStatusCode: integer('response_status_code'),
  responseTimeMs: integer('response_time_ms'),

  oldValues: text('old_values'), // JSON string
  newValues: text('new_values'), // JSON string

  metadata: text('metadata'), // JSON string
  tags: text('tags'), // JSON string array

  isSuspicious: boolean('is_suspicious').default(false),
  riskScore: integer('risk_score').default(0),
  threatIndicators: text('threat_indicators'), // JSON string array

  retentionPeriodDays: integer('retention_period_days').default(90),
  isImmutable: boolean('is_immutable').default(true),

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
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type UserSession = typeof userSessions.$inferSelect
export type NewUserSession = typeof userSessions.$inferInsert
export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert
export type ExtensionDownload = typeof extensionDownloads.$inferSelect
export type NewExtensionDownload = typeof extensionDownloads.$inferInsert
