import { LearningService } from '../../app/lib/learning/learning-service';

export interface Env {
  DATABASE_URL: string;
}

/**
 * Cloudflare Worker scheduled handler for periodic learning cycles
 * Configure in wrangler.toml with cron trigger
 */
export default {
  async scheduled(
    controller: any,
    env: Env,
    ctx: any
  ): Promise<void> {
    console.log('Starting scheduled learning cycle...');
    
    try {
      // Set up environment for database access
      process.env.DATABASE_URL = env.DATABASE_URL;
      
      // Run learning cycle
      const learningService = new LearningService();
      const metrics = await learningService.runLearningCycle();
      
      console.log('Learning cycle completed:', metrics);
      
      // Log important metrics
      if (metrics.llmDependencyScore < 0.3 && metrics.accuracyScore > 0.85) {
        console.log('🎉 System achieving high independence from LLMs!');
        console.log(`LLM dependency: ${(metrics.llmDependencyScore * 100).toFixed(1)}%`);
        console.log(`Local accuracy: ${(metrics.accuracyScore * 100).toFixed(1)}%`);
      }
      
      // Store metrics for monitoring (could push to analytics service)
      await logMetrics(metrics);
      
    } catch (error) {
      console.error('Error in scheduled learning cycle:', error);
      // Could send alert or notification here
    }
  },
};

/**
 * Log metrics for monitoring
 */
async function logMetrics(metrics: any): Promise<void> {
  // In production, this could send to Cloudflare Analytics, DataDog, etc.
  console.log('Learning Metrics:', {
    timestamp: new Date().toISOString(),
    totalPatterns: metrics.totalPatterns,
    newPatterns: metrics.newPatternsLearned,
    llmDependency: metrics.llmDependencyScore,
    accuracy: metrics.accuracyScore,
  });
}