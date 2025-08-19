// DEPRECATED ENDPOINT - Use /api/engineer/history-dual-mode instead
// This file remains only to return deprecation notices for the old endpoint

// Handle CORS preflight requests
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://mstprmpt.zeidgeist.com',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function onRequestGet(context: any): Response {
  // DEPRECATED: This endpoint has been replaced with /api/engineer/history-dual-mode for enhanced privacy protection
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://mstprmpt.zeidgeist.com',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }
  
  return new Response(JSON.stringify({
    error: "This endpoint has been deprecated for security reasons. Please use the secure endpoint instead.",
    deprecated: true,
    secureEndpoint: "/api/engineer/history-dual-mode",
    reason: "Enhanced privacy protection and user authentication required",
    migrationGuide: "Update your client code to use /api/engineer/history-dual-mode"
  }), {
    status: 410, // Gone
    headers: corsHeaders
  })
}

export async function onRequestPost(context: any): Promise<Response> {
  // DEPRECATED: This endpoint has been replaced with /api/engineer/history-dual-mode for enhanced privacy protection
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://mstprmpt.zeidgeist.com',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }
  
  return new Response(JSON.stringify({
    error: "This endpoint has been deprecated for security reasons. Please use the secure endpoint instead.",
    deprecated: true,
    secureEndpoint: "/api/engineer/history-dual-mode",
    reason: "Enhanced privacy protection and user authentication required",
    migrationGuide: "Update your client code to use /api/engineer/history-dual-mode"
  }), {
    status: 410, // Gone
    headers: corsHeaders
  })
}