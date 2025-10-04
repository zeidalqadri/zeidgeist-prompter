/**
 * Cloudflare Workers-compatible Database Module
 *
 * This module provides database functionality for Cloudflare Pages Functions
 * without using Node.js specific features like process.env
 */

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

// Export schema types
export * from './schema'

/**
 * Create a database connection using the environment object
 * @param env - Cloudflare environment object containing DATABASE_URL
 */
export function createDb(env: { DATABASE_URL?: string }) {
  const databaseUrl = env.DATABASE_URL

  if (!databaseUrl) {
    console.error('DATABASE_URL not found in environment')
    // Return a stub that won't crash but won't work either
    // This allows the enhancement to continue without database
    return null
  }

  try {
    const sql = neon(databaseUrl)
    return drizzle(sql, { schema })
  } catch (error) {
    console.error('Failed to create database connection:', error)
    return null
  }
}

/**
 * Execute a database operation with proper error handling
 * @param env - Cloudflare environment object
 * @param operation - Database operation to execute
 */
export async function withDatabase<T>(
  env: { DATABASE_URL?: string },
  operation: (db: ReturnType<typeof drizzle>) => Promise<T>
): Promise<T | null> {
  const db = createDb(env)

  if (!db) {
    console.warn('Database operation skipped - no connection available')
    return null
  }

  try {
    return await operation(db)
  } catch (error) {
    console.error('Database operation failed:', error)
    return null
  }
}

// Export a type for the database instance
export type Database = ReturnType<typeof createDb>