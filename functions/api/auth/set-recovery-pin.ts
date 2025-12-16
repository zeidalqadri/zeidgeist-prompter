/**
 * Set Recovery PIN API Endpoint
 * POST /api/auth/set-recovery-pin
 *
 * Allows authenticated users to set or update their 6-digit recovery PIN
 * for password reset functionality.
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
    // Extract token from cookies or Authorization header
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
      }), { status: 401, headers: corsHeaders });
    }

    // Validate token and get user
    const authService = new CloudflareAuthService(env);
    const user = await authService.validateToken(token);

    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid or expired session'
      }), { status: 401, headers: corsHeaders });
    }

    // Parse request body
    const body = await request.json() as { pin?: string };
    const { pin } = body;

    // Validate PIN format
    if (!pin || !/^\d{6}$/.test(pin)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'PIN must be exactly 6 digits'
      }), { status: 400, headers: corsHeaders });
    }

    // Set the recovery PIN
    const result = await authService.setRecoveryPIN(user.id, pin);

    if (!result.success) {
      return new Response(JSON.stringify({
        success: false,
        error: result.error
      }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Recovery PIN set successfully. You can use this PIN to reset your password if you forget it.'
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Set recovery PIN error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to set recovery PIN'
    }), { status: 500, headers: corsHeaders });
  }
}

/**
 * Parse cookies from Cookie header
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
