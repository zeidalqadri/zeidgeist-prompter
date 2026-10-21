import { randomBytes, createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Hono } from 'hono';

// --- Test DB isolation ---
//
// `@mstprmpt/db`'s `createDb()` caches its connection in a module-level
// singleton, so every part of the app that calls `createDb()` shares one
// SQLite file for the lifetime of this process. To keep this test file
// isolated from other test files (and from any real dev DB), we point
// `DATABASE_PATH` at a fresh temp file *before* the app (and therefore
// `@mstprmpt/db`) is ever imported, then create the schema by hand with a
// raw `better-sqlite3` connection since there's no migration runner.

const DB_PATH = path.join(os.tmpdir(), `mstprmpt-auth-test-${randomBytes(8).toString('hex')}.db`);

process.env['DATABASE_PATH'] = DB_PATH;

const SCHEMA_SQL = `
CREATE TABLE organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, stripe_customer_id TEXT UNIQUE, stripe_price_id TEXT, plan_tier TEXT NOT NULL DEFAULT 'free', plan_limits TEXT NOT NULL DEFAULT '{"monthlyEnhancements":50,"ratePerMinute":5,"burstLimit":10}', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT, password_hash TEXT NOT NULL, email_verified INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, last_login TEXT, reset_token_hash TEXT, reset_token_expires_at TEXT, failed_reset_attempts INTEGER DEFAULT 0, reset_locked_until TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE org_members (id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL DEFAULT 'member', created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE UNIQUE INDEX org_members_org_user_idx ON org_members(org_id, user_id);
CREATE TABLE user_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, is_revoked INTEGER DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE api_keys (id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, name TEXT NOT NULL, key_prefix TEXT NOT NULL, key_hash TEXT NOT NULL UNIQUE, scopes TEXT DEFAULT '["enhance"]', is_active INTEGER DEFAULT 1, last_used_at TEXT, expires_at TEXT, revoked_at TEXT, created_by TEXT REFERENCES users(id), created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX api_keys_org_active_idx ON api_keys(org_id, is_active);
`;

let app: Hono;

beforeAll(async () => {
  const setup = new Database(DB_PATH);
  setup.pragma('journal_mode = WAL');
  setup.pragma('foreign_keys = ON');
  setup.exec(SCHEMA_SQL);
  setup.close();

  // Import the app *after* DATABASE_PATH is set and the schema exists, so
  // `createDb()`'s first (cached) connection points at our temp DB.
  const mod = await import('../../app');
  app = mod.default;
});

afterAll(() => {
  for (const suffix of ['', '-wal', '-shm']) {
    const file = `${DB_PATH}${suffix}`;
    if (fs.existsSync(file)) {
      fs.rmSync(file);
    }
  }
});

// --- Helpers ---

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function uniqueEmail(): string {
  return `test-${randomBytes(8).toString('hex')}@example.com`;
}

interface RegisterOptions {
  email?: string;
  name?: string;
  password?: string;
  orgName?: string;
}

async function register(options: RegisterOptions = {}) {
  const body = {
    email: options.email ?? uniqueEmail(),
    name: options.name ?? 'Test User',
    password: options.password ?? 'super-secure-password-123',
    orgName: options.orgName ?? 'Acme Inc',
  };

  const res = await app.request('/v1/auth/register', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });

  return { res, body };
}

async function login(email: string, password: string) {
  return app.request('/v1/auth/login', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ email, password }),
  });
}

// --- Tests ---

describe('POST /v1/auth/register', () => {
  it('registers a new user, creates an org, and returns an API key', async () => {
    const { res, body } = await register();

    expect(res.status).toBe(201);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.user.email).toBe(body.email);
    expect(json.data.user.name).toBe(body.name);
    expect(json.data.org.name).toBe(body.orgName);
    expect(json.data.org.planTier).toBe('free');
    expect(json.data.apiKey.key).toMatch(/^mst_live_/);
    expect(json.data.apiKey.keyPrefix).toMatch(/^mst_live_/);
  });

  it('rejects registration with a duplicate email (409)', async () => {
    const email = uniqueEmail();
    const first = await register({ email });
    expect(first.res.status).toBe(201);

    const second = await register({ email });
    expect(second.res.status).toBe(409);

    const json = await second.res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('EMAIL_EXISTS');
  });
});

