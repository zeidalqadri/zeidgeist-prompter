import { randomBytes, createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Hono } from 'hono';

const mockEnhanceWithFallback = vi.fn();
const mockValidateSafety = vi.fn();

vi.mock('@mstprmpt/engine', () => ({
  LLMProviderFactory: { enhanceWithFallback: mockEnhanceWithFallback },
  SafetyValidator: vi.fn().mockImplementation(() => ({ validateSafety: mockValidateSafety })),
  CostAwareOptimizer: vi.fn().mockImplementation(() => ({})),
  DEFAULT_COST_CONFIG: { lambda: 0.007, enablePostProcessing: true, minQualityThreshold: 0.7, maxCompressionRatio: 0.5 },
  COST_PRESETS: {
    costSavings: { config: { lambda: 0.01 } },
    balanced: { config: { lambda: 0.007 } },
  },
}));

const DB_PATH = path.join(os.tmpdir(), `mstprmpt-enhance-test-${randomBytes(8).toString('hex')}.db`);
process.env['DATABASE_PATH'] = DB_PATH;

const SCHEMA_SQL = `
CREATE TABLE organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, stripe_customer_id TEXT UNIQUE, stripe_price_id TEXT, plan_tier TEXT NOT NULL DEFAULT 'free', plan_limits TEXT NOT NULL DEFAULT '{"monthlyEnhancements":50,"ratePerMinute":5,"burstLimit":10}', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
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

function seedOrgAndKey(options?: { scopes?: string[]; planLimits?: Record<string, number>; planTier?: string }) {
  const orgId = crypto.randomUUID();
  const keyId = crypto.randomUUID();
  const rawKey = `mst_live_${randomBytes(32).toString('base64url')}`;
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.substring(0, 12) + '...';
  const planLimits = options?.planLimits ?? { monthlyEnhancements: 50, ratePerMinute: 100, burstLimit: 200 };
  const planTier = options?.planTier ?? 'free';
  const scopes = JSON.stringify(options?.scopes ?? ['enhance']);

  setupDb.prepare(
    'INSERT INTO organizations (id, name, slug, plan_tier, plan_limits) VALUES (?, ?, ?, ?, ?)',
  ).run(orgId, 'Test Org', `test-org-${randomBytes(3).toString('hex')}`, planTier, JSON.stringify(planLimits));

  setupDb.prepare(
    'INSERT INTO api_keys (id, org_id, name, key_prefix, key_hash, scopes) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(keyId, orgId, 'Test Key', keyPrefix, keyHash, scopes);

  return { orgId, keyId, rawKey };
}

function getCurrentBillingPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

beforeAll(async () => {
  setupDb = new Database(DB_PATH);
  setupDb.pragma('journal_mode = WAL');
  setupDb.pragma('foreign_keys = ON');
  setupDb.exec(SCHEMA_SQL);

  const mod = await import('../../app');
  app = mod.default;
});

beforeEach(() => {
  mockEnhanceWithFallback.mockReset();
  mockValidateSafety.mockReset();
  mockValidateSafety.mockReturnValue({ riskLevel: 'safe', checks: [] });
});

afterAll(() => {
  setupDb.close();
  for (const suffix of ['', '-wal', '-shm']) {
    const file = `${DB_PATH}${suffix}`;
    if (fs.existsSync(file)) fs.rmSync(file);
  }
});

describe('POST /v1/enhance', () => {
  it('returns enhanced prompt on success', async () => {
    const { rawKey } = seedOrgAndKey();

    mockEnhanceWithFallback.mockResolvedValue({
      enhancedPrompt: 'An improved version of the prompt',
      source: 'claude',
      metadata: {
        model: 'claude-3-haiku',
        usage: { prompt_tokens: 10, completion_tokens: 50 },
        reasoning: { analysis: 'test' },
        attemptedProviders: ['claude'],
      },
    });

    const res = await app.request('/v1/enhance', {
      method: 'POST',
      headers: { ...JSON_HEADERS, Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({ prompt: 'Write a blog post about cats' }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.enhancedPrompt).toBe('An improved version of the prompt');
    expect(json.data.source).toBe('claude');
    expect(json.data.metadata.model).toBe('claude-3-haiku');
    expect(json.usage).toBeDefined();
    expect(typeof json.usage.remaining).toBe('number');
  });

  it('returns 402 when usage quota is exhausted', async () => {
    const { orgId, keyId, rawKey } = seedOrgAndKey({
      planLimits: { monthlyEnhancements: 1, ratePerMinute: 100, burstLimit: 200 },
    });

    setupDb.prepare(
      'INSERT INTO usage_records (id, org_id, api_key_id, billing_period, request_count) VALUES (?, ?, ?, ?, ?)',
    ).run(crypto.randomUUID(), orgId, keyId, getCurrentBillingPeriod(), 1);

    const res = await app.request('/v1/enhance', {
      method: 'POST',
      headers: { ...JSON_HEADERS, Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({ prompt: 'test prompt' }),
    });

    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('QUOTA_EXCEEDED');
  });

  it('returns 400 when safety validation blocks the prompt', async () => {
    const { rawKey } = seedOrgAndKey();

    mockValidateSafety.mockReturnValue({ riskLevel: 'critical', checks: [{ name: 'harmful', passed: false }] });

    const res = await app.request('/v1/enhance', {
      method: 'POST',
      headers: { ...JSON_HEADERS, Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({ prompt: 'dangerous prompt content' }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SAFETY_BLOCKED');
  });

  it('returns 401 for an invalid API key', async () => {
    const res = await app.request('/v1/enhance', {
      method: 'POST',
      headers: { ...JSON_HEADERS, Authorization: 'Bearer mst_live_invalid_key_value' },
      body: JSON.stringify({ prompt: 'test prompt' }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('AUTH_INVALID_KEY');
  });

  it('returns 403 when API key lacks the enhance scope', async () => {
    const { rawKey } = seedOrgAndKey({ scopes: ['read'] });

    const res = await app.request('/v1/enhance', {
      method: 'POST',
      headers: { ...JSON_HEADERS, Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({ prompt: 'test prompt' }),
    });

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INSUFFICIENT_SCOPE');
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await app.request('/v1/enhance', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ prompt: 'test prompt' }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('AUTH_MISSING');
  });
});
