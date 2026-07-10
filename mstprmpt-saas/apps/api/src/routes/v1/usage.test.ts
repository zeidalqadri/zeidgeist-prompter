import { randomBytes, createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Hono } from 'hono';

const DB_PATH = path.join(os.tmpdir(), `mstprmpt-usage-test-${randomBytes(8).toString('hex')}.db`);
process.env['DATABASE_PATH'] = DB_PATH;

const SCHEMA_SQL = `
CREATE TABLE organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, stripe_customer_id TEXT UNIQUE, stripe_price_id TEXT, plan_tier TEXT NOT NULL DEFAULT 'free', plan_limits TEXT NOT NULL DEFAULT '{"monthlyEnhancements":50,"ratePerMinute":100,"burstLimit":200}', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT, password_hash TEXT NOT NULL, email_verified INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, last_login TEXT, reset_token_hash TEXT, reset_token_expires_at TEXT, failed_reset_attempts INTEGER DEFAULT 0, reset_locked_until TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE org_members (id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL DEFAULT 'member', created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE UNIQUE INDEX org_members_org_user_idx ON org_members(org_id, user_id);
CREATE TABLE user_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, is_revoked INTEGER DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE api_keys (id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, name TEXT NOT NULL, key_prefix TEXT NOT NULL, key_hash TEXT NOT NULL UNIQUE, scopes TEXT DEFAULT '["enhance"]', is_active INTEGER DEFAULT 1, last_used_at TEXT, expires_at TEXT, revoked_at TEXT, created_by TEXT REFERENCES users(id), created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX api_keys_org_active_idx ON api_keys(org_id, is_active);
CREATE TABLE usage_records (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, api_key_id TEXT NOT NULL REFERENCES api_keys(id), billing_period TEXT NOT NULL, request_count INTEGER NOT NULL DEFAULT 0, input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0, total_latency_ms INTEGER NOT NULL DEFAULT 0, provider_usage TEXT DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE UNIQUE INDEX usage_records_org_key_period_idx ON usage_records(org_id, api_key_id, billing_period);
CREATE TABLE enhancement_logs (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), org_id TEXT NOT NULL REFERENCES organizations(id), api_key_id TEXT NOT NULL REFERENCES api_keys(id), prompt_length INTEGER NOT NULL, has_context INTEGER NOT NULL, source TEXT NOT NULL, model TEXT, input_tokens INTEGER, output_tokens INTEGER, response_time_ms INTEGER, cost_preset TEXT, status_code INTEGER NOT NULL, error_message TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX enhancement_logs_org_created_idx ON enhancement_logs(org_id, created_at);
CREATE INDEX enhancement_logs_key_created_idx ON enhancement_logs(api_key_id, created_at);
`;

let app: Hono;
let setupDb: Database.Database;

function seedOrgAndKey(options?: { planLimits?: Record<string, number> }) {
  const orgId = crypto.randomUUID();
  const keyId = crypto.randomUUID();
  const rawKey = `mst_live_${randomBytes(32).toString('base64url')}`;
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.substring(0, 12) + '...';
  const planLimits = options?.planLimits ?? { monthlyEnhancements: 50, ratePerMinute: 100, burstLimit: 200 };

  setupDb.prepare(
    'INSERT INTO organizations (id, name, slug, plan_tier, plan_limits) VALUES (?, ?, ?, ?, ?)',
  ).run(orgId, 'Test Org', `test-org-${randomBytes(3).toString('hex')}`, 'free', JSON.stringify(planLimits));

  setupDb.prepare(
    'INSERT INTO api_keys (id, org_id, name, key_prefix, key_hash, scopes) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(keyId, orgId, 'Test Key', keyPrefix, keyHash, '["enhance"]');

  return { orgId, keyId, rawKey };
}

function getCurrentBillingPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

beforeAll(async () => {
  setupDb = new Database(DB_PATH);
  setupDb.pragma('journal_mode = WAL');
  setupDb.pragma('foreign_keys = ON');
  setupDb.exec(SCHEMA_SQL);

  const mod = await import('../../app');
  app = mod.default;
});

afterAll(() => {
  setupDb.close();
  for (const suffix of ['', '-wal', '-shm']) {
    const file = `${DB_PATH}${suffix}`;
    if (fs.existsSync(file)) fs.rmSync(file);
  }
});

describe('GET /v1/usage', () => {
  it('returns usage totals for the current billing period', async () => {
    const { orgId, keyId, rawKey } = seedOrgAndKey();

    setupDb.prepare(
      'INSERT INTO usage_records (id, org_id, api_key_id, billing_period, request_count, input_tokens, output_tokens) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(crypto.randomUUID(), orgId, keyId, getCurrentBillingPeriod(), 15, 3000, 7500);

    const res = await app.request('/v1/usage', {
      method: 'GET',
      headers: { Authorization: `Bearer ${rawKey}` },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.totalRequests).toBe(15);
    expect(json.data.totalInputTokens).toBe(3000);
    expect(json.data.totalOutputTokens).toBe(7500);
    expect(json.data.remaining).toBe(35);
    expect(json.data.limit).toBe(50);
    expect(json.data.byKey).toHaveLength(1);
    expect(json.data.byKey[0].apiKeyId).toBe(keyId);
  });

  it('returns usage for a specific period when queried', async () => {
    const { orgId, keyId, rawKey } = seedOrgAndKey();

    setupDb.prepare(
      'INSERT INTO usage_records (id, org_id, api_key_id, billing_period, request_count, input_tokens, output_tokens) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(crypto.randomUUID(), orgId, keyId, '2025-01', 42, 10000, 25000);

    const res = await app.request('/v1/usage?period=2025-01', {
      method: 'GET',
      headers: { Authorization: `Bearer ${rawKey}` },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.period).toBe('2025-01');
    expect(json.data.totalRequests).toBe(42);
    expect(json.data.totalInputTokens).toBe(10000);
    expect(json.data.totalOutputTokens).toBe(25000);
  });

  it('returns zeroes when no usage exists', async () => {
    const { rawKey } = seedOrgAndKey();

    const res = await app.request('/v1/usage', {
      method: 'GET',
      headers: { Authorization: `Bearer ${rawKey}` },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.totalRequests).toBe(0);
    expect(json.data.totalInputTokens).toBe(0);
    expect(json.data.totalOutputTokens).toBe(0);
    expect(json.data.remaining).toBe(50);
    expect(json.data.byKey).toHaveLength(0);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await app.request('/v1/usage', { method: 'GET' });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('AUTH_MISSING');
  });
});
