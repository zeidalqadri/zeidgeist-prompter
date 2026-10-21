import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';

// ---------------------------------------------------------------------------
// Test env setup — must run before `@mstprmpt/db` or the app is imported, so
// `createDb()`'s cached connection and the webhook handler's Stripe client
// pick up test-only values. `vi.hoisted` guarantees this runs before the
// static imports below are evaluated.
// ---------------------------------------------------------------------------
const TEST_DB_PATH = vi.hoisted(() => {
  const dir = process.env['TMPDIR'] || process.env['TEMP'] || '/tmp';
  const dbPath = `${dir}/mstprmpt-stripe-webhook-test-${process.pid}-${Date.now()}-${Math.floor(Math.random() * 1e6)}.db`;
  process.env['DATABASE_PATH'] = dbPath;
  process.env['STRIPE_SECRET_KEY'] = 'sk_test_mock';
  process.env['STRIPE_WEBHOOK_SECRET'] = 'whsec_test_mock';
  return dbPath;
});

// Bypass real HMAC verification: `constructEvent` just parses the raw body,
// so tests can post the Stripe event object directly.
vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      webhooks = {
        constructEvent: (body: string, _sig: string, _secret: string) => JSON.parse(body),
      };
    },
  };
});

const DDL = `
CREATE TABLE organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, stripe_customer_id TEXT UNIQUE, stripe_price_id TEXT, plan_tier TEXT NOT NULL DEFAULT 'free', plan_limits TEXT NOT NULL DEFAULT '{"monthlyEnhancements":50,"ratePerMinute":5,"burstLimit":10}', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE billing_events (id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organizations(id), stripe_event_id TEXT NOT NULL UNIQUE, event_type TEXT NOT NULL, payload TEXT NOT NULL, processed_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
`;

let setupDb: Database.Database;

function insertOrg(org: {
  id: string;
  stripeCustomerId: string;
  planTier?: string;
  planLimits?: Record<string, number>;
}): void {
  setupDb
    .prepare(
      `INSERT INTO organizations (id, name, slug, stripe_customer_id, plan_tier, plan_limits)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      org.id,
      `Org ${org.id}`,
      `org-${org.id}`,
      org.stripeCustomerId,
      org.planTier ?? 'free',
      JSON.stringify(org.planLimits ?? { monthlyEnhancements: 50, ratePerMinute: 5, burstLimit: 10 }),
    );
}

function getOrg(id: string): { plan_tier: string; plan_limits: string } | undefined {
  return setupDb.prepare('SELECT plan_tier, plan_limits FROM organizations WHERE id = ?').get(id) as
    | { plan_tier: string; plan_limits: string }
    | undefined;
}

function insertBillingEvent(orgId: string, stripeEventId: string): void {
  setupDb
    .prepare(
      `INSERT INTO billing_events (id, org_id, stripe_event_id, event_type, payload)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(`be-${stripeEventId}`, orgId, stripeEventId, 'checkout.session.completed', '{}');
}

// Imported after the hoisted env setup above so both pick up the test DB path
// and test Stripe credentials.
const { default: app } = await import('../../app');
const { logger } = await import('../../lib/logger');

async function postWebhook(body: unknown, headers: Record<string, string> = {}) {
  return app.request('/webhooks/stripe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

beforeAll(() => {
  setupDb = new Database(TEST_DB_PATH);
  setupDb.pragma('foreign_keys = ON');
  setupDb.exec(DDL);
});

afterAll(() => {
  setupDb.close();
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    try {
      fs.unlinkSync(`${TEST_DB_PATH}${suffix}`);
    } catch {
      // file may not exist — nothing to clean up
    }
  }
});

describe('POST /webhooks/stripe', () => {
  it('rejects requests missing the stripe-signature header with 400', async () => {
    const res = await postWebhook({ id: 'evt_no_sig', type: 'checkout.session.completed', data: { object: {} } });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing stripe-signature header' });
  });

  it('short-circuits duplicate events', async () => {
    const orgId = 'org-duplicate';
    insertOrg({ id: orgId, stripeCustomerId: 'cus_duplicate' });
    insertBillingEvent(orgId, 'evt_duplicate');

    const res = await postWebhook(
      {
        id: 'evt_duplicate',
        type: 'checkout.session.completed',
        data: { object: { customer: 'cus_duplicate', metadata: { tier: 'pro' } } },
      },
      { 'stripe-signature': 'sig_test' },
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, duplicate: true });

    // Plan must be untouched since the handler returned before dispatching.
    expect(getOrg(orgId)?.plan_tier).toBe('free');
  });

  it('upgrades the org plan on checkout.session.completed with a valid tier', async () => {
    const orgId = 'org-checkout-valid';
    insertOrg({ id: orgId, stripeCustomerId: 'cus_checkout_valid' });

    const res = await postWebhook(
      {
        id: 'evt_checkout_valid',
        type: 'checkout.session.completed',
        data: { object: { customer: 'cus_checkout_valid', metadata: { tier: 'pro' } } },
      },
      { 'stripe-signature': 'sig_test' },
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    const org = getOrg(orgId);
    expect(org?.plan_tier).toBe('pro');
    expect(JSON.parse(org!.plan_limits)).toEqual({ monthlyEnhancements: 1000, ratePerMinute: 30, burstLimit: 60 });
  });

  // NOTE: as of commit 65d3f8bd, apps/api/src/routes/webhooks/stripe.ts does NOT
  // implement this contract yet — it defaults a missing `metadata.tier` to
  // 'pro' and always updates the plan. This test encodes the intended/secure
  // behavior (reject silently-missing tier, warn, leave plan untouched) and
  // will fail until that validation lands. See final report for details.
  it('does not update the plan when checkout.session.completed is missing tier metadata', async () => {
    const orgId = 'org-checkout-missing-tier';
    insertOrg({ id: orgId, stripeCustomerId: 'cus_checkout_missing_tier' });
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined as never);

    const res = await postWebhook(
      {
        id: 'evt_checkout_missing_tier',
        type: 'checkout.session.completed',
        data: { object: { customer: 'cus_checkout_missing_tier', metadata: {} } },
      },
      { 'stripe-signature': 'sig_test' },
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({ orgId, eventId: 'evt_checkout_missing_tier' }),
      expect.stringContaining('missing or invalid tier'),
    );

    expect(getOrg(orgId)?.plan_tier).toBe('free');

    warnSpy.mockRestore();
  });

  it('downgrades the org to free on customer.subscription.deleted', async () => {
    const orgId = 'org-subscription-deleted';
    insertOrg({
      id: orgId,
      stripeCustomerId: 'cus_subscription_deleted',
      planTier: 'pro',
      planLimits: { monthlyEnhancements: 1000, ratePerMinute: 30, burstLimit: 60 },
    });

    const res = await postWebhook(
      {
        id: 'evt_subscription_deleted',
        type: 'customer.subscription.deleted',
        data: { object: { customer: 'cus_subscription_deleted' } },
      },
      { 'stripe-signature': 'sig_test' },
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    const org = getOrg(orgId);
    expect(org?.plan_tier).toBe('free');
    expect(JSON.parse(org!.plan_limits)).toEqual({ monthlyEnhancements: 50, ratePerMinute: 5, burstLimit: 10 });
  });
});
