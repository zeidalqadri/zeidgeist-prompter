import { Hono } from 'hono';
import Stripe from 'stripe';
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
  const stripeSecretKey = process.env['STRIPE_SECRET_KEY'];

  if (!webhookSecret || !stripeSecretKey) {
    logger.error('STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY not configured');
    return c.json({ error: 'Webhook not configured' }, 500);
  }

  const stripe = new Stripe(stripeSecretKey);

  const signature = c.req.header('stripe-signature');
  if (!signature) {
    return c.json({ error: 'Missing stripe-signature header' }, 400);
  }

  const rawBody = await c.req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    logger.warn({ err }, 'Invalid Stripe webhook signature');
    return c.json({ error: 'Invalid signature' }, 400);
  }

  const db = createDb();

  const existing = await db
    .select({ id: billingEvents.id })
    .from(billingEvents)
    .where(eq(billingEvents.stripeEventId, event.id))
    .limit(1);

  if (existing.length > 0) {
    return c.json({ received: true, duplicate: true });
  }

  const eventObj = event.data.object as Record<string, unknown>;
  const customerId = (eventObj['customer'] as string) || '';

  const orgs = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.stripeCustomerId, customerId))
    .limit(1);

  const orgId = orgs[0]?.id;
  if (!orgId) {
    logger.warn({ customerId, eventType: event.type }, 'No org found for Stripe customer');
    return c.json({ received: true, warning: 'no_matching_org' });
  }

  await db.insert(billingEvents).values({
    orgId,
    stripeEventId: event.id,
    eventType: event.type,
    payload: event as unknown as Record<string, unknown>,
    processedAt: new Date().toISOString(),
  });

  switch (event.type) {
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
      logger.info({ eventType: event.type }, 'Unhandled webhook event');
  }

  return c.json({ received: true });
});

export default app;
