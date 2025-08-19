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
    const body = await request.json();
    const { email, password, username } = body;

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

    // Success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Registration successful. Please check your email for verification.',
      user: {
        id: result.user!.id,
        email: result.user!.email,
        username: result.user!.username,
        emailVerified: result.user!.emailVerified
      }
    }), {
      status: 201,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Registration endpoint error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Registration failed. Please try again.'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}