describe('POST /v1/auth/login', () => {
  it('logs in successfully and returns a session token', async () => {
    const email = uniqueEmail();
    const password = 'correct-horse-battery-staple';
    await register({ email, password });

    const res = await login(email, password);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.user.email).toBe(email);
    expect(typeof json.data.sessionToken).toBe('string');
    expect(json.data.sessionToken.length).toBeGreaterThan(0);
    expect(json.data.organizations).toHaveLength(1);
  });

  it('rejects login with an incorrect password (401)', async () => {
    const email = uniqueEmail();
    await register({ email, password: 'the-correct-password-1' });

    const res = await login(email, 'the-wrong-password-1');
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('POST /v1/auth/forgot-password', () => {
  it('returns a generic message without leaking the reset token', async () => {
    const email = uniqueEmail();
    await register({ email });

    const res = await app.request('/v1/auth/forgot-password', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ email }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.message).toMatch(/if an account exists/i);
    expect(json.data._resetToken).toBeUndefined();
    expect(json.data).not.toHaveProperty('resetToken');
  });

  it('returns the same generic message for a non-existent email (anti-enumeration)', async () => {
    const existingEmail = uniqueEmail();
    await register({ email: existingEmail });

    const existingRes = await app.request('/v1/auth/forgot-password', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ email: existingEmail }),
    });
    const missingRes = await app.request('/v1/auth/forgot-password', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ email: uniqueEmail() }),
    });

    expect(existingRes.status).toBe(200);
    expect(missingRes.status).toBe(200);

    const existingJson = await existingRes.json();
    const missingJson = await missingRes.json();

    expect(missingJson.data.message).toBe(existingJson.data.message);
  });
});

describe('POST /v1/auth/change-password', () => {
  it('changes the password when given a valid session token', async () => {
    const email = uniqueEmail();
    const oldPassword = 'the-old-password-123';
    const newPassword = 'the-new-password-456';
    await register({ email, password: oldPassword });

    const loginRes = await login(email, oldPassword);
    const { sessionToken } = (await loginRes.json()).data;

    const res = await app.request('/v1/auth/change-password', {
      method: 'POST',
      headers: { ...JSON_HEADERS, Authorization: `Bearer ${sessionToken}` },
      body: JSON.stringify({ currentPassword: oldPassword, newPassword }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    const oldLoginRes = await login(email, oldPassword);
    expect(oldLoginRes.status).toBe(401);

    const newLoginRes = await login(email, newPassword);
    expect(newLoginRes.status).toBe(200);
  });

  it('rejects change-password with a revoked session (401)', async () => {
    const email = uniqueEmail();
    const password = 'a-perfectly-fine-password-1';
    await register({ email, password });

    const loginRes = await login(email, password);
    const { sessionToken } = (await loginRes.json()).data;

    // Manually revoke the session directly in the DB, bypassing the API,
    // to prove `sessionAuth` actually checks `is_revoked` rather than just
    // trusting a previously-issued token.
    const tokenHash = createHash('sha256').update(sessionToken).digest('hex');
    const raw = new Database(DB_PATH);
    raw.prepare('UPDATE user_sessions SET is_revoked = 1 WHERE token_hash = ?').run(tokenHash);
    raw.close();

    const res = await app.request('/v1/auth/change-password', {
      method: 'POST',
      headers: { ...JSON_HEADERS, Authorization: `Bearer ${sessionToken}` },
      body: JSON.stringify({ currentPassword: password, newPassword: 'another-new-password-2' }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('AUTH_INVALID_SESSION');
  });
});
