/**
 * Session Cleanup Scheduled Function
 *
 * Deletes expired sessions and old revoked sessions from the D1 database.
 * Should be called every 6 hours via:
 * - Cloudflare Cron Triggers (requires separate Worker)
 * - External cron service (e.g., cron-job.org)
 * - Manual trigger via POST request with admin key
 *
 * POST /api/scheduled/session-cleanup
 */

import { createD1AuthDb } from "../../_shared/db-d1";
import { getSecurityHeaders } from "../../_shared/privacy-guard";

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      ...getSecurityHeaders(),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Cleanup-Key',
    },
  });
}

export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context;

  const corsHeaders = {
    ...getSecurityHeaders(),
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  };

  try {
    // Verify cleanup key (should be set as a secret in Cloudflare)
    const cleanupKey = request.headers.get('x-cleanup-key');
    const expectedKey = env.CLEANUP_SECRET_KEY;

    // Allow if key matches or if request is from Cloudflare scheduled trigger
    const isScheduledTrigger = request.cf?.colo !== undefined && !request.headers.get('origin');

    if (!isScheduledTrigger && (!expectedKey || cleanupKey !== expectedKey)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const d1Db = createD1AuthDb(env);
    if (!d1Db) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Database not available'
      }), {
        status: 503,
        headers: corsHeaders
      });
    }

    const startTime = Date.now();

    // 1. Delete expired sessions
    const expiredDeleted = await d1Db.deleteExpiredSessions();

    // 2. Delete old revoked sessions (older than 7 days)
    const staleDeleted = await deleteOldRevokedSessions(d1Db, 7);

    // 3. Clean up very old sessions (safety net - older than 30 days)
    const ancientDeleted = await deleteAncientSessions(d1Db, 30);

    const duration = Date.now() - startTime;

    console.log(`[SessionCleanup] Completed in ${duration}ms:`, {
      expiredDeleted,
      staleDeleted,
      ancientDeleted
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Session cleanup completed',
      stats: {
        expiredDeleted,
        staleDeleted,
        ancientDeleted,
        durationMs: duration
      }
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Session cleanup error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Session cleanup failed'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

/**
 * Delete revoked sessions older than specified days
 */
async function deleteOldRevokedSessions(d1Db: any, days: number): Promise<number> {
  try {
    const result = await d1Db.db.prepare(`
      DELETE FROM user_sessions
      WHERE is_revoked = 1
      AND created_at < datetime('now', '-' || ? || ' days')
    `).bind(days).run();

    return result.meta.changes;
  } catch (error) {
    console.error('Failed to delete old revoked sessions:', error);
    return 0;
  }
}

/**
 * Delete all sessions older than specified days (safety net)
 */
async function deleteAncientSessions(d1Db: any, days: number): Promise<number> {
  try {
    const result = await d1Db.db.prepare(`
      DELETE FROM user_sessions
      WHERE created_at < datetime('now', '-' || ? || ' days')
    `).bind(days).run();

    return result.meta.changes;
  } catch (error) {
    console.error('Failed to delete ancient sessions:', error);
    return 0;
  }
}
