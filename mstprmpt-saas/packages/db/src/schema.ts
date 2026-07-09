import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

function uuid(name: string) {
  return text(name);
}

function timestamp(name: string) {
  return text(name);
}

function jsonb(name: string) {
  return text(name, { mode: 'json' });
}

function boolean(name: string) {
  return integer(name, { mode: 'boolean' });
}

// --- Organizations ---

export const organizations = sqliteTable('organizations', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripePriceId: text('stripe_price_id'),
  planTier: text('plan_tier').notNull().default('free'),
  planLimits: jsonb('plan_limits').notNull().default('{"monthlyEnhancements":50,"ratePerMinute":5,"burstLimit":10}'),
  createdAt: timestamp('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: timestamp('updated_at').notNull().default(sql`(datetime('now'))`),
});

// --- Users ---

export const users = sqliteTable('users', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash').notNull(),
  emailVerified: boolean('email_verified').default(false),
  isActive: boolean('is_active').default(true),
  lastLogin: timestamp('last_login'),
  resetTokenHash: text('reset_token_hash'),
  resetTokenExpiresAt: timestamp('reset_token_expires_at'),
  failedResetAttempts: integer('failed_reset_attempts').default(0),
  resetLockedUntil: timestamp('reset_locked_until'),
  createdAt: timestamp('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: timestamp('updated_at').notNull().default(sql`(datetime('now'))`),
});

// --- Org Members ---

export const orgMembers = sqliteTable('org_members', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'),
  createdAt: timestamp('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex('org_members_org_user_idx').on(table.orgId, table.userId),
]);

// --- User Sessions ---

export const userSessions = sqliteTable('user_sessions', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  isRevoked: boolean('is_revoked').default(false),
  createdAt: timestamp('created_at').notNull().default(sql`(datetime('now'))`),
});

// --- API Keys ---

export const apiKeys = sqliteTable('api_keys', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  keyPrefix: text('key_prefix').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  scopes: text('scopes').default('["enhance"]'),
  isActive: boolean('is_active').default(true),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  revokedAt: timestamp('revoked_at'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('api_keys_org_active_idx').on(table.orgId, table.isActive),
]);

// --- Usage Records ---

export const usageRecords = sqliteTable('usage_records', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  apiKeyId: uuid('api_key_id').notNull().references(() => apiKeys.id),
  billingPeriod: text('billing_period').notNull(),
  requestCount: integer('request_count').notNull().default(0),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  totalLatencyMs: integer('total_latency_ms').notNull().default(0),
  providerUsage: jsonb('provider_usage').default('{}'),
  createdAt: timestamp('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: timestamp('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex('usage_records_org_key_period_idx').on(table.orgId, table.apiKeyId, table.billingPeriod),
]);

// --- Enhancement Logs ---

export const enhancementLogs = sqliteTable('enhancement_logs', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  apiKeyId: uuid('api_key_id').notNull().references(() => apiKeys.id),
  promptLength: integer('prompt_length').notNull(),
  hasContext: boolean('has_context').notNull(),
  source: text('source').notNull(),
  model: text('model'),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  responseTimeMs: integer('response_time_ms'),
  costPreset: text('cost_preset'),
  statusCode: integer('status_code').notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('enhancement_logs_org_created_idx').on(table.orgId, table.createdAt),
  index('enhancement_logs_key_created_idx').on(table.apiKeyId, table.createdAt),
]);

// --- Billing Events ---

export const billingEvents = sqliteTable('billing_events', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  stripeEventId: text('stripe_event_id').notNull().unique(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').notNull().default(sql`(datetime('now'))`),
});

// --- Webhook Endpoints (P1) ---

export const webhookEndpoints = sqliteTable('webhook_endpoints', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  secret: text('secret').notNull(),
  events: text('events').default('["enhancement.completed"]'),
  isActive: boolean('is_active').default(true),
  failureCount: integer('failure_count').default(0),
  lastDeliveryAt: timestamp('last_delivery_at'),
  createdAt: timestamp('created_at').notNull().default(sql`(datetime('now'))`),
});
