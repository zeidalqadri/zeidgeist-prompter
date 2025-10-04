# Database Connection Guide

## Overview

This guide covers the database connection architecture for zeidgeist-prompter, including the migration from the legacy lazy initialization pattern to the new DatabaseConnectionManager.

## Architecture

### Current Implementation: Neon Serverless with HTTP

**Database**: PostgreSQL via [Neon](https://neon.tech)
**Client**: `@neondatabase/serverless` (HTTP-based, no persistent connections)
**ORM**: Drizzle ORM
**Environment**: Cloudflare Workers (serverless, stateless)

### Why Neon HTTP Client?

Neon's HTTP client is specifically designed for serverless environments:
- ✅ No persistent connections (stateless by design)
- ✅ Works in Cloudflare Workers (no TCP support needed)
- ✅ Automatic connection management per request
- ✅ Low latency with edge caching
- ✅ Scales automatically with demand

## Problem: Lazy Initialization Anti-Pattern

### Legacy Code (DEPRECATED):

```typescript
// ❌ ANTI-PATTERN: Global state with lazy initialization
let _db: ReturnType<typeof drizzle> | null = null

function getDb() {
  if (!_db) {
    _db = drizzle(neon(process.env.DATABASE_URL), { schema })
  }
  return _db
}

export const db = new Proxy({}, {
  get(target, prop) {
    return getDb()[prop]
  }
})
```

### Why This Is Problematic:

1. **Hidden State**: Database initialization happens on first access, not explicitly
2. **Race Conditions**: Multiple simultaneous first requests may create duplicate clients
3. **No Error Recovery**: If initialization fails, subsequent calls may behave unpredictably
4. **No Health Checks**: Can't validate connection health
5. **Difficult Testing**: Global state makes unit testing complex
6. **No Observability**: Can't track connection metrics

## Solution: DatabaseConnectionManager

### New Architecture (RECOMMENDED):

```typescript
import { withDatabase } from '../app/lib/db';

// Simple usage: Execute operation with automatic connection management
const users = await withDatabase(env, async (db) => {
  return await db.select().from(users).where(eq(users.id, userId));
});
```

### Key Improvements:

1. **Explicit Lifecycle**: Connection creation and cleanup are explicit
2. **Health Checks**: Built-in connectivity validation
3. **Error Handling**: Comprehensive error recovery
4. **Type Safety**: Full TypeScript support
5. **Testability**: Easy to mock and test
6. **Observability**: Latency tracking, error logging

## Usage Patterns

### Pattern 1: Simple Query (Recommended)

```typescript
import { withDatabase } from '../app/lib/db';
import { users } from '../app/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function onRequest(context: { request: Request; env: any }) {
  const { env } = context;

  try {
    const userList = await withDatabase(env, async (db) => {
      return await db.select().from(users).limit(10);
    });

    return new Response(JSON.stringify(userList), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Database error:', error);
    return new Response('Database error', { status: 500 });
  }
}
```

### Pattern 2: Transaction (Atomic Operations)

```typescript
import { withTransaction } from '../app/lib/db';
import { users, userSessions } from '../app/lib/db/schema';

export async function createUserWithSession(env: any, userData: any) {
  return await withTransaction(env, async (tx) => {
    // Both operations succeed or both fail
    const [user] = await tx.insert(users).values(userData).returning();

    const [session] = await tx.insert(userSessions).values({
      userId: user.id,
      token: generateToken(),
      expiresAt: new Date(Date.now() + 3600000)
    }).returning();

    return { user, session };
  });
}
```

### Pattern 3: Advanced - Manual Connection Management

```typescript
import { createDatabaseManager } from '../app/lib/db';

export async function onRequest(context: { request: Request; env: any }) {
  const { env } = context;
  const manager = createDatabaseManager(env);

  try {
    // Health check before operations
    const health = await manager.healthCheck();
    if (!health.isHealthy) {
      throw new Error(`Database unhealthy: ${health.error}`);
    }

    // Execute operations
    const result = await manager.execute(async (db) => {
      return await db.select().from(users);
    });

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response('Error', { status: 500 });
  } finally {
    // Always cleanup
    manager.close();
  }
}
```

### Pattern 4: Health Check Endpoint

```typescript
import { createDatabaseManager } from '../app/lib/db';

export async function onRequest(context: { request: Request; env: any }) {
  const { env } = context;
  const manager = createDatabaseManager(env);

  try {
    const health = await manager.healthCheck(true); // Force check

    return new Response(JSON.stringify({
      status: health.isHealthy ? 'healthy' : 'unhealthy',
      latencyMs: health.latencyMs,
      error: health.error,
      timestamp: new Date().toISOString()
    }), {
      status: health.isHealthy ? 200 : 503,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    manager.close();
  }
}
```

## Migration Guide

### Step 1: Identify Legacy Usage

Search for uses of the legacy `db` export:

```bash
grep -r "from.*'.*db.*'" functions/
grep -r "import.*{.*db.*}" functions/
```

### Step 2: Update Imports

**Before:**
```typescript
import { db } from '../../app/lib/db';
```

**After:**
```typescript
import { withDatabase } from '../../app/lib/db';
```

### Step 3: Wrap Database Operations

**Before:**
```typescript
const users = await db.select().from(users);
```

**After:**
```typescript
const users = await withDatabase(env, async (db) => {
  return await db.select().from(users);
});
```

### Step 4: Update Transaction Code

**Before:**
```typescript
await db.transaction(async (tx) => {
  // operations
});
```

**After:**
```typescript
await withTransaction(env, async (tx) => {
  // operations
});
```

## Error Handling

### DatabaseError Class

All database errors are wrapped in `DatabaseError` with cause tracking:

```typescript
try {
  await withDatabase(env, async (db) => {
    // database operations
  });
} catch (error) {
  if (error instanceof DatabaseError) {
    console.error('Database error:', error.message);
    console.error('Caused by:', error.cause);
  }
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `DATABASE_URL is required` | Missing environment variable | Set DATABASE_URL in wrangler.toml or Cloudflare dashboard |
| `Database initialization failed` | Invalid connection string | Verify DATABASE_URL format: `postgresql://...` |
| `Database operation failed` | Query error | Check query syntax, table names, column names |
| `Transaction failed` | Constraint violation | Check foreign keys, unique constraints |
| `Database unhealthy` | Connection timeout | Check Neon service status, increase timeout |

## Configuration

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:password@host.neon.tech/database

# Optional (set via DatabaseConfig)
CONNECTION_TIMEOUT=10000  # 10 seconds
STATEMENT_TIMEOUT=30000   # 30 seconds
```

### Custom Configuration

```typescript
import { DatabaseConnectionManager } from '../app/lib/db';

const config = {
  databaseUrl: env.DATABASE_URL,
  connectionTimeout: 15000,  // 15 seconds
  statementTimeout: 45000    // 45 seconds
};

const manager = new DatabaseConnectionManager(config);
```

## Performance Considerations

### Connection Overhead

Neon HTTP client creates a new HTTP request per query:
- **Latency**: 10-50ms per query (edge-optimized)
- **Throughput**: Limited by HTTP request limits
- **Recommendation**: Batch queries where possible

### Query Optimization

```typescript
// ❌ Bad: Multiple round trips
const user = await withDatabase(env, db => db.select().from(users).where(eq(users.id, id)));
const sessions = await withDatabase(env, db => db.select().from(sessions).where(eq(sessions.userId, id)));

// ✅ Good: Single query with join
const userWithSessions = await withDatabase(env, async (db) => {
  return await db.select()
    .from(users)
    .leftJoin(sessions, eq(users.id, sessions.userId))
    .where(eq(users.id, id));
});
```

### Health Check Caching

Health checks are cached for 1 minute to avoid excessive checks:

```typescript
// Uses cached result if < 1 minute old
const health = await manager.healthCheck();

// Forces new check
const health = await manager.healthCheck(true);
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { DatabaseConnectionManager } from './connection-manager';

describe('DatabaseConnectionManager', () => {
  it('should create client on first access', () => {
    const config = { databaseUrl: 'postgresql://test' };
    const manager = new DatabaseConnectionManager(config);

    const client = manager.getClient();
    expect(client).toBeDefined();
  });

  it('should reuse client on subsequent access', () => {
    const config = { databaseUrl: 'postgresql://test' };
    const manager = new DatabaseConnectionManager(config);

    const client1 = manager.getClient();
    const client2 = manager.getClient();

    expect(client1).toBe(client2);
  });
});
```

### Integration Tests

```typescript
import { withDatabase } from '../app/lib/db';

describe('Database Integration', () => {
  it('should execute query successfully', async () => {
    const env = { DATABASE_URL: process.env.TEST_DATABASE_URL };

    const result = await withDatabase(env, async (db) => {
      return await db.execute(sql`SELECT 1 as test`);
    });

    expect(result).toBeDefined();
  });
});
```

## Monitoring

### Key Metrics to Track

1. **Query Latency**: Time from request to response
2. **Error Rate**: Failed queries / total queries
3. **Connection Health**: Health check pass rate
4. **Query Volume**: Queries per second

### Logging

Enable query logging in development:

```typescript
const drizzleClient = drizzle(sqlClient, {
  schema,
  logger: process.env.NODE_ENV === 'development'  // Logs all queries
});
```

## Security Best Practices

1. **Never Commit DATABASE_URL**: Use secrets management
2. **Use Read Replicas**: For read-heavy workloads
3. **Implement Connection Limits**: Prevent connection exhaustion
4. **Enable SSL**: Neon enforces SSL by default
5. **Rotate Credentials**: Regularly rotate database passwords
6. **Audit Queries**: Log sensitive data access

## Troubleshooting

### Connection Timeouts

```typescript
// Increase timeout for long-running queries
const config = {
  databaseUrl: env.DATABASE_URL,
  connectionTimeout: 30000,  // 30 seconds
  statementTimeout: 60000    // 60 seconds
};
```

### Cold Start Performance

First request may be slower due to:
- Worker cold start
- DNS resolution
- TLS handshake

**Solution**: Use warm-up requests or keep-alive pings

### Query Debugging

Enable logging to see exact queries:

```typescript
const manager = createDatabaseManager(env);
const client = manager.getClient();

// Drizzle will log queries if logger is enabled
const result = await client.select().from(users);
```

## Related Documentation

- [Neon Serverless Driver](https://neon.tech/docs/serverless/serverless-driver)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
