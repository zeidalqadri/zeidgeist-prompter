import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { enhance, EnhanceError } from '../../services/enhance.service';
import { apiKeyAuth, requireScope, type AuthContext } from '../../middleware/api-key-auth';
import { usageTracking } from '../../middleware/usage-tracking';
import { rateLimit } from '../../middleware/rate-limit';
import { eq, and } from 'drizzle-orm';
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

    // Get current usage for response
    const billingPeriod = getCurrentBillingPeriod();
    const db = createDb();
    const usage = await db
      .select({ requestCount: usageRecords.requestCount })
      .from(usageRecords)
      .where(and(
        eq(usageRecords.orgId, auth.orgId),
        eq(usageRecords.apiKeyId, auth.apiKeyId),
        eq(usageRecords.billingPeriod, billingPeriod),
      ))
      .limit(1);

    const currentCount = (usage[0]?.requestCount ?? 0) + 1;
    const limit = auth.planLimits.monthlyEnhancements;

    return c.json({
      success: true,
      data: result,
      usage: {
        remaining: Math.max(0, limit - currentCount),
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
