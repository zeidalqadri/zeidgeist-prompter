import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { flexibleAuth, type FlexibleAuthContext } from '../../middleware/flexible-auth';
import { createCheckoutSession, getCustomerPortalUrl } from '../../services/billing.service';

const checkoutBody = z.object({
  targetTier: z.enum(['pro', 'enterprise']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  email: z.string().email(),
  orgName: z.string(),
});

const app = new Hono<{ Variables: { auth: FlexibleAuthContext } }>();

app.post('/checkout', flexibleAuth, zValidator('json', checkoutBody), async (c) => {
  const body = c.req.valid('json');
  const auth = c.get('auth');

  if (auth.planTier === body.targetTier) {
    return c.json({ success: false, error: { code: 'ALREADY_ON_PLAN', message: `Already on ${body.targetTier} plan` } }, 400);
  }

  const checkoutUrl = await createCheckoutSession(
    auth.orgId,
    body.targetTier,
    body.successUrl,
    body.cancelUrl,
    body.email,
    body.orgName,
  );

  return c.json({ success: true, data: { checkoutUrl } });
});

app.post('/portal', flexibleAuth, zValidator('json', z.object({ returnUrl: z.string().url() })), async (c) => {
  const { returnUrl } = c.req.valid('json');
  const auth = c.get('auth');

  const portalUrl = await getCustomerPortalUrl(auth.orgId, returnUrl);
  return c.json({ success: true, data: { portalUrl } });
});

export default app;
