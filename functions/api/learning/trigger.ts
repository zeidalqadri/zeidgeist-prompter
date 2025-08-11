import { LearningScheduler } from '../../../app/lib/learning/learning-scheduler';

// Handle CORS preflight requests
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

/**
 * API endpoint to manually trigger a learning cycle
 */
export async function onRequestPost(context: any): Promise<Response> {
  try {
    // Set up environment for database access
    const { request, env } = context;
    if (env.DATABASE_URL) {
      process.env.DATABASE_URL = env.DATABASE_URL;
    }

    const scheduler = new LearningScheduler();
    
    // Get optional parameters from request
    const body = await request.json().catch(() => ({}));
    const { force = false } = body;

    // Run the learning cycle
    const metrics = await scheduler.forceLearningCycle();

    const responseBody = {
      success: true,
      message: 'Learning cycle triggered successfully',
      metrics,
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://mstprmpt.zeidgeist.com',
      },
    });
  } catch (error) {
    console.error('Error triggering learning cycle:', error);
    
    const errorResponse = {
      success: false,
      error: 'Failed to trigger learning cycle',
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