import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createDb, users, organizations, orgMembers, apiKeys, userSessions } from '@mstprmpt/db';
import { generateApiKey } from '../../lib/crypto';
import { logger } from '../../lib/logger';

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_RESET_ATTEMPTS = 5;
const RESET_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

const registerBody = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(12),
  orgName: z.string().min(1).max(100),
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string(),
});

const forgotPasswordBody = z.object({
  email: z.string().email(),
});

const resetPasswordBody = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(12),
});

const changePasswordBody = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(12),
});

function isSha256Hash(hash: string): boolean {
  return /^[a-f0-9]{64}$/.test(hash);
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

const app = new Hono();

// --- Register ---

app.post('/register', zValidator('json', registerBody), async (c) => {
  const body = c.req.valid('json');
  const db = createDb();

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).limit(1);
  if (existing.length > 0) {
    return c.json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'Email already registered' } }, 409);
  }

  const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);

  const [user] = await db.insert(users).values({
    email: body.email,
    name: body.name,
    passwordHash,
    emailVerified: false,
  }).returning();

  const slug = body.orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + randomBytes(3).toString('hex');

  const [org] = await db.insert(organizations).values({
    name: body.orgName,
    slug,
    planTier: 'free',
    planLimits: { monthlyEnhancements: 50, ratePerMinute: 5, burstLimit: 10 },
  }).returning();

  await db.insert(orgMembers).values({
    orgId: org!.id,
    userId: user!.id,
    role: 'owner',
  });

  const { fullKey, keyPrefix, keyHash } = generateApiKey('live');

  await db.insert(apiKeys).values({
    orgId: org!.id,
    name: 'Default Key',
    keyPrefix,
    keyHash,
    scopes: JSON.stringify(['enhance']),
    createdBy: user!.id,
  });

  return c.json({
    success: true,
    data: {
      user: { id: user!.id, email: user!.email, name: user!.name },
      org: { id: org!.id, name: org!.name, slug: org!.slug, planTier: org!.planTier },
      apiKey: {
        key: fullKey,
        keyPrefix,
        note: 'Save this key — it will not be shown again.',
      },
    },
  }, 201);
});

// --- Login (with transparent SHA-256 → bcrypt migration) ---

app.post('/login', zValidator('json', loginBody), async (c) => {
  const body = c.req.valid('json');
  const db = createDb();

  const result = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
  if (result.length === 0) {
    return c.json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }, 401);
  }

  const user = result[0]!;
  let isValid = false;

  if (isSha256Hash(user.passwordHash)) {
    // Legacy SHA-256 hash — verify, then transparently upgrade to bcrypt
    const legacyHash = sha256(body.password);
    if (legacyHash === user.passwordHash) {
      isValid = true;
      const bcryptHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
      await db.update(users)
        .set({ passwordHash: bcryptHash, updatedAt: new Date().toISOString() })
        .where(eq(users.id, user.id));
      logger.info({ userId: user.id }, 'Migrated password hash from SHA-256 to bcrypt');
    }
  } else {
    isValid = await bcrypt.compare(body.password, user.passwordHash);
  }

  if (!isValid) {
    return c.json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }, 401);
  }

  const memberships = await db
    .select({ orgId: orgMembers.orgId, role: orgMembers.role, orgName: organizations.name, planTier: organizations.planTier })
    .from(orgMembers)
    .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
    .where(eq(orgMembers.userId, user.id));

  const sessionToken = randomBytes(32).toString('base64url');
  const sessionHash = createHash('sha256').update(sessionToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await db.insert(userSessions).values({
    userId: user.id,
    tokenHash: sessionHash,
    expiresAt,
  });

  await db.update(users).set({ lastLogin: new Date().toISOString() }).where(eq(users.id, user.id));

  return c.json({
    success: true,
    data: {
      user: { id: user.id, email: user.email, name: user.name },
      organizations: memberships,
      sessionToken,
      expiresAt,
    },
  });
});

// --- Forgot Password (request reset) ---

