/**
 * Password Change API Endpoint
 * POST /api/auth/change-password
 *
 * Allows authenticated users to change their password.
 * Requires current password verification and revokes all other sessions.
 */

import { CloudflareAuthService } from "../../_shared/auth-service-workers";
import { getSecurityHeaders } from "../../_shared/privacy-guard";

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

    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      const cookies = parseCookies(cookieHeader);
      token = cookies['access_token'] || null;
    }

    if (!token) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Initialize auth service and validate token
    const authService = new CloudflareAuthService(env);
    const user = await authService.validateToken(token);

    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid or expired session'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Parse request body
    const body = await request.json() as any;
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Current password and new password are required'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Extract session ID from token
    const payload = parseJWTPayload(token);
    const sessionId = payload?.session_id;

    if (!sessionId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid session'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Change password
    const result = await authService.changePassword(
      user.id,
      sessionId,
      currentPassword,
      newPassword
    );

    if (!result.success) {
      return new Response(JSON.stringify({
        success: false,
        error: result.error
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Password changed successfully. Other sessions have been logged out.'
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Password change endpoint error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to change password. Please try again.'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
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
