import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { createDb, usageRecords, enhancementLogs } from '@mstprmpt/db';
import { apiKeyAuth, type AuthContext } from '../../middleware/api-key-auth';

const app = new Hono<{ Variables: { auth: AuthContext } }>();

app.get('/', apiKeyAuth, async (c) => {
  const auth = c.get('auth');
  const period = c.req.query('period') || getCurrentBillingPeriod();
  const db = createDb();

  const records = await db
    .select()
    .from(usageRecords)
    .where(and(eq(usageRecords.orgId, auth.orgId), eq(usageRecords.billingPeriod, period)));

  const totalRequests = records.reduce((sum, r) => sum + r.requestCount, 0);
  const totalInputTokens = records.reduce((sum, r) => sum + (r.inputTokens ?? 0), 0);
  const totalOutputTokens = records.reduce((sum, r) => sum + (r.outputTokens ?? 0), 0);

  return c.json({
    success: true,
    data: {
      period,
      totalRequests,
      totalInputTokens,
      totalOutputTokens,
      limit: auth.planLimits.monthlyEnhancements,
      remaining: Math.max(0, auth.planLimits.monthlyEnhancements - totalRequests),
      byKey: records.map(r => ({
        apiKeyId: r.apiKeyId,
        requestCount: r.requestCount,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        providerUsage: r.providerUsage,
      })),
    },
  });
});

function getCurrentBillingPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default app;
