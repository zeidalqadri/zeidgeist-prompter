import { createMiddleware } from 'hono/factory';
import { createHash } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { createDb, userSessions, users, orgMembers, organizations } from '@mstprmpt/db';
import type { PlanLimits } from '@mstprmpt/db/types';

export interface SessionContext {
  userId: string;
  email: string;
  orgId: string;
  role: string;
  planTier: string;
  planLimits: PlanLimits;
}

export const sessionAuth = createMiddleware<{ Variables: { session: SessionContext } }>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: { code: 'AUTH_MISSING', message: 'Missing session token' } }, 401);
  }

  const token = authHeader.slice(7);

  if (token.startsWith('mst_live_') || token.startsWith('mst_test_')) {
    return c.json({ success: false, error: { code: 'AUTH_WRONG_TYPE', message: 'Use a session token for dashboard routes, not an API key' } }, 401);
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const db = createDb();

  const result = await db
    .select({
      sessionId: userSessions.id,
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
    return c.json({ success: false, error: { code: 'AUTH_SESSION_EXPIRED', message: 'Session expired — please log in again' } }, 401);
  }

  const membership = await db
    .select({
      orgId: orgMembers.orgId,
      role: orgMembers.role,
      planTier: organizations.planTier,
      planLimits: organizations.planLimits,
    })
    .from(orgMembers)
    .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
    .where(eq(orgMembers.userId, session.userId))
    .limit(1);

  if (membership.length === 0) {
    return c.json({ success: false, error: { code: 'AUTH_NO_ORG', message: 'User has no organization membership' } }, 403);
  }

  const member = membership[0]!;
  const planLimits: PlanLimits = typeof member.planLimits === 'string'
    ? JSON.parse(member.planLimits)
    : (member.planLimits as PlanLimits) ?? { monthlyEnhancements: 50, ratePerMinute: 5, burstLimit: 10 };

  c.set('session', {
    userId: session.userId,
    email: session.email,
    orgId: member.orgId,
    role: member.role,
    planTier: member.planTier,
    planLimits,
  });

  await next();
});
