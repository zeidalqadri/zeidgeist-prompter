/**
 * Database Connection Pool Manager for Cloudflare Workers
 * Optimizes database connections for better performance
 */

import { createDb } from './db'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'

// Connection cache with TTL
const connectionCache = new Map<string, { db: any; timestamp: number }>()
const CONNECTION_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get optimized database connection with connection pooling
 */
export function getOptimizedDb(env: any): any {
  const cacheKey = env.DATABASE_URL
  const now = Date.now()
  
  // Check if we have a valid cached connection
  const cached = connectionCache.get(cacheKey)
  if (cached && (now - cached.timestamp) < CONNECTION_TTL) {
    return cached.db
  }
  
  // Create new connection
  const db = createDb(env)

  // Only cache if connection was successful
  if (db) {
    // Cache the connection
    connectionCache.set(cacheKey, { db, timestamp: now })
  }
  
  // Clean up old connections (simple cleanup)
  if (connectionCache.size > 10) {
    const entries = Array.from(connectionCache.entries())
    const oldEntries = entries.filter(([, value]) => (now - value.timestamp) >= CONNECTION_TTL)
    oldEntries.forEach(([key]) => connectionCache.delete(key))
  }
  
  return db
}

/**
 * Execute database query with retry logic and performance monitoring
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 100
): Promise<T> {
  const startTime = Date.now()
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await operation()
      const duration = Date.now() - startTime
      
      // Log slow queries (>1 second)
      if (duration > 1000) {
        console.warn(`Slow database query detected: ${duration}ms`)
      }
      
      return result
    } catch (error) {
      if (attempt === retries - 1) {
        console.error('Database operation failed after retries:', error)
        throw error
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)))
    }
  }
  
  throw new Error('Max retries reached')
}

/**
 * Clear connection cache (useful for testing)
 */
export function clearConnectionCache(): void {
  connectionCache.clear()
}