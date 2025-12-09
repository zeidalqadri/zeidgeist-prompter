/**
 * D1 Database Adapter for Cloudflare Workers
 *
 * Provides native D1 database access for auth operations.
 * This is optimized for Cloudflare's edge network with:
 * - Sub-millisecond latency (edge-local)
 * - No cold start connection overhead
 * - Automatic replication
 * - Built-in SQLite compatibility
 */

// D1 Database type definition
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(columnName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: {
    duration: number;
    changes: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
  };
}

interface D1ExecResult {
  count: number;
  duration: number;
}

// User types for D1
export interface D1User {
  id: string;
  email: string;
  username: string | null;
  password_hash: string;
  email_verified: number; // SQLite uses integers for booleans
  mfa_enabled: number;
  mfa_secret: string | null;
  totp_secret: string | null;
  is_active: number;
  last_login: string | null;
  login_attempts: number;
  locked_until: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

export interface D1Session {
  id: string;
  user_id: string;
  token_hash: string;
  user_agent: string | null;
  expires_at: string;
  is_revoked: number;
  created_at: string;
  last_accessed: string;
}

/**
 * D1 Auth Database Adapter
 *
 * Provides a high-level interface for auth operations on D1.
 * Designed to be a drop-in replacement for the Neon/Drizzle adapter.
 */
export class D1AuthDatabase {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  // ===== User Operations =====

  async findUserByEmail(email: string): Promise<D1User | null> {
    const stmt = this.db.prepare(
      'SELECT * FROM users WHERE email = ? LIMIT 1'
    ).bind(email.toLowerCase());

    return await stmt.first<D1User>();
  }

  async findUserById(id: string): Promise<D1User | null> {
    const stmt = this.db.prepare(
      'SELECT * FROM users WHERE id = ? LIMIT 1'
    ).bind(id);

    return await stmt.first<D1User>();
  }

  async findActiveUserById(id: string): Promise<D1User | null> {
    const stmt = this.db.prepare(
      'SELECT * FROM users WHERE id = ? AND is_active = 1 LIMIT 1'
    ).bind(id);

    return await stmt.first<D1User>();
  }

  async createUser(user: {
    email: string;
    username?: string;
    passwordHash: string;
    metadata?: string;
  }): Promise<D1User> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.prepare(`
      INSERT INTO users (id, email, username, password_hash, email_verified, mfa_enabled, is_active, login_attempts, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, 0, 1, 0, ?, ?, ?)
    `).bind(
      id,
      user.email.toLowerCase(),
      user.username?.toLowerCase() || null,
      user.passwordHash,
      user.metadata || null,
      now,
      now
    ).run();

    return (await this.findUserById(id))!;
  }

  async updateUser(id: string, updates: Partial<{
    loginAttempts: number;
    lockedUntil: string | null;
    lastLogin: string;
    mfaEnabled: boolean;
    totpSecret: string;
    isActive: boolean;
  }>): Promise<void> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (updates.loginAttempts !== undefined) {
      setClauses.push('login_attempts = ?');
      values.push(updates.loginAttempts);
    }
    if (updates.lockedUntil !== undefined) {
      setClauses.push('locked_until = ?');
      values.push(updates.lockedUntil);
    }
    if (updates.lastLogin !== undefined) {
      setClauses.push('last_login = ?');
      values.push(updates.lastLogin);
    }
    if (updates.mfaEnabled !== undefined) {
      setClauses.push('mfa_enabled = ?');
      values.push(updates.mfaEnabled ? 1 : 0);
    }
    if (updates.totpSecret !== undefined) {
      setClauses.push('totp_secret = ?');
      values.push(updates.totpSecret);
    }
    if (updates.isActive !== undefined) {
      setClauses.push('is_active = ?');
      values.push(updates.isActive ? 1 : 0);
    }

    if (setClauses.length === 0) return;

    values.push(id);
    const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`;

    await this.db.prepare(query).bind(...values).run();
  }

  // ===== Session Operations =====

  async createSession(session: {
    id: string;
    userId: string;
    tokenHash: string;
    userAgent?: string;
    expiresAt: Date;
  }): Promise<D1Session> {
    const now = new Date().toISOString();

    await this.db.prepare(`
      INSERT INTO user_sessions (id, user_id, token_hash, user_agent, expires_at, is_revoked, created_at, last_accessed)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `).bind(
      session.id,
      session.userId,
      session.tokenHash,
      session.userAgent || null,
      session.expiresAt.toISOString(),
      now,
      now
    ).run();

    return (await this.findSessionById(session.id))!;
  }

  async findSessionById(id: string): Promise<D1Session | null> {
    const stmt = this.db.prepare(
      'SELECT * FROM user_sessions WHERE id = ? LIMIT 1'
    ).bind(id);

    return await stmt.first<D1Session>();
  }

  async findSessionByTokenHash(tokenHash: string): Promise<D1Session | null> {
    const stmt = this.db.prepare(
      'SELECT * FROM user_sessions WHERE token_hash = ? AND is_revoked = 0 LIMIT 1'
    ).bind(tokenHash);

    return await stmt.first<D1Session>();
  }

  async revokeSession(id: string): Promise<void> {
    await this.db.prepare(
      'UPDATE user_sessions SET is_revoked = 1 WHERE id = ?'
    ).bind(id).run();
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.db.prepare(
      'UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ?'
    ).bind(userId).run();
  }

  async updateSessionLastAccessed(id: string): Promise<void> {
    await this.db.prepare(
      'UPDATE user_sessions SET last_accessed = datetime("now") WHERE id = ?'
    ).bind(id).run();
  }

  async deleteExpiredSessions(): Promise<number> {
    const result = await this.db.prepare(
      'DELETE FROM user_sessions WHERE expires_at < datetime("now")'
    ).run();

    return result.meta.changes;
  }

  // ===== Utility Methods =====

  /**
   * Convert D1User to the format expected by the auth service
   */
  static toAuthUser(d1User: D1User): {
    id: string;
    email: string;
    username: string | null;
    passwordHash: string;
    emailVerified: boolean;
    mfaEnabled: boolean;
    mfaSecret: string | null;
    totpSecret: string | null;
    isActive: boolean;
    lastLogin: Date | null;
    loginAttempts: number;
    lockedUntil: Date | null;
    metadata: string | null;
  } {
    return {
      id: d1User.id,
      email: d1User.email,
      username: d1User.username,
      passwordHash: d1User.password_hash,
      emailVerified: d1User.email_verified === 1,
      mfaEnabled: d1User.mfa_enabled === 1,
      mfaSecret: d1User.mfa_secret,
      totpSecret: d1User.totp_secret,
      isActive: d1User.is_active === 1,
      lastLogin: d1User.last_login ? new Date(d1User.last_login) : null,
      loginAttempts: d1User.login_attempts,
      lockedUntil: d1User.locked_until ? new Date(d1User.locked_until) : null,
      metadata: d1User.metadata,
    };
  }
}

/**
 * Create a D1 auth database instance from the environment
 */
export function createD1AuthDb(env: { AUTH_DB?: D1Database }): D1AuthDatabase | null {
  if (!env.AUTH_DB) {
    console.warn('AUTH_DB (D1) not configured - using fallback database');
    return null;
  }

  return new D1AuthDatabase(env.AUTH_DB);
}
