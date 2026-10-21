import { randomBytes, createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Hono } from 'hono';

const DB_PATH = path.join(os.tmpdir(), `mstprmpt-keys-test-${randomBytes(8).toString('hex')}.db`);
process.env['DATABASE_PATH'] = DB_PATH;

const SCHEMA_SQL = `
CREATE TABLE organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, stripe_customer_id TEXT UNIQUE, stripe_price_id TEXT, plan_tier TEXT NOT NULL DEFAULT 'free', plan_limits TEXT NOT NULL DEFAULT '{"monthlyEnhancements":50,"ratePerMinute":100,"burstLimit":200}', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT, password_hash TEXT NOT NULL, email_verified INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, last_login TEXT, reset_token_hash TEXT, reset_token_expires_at TEXT, failed_reset_attempts INTEGER DEFAULT 0, reset_locked_until TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE org_members (id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL DEFAULT 'member', created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE UNIQUE INDEX org_members_org_user_idx ON org_members(org_id, user_id);
CREATE TABLE user_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, is_revoked INTEGER DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE api_keys (id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, name TEXT NOT NULL, key_prefix TEXT NOT NULL, key_hash TEXT NOT NULL UNIQUE, scopes TEXT DEFAULT '["enhance"]', is_active INTEGER DEFAULT 1, last_used_at TEXT, expires_at TEXT, revoked_at TEXT, created_by TEXT REFERENCES users(id), created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX api_keys_org_active_idx ON api_keys(org_id, is_active);
`;

let app: Hono;
let setupDb: Database.Database;

function seedOrgAndKey() {
  const orgId = crypto.randomUUID();
  const keyId = crypto.randomUUID();
  const rawKey = `mst_live_${randomBytes(32).toString('base64url')}`;
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.substring(0, 12) + '...';

  setupDb.prepare(
    'INSERT INTO organizations (id, name, slug, plan_tier) VALUES (?, ?, ?, ?)',
  ).run(orgId, 'Test Org', `test-org-${randomBytes(3).toString('hex')}`, 'free');

  setupDb.prepare(
    'INSERT INTO api_keys (id, org_id, name, key_prefix, key_hash, scopes) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(keyId, orgId, 'Bootstrap Key', keyPrefix, keyHash, '["enhance"]');

  return { orgId, keyId, rawKey };
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

afterAll(() => {
  setupDb.close();
  for (const suffix of ['', '-wal', '-shm']) {
    const file = `${DB_PATH}${suffix}`;
    if (fs.existsSync(file)) fs.rmSync(file);
  }
});

describe('POST /v1/keys', () => {
  it('creates a new API key with mst_live_ prefix', async () => {
    const { rawKey } = seedOrgAndKey();

    const res = await app.request('/v1/keys', {
      method: 'POST',
      headers: { ...JSON_HEADERS, Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({ name: 'My New Key' }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.key).toMatch(/^mst_live_/);
    expect(json.data.name).toBe('My New Key');
    expect(json.data.keyPrefix).toBeDefined();
    expect(json.data.id).toBeDefined();
  });
});

describe('GET /v1/keys', () => {
  it('lists only active keys for the org', async () => {
    const { orgId, rawKey } = seedOrgAndKey();

    const revokedKeyHash = createHash('sha256').update('mst_live_revoked').digest('hex');
    setupDb.prepare(
      'INSERT INTO api_keys (id, org_id, name, key_prefix, key_hash, scopes, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(crypto.randomUUID(), orgId, 'Revoked Key', 'mst_live_rev...', revokedKeyHash, '["enhance"]', 0);

    const res = await app.request('/v1/keys', {
      method: 'GET',
      headers: { Authorization: `Bearer ${rawKey}` },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    for (const key of json.data) {
      expect(key.isActive).toBe(true);
      expect(key.name).not.toBe('Revoked Key');
    }
  });
});

describe('DELETE /v1/keys/:id', () => {
  it('soft-revokes a key (204)', async () => {
    const { rawKey } = seedOrgAndKey();

    const createRes = await app.request('/v1/keys', {
      method: 'POST',
      headers: { ...JSON_HEADERS, Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({ name: 'To Delete' }),
    });
    const { data: created } = await createRes.json();

    const deleteRes = await app.request(`/v1/keys/${created.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${rawKey}` },
    });

    expect(deleteRes.status).toBe(204);

    const listRes = await app.request('/v1/keys', {
      method: 'GET',
      headers: { Authorization: `Bearer ${rawKey}` },
    });
    const { data: keys } = await listRes.json();
    const deletedKey = keys.find((k: { id: string }) => k.id === created.id);
    expect(deletedKey).toBeUndefined();
  });
});

describe('POST /v1/keys/:id/rotate', () => {
  it('revokes the old key and returns a new one', async () => {
    const { rawKey } = seedOrgAndKey();

    const createRes = await app.request('/v1/keys', {
      method: 'POST',
      headers: { ...JSON_HEADERS, Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({ name: 'To Rotate' }),
    });
    const { data: original } = await createRes.json();

    const rotateRes = await app.request(`/v1/keys/${original.id}/rotate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${rawKey}` },
    });

    expect(rotateRes.status).toBe(200);
    const { data: rotated } = await rotateRes.json();
    expect(rotated.key).toMatch(/^mst_live_/);
    expect(rotated.id).not.toBe(original.id);
    expect(rotated.name).toBe('To Rotate');
  });

  it('returns 404 for a non-existent key', async () => {
    const { rawKey } = seedOrgAndKey();

    const res = await app.request('/v1/keys/nonexistent-id/rotate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${rawKey}` },
    });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NOT_FOUND');
  });
});
