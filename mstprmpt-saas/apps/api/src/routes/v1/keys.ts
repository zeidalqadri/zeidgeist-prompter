import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, and } from 'drizzle-orm';
import { createDb, apiKeys } from '@mstprmpt/db';
import { generateApiKey, hashApiKey } from '../../lib/crypto';
import { apiKeyAuth, type AuthContext } from '../../middleware/api-key-auth';

const createKeyBody = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
});

const app = new Hono<{ Variables: { auth: AuthContext } }>();

app.post('/', apiKeyAuth, zValidator('json', createKeyBody), async (c) => {
  const body = c.req.valid('json');
  const auth = c.get('auth');
  const db = createDb();

  const { fullKey, keyPrefix, keyHash } = generateApiKey('live');

  const [created] = await db.insert(apiKeys).values({
    orgId: auth.orgId,
    name: body.name,
    keyPrefix,
    keyHash,
    scopes: JSON.stringify(body.scopes || ['enhance']),
    expiresAt: body.expiresAt ? new Date(body.expiresAt).toISOString() : undefined,
    createdBy: undefined,
  }).returning();

  return c.json({
    success: true,
    data: {
      id: created!.id,
      key: fullKey,
      name: created!.name,
      keyPrefix,
      scopes: created!.scopes,
      expiresAt: created!.expiresAt,
      createdAt: created!.createdAt,
    },
  }, 201);
});

app.get('/', apiKeyAuth, async (c) => {
  const auth = c.get('auth');
  const db = createDb();

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      isActive: apiKeys.isActive,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.orgId, auth.orgId), eq(apiKeys.isActive, true)));

  return c.json({ success: true, data: keys });
});

app.delete('/:id', apiKeyAuth, async (c) => {
  const keyId = c.req.param('id');
  const auth = c.get('auth');
  const db = createDb();

  await db.update(apiKeys)
    .set({ isActive: false, revokedAt: new Date().toISOString() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.orgId, auth.orgId)));

  return c.body(null, 204);
});

app.post('/:id/rotate', apiKeyAuth, async (c) => {
  const keyId = c.req.param('id');
  const auth = c.get('auth');
  const db = createDb();

  const existing = await db
    .select({ name: apiKeys.name, scopes: apiKeys.scopes })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.orgId, auth.orgId)))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'API key not found' } }, 404);
  }

  // Revoke old key
  await db.update(apiKeys)
    .set({ isActive: false, revokedAt: new Date().toISOString() })
    .where(eq(apiKeys.id, keyId));

  // Create new key
  const { fullKey, keyPrefix, keyHash } = generateApiKey('live');
  const [created] = await db.insert(apiKeys).values({
    orgId: auth.orgId,
    name: existing[0]!.name,
    keyPrefix,
    keyHash,
    scopes: JSON.stringify(existing[0]!.scopes ? JSON.parse(existing[0]!.scopes) : ['enhance']),
  }).returning();

  return c.json({
    success: true,
    data: {
      id: created!.id,
      key: fullKey,
      name: created!.name,
      keyPrefix,
      scopes: created!.scopes,
      createdAt: created!.createdAt,
    },
  });
});

export default app;
