import { createMiddleware } from 'hono/factory';
import { eq, and, sql } from 'drizzle-orm';
import { createDb, usageRecords } from '@mstprmpt/db';
import type { AuthContext } from './api-key-auth';

function getCurrentBillingPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const usageTracking = createMiddleware<{ Variables: { auth: AuthContext } }>(async (c, next) => {
  const auth = c.get('auth');
  const db = createDb();
  const billingPeriod = getCurrentBillingPeriod();

  const existing = await db
    .select({ requestCount: usageRecords.requestCount })
    .from(usageRecords)
    .where(and(
      eq(usageRecords.orgId, auth.orgId),
      eq(usageRecords.apiKeyId, auth.apiKeyId),
      eq(usageRecords.billingPeriod, billingPeriod),
    ))
    .limit(1);

  const currentCount = existing[0]?.requestCount ?? 0;
  const limit = auth.planLimits.monthlyEnhancements;

  if (limit > 0 && currentCount >= limit) {
    return c.json({
      success: false,
      error: {
        code: 'QUOTA_EXCEEDED',
        message: `Monthly quota of ${limit} enhancements exhausted. Upgrade your plan.`,
      },
      usage: { remaining: 0, limit, resetAt: getNextResetDate() },
    }, 402);
  }

  // Proceed with request
  await next();

  // Increment usage after successful response (only for 2xx)
  if (c.res.status >= 200 && c.res.status < 300) {
    await db
      .insert(usageRecords)
      .values({ orgId: auth.orgId, apiKeyId: auth.apiKeyId, billingPeriod, requestCount: 1 })
      .onConflictDoUpdate({
        target: [usageRecords.orgId, usageRecords.apiKeyId, usageRecords.billingPeriod],
        set: {
          requestCount: sql`${usageRecords.requestCount} + 1`,
          updatedAt: new Date().toISOString(),
        },
      })
      .catch(() => {});
  }
});

function getNextResetDate(): string {
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return nextMonth.toISOString();
}
