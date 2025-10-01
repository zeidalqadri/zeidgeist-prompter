/**
 * Database Connection Module
 *
 * DEPRECATED: The lazy initialization pattern below is kept for backward compatibility
 * but is not recommended for production use.
 *
 * RECOMMENDED: Use the new connection manager from './connection-manager'
 *
 * Migration guide:
 * - Old: const result = await db.select().from(users)
 * - New: const result = await withDatabase(env, db => db.select().from(users))
 */

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

// DEPRECATED: Lazy database connection (anti-pattern in Cloudflare Workers)
// Use DatabaseConnectionManager instead
let _db: ReturnType<typeof drizzle> | null = null

function getDb() {
  if (!_db) {
    // Get database URL from environment variable
    const databaseUrl = process.env.DATABASE_URL

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required')
    }

    // Log deprecation warning
    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        'DEPRECATED: Lazy database initialization is an anti-pattern. ' +
        'Use DatabaseConnectionManager from ./connection-manager instead.'
      );
    }

    // Create Neon HTTP client
    const sql = neon(databaseUrl)

    // Create Drizzle instance with schema
    _db = drizzle(sql, { schema })
  }

  return _db
}

// DEPRECATED: Export lazy database connection
// This is kept for backward compatibility but will be removed in future versions
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>]
  }
})

// Export new connection manager (RECOMMENDED)
export {
  DatabaseConnectionManager,
  createDatabaseManager,
  withDatabase,
  withTransaction,
  type DatabaseClient,
  type DatabaseConfig,
  type ConnectionHealth,
  DatabaseError
} from './connection-manager'

// Export schema for use in other files
export * from './schema'