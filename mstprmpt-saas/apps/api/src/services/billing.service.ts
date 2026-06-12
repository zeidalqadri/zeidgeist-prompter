import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { createDb, organizations } from '@mstprmpt/db';

const STRIPE_SECRET_KEY = process.env['STRIPE_SECRET_KEY'];

function getStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(STRIPE_SECRET_KEY);
}

const PLAN_CONFIGS: Record<string, { priceEnvKey: string; limits: { monthlyEnhancements: number; ratePerMinute: number; burstLimit: number } }> = {
  pro: {
    priceEnvKey: 'STRIPE_PRO_PRICE_ID',
    limits: { monthlyEnhancements: 1000, ratePerMinute: 30, burstLimit: 60 },
  },
  enterprise: {
    priceEnvKey: 'STRIPE_ENTERPRISE_PRICE_ID',
    limits: { monthlyEnhancements: -1, ratePerMinute: 100, burstLimit: 200 },
  },
};

export async function createOrGetStripeCustomer(orgId: string, email: string, orgName: string): Promise<string> {
  const db = createDb();
  const [org] = await db.select({ stripeCustomerId: organizations.stripeCustomerId }).from(organizations).where(eq(organizations.id, orgId)).limit(1);

  if (org?.stripeCustomerId) return org.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    name: orgName,
    metadata: { orgId },
  });

  await db.update(organizations)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date().toISOString() })
    .where(eq(organizations.id, orgId));

  return customer.id;
}

export async function createCheckoutSession(
  orgId: string,
  targetTier: string,
  successUrl: string,
  cancelUrl: string,
  customerEmail: string,
  orgName: string,
): Promise<string> {
  const planConfig = PLAN_CONFIGS[targetTier];
  if (!planConfig) throw new Error(`Invalid plan tier: ${targetTier}`);

  const priceId = process.env[planConfig.priceEnvKey];
  if (!priceId) throw new Error(`${planConfig.priceEnvKey} not configured`);

  const customerId = await createOrGetStripeCustomer(orgId, customerEmail, orgName);
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { orgId, tier: targetTier },
    subscription_data: { metadata: { orgId, tier: targetTier } },
  });

  return session.url!;
}

export async function getCustomerPortalUrl(orgId: string, returnUrl: string): Promise<string> {
  const db = createDb();
  const [org] = await db.select({ stripeCustomerId: organizations.stripeCustomerId }).from(organizations).where(eq(organizations.id, orgId)).limit(1);

  if (!org?.stripeCustomerId) throw new Error('No Stripe customer for this org');

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

export async function updateOrgPlan(orgId: string, tier: string): Promise<void> {
  const planConfig = PLAN_CONFIGS[tier];
  const limits = planConfig?.limits ?? { monthlyEnhancements: 50, ratePerMinute: 5, burstLimit: 10 };
  const db = createDb();

  await db.update(organizations)
    .set({ planTier: tier, planLimits: limits, updatedAt: new Date().toISOString() })
    .where(eq(organizations.id, orgId));
}
