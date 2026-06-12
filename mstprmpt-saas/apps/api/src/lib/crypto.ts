import { randomBytes, createHash } from 'node:crypto';

const KEY_PREFIX_LIVE = 'mst_live_';
const KEY_PREFIX_TEST = 'mst_test_';

export function generateApiKey(mode: 'live' | 'test' = 'live'): { fullKey: string; keyPrefix: string; keyHash: string } {
  const prefix = mode === 'live' ? KEY_PREFIX_LIVE : KEY_PREFIX_TEST;
  const random = randomBytes(32).toString('base64url');
  const fullKey = `${prefix}${random}`;
  const keyPrefix = fullKey.substring(0, 12) + '...';
  const keyHash = hashApiKey(fullKey);
  return { fullKey, keyPrefix, keyHash };
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}
