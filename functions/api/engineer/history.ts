// DEPRECATED ENDPOINT - Use /api/engineer/historyDualMode instead
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

export async function onRequestGet(context: any): Promise<Response> {
  // DEPRECATED: This endpoint has been replaced with /api/engineer/historyDualMode for enhanced privacy protection
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://mstprmpt.zeidgeist.com',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }
  
  return new Response(JSON.stringify({
    error: "This endpoint has been deprecated for security reasons. Please use the secure endpoint instead.",
    deprecated: true,
    secureEndpoint: "/api/engineer/historyDualMode",
    reason: "Enhanced privacy protection and user authentication required",
    migrationGuide: "Update your client code to use /api/engineer/historyDualMode"
  }), {
    status: 410, // Gone
    headers: corsHeaders
  })
}

export async function onRequestPost(context: any): Promise<Response> {
  // DEPRECATED: This endpoint has been replaced with /api/engineer/historyDualMode for enhanced privacy protection
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://mstprmpt.zeidgeist.com',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }
  
  return new Response(JSON.stringify({
    error: "This endpoint has been deprecated for security reasons. Please use the secure endpoint instead.",
    deprecated: true,
    secureEndpoint: "/api/engineer/historyDualMode",
    reason: "Enhanced privacy protection and user authentication required",
    migrationGuide: "Update your client code to use /api/engineer/historyDualMode"
  }), {
    status: 410, // Gone
    headers: corsHeaders
  })
}