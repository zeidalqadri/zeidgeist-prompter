import { createMiddleware } from 'hono/factory';
import type { AuthContext } from './api-key-auth';

interface BucketEntry {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, BucketEntry>();

export const rateLimit = createMiddleware<{ Variables: { auth: AuthContext } }>(async (c, next) => {
  const auth = c.get('auth');
  const key = `${auth.orgId}:${auth.apiKeyId}`;
  const maxTokens = auth.planLimits.ratePerMinute;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: maxTokens, lastRefill: now };
    buckets.set(key, bucket);
  }

  const elapsed = (now - bucket.lastRefill) / 60000;
  bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsed * maxTokens);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    const retryAfter = Math.ceil((1 - bucket.tokens) / maxTokens * 60);
    c.header('Retry-After', String(retryAfter));
    c.header('X-RateLimit-Limit', String(maxTokens));
    c.header('X-RateLimit-Remaining', '0');
    return c.json({
      success: false,
      error: { code: 'RATE_LIMITED', message: `Rate limit exceeded. ${maxTokens} requests per minute allowed.` },
    }, 429);
  }

  bucket.tokens -= 1;

  c.header('X-RateLimit-Limit', String(maxTokens));
  c.header('X-RateLimit-Remaining', String(Math.floor(bucket.tokens)));

  await next();
});
