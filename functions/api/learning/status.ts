import { LearningScheduler } from '../../../app/lib/learning/learning-scheduler';

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
    // Set up environment for database access
    const { env } = context;
    if (env.DATABASE_URL) {
      process.env.DATABASE_URL = env.DATABASE_URL;
    }

    const scheduler = new LearningScheduler();
    const stats = await scheduler.getLearningStats();

    const responseBody = {
      success: true,
      stats,
      summary: {
        isActive: stats.scheduler.isRunning,
        llmIndependence: `${((1 - stats.metrics.llmDependencyScore) * 100).toFixed(1)}%`,
        localAccuracy: `${(stats.metrics.accuracyScore * 100).toFixed(1)}%`,
        totalPatterns: stats.metrics.totalPatterns,
        recentLocalEnhancements: stats.enhancer.localEnhancements,
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