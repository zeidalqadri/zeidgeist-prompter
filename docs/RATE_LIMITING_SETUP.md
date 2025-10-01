# Distributed Rate Limiting Setup Guide

## Overview

This application uses Cloudflare Workers KV for distributed rate limiting, replacing the previous in-memory implementation that didn't work correctly in distributed environments.

## Why Distributed Rate Limiting?

**Problem with In-Memory Rate Limiting:**
- Cloudflare Workers are stateless and ephemeral
- Each request may hit a different Worker instance
- In-memory maps reset on cold starts
- Rate limits can be easily bypassed by triggering new Worker instances
- **Security Risk**: Attackers can overwhelm the system with distributed requests

**Solution: Cloudflare KV-Based Rate Limiting:**
- ✅ Shared state across all Worker instances globally
- ✅ Automatic TTL-based expiration
- ✅ Low latency (edge-based storage)
- ✅ Prevents bypass attacks
- ✅ Progressive blocking for repeat violators

## Setup Instructions

### 1. Create KV Namespace

#### Using Wrangler CLI (Recommended):

```bash
# Create production KV namespace
wrangler kv:namespace create RATE_LIMITER

# Create preview KV namespace for development
wrangler kv:namespace create RATE_LIMITER --preview
```

This will output something like:
```
✨ Success!
Add the following to your wrangler.toml:
kv_namespaces = [
  { binding = "RATE_LIMITER", id = "abc123...", preview_id = "xyz789..." }
]
```

#### Using Cloudflare Dashboard:

1. Navigate to Workers & Pages → KV
2. Click "Create namespace"
3. Name it: `rate-limiter-production`
4. Note the namespace ID

### 2. Configure wrangler.toml

Add the KV namespace binding to your `wrangler.toml`:

```toml
# For Cloudflare Workers
[[kv_namespaces]]
binding = "RATE_LIMITER"
id = "your-production-namespace-id"
preview_id = "your-preview-namespace-id"
```

**For Cloudflare Pages:**

Pages Functions use a different configuration. Add to your Pages project settings:

1. Go to Pages project → Settings → Functions
2. Add KV namespace binding:
   - Variable name: `RATE_LIMITER`
   - KV namespace: Select your created namespace

### 3. Environment Variables

No additional environment variables are required. The KV binding is injected automatically by Cloudflare.

### 4. Update API Endpoints

Migrate your endpoints from legacy to distributed rate limiting:

#### Before (In-Memory - Broken):
```typescript
import { validateRequest } from '../_shared/auth';

export async function onRequest(context) {
  const { request, env } = context;

  // This doesn't work in distributed Workers!
  const validation = validateRequest(request, env, '/api/engineer');

  if (!validation.success) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 401
    });
  }

  // Handle request...
}
```

#### After (KV - Distributed):
```typescript
import { validateRequestWithKV } from '../_shared/auth';
import { createRateLimitResponse } from '../_shared/rate-limiter';

export async function onRequest(context) {
  const { request, env } = context;

  // Use distributed rate limiting with KV
  const validation = await validateRequestWithKV(
    request,
    env,
    '/api/engineer',
    env.RATE_LIMITER
  );

  if (!validation.success) {
    if (validation.rateLimitResult) {
      // Return proper rate limit response with headers
      return createRateLimitResponse(validation.rateLimitResult);
    }

    return new Response(JSON.stringify({ error: validation.error }), {
      status: 401
    });
  }

  // Handle request...
}
```

### 5. Configure Rate Limits

Rate limits are configured in `functions/_shared/rate-limiter.ts`:

```typescript
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/engineer': {
    windowMs: 60000,        // 1 minute window
    maxRequests: 10,        // 10 requests per minute
    blockDuration: 300000   // Block for 5 minutes after 3 violations
  },
  '/api/auth/login': {
    windowMs: 900000,       // 15 minute window
    maxRequests: 5,         // 5 login attempts
    blockDuration: 1800000  // Block for 30 minutes
  }
};
```

#### Custom Rate Limits:

```typescript
import { DistributedRateLimiter } from '../_shared/rate-limiter';

const customLimits = {
  '/api/premium': {
    windowMs: 60000,
    maxRequests: 100  // Premium users get higher limits
  }
};

const rateLimiter = new DistributedRateLimiter(
  env.RATE_LIMITER,
  customLimits
);
```

## Rate Limiting Features

### 1. Sliding Window Algorithm
- More accurate than fixed windows
- Prevents burst traffic at window boundaries
- Gradual limit recovery

### 2. Progressive Blocking
- First violation: Rate limit with retry-after
- Second violation: Rate limit with longer retry-after
- Third violation: Temporary IP block (default 5-30 minutes)

### 3. Per-Endpoint Limits
- Each API endpoint can have different limits
- Authentication endpoints have stricter limits
- Public endpoints have more lenient limits

### 4. Standard HTTP Headers
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 2025-10-01T14:30:00Z
Retry-After: 45
```

## Testing Rate Limits

### Local Development

For local development, create a KV namespace or use preview mode:

```bash
# Run with preview KV namespace
wrangler pages dev --kv RATE_LIMITER

# Or use local mode (simulated KV)
wrangler pages dev --local
```

### Testing Rate Limit Enforcement

```bash
# Test normal requests
for i in {1..5}; do
  curl -i http://localhost:8788/api/engineer -X POST \
    -H "Content-Type: application/json" \
    -d '{"prompt": "test"}'
  echo "Request $i"
