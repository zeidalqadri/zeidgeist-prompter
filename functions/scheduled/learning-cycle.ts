// Note: LearningService requires Node.js environment with process.env.DATABASE_URL
// For Cloudflare Workers, we'll need to temporarily set global for compatibility

export interface Env {
  DATABASE_URL: string;
}

/**
 * Cloudflare Worker scheduled handler for periodic learning cycles
 * Configure in wrangler.api.toml with cron trigger
 */
export default {
  async scheduled(
    controller: any,
    env: Env,
    ctx: any
  ): Promise<void> {
    console.log('Learning cycle temporarily disabled for Worker compatibility');

    // TODO: Create Worker-compatible learning service
    // Disabled: LearningService imports from app/lib which uses Node.js features

    // For now, just log that the scheduled function was triggered
    console.log('Scheduled learning cycle triggered but skipped');
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
