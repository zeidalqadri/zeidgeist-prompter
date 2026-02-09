/**
 * API Middleware - Guarantees JSON responses for all /api/* routes
 *
 * Prevents "Unexpected token '<', <!DOCTYPE" errors by intercepting
 * HTML responses (from failed function loads or Cloudflare fallbacks)
 * and converting them to structured JSON error responses.
 */

interface MiddlewareContext {
  request: Request;
  env: Record<string, unknown>;
  next: () => Promise<Response>;
}

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization, X-Test-Provider',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  };
}

export async function onRequest(context: MiddlewareContext): Promise<Response> {
  const { request } = context;

  // Handle CORS preflight at the middleware level as a fallback
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: getCorsHeaders(request),
    });
  }

  try {
    const response = await context.next();

    // Check if the response is HTML instead of JSON
    // This happens when a function fails to load and Cloudflare serves its fallback page
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      return new Response(JSON.stringify({
        error: 'API endpoint temporarily unavailable. Please try again.',
        result: null,
      }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(request),
        },
      });
    }

    return response;
  } catch (error) {
    // Catch any unhandled error (including import failures)
    console.error('[API Middleware] Unhandled error:', error instanceof Error ? error.message : String(error));

    return new Response(JSON.stringify({
      error: 'Internal server error. Please try again.',
      result: null,
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(request),
      },
    });
  }
}
