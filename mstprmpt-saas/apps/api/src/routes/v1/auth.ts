import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createDb, users, organizations, orgMembers, apiKeys, userSessions } from '@mstprmpt/db';
import { generateApiKey } from '../../lib/crypto';

const registerBody = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(12),
  orgName: z.string().min(1).max(100),
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string(),
});

const app = new Hono();

app.post('/register', zValidator('json', registerBody), async (c) => {
  const body = c.req.valid('json');
  const db = createDb();

  // Check if email exists
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).limit(1);
  if (existing.length > 0) {
    return c.json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'Email already registered' } }, 409);
  }

  const passwordHash = await bcrypt.hash(body.password, 12);

  const [user] = await db.insert(users).values({
    email: body.email,
    name: body.name,
    passwordHash,
    emailVerified: false,
  }).returning();

  // Create org with slug derived from name
  const slug = body.orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + randomBytes(3).toString('hex');

  const [org] = await db.insert(organizations).values({
    name: body.orgName,
    slug,
    planTier: 'free',
    planLimits: { monthlyEnhancements: 50, ratePerMinute: 5, burstLimit: 10 },
  }).returning();

  // Link user as owner
  await db.insert(orgMembers).values({
    orgId: org!.id,
    userId: user!.id,
    role: 'owner',
  });

  // Create first API key
  const { fullKey, keyPrefix, keyHash } = generateApiKey('live');

  await db.insert(apiKeys).values({
    orgId: org!.id,
    name: 'Default Key',
    keyPrefix,
    keyHash,
    scopes: JSON.stringify(['enhance']),
    createdBy: user!.id,
  });

  return c.json({
    success: true,
    data: {
      user: { id: user!.id, email: user!.email, name: user!.name },
      org: { id: org!.id, name: org!.name, slug: org!.slug, planTier: org!.planTier },
      apiKey: {
        key: fullKey,
        keyPrefix,
        note: 'Save this key — it will not be shown again.',
      },
    },
  }, 201);
});

app.post('/login', zValidator('json', loginBody), async (c) => {
  const body = c.req.valid('json');
  const db = createDb();

  const result = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
  if (result.length === 0) {
    return c.json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }, 401);
  }

  const user = result[0]!;
  const isValid = await bcrypt.compare(body.password, user.passwordHash);

  if (!isValid) {
    return c.json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }, 401);
  }

  const memberships = await db
    .select({ orgId: orgMembers.orgId, role: orgMembers.role, orgName: organizations.name, planTier: organizations.planTier })
    .from(orgMembers)
    .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
    .where(eq(orgMembers.userId, user.id));

  const sessionToken = randomBytes(32).toString('base64url');
  const sessionHash = createHash('sha256').update(sessionToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await db.insert(userSessions).values({
    userId: user.id,
    tokenHash: sessionHash,
    expiresAt,
  });

  await db.update(users).set({ lastLogin: new Date().toISOString() }).where(eq(users.id, user.id));

  return c.json({
    success: true,
    data: {
      user: { id: user.id, email: user.email, name: user.name },
      organizations: memberships,
      sessionToken,
      expiresAt,
    },
  });
});

export default app;
