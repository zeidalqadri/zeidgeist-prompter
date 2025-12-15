/**
 * D1/SQLite Schema for Drizzle ORM
 *
 * This is the SQLite-compatible schema for Cloudflare D1.
 * All tables are consolidated here for unified database access.
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Helper for UUID default (SQLite doesn't have gen_random_uuid())
// UUIDs are generated in application code using crypto.randomUUID()

// ============================================
// USER AUTHENTICATION
// ============================================

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  passwordHash: text('password_hash').notNull(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  mfaEnabled: integer('mfa_enabled', { mode: 'boolean' }).default(false),
  mfaSecret: text('mfa_secret'),
  totpSecret: text('totp_secret'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  lastLogin: text('last_login'),
  loginAttempts: integer('login_attempts').default(0),
  lockedUntil: text('locked_until'),
  metadata: text('metadata'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`)
})

export const userSessions = sqliteTable('user_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  userAgent: text('user_agent'),
  expiresAt: text('expires_at').notNull(),
  isRevoked: integer('is_revoked', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  lastAccessed: text('last_accessed').notNull().default(sql`(datetime('now'))`)
})

// ============================================
// PROMPT HISTORY
// ============================================

export const promptHistory = sqliteTable('prompt_history', {
  id: text('id').primaryKey(),
  original: text('original').notNull(),
  refined: text('refined').notNull(),
  context: text('context'),
  metadata: text('metadata'),
  ipAddress: text('ip_address'),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  timestamp: text('timestamp').notNull().default(sql`(datetime('now'))`),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`)
})

// ============================================
// FEEDBACK
// ============================================

export const feedback = sqliteTable('feedback', {
  id: text('id').primaryKey(),
  enhancementId: text('enhancement_id'),
  originalPrompt: text('original_prompt').notNull(),
  enhancedPrompt: text('enhanced_prompt').notNull(),
  wasSuccessful: integer('was_successful', { mode: 'boolean' }).notNull(),
  score: integer('score').default(0),
  feedbackText: text('feedback_text'),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  timestamp: text('timestamp').notNull().default(sql`(datetime('now'))`),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

// ============================================
// ENHANCEMENT LOGS
// ============================================

export const enhancementLogs = sqliteTable('enhancement_logs', {
  id: text('id').primaryKey(),
  originalPrompt: text('original_prompt'),
  enhancedPrompt: text('enhanced_prompt'),
  promptLength: integer('prompt_length').notNull(),
  hasContext: integer('has_context', { mode: 'boolean' }).notNull(),
  isRefinement: integer('is_refinement', { mode: 'boolean' }).notNull(),
  isExpansion: integer('is_expansion', { mode: 'boolean' }).notNull(),
  repeatCount: integer('repeat_count').default(0),
  source: text('source').notNull(),
  enhancementModel: text('enhancement_model'),
  responseTime: integer('response_time'),
  processingTime: integer('processing_time'),
  wasIdentical: integer('was_identical', { mode: 'boolean' }).default(false),
  hadError: integer('had_error', { mode: 'boolean' }).default(false),
  context: text('context'),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  timestamp: text('timestamp').notNull().default(sql`(datetime('now'))`),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

// ============================================
// PROMPTS REPOSITORY
// ============================================

export const prompts = sqliteTable('prompts', {
  id: text('id').primaryKey(),
  originalText: text('original_text').notNull(),
  textHash: text('text_hash').notNull(),
  categoryId: text('category_id'),
  latestVersion: integer('latest_version').notNull().default(1),
  totalUses: integer('total_uses').notNull().default(0),
  avgQualityScore: integer('avg_quality_score'),
  isPublic: integer('is_public', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`)
})

export const promptVersions = sqliteTable('prompt_versions', {
  id: text('id').primaryKey(),
  promptId: text('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  enhancedText: text('enhanced_text').notNull(),
  enhancementSource: text('enhancement_source').notNull(),
  qualityScore: integer('quality_score'),
  metricsData: text('metrics_data'),
  isBaseline: integer('is_baseline', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

// ============================================
// TRAINING EXAMPLES
// ============================================

export const trainingExamples = sqliteTable('training_examples', {
  id: text('id').primaryKey(),
  rawPrompt: text('raw_prompt').notNull(),
  enhancedPrompt: text('enhanced_prompt').notNull(),
  context: text('context'),
  category: text('category'),
  keywords: text('keywords'),
  source: text('source').notNull(),
  quality: integer('quality').default(0),
  usageCount: integer('usage_count').default(0),
  metadata: text('metadata'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`)
})

// ============================================
// EXTENSION DOWNLOADS
// ============================================

export const extensionDownloads = sqliteTable('extension_downloads', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  extensionVersion: text('extension_version').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  referrer: text('referrer'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

// ============================================
// AUDIT LOGS
// ============================================

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  eventCategory: text('event_category').notNull(),
  severity: text('severity').notNull(),
  action: text('action').notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  userEmail: text('user_email'),
  userIpAddress: text('user_ip_address'),
  userAgent: text('user_agent'),
  sessionId: text('session_id'),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  resourceName: text('resource_name'),
  requestMethod: text('request_method'),
  requestPath: text('request_path'),
  requestQueryParams: text('request_query_params'),
  requestHeaders: text('request_headers'),
  responseStatusCode: integer('response_status_code'),
  responseTimeMs: integer('response_time_ms'),
  oldValues: text('old_values'),
  newValues: text('new_values'),
  metadata: text('metadata'),
  tags: text('tags'),
  isSuspicious: integer('is_suspicious', { mode: 'boolean' }).default(false),
  riskScore: integer('risk_score').default(0),
  threatIndicators: text('threat_indicators'),
  retentionPeriodDays: integer('retention_period_days').default(90),
  isImmutable: integer('is_immutable', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

// ============================================
// TYPE EXPORTS
// ============================================

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
export type Prompt = typeof prompts.$inferSelect
export type NewPrompt = typeof prompts.$inferInsert
export type PromptVersion = typeof promptVersions.$inferSelect
export type NewPromptVersion = typeof promptVersions.$inferInsert
export type TrainingExample = typeof trainingExamples.$inferSelect
export type NewTrainingExample = typeof trainingExamples.$inferInsert
export type ExtensionDownload = typeof extensionDownloads.$inferSelect
export type NewExtensionDownload = typeof extensionDownloads.$inferInsert
export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert
