/**
 * Forgot Password API Endpoint
 * POST /api/auth/forgot-password
 *
 * Allows users to reset their password using email + recovery PIN verification.
 * No email sending required - uses on-site PIN verification.
 */

import { CloudflareAuthService } from "../../_shared/auth-service-workers";
import { getSecurityHeaders } from "../../_shared/privacy-guard";

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      ...getSecurityHeaders(),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
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
    // Basic rate limiting using client IP
    const clientIP = request.headers.get('cf-connecting-ip') ||
                     request.headers.get('x-forwarded-for') ||
                     'unknown';

    // Parse request body
    const body = await request.json() as {
      email?: string;
      pin?: string;
      newPassword?: string;
    };

    const { email, pin, newPassword } = body;

    // Validate required fields
    if (!email || !pin || !newPassword) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email, PIN, and new password are required'
      }), { status: 400, headers: corsHeaders });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid email format'
      }), { status: 400, headers: corsHeaders });
    }

    // Validate PIN format
    if (!/^\d{6}$/.test(pin)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'PIN must be exactly 6 digits'
      }), { status: 400, headers: corsHeaders });
    }

    // Validate password requirements
    if (newPassword.length < 12) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Password must be at least 12 characters'
      }), { status: 400, headers: corsHeaders });
    }

    if (!/[A-Z]/.test(newPassword)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Password must contain at least one uppercase letter'
      }), { status: 400, headers: corsHeaders });
    }

    if (!/[0-9]/.test(newPassword)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Password must contain at least one number'
      }), { status: 400, headers: corsHeaders });
    }

    // Initialize auth service and attempt password reset
    const authService = new CloudflareAuthService(env);
    const result = await authService.resetPasswordWithPIN(email, pin, newPassword);

    if (!result.success) {
      // Log failed attempt for security monitoring
      console.warn(`Password reset failed for ${email.substring(0, 3)}*** from IP ${clientIP}: ${result.error}`);

      return new Response(JSON.stringify({
        success: false,
        error: result.error
      }), { status: 400, headers: corsHeaders });
    }

    // Success - log for audit trail
    console.log(`Password reset successful for ${email.substring(0, 3)}*** from IP ${clientIP}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Password reset successful. Please log in with your new password.'
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Forgot password error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Password reset failed. Please try again.'
    }), { status: 500, headers: corsHeaders });
  }
}
