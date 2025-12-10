/**
 * User Logout API Endpoint
 * POST /api/auth/logout
 *
 * Terminates the user's session by:
 * 1. Revoking the session in the database
 * 2. Invalidating the KV session cache
 * 3. Clearing authentication cookies
 */

import { CloudflareAuthService } from "../../_shared/auth-service-workers";
import { getSecurityHeaders } from "../../_shared/privacy-guard";
import { createD1AuthDb } from "../../_shared/db-d1";

// Cookie clearing headers - set Max-Age=0 to immediately expire cookies
const CLEAR_COOKIES = [
  'access_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
  'id_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
  'refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
].join(', ');

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      ...getSecurityHeaders(),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    // Extract token from cookie or Authorization header
    const cookieHeader = request.headers.get('cookie') || '';
    const authHeader = request.headers.get('authorization') || '';

    let token: string | null = null;

    // Try Authorization header first
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Fall back to cookie
      const cookies = parseCookies(cookieHeader);
      token = cookies['access_token'] || null;
    }

    if (!token) {
      // No token found - still clear cookies and return success
      // (user may have already logged out or token expired)
      return new Response(JSON.stringify({
        success: true,
        message: 'Logged out successfully'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Set-Cookie': CLEAR_COOKIES
        }
      });
    }

    // Parse JWT to extract session_id and user_id
    const payload = parseJWTPayload(token);

    if (payload && payload.session_id && payload.sub) {
      const sessionId = payload.session_id;
      const userId = payload.sub;

      // Revoke session in D1 database
      const d1Db = createD1AuthDb(env);
      if (d1Db) {
        try {
          await d1Db.revokeSession(sessionId);
        } catch (dbError) {
          console.error('Failed to revoke session in D1:', dbError);
          // Continue - still clear cookies
        }
      }

      // Invalidate KV session cache
      try {
        const authService = new CloudflareAuthService(env);
        await authService.invalidateSession(sessionId, userId);
      } catch (kvError) {
        console.error('Failed to invalidate session cache:', kvError);
        // Continue - still clear cookies
      }
    }

    // Return success with cookie clearing headers
    return new Response(JSON.stringify({
      success: true,
      message: 'Logged out successfully'
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Set-Cookie': CLEAR_COOKIES
      }
    });

  } catch (error) {
    console.error('Logout endpoint error:', error);

    // Even on error, clear cookies to ensure client-side logout
    return new Response(JSON.stringify({
      success: true,
      message: 'Logged out successfully'
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Set-Cookie': CLEAR_COOKIES
      }
    });
  }
}

/**
 * Parse cookies from Cookie header string
 */
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

/**
 * Parse JWT payload without verification (we just need session_id)
 * Note: The token was already verified during the session, we just need to extract IDs
 */
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
