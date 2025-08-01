import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLearningScheduler } from '@/lib/learning/learning-scheduler';

/**
 * API endpoint to get learning system status
 */
export const GET: RequestHandler = async () => {
  try {
    const scheduler = getLearningScheduler();
    const stats = await scheduler.getLearningStats();

    return json({
      success: true,
      stats,
      summary: {
        isActive: stats.scheduler.isRunning,
        llmIndependence: `${((1 - stats.metrics.llmDependencyScore) * 100).toFixed(1)}%`,
        localAccuracy: `${(stats.metrics.accuracyScore * 100).toFixed(1)}%`,
        totalPatterns: stats.metrics.totalPatterns,
        recentLocalEnhancements: stats.enhancer.localEnhancements,
      },
    });
  } catch (error) {
    console.error('Error getting learning status:', error);
    return json(
      {
        success: false,
        error: 'Failed to get learning status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};