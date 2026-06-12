import { createMiddleware } from 'hono/factory';
import { eq, and } from 'drizzle-orm';
import { createDb, apiKeys, organizations } from '@mstprmpt/db';
import { hashApiKey } from '../lib/crypto';
import type { PlanLimits } from '@mstprmpt/db/types';

export interface AuthContext {
  orgId: string;
  apiKeyId: string;
  planTier: string;
  planLimits: PlanLimits;
}

export const apiKeyAuth = createMiddleware<{ Variables: { auth: AuthContext } }>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: { code: 'AUTH_MISSING', message: 'Missing API key. Pass via Authorization: Bearer mst_live_...' } }, 401);
  }

  const rawKey = authHeader.slice(7);
  if (!rawKey.startsWith('mst_live_') && !rawKey.startsWith('mst_test_')) {
    return c.json({ success: false, error: { code: 'AUTH_INVALID_FORMAT', message: 'Invalid API key format' } }, 401);
  }

  const keyHash = hashApiKey(rawKey);
  const db = createDb();

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

  // Update last used timestamp (fire-and-forget)
  db.update(apiKeys).set({ lastUsedAt: new Date().toISOString() }).where(eq(apiKeys.id, key.keyId)).catch(() => {});

  // Parse planLimits (stored as JSON string in SQLite)
  const planLimits: PlanLimits = typeof key.planLimits === 'string'
    ? JSON.parse(key.planLimits)
    : (key.planLimits as PlanLimits) ?? { monthlyEnhancements: 50, ratePerMinute: 5, burstLimit: 10 };

  c.set('auth', {
    orgId: key.orgId,
    apiKeyId: key.keyId,
    planTier: key.planTier,
    planLimits,
  });

  await next();
});
