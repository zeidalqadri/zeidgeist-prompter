// Dynamic import for Node.js compatibility in Cloudflare Workers

// Handle CORS preflight requests
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

/**
 * API endpoint to get learning system status
 */
export async function onRequestGet(context: any): Promise<Response> {
  try {
    // Learning status temporarily disabled for Worker compatibility
    console.log('Learning status endpoint temporarily disabled');

    // TODO: Create Worker-compatible learning scheduler
    // Disabled: LearningScheduler imports from app/lib which uses Node.js features

    const responseBody = {
      success: false,
      message: 'Learning status temporarily disabled for Worker compatibility',
      stats: null,
      summary: {
        isActive: false,
        llmIndependence: 'N/A',
        localAccuracy: 'N/A',
        totalPatterns: 0,
        recentLocalEnhancements: 0,
      },
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://mstprmpt.zeidgeist.com',
      },
    });
  } catch (error) {
    console.error('Error getting learning status:', error);
    
    const errorResponse = {
      success: false,
      error: 'Failed to get learning status',
      // Error details removed for security
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://mstprmpt.zeidgeist.com',
      },
    });
  }
}