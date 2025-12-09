/**
 * Authenticated Extension Download API Endpoint
 * POST /api/extension/download
 *
 * Requires authentication via JWT cookie.
 * Tracks all downloads for analytics.
 * Rate limited to 5 downloads per user per 24 hours.
 */

import { CloudflareAuthService } from "../../_shared/auth-service-workers";
import { getSecurityHeaders } from "../../_shared/privacy-guard";
import { createDb, extensionDownloads } from "../../_shared/db";
import { count, and, eq, gte } from "drizzle-orm";

// Extension version - update when releasing new versions
const EXTENSION_VERSION = "1.0.0";
const MAX_DOWNLOADS_PER_DAY = 5;

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=');
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  });
  return cookies;
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      ...getSecurityHeaders(),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context;

  const corsHeaders = {
    ...getSecurityHeaders(),
    'Access-Control-Allow-Credentials': 'true',
  };

  try {
    // Extract access_token from cookie
    const cookieHeader = request.headers.get('cookie');
    const cookies = parseCookies(cookieHeader);
    const accessToken = cookies['access_token'];

    // Check authentication
    if (!accessToken) {
      return new Response(JSON.stringify({
        success: false,
        requiresAuth: true,
        error: 'Authentication required to download extension'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate JWT token
    const authService = new CloudflareAuthService(env);
    const user = await authService.validateToken(accessToken);

    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        requiresAuth: true,
        error: 'Invalid or expired session. Please log in again.'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get database connection
    const db = createDb(env);
    if (!db) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Database unavailable'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check rate limit - count downloads in last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [downloadCount] = await db
      .select({ count: count() })
      .from(extensionDownloads)
      .where(
        and(
          eq(extensionDownloads.userId, user.id),
          gte(extensionDownloads.createdAt, twentyFourHoursAgo)
        )
      );

    if (downloadCount && downloadCount.count >= MAX_DOWNLOADS_PER_DAY) {
      return new Response(JSON.stringify({
        success: false,
        error: `Rate limit exceeded. Maximum ${MAX_DOWNLOADS_PER_DAY} downloads per 24 hours.`,
        retryAfter: '24 hours'
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': '86400'
        }
      });
    }

    // Get client metadata
    const clientIP = request.headers.get('cf-connecting-ip') ||
                     request.headers.get('x-forwarded-for') ||
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referrer = request.headers.get('referer') || null;

    // Log download to database
    await db.insert(extensionDownloads).values({
      userId: user.id,
      extensionVersion: EXTENSION_VERSION,
      ipAddress: clientIP,
      userAgent: userAgent,
      referrer: referrer,
    });

    // Read the extension file from assets
    // In Cloudflare Pages, static assets can be accessed via env.ASSETS
    const extensionPath = '/extension/mstprmpt-extension.zip';

    // Try to fetch from the static assets
    let fileResponse: Response;
    try {
      if (env.ASSETS) {
        // Cloudflare Pages Functions - use ASSETS binding
        fileResponse = await env.ASSETS.fetch(new Request(`https://placeholder${extensionPath}`));
      } else {
        // Fallback: fetch from self (works in dev/preview)
        const url = new URL(request.url);
        fileResponse = await fetch(`${url.origin}${extensionPath}`);
      }
    } catch (fetchError) {
      console.error('Failed to fetch extension file:', fetchError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Extension file not available'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!fileResponse.ok) {
      console.error('Extension file not found:', fileResponse.status);
      return new Response(JSON.stringify({
        success: false,
        error: 'Extension file not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Stream the file back with appropriate headers
    const fileBuffer = await fileResponse.arrayBuffer();

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="mstprmpt-extension-v${EXTENSION_VERSION}.zip"`,
        'Content-Length': fileBuffer.byteLength.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      }
    });

  } catch (error) {
    console.error('Extension download error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Download failed. Please try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
