import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { enhance, EnhanceError } from '../../services/enhance.service';
import { apiKeyAuth, requireScope, type AuthContext } from '../../middleware/api-key-auth';
import { usageTracking } from '../../middleware/usage-tracking';
import { rateLimit } from '../../middleware/rate-limit';
import { eq, and, sql } from 'drizzle-orm';
import { createDb, usageRecords } from '@mstprmpt/db';

const enhanceBody = z.object({
  prompt: z.string().min(1).max(10000),
  context: z.string().max(5000).optional(),
  options: z.object({
    costPreset: z.enum(['maxQuality', 'balanced', 'costSavings', 'aggressive']).optional(),
    lambda: z.number().min(0).max(0.02).optional(),
    preferredProvider: z.enum(['claude', 'openai', 'deepseek', 'mistral', 'gemini']).optional(),
  }).optional(),
});

const app = new Hono<{ Variables: { auth: AuthContext } }>();

app.post('/', apiKeyAuth, requireScope('enhance'), rateLimit, usageTracking, zValidator('json', enhanceBody), async (c) => {
  const body = c.req.valid('json');
  const auth = c.get('auth');
  const billingPeriod = getCurrentBillingPeriod();
  const db = createDb();
  const limit = auth.planLimits.monthlyEnhancements;

  // Enforce usage limit before calling enhance (sum across all API keys for the org)
  if (limit !== -1) {
    const orgUsage = await db
      .select({ total: sql<number>`coalesce(sum(${usageRecords.requestCount}), 0)` })
      .from(usageRecords)
      .where(and(
        eq(usageRecords.orgId, auth.orgId),
        eq(usageRecords.billingPeriod, billingPeriod),
      ));

    const currentOrgCount = Number(orgUsage[0]?.total ?? 0);

    if (currentOrgCount >= limit) {
      return c.json({
        success: false,
        error: {
          code: 'USAGE_LIMIT_EXCEEDED',
          message: `Monthly limit of ${limit} enhancements reached. Upgrade your plan or wait until ${getNextResetDate()}.`,
        },
        usage: { remaining: 0, limit, resetAt: getNextResetDate() },
      }, 429);
    }
  }

  try {
    const result = await enhance(
      {
        prompt: body.prompt,
        context: body.context,
        costPreset: body.options?.costPreset,
        lambda: body.options?.lambda,
        preferredProvider: body.options?.preferredProvider,
      },
      auth.orgId,
      auth.apiKeyId,
      auth.planTier,
    );

    // Query usage AFTER enhance returns (usage-tracking middleware has committed by now)
    const postUsage = await db
      .select({ total: sql<number>`coalesce(sum(${usageRecords.requestCount}), 0)` })
      .from(usageRecords)
      .where(and(
        eq(usageRecords.orgId, auth.orgId),
        eq(usageRecords.billingPeriod, billingPeriod),
      ));

    const updatedCount = Number(postUsage[0]?.total ?? 0);

    return c.json({
      success: true,
      data: result,
      usage: {
        remaining: limit === -1 ? -1 : Math.max(0, limit - updatedCount),
        limit,
        resetAt: getNextResetDate(),
      },
    });
  } catch (error) {
    if (error instanceof EnhanceError) {
      return c.json({
        success: false,
        error: { code: error.code, message: error.message },
      }, error.statusCode as 400);
    }
    throw error;
  }
});

function getCurrentBillingPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getNextResetDate(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

export default app;
