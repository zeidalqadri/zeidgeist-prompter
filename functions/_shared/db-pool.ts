/**
 * Database Connection Pool Manager for Cloudflare D1
 *
 * D1 handles connection pooling internally, so this module
 * provides compatibility with existing code patterns.
 */

import { createDb, getOptimizedDb as getDb, executeWithRetry as retry } from './db'

// Re-export from db.ts for backward compatibility
export { createDb }
export const getOptimizedDb = getDb
export const executeWithRetry = retry

/**
 * Clear connection cache (no-op for D1, kept for API compatibility)
 */
export function clearConnectionCache(): void {
  // D1 manages connections internally, nothing to clear
}
