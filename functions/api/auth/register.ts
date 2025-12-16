/**
 * User Registration API Endpoint
 * POST /api/auth/register
 */

import { CloudflareAuthService } from "../../_shared/auth-service-workers";
import { getSecurityHeaders } from "../../_shared/privacy-guard";
import { monitorRequest } from "../../_shared/privacy-monitor";

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
    const { email, password, username, recoveryPin } = body;

    // Input validation
    if (!email || !password) {
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
    
    // Attempt registration
    const result = await authService.register(email, password, username);
    
    if (!result.success) {
      return new Response(JSON.stringify({
        success: false,
        error: result.error,
        suggestions: result.suggestions
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Successful registration - automatically create session for seamless login
    const userForSession = {
      id: result.user!.id,
      email: result.user!.email,
      username: result.user!.username,
      emailVerified: result.user!.emailVerified,
      mfaEnabled: false,
    };

    // Create session (same as login endpoint)
    const session = await authService.createSession(userForSession);

    // If recovery PIN was provided, set it for the user
    if (recoveryPin && /^\d{6}$/.test(recoveryPin)) {
      await authService.setRecoveryPIN(result.user!.id, recoveryPin);
    }

    // Cache warming: Pre-populate session cache for faster first authenticated request
    if (env.SESSION_STORAGE && session) {
      const SESSION_CACHE_TTL = 600; // 10 minutes
      const cacheKey = `session:${session.id}:${result.user!.id}`;
      const cachedSession = {
        userId: result.user!.id,
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

    // Success response WITH session cookies (auto-login)
    return new Response(JSON.stringify({
      success: true,
      message: 'Account created successfully. You are now logged in.',
      user: {
        id: result.user!.id,
        email: result.user!.email,
        username: result.user!.username,
        emailVerified: result.user!.emailVerified
      }
    }), {
      status: 201,
      headers: {
        ...corsHeaders,
        'Set-Cookie': [
          `access_token=${session.accessToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`,
          `id_token=${session.idToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`,
          `refresh_token=${session.refreshToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`
        ].join(', ')
      }
    });

  } catch (error) {
    console.error('Registration endpoint error:', error);

    // Sanitize error messages for production
    let errorMessage = 'Registration failed. Please try again.';

    if (error instanceof Error) {
      // Check for specific configuration errors
      if (error.message.includes('JWT_SECRET')) {
        errorMessage = 'Server configuration error: Authentication not configured.';
      } else if (error.message.includes('database') || error.message.includes('AUTH_DB') || error.message.includes('DATABASE_URL')) {
        errorMessage = 'Server configuration error: Database not configured.';
      } else if (error.message.includes('FATAL')) {
        errorMessage = 'Server configuration error. Please contact support.';
      }
    }

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}