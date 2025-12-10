/**
 * Session Management API Endpoints
 *
 * GET  /api/auth/sessions           - List active sessions for current user
 * DELETE /api/auth/sessions/:id     - Revoke a specific session
 * DELETE /api/auth/sessions?all=true - Revoke all sessions except current
 */

import { CloudflareAuthService } from "../../_shared/auth-service-workers";
import { createD1AuthDb } from "../../_shared/db-d1";
import { getSecurityHeaders } from "../../_shared/privacy-guard";

interface SessionInfo {
  id: string;
  userAgent: string | null;
  createdAt: string;
  lastAccessed: string;
  isCurrent: boolean;
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      ...getSecurityHeaders(),
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function onRequestGet(context: any): Promise<Response> {
  const { request, env } = context;

  const corsHeaders = {
    ...getSecurityHeaders(),
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  };

  try {
    // Authenticate user
    const auth = await authenticateRequest(request, env);
    if (!auth.success) {
      return new Response(JSON.stringify({
        success: false,
        error: auth.error
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const { user, sessionId } = auth;

    // Get user's sessions
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

    const sessions = await d1Db.listUserSessions(user.id);

    const sessionInfos: SessionInfo[] = sessions.map(session => ({
      id: session.id,
      userAgent: session.user_agent,
      createdAt: session.created_at,
      lastAccessed: session.last_accessed,
      isCurrent: session.id === sessionId
    }));

    return new Response(JSON.stringify({
      success: true,
      sessions: sessionInfos
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Sessions list error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to list sessions'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

export async function onRequestDelete(context: any): Promise<Response> {
  const { request, env } = context;

  const corsHeaders = {
    ...getSecurityHeaders(),
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  };

  try {
    // Authenticate user
    const auth = await authenticateRequest(request, env);
    if (!auth.success) {
      return new Response(JSON.stringify({
        success: false,
        error: auth.error
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const { user, sessionId: currentSessionId } = auth;
    const url = new URL(request.url);

    // Check if revoking all sessions
    const revokeAll = url.searchParams.get('all') === 'true';

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

    if (revokeAll) {
      // Revoke all sessions except current
      await d1Db.revokeAllUserSessionsExcept(user.id, currentSessionId);

      return new Response(JSON.stringify({
        success: true,
        message: 'All other sessions have been revoked'
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // Revoke a specific session
    // Extract session ID from URL path: /api/auth/sessions/:id
    const pathParts = url.pathname.split('/');
    const targetSessionId = pathParts[pathParts.length - 1];

    if (!targetSessionId || targetSessionId === 'sessions') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Session ID is required. Use ?all=true to revoke all sessions.'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Don't allow revoking current session (use logout for that)
    if (targetSessionId === currentSessionId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Cannot revoke current session. Use logout instead.'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Verify the session belongs to this user
    const session = await d1Db.findSessionById(targetSessionId);
    if (!session || session.user_id !== user.id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Session not found'
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    // Revoke the session
    await d1Db.revokeSession(targetSessionId);

    // Invalidate KV cache
    const authService = new CloudflareAuthService(env);
    await authService.invalidateSession(targetSessionId, user.id);

    return new Response(JSON.stringify({
      success: true,
      message: 'Session revoked successfully'
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Session revoke error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to revoke session'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

/**
 * Authenticate request and return user info
 */
async function authenticateRequest(
  request: Request,
  env: any
): Promise<{ success: true; user: { id: string }; sessionId: string } | { success: false; error: string }> {
  const cookieHeader = request.headers.get('cookie') || '';
  const authHeader = request.headers.get('authorization') || '';

  let token: string | null = null;

  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    const cookies = parseCookies(cookieHeader);
    token = cookies['access_token'] || null;
  }

  if (!token) {
    return { success: false, error: 'Authentication required' };
  }

  const authService = new CloudflareAuthService(env);
  const user = await authService.validateToken(token);

  if (!user) {
    return { success: false, error: 'Invalid or expired session' };
  }

  const payload = parseJWTPayload(token);
  const sessionId = payload?.session_id;

  if (!sessionId) {
    return { success: false, error: 'Invalid session' };
  }

  return { success: true, user, sessionId };
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) return cookies;

  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.trim().split('=');
    if (key) {
      cookies[key.trim()] = valueParts.join('=').trim();
    }
  }

  return cookies;
}

function parseJWTPayload(token: string): { session_id?: string; sub?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}
