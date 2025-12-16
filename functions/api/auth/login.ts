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

      // Build response - only include requiresMFA when it's the actual reason
      // This prevents user enumeration by not revealing MFA status on wrong password
      const responseBody: {
        success: boolean;
        error?: string;
        requiresMFA?: boolean;
        isLocked?: boolean;
        lockoutMinutes?: number;
      } = {
        success: false,
        error: result.error
      };

      // Only include requiresMFA when password was correct and MFA is needed
      if (result.requiresMFA && result.error === 'MFA code required') {
        responseBody.requiresMFA = true;
      }

      // Include lockout info if account is locked (helps UX without security risk)
      if (result.error && result.error.includes('Account locked')) {
        responseBody.isLocked = true;
        // Extract remaining minutes from error message
        const match = result.error.match(/(\d+) minutes/);
        if (match) {
          responseBody.lockoutMinutes = parseInt(match[1], 10);
        }
      }

      return new Response(JSON.stringify(responseBody), {
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

    // Cache warming: Pre-populate session cache for faster first authenticated request
    // Uses waitUntil for non-blocking async cache write
    if (env.SESSION_STORAGE && result.session && result.user) {
      const SESSION_CACHE_TTL = 600; // 10 minutes
      const cacheKey = `session:${result.session.id}:${result.user.id}`;
      const cachedSession = {
        userId: result.user.id,
        user: result.user,
        expiresAt: Date.now() + (SESSION_CACHE_TTL * 1000),
        cachedAt: Date.now()
      };

      context.waitUntil(
        env.SESSION_STORAGE.put(cacheKey, JSON.stringify(cachedSession), {
          expirationTtl: SESSION_CACHE_TTL
        }).catch((err: Error) => {
          console.warn('Session cache warming failed:', err);
        })
      );
    }

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
          `access_token=${result.session!.accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`, // 1 hour
          `id_token=${result.session!.idToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`, // 1 hour
          `refresh_token=${result.session!.refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800` // 7 days
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