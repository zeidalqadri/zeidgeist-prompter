import { createDb } from './index';
import { organizations, users, orgMembers, apiKeys } from './schema';
import { randomBytes, createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';

async function seed() {
  const dbPath = process.env['DATABASE_PATH'] || './data/mstprmpt.db';
  const dir = dbPath.substring(0, dbPath.lastIndexOf('/'));
  if (dir) mkdirSync(dir, { recursive: true });

  const db = createDb(dbPath);

  console.log(`Seeding database at ${dbPath}...`);

  // Create test user
  const userId = crypto.randomUUID();
  await db.insert(users).values({
    id: userId,
    email: 'admin@mstprmpt.com',
    name: 'Admin',
    passwordHash: createHash('sha256').update('testpassword123').digest('hex'),
    emailVerified: true,
  });

  console.log(`Created user: admin@mstprmpt.com (${userId})`);

  // Create test org
  const orgId = crypto.randomUUID();
  await db.insert(organizations).values({
    id: orgId,
    name: 'Test Organization',
    slug: 'test-org',
    planTier: 'pro',
    planLimits: JSON.stringify({ monthlyEnhancements: 1000, ratePerMinute: 30, burstLimit: 60 }),
  });

  console.log(`Created org: Test Organization (${orgId})`);

  // Link user to org
  await db.insert(orgMembers).values({
    orgId,
    userId,
    role: 'owner',
  });

  // Create API key
  const rawKey = `mst_live_${randomBytes(32).toString('base64url')}`;
  const keyPrefix = rawKey.substring(0, 12) + '...';
  const keyHash = createHash('sha256').update(rawKey).digest('hex');

  await db.insert(apiKeys).values({
    orgId,
    name: 'Default Key',
    keyPrefix,
    keyHash,
    scopes: JSON.stringify(['enhance']),
    createdBy: userId,
  });

  console.log('\n=== Test API Key (save this — shown only once) ===');
  console.log(rawKey);
  console.log('================================================\n');

  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
