import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { createDb, organizations, billingEvents } from '@mstprmpt/db';
import { logger } from '../../lib/logger';

const PLAN_LIMITS: Record<string, { monthlyEnhancements: number; ratePerMinute: number; burstLimit: number }> = {
  free: { monthlyEnhancements: 50, ratePerMinute: 5, burstLimit: 10 },
  pro: { monthlyEnhancements: 1000, ratePerMinute: 30, burstLimit: 60 },
  enterprise: { monthlyEnhancements: -1, ratePerMinute: 100, burstLimit: 200 },
};

const app = new Hono();

app.post('/', async (c) => {
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];
  if (!webhookSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET not configured');
    return c.json({ error: 'Webhook not configured' }, 500);
  }

  // In production, verify the Stripe signature here using stripe.webhooks.constructEvent()
  // For now, accept the raw body
  const body = await c.req.json() as { id: string; type: string; data: { object: Record<string, unknown> } };

  const db = createDb();

  // Idempotency check
  const existing = await db
    .select({ id: billingEvents.id })
    .from(billingEvents)
    .where(eq(billingEvents.stripeEventId, body.id))
    .limit(1);

  if (existing.length > 0) {
    return c.json({ received: true, duplicate: true });
  }

  const eventObj = body.data.object;
  const customerId = (eventObj['customer'] as string) || '';

  // Find org by Stripe customer ID
  const orgs = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.stripeCustomerId, customerId))
    .limit(1);

  const orgId = orgs[0]?.id;
  if (!orgId) {
    logger.warn({ customerId, eventType: body.type }, 'No org found for Stripe customer');
    return c.json({ received: true, warning: 'no_matching_org' });
  }

  // Store event
  await db.insert(billingEvents).values({
    orgId,
    stripeEventId: body.id,
    eventType: body.type,
    payload: body,
    processedAt: new Date().toISOString(),
  });

  // Process event
  switch (body.type) {
    case 'checkout.session.completed': {
      const tier = ((eventObj['metadata'] as Record<string, string>)?.['tier'] || 'pro') as string;
      const limits = PLAN_LIMITS[tier] || PLAN_LIMITS['pro']!;
      await db.update(organizations)
        .set({ planTier: tier, planLimits: limits, updatedAt: new Date().toISOString() })
        .where(eq(organizations.id, orgId));
      logger.info({ orgId, tier }, 'Plan upgraded');
      break;
    }
    case 'customer.subscription.deleted': {
      const limits = PLAN_LIMITS['free']!;
      await db.update(organizations)
        .set({ planTier: 'free', planLimits: limits, updatedAt: new Date().toISOString() })
        .where(eq(organizations.id, orgId));
      logger.info({ orgId }, 'Plan downgraded to free');
      break;
    }
    case 'invoice.payment_failed': {
      logger.warn({ orgId }, 'Payment failed — grace period started');
      break;
    }
    default:
      logger.info({ eventType: body.type }, 'Unhandled webhook event');
  }

  return c.json({ received: true });
});

export default app;
