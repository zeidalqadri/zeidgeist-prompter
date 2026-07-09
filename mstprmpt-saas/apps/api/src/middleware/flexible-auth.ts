import { createMiddleware } from 'hono/factory';
import { createHash } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { createDb, apiKeys, organizations, userSessions, users, orgMembers } from '@mstprmpt/db';
import { hashApiKey } from '../lib/crypto';
import type { PlanLimits } from '@mstprmpt/db/types';

export interface FlexibleAuthContext {
  orgId: string;
  planTier: string;
  planLimits: PlanLimits;
  authType: 'api_key' | 'session';
  apiKeyId?: string;
  userId?: string;
  email?: string;
}

export const flexibleAuth = createMiddleware<{ Variables: { auth: FlexibleAuthContext } }>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: { code: 'AUTH_MISSING', message: 'Missing Authorization header' } }, 401);
  }

  const token = authHeader.slice(7);
  const db = createDb();

  if (token.startsWith('mst_live_') || token.startsWith('mst_test_')) {
    const keyHash = hashApiKey(token);

    const result = await db
      .select({
        keyId: apiKeys.id,
        orgId: apiKeys.orgId,
        isActive: apiKeys.isActive,
        expiresAt: apiKeys.expiresAt,
        planTier: organizations.planTier,
        planLimits: organizations.planLimits,
      })
      .from(apiKeys)
      .innerJoin(organizations, eq(apiKeys.orgId, organizations.id))
      .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)))
      .limit(1);

    if (result.length === 0) {
      return c.json({ success: false, error: { code: 'AUTH_INVALID_KEY', message: 'Invalid or revoked API key' } }, 401);
    }

    const key = result[0]!;
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return c.json({ success: false, error: { code: 'AUTH_KEY_EXPIRED', message: 'API key has expired' } }, 401);
    }

    const planLimits: PlanLimits = typeof key.planLimits === 'string'
      ? JSON.parse(key.planLimits)
      : (key.planLimits as PlanLimits) ?? { monthlyEnhancements: 50, ratePerMinute: 5, burstLimit: 10 };

    c.set('auth', {
      orgId: key.orgId,
      apiKeyId: key.keyId,
      planTier: key.planTier,
      planLimits,
      authType: 'api_key',
    });
  } else {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const result = await db
      .select({
        userId: userSessions.userId,
        expiresAt: userSessions.expiresAt,
        isRevoked: userSessions.isRevoked,
        email: users.email,
      })
      .from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .where(and(eq(userSessions.tokenHash, tokenHash), eq(userSessions.isRevoked, false)))
      .limit(1);

    if (result.length === 0) {
      return c.json({ success: false, error: { code: 'AUTH_INVALID_SESSION', message: 'Invalid or revoked session' } }, 401);
    }

    const session = result[0]!;
    if (new Date(session.expiresAt) < new Date()) {
      return c.json({ success: false, error: { code: 'AUTH_SESSION_EXPIRED', message: 'Session expired' } }, 401);
    }

    const membership = await db
      .select({
        orgId: orgMembers.orgId,
        planTier: organizations.planTier,
        planLimits: organizations.planLimits,
      })
      .from(orgMembers)
      .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
      .where(eq(orgMembers.userId, session.userId))
      .limit(1);

    if (membership.length === 0) {
      return c.json({ success: false, error: { code: 'AUTH_NO_ORG', message: 'No organization found' } }, 403);
    }

    const member = membership[0]!;
    const planLimits: PlanLimits = typeof member.planLimits === 'string'
      ? JSON.parse(member.planLimits)
      : (member.planLimits as PlanLimits) ?? { monthlyEnhancements: 50, ratePerMinute: 5, burstLimit: 10 };

    c.set('auth', {
      orgId: member.orgId,
      planTier: member.planTier,
      planLimits,
      authType: 'session',
      userId: session.userId,
      email: session.email,
    });
  }

  await next();
});