app.post('/forgot-password', zValidator('json', forgotPasswordBody), async (c) => {
  const { email } = c.req.valid('json');
  const db = createDb();

  // Always return success shape to prevent email enumeration
  const genericMessage = 'If an account exists with that email, a reset link has been generated.';

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (result.length === 0) {
    return c.json({ success: true, data: { message: genericMessage } });
  }

  const user = result[0]!;

  // Check lockout from too many reset requests
  if (user.resetLockedUntil && new Date(user.resetLockedUntil) > new Date()) {
    // Don't reveal lockout — same response as success
    return c.json({ success: true, data: { message: genericMessage } });
  }

  // Rate-limit: track consecutive reset requests
  const attempts = (user.failedResetAttempts ?? 0) + 1;
  if (attempts > MAX_RESET_ATTEMPTS) {
    await db.update(users).set({
      resetLockedUntil: new Date(Date.now() + RESET_LOCKOUT_MS).toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(users.id, user.id));
    return c.json({ success: true, data: { message: genericMessage } });
  }

  const resetToken = randomBytes(32).toString('base64url');
  const resetTokenHash = createHash('sha256').update(resetToken).digest('hex');
  const resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

  await db.update(users).set({
    resetTokenHash,
    resetTokenExpiresAt,
    failedResetAttempts: attempts,
    updatedAt: new Date().toISOString(),
  }).where(eq(users.id, user.id));

  logger.info({ userId: user.id, attempt: attempts }, 'Password reset token generated');

  // In production, send this token via email.
  // For pre-launch, return it in the response so the flow is testable.
  return c.json({
    success: true,
    data: {
      message: genericMessage,
      // Pre-launch only — remove before public launch
      _resetToken: resetToken,
      _expiresAt: resetTokenExpiresAt,
    },
  });
});

// --- Reset Password (execute reset with token) ---

app.post('/reset-password', zValidator('json', resetPasswordBody), async (c) => {
  const { token, newPassword } = c.req.valid('json');
  const db = createDb();

  const tokenHash = createHash('sha256').update(token).digest('hex');

  const result = await db.select().from(users).where(eq(users.resetTokenHash, tokenHash)).limit(1);

  if (result.length === 0) {
    return c.json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired reset token' } }, 400);
  }

  const user = result[0]!;

  // Check lockout from too many failed attempts
  if (user.resetLockedUntil && new Date(user.resetLockedUntil) > new Date()) {
    const retryAfter = Math.ceil((new Date(user.resetLockedUntil).getTime() - Date.now()) / 1000);
    return c.json({
      success: false,
      error: { code: 'RESET_LOCKED', message: `Too many failed attempts. Try again in ${retryAfter} seconds.` },
    }, 429);
  }

  // Check expiry
  if (!user.resetTokenExpiresAt || new Date(user.resetTokenExpiresAt) < new Date()) {
    await db.update(users).set({
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      updatedAt: new Date().toISOString(),
    }).where(eq(users.id, user.id));

    return c.json({ success: false, error: { code: 'TOKEN_EXPIRED', message: 'Reset token has expired. Please request a new one.' } }, 400);
  }

  // Hash new password with bcrypt
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Clear the reset token, update password, revoke all sessions
  await db.update(users).set({
    passwordHash,
    resetTokenHash: null,
    resetTokenExpiresAt: null,
    failedResetAttempts: 0,
    resetLockedUntil: null,
    updatedAt: new Date().toISOString(),
  }).where(eq(users.id, user.id));

  // Revoke all active sessions (force re-login)
  await db.update(userSessions)
    .set({ isRevoked: true })
    .where(eq(userSessions.userId, user.id));

  logger.info({ userId: user.id }, 'Password reset completed, all sessions revoked');

  return c.json({
    success: true,
    data: { message: 'Password reset successful. Please log in with your new password.' },
  });
});

// --- Change Password (authenticated, for logged-in users) ---

app.post('/change-password', zValidator('json', changePasswordBody), async (c) => {
  const { currentPassword, newPassword } = c.req.valid('json');

  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: { code: 'AUTH_MISSING', message: 'Session token required' } }, 401);
  }

  const token = authHeader.slice(7);
  if (token.startsWith('mst_live_') || token.startsWith('mst_test_')) {
    return c.json({ success: false, error: { code: 'AUTH_WRONG_TYPE', message: 'Use a session token, not an API key' } }, 401);
  }

  const db = createDb();
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const sessions = await db
    .select({ userId: userSessions.userId, expiresAt: userSessions.expiresAt })
    .from(userSessions)
    .where(eq(userSessions.tokenHash, tokenHash))
    .limit(1);

  if (sessions.length === 0 || new Date(sessions[0]!.expiresAt) < new Date()) {
    return c.json({ success: false, error: { code: 'AUTH_INVALID_SESSION', message: 'Invalid or expired session' } }, 401);
  }

  const userId = sessions[0]!.userId;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (result.length === 0) {
    return c.json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } }, 404);
  }

  const user = result[0]!;

  // Verify current password (handle both legacy SHA-256 and bcrypt)
  let currentValid = false;
  if (isSha256Hash(user.passwordHash)) {
    currentValid = sha256(currentPassword) === user.passwordHash;
  } else {
    currentValid = await bcrypt.compare(currentPassword, user.passwordHash);
  }

  if (!currentValid) {
    return c.json({ success: false, error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' } }, 401);
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await db.update(users).set({
    passwordHash,
    updatedAt: new Date().toISOString(),
  }).where(eq(users.id, user.id));

  logger.info({ userId: user.id }, 'Password changed successfully');

  return c.json({
    success: true,
    data: { message: 'Password changed successfully.' },
  });
});

export default app;
