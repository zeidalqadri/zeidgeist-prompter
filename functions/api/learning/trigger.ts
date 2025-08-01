import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLearningScheduler } from '@/lib/learning/learning-scheduler';

/**
 * API endpoint to manually trigger a learning cycle
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const scheduler = getLearningScheduler();
    
    // Get optional parameters from request
    const body = await request.json().catch(() => ({}));
    const { force = false } = body;

    // Run the learning cycle
    const metrics = await scheduler.forceLearningCycle();

    return json({
      success: true,
      message: 'Learning cycle triggered successfully',
      metrics,
    });
  } catch (error) {
    console.error('Error triggering learning cycle:', error);
    return json(
      {
        success: false,
        error: 'Failed to trigger learning cycle',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};