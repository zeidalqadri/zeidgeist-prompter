import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

// Lazy database connection
let _db: ReturnType<typeof drizzle> | null = null

function getDb() {
  if (!_db) {
    // Get database URL from environment variable
    const databaseUrl = process.env.DATABASE_URL

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required')
    }

    // Create Neon HTTP client
    const sql = neon(databaseUrl)

    // Create Drizzle instance with schema
    _db = drizzle(sql, { schema })
  }
  
  return _db
}

// Export lazy database connection
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>]
  }
})

// Export schema for use in other files
export * from './schema'