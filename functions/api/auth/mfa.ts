/**
 * Multi-Factor Authentication API Endpoints
 * GET /api/auth/mfa/setup - Setup TOTP
 * POST /api/auth/mfa/enable - Enable MFA with verification
 * POST /api/auth/mfa/verify - Verify MFA code during login
 */

import { CloudflareAuthService } from "../../_shared/auth-service-workers";
import { getSecurityHeaders } from "../../_shared/privacy-guard";
import { monitorRequest, privacyMonitor } from "../../_shared/privacy-monitor";

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      ...getSecurityHeaders(),
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * Setup MFA - Generate TOTP secret and QR code
 * GET /api/auth/mfa/setup
 */
export async function onRequestGet(context: any): Promise<Response> {
  const { request, env } = context;
  
  monitorRequest(request, context);
  
  const corsHeaders = {
    ...getSecurityHeaders(),
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  };

  try {
    // Extract user from authorization token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authorization required'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const token = authHeader.substring(7);
    const authService = new CloudflareAuthService(env);
    
    // Validate token and get user
    const user = await authService.validateToken(token);
    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid or expired token'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Setup MFA
    const mfaSetup = await authService.setupMFA(user.id);
    if (!mfaSetup) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to setup MFA'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({
      success: true,
      mfa: {
        secret: mfaSetup.secret,
        qrCode: mfaSetup.qrCode,
        backupCodes: mfaSetup.backupCodes
      },
      instructions: {
        step1: 'Install an authenticator app (Google Authenticator, Authy, etc.)',
        step2: 'Scan the QR code or manually enter the secret',
        step3: 'Save the backup codes in a secure location',
        step4: 'Use the verify endpoint to enable MFA'
      }
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('MFA setup error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'MFA setup failed'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

/**
 * Enable/Verify MFA
 * POST /api/auth/mfa/enable
 */
export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context;
  
  monitorRequest(request, context);
  
  const corsHeaders = {
    ...getSecurityHeaders(),
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  };

  try {
    const url = new URL(request.url);
    const endpoint = url.pathname.split('/').pop();
    
    const body = await request.json() as any;
    const { totpCode } = body;

    if (!totpCode) {
      return new Response(JSON.stringify({
        success: false,
        error: 'TOTP code is required'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Extract user from authorization token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authorization required'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const token = authHeader.substring(7);
    const authService = new CloudflareAuthService(env);
    
    // Validate token and get user
    const user = await authService.validateToken(token);
    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid or expired token'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    if (endpoint === 'enable') {
      // Enable MFA after verifying TOTP code
      const enabled = await authService.enableMFA(user.id, totpCode);
      
      if (!enabled) {
        // Track failed MFA verification
        const clientIP = request.headers.get('cf-connecting-ip') || 'unknown';
        privacyMonitor.trackViolation(clientIP, 'FAILED_MFA_VERIFICATION', {
          userId: user.id
        });
        
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid TOTP code. Please try again.'
        }), {
          status: 400,
          headers: corsHeaders
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'MFA enabled successfully',
        mfaEnabled: true
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid endpoint'
    }), {
      status: 404,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('MFA endpoint error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'MFA operation failed'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}