done

# Test rate limit exceeded (11th request should be blocked)
for i in {1..15}; do
  curl -i http://localhost:8788/api/engineer -X POST \
    -H "Content-Type: application/json" \
    -d '{"prompt": "test"}'
  sleep 1
done
```

### Expected Response on Rate Limit:

```json
{
  "error": "Rate Limit Exceeded",
  "message": "Rate limit exceeded. Please try again later.",
  "limit": 10,
  "remaining": 0,
  "resetAt": "2025-10-01T14:35:00Z",
  "retryAfter": 45,
  "blocked": false
}
```

### After Repeat Violations (Blocked):

```json
{
  "error": "Rate Limit Exceeded",
  "message": "Rate limit exceeded. Your IP has been temporarily blocked due to repeated violations.",
  "limit": 10,
  "remaining": 0,
  "resetAt": "2025-10-01T14:40:00Z",
  "retryAfter": 300,
  "blocked": true
}
```

## Monitoring

### View Rate Limit Data in KV

```bash
# List keys (shows active rate limits)
wrangler kv:key list --namespace-id=your-namespace-id

# View specific rate limit entry
wrangler kv:key get "ratelimit:192.168.1.1:/api/engineer" \
  --namespace-id=your-namespace-id
```

### Sample KV Data:

```json
{
  "count": 8,
  "firstRequest": 1696161600000,
  "violations": 1,
  "blockedUntil": null
}
```

### Metrics to Monitor

1. **Rate Limit Hit Rate**: Percentage of requests hitting rate limits
2. **Block Rate**: Percentage of IPs getting temporarily blocked
3. **Top Rate-Limited IPs**: Identify potential attackers
4. **Endpoint Limits**: Which endpoints are most rate-limited

### Cloudflare Analytics

Enable analytics to track:
- Request counts per IP
- Geographic distribution of rate-limited requests
- Time-series of rate limit violations

## Administrative Functions

### Reset Rate Limit for Specific Client

```typescript
import { DistributedRateLimiter } from './rate-limiter';

const rateLimiter = new DistributedRateLimiter(env.RATE_LIMITER);

// Reset rate limit (e.g., for false positive)
await rateLimiter.resetRateLimit('192.168.1.1', '/api/engineer');
```

### Check Rate Limit Status (Without Incrementing)

```typescript
const status = await rateLimiter.getRateLimitStatus(
  '192.168.1.1',
  '/api/engineer'
);

console.log(`Remaining: ${status.remaining}/${status.limit}`);
```

## Migration from In-Memory Rate Limiting

### Step 1: Set up KV namespace (as described above)

### Step 2: Deploy with backward compatibility

The new implementation is backward compatible:
- Old `validateRequest()` function still works (but logs deprecation warning)
- New `validateRequestWithKV()` function uses distributed rate limiting

### Step 3: Update endpoints gradually

Update one endpoint at a time to use `validateRequestWithKV()`:

1. Start with low-traffic endpoints
2. Monitor for issues
3. Roll out to high-traffic endpoints
4. Remove legacy functions after migration complete

### Step 4: Remove deprecated code

After all endpoints migrated, remove:
- Old `checkRateLimit()` function
- In-memory `rateLimitStore` Map
- `cleanupRateLimitStore()` function

## Troubleshooting

### Rate Limits Not Working

1. **Check KV binding**: Ensure `RATE_LIMITER` is properly bound
   ```bash
   wrangler kv:namespace list
   ```

2. **Verify KV data**: Check if rate limit entries are being stored
   ```bash
   wrangler kv:key list --namespace-id=your-id
   ```

3. **Check client identifier**: Ensure `cf-connecting-ip` header is present
   ```typescript
   console.log('Client IP:', request.headers.get('cf-connecting-ip'));
   ```

### Rate Limits Too Strict/Lenient

Adjust limits in `rate-limiter.ts`:
- Increase `maxRequests` for more lenient limits
- Decrease `windowMs` for stricter enforcement
- Adjust `blockDuration` for longer/shorter blocks

### KV Quota Exceeded

Cloudflare Workers KV limits:
- Free tier: 100,000 reads/day, 1,000 writes/day
- Paid tier: 10M reads/day, 1M writes/day

If hitting limits, consider:
- Increasing time windows (fewer writes)
- Using Durable Objects for very high traffic
- Caching rate limit checks client-side

## Best Practices

1. **Start Conservative**: Begin with strict limits, loosen as needed
2. **Monitor Violations**: Track which IPs are getting blocked
3. **Whitelist Known IPs**: For CI/CD, monitoring, etc.
4. **Different Limits by Tier**: Premium users get higher limits
5. **Geographic Consideration**: Different limits for different regions
6. **Bot Protection**: Stricter limits for non-browser clients

## Security Considerations

1. **Don't Trust X-Forwarded-For**: Use `cf-connecting-ip` (Cloudflare's trusted header)
2. **Block After Violations**: Prevents brute force attacks
3. **Vary Limits by Endpoint**: Auth endpoints need stricter limits
4. **Monitor for Patterns**: Distributed attacks, credential stuffing
5. **GDPR Compliance**: KV data includes IP addresses (PII)

## Related Documentation

- [Cloudflare Workers KV](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
- [OWASP API Security - Rate Limiting](https://owasp.org/www-project-api-security/)
