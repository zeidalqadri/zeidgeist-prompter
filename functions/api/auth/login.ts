/**
 * User Login API Endpoint
 * POST /api/auth/login
 */

import { CloudflareAuthService } from "../../_shared/auth-service-workers";
import { getSecurityHeaders } from "../../_shared/privacy-guard";
import { monitorRequest, privacyMonitor } from "../../_shared/privacy-monitor";

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
  
  // Monitor request for security
  monitorRequest(request, context);
  
  const corsHeaders = {
    ...getSecurityHeaders(),
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  };

  try {
    const body = await request.json() as any;
    const { email, password, totpCode } = body;
    
    // Get client information for session tracking
    const clientIP = request.headers.get('cf-connecting-ip') || 
                     request.headers.get('x-forwarded-for') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Input validation
    if (!email || !password) {
      // Track failed login attempt
      privacyMonitor.trackViolation(clientIP, 'INVALID_LOGIN_DATA');
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Email and password are required'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Initialize auth service
    const authService = new CloudflareAuthService(env);
    
    // Attempt login
    const result = await authService.login(email, password, totpCode);
    
    if (!result.success) {
      // Track failed login
      if (result.error === 'Invalid credentials') {
        privacyMonitor.trackViolation(clientIP, 'FAILED_LOGIN_ATTEMPT', {
          email: email.substring(0, 3) + '***', // Partial email for logging
          userAgent
        });
      }
      
      return new Response(JSON.stringify({
        success: false,
        error: result.error,
        requiresMFA: result.requiresMFA
      }), {
        status: result.requiresMFA ? 200 : 401,
        headers: corsHeaders
      });
    }

    // Successful login - track for monitoring
    privacyMonitor.trackRequest(clientIP, '/api/auth/login', {
      successful: true,
      mfaUsed: result.user!.mfaEnabled,
      userId: result.user!.id
    });

    // Success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Login successful',
      user: {
        id: result.user!.id,
        email: result.user!.email,
        username: result.user!.username,
        emailVerified: result.user!.emailVerified,
        mfaEnabled: result.user!.mfaEnabled
      },
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        // Security headers for secure token handling
        'Set-Cookie': [
          `access_token=${result.session!.accessToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`, // 1 hour
          `id_token=${result.session!.idToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`, // 1 hour  
          `refresh_token=${result.session!.refreshToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800` // 7 days
        ].join(', ')
      }
    });

  } catch (error) {
    console.error('Login endpoint error:', error);
    
    // Track system error
    const clientIP = request.headers.get('cf-connecting-ip') || 'unknown';
    privacyMonitor.trackViolation(clientIP, 'LOGIN_SYSTEM_ERROR');
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Login failed. Please try again.'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}