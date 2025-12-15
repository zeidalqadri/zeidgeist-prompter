/**
 * Learning Cycle Scheduled Worker - ENABLED & OPTIMIZED
 *
 * Cloudflare Worker scheduled handler for periodic learning cycles.
 * Runs pattern extraction, quality updates, and cleanup operations.
 *
 * Configure in wrangler.toml with cron trigger:
 * [[triggers.crons]]
 * cron = "0 2 * * *"  # Run daily at 2 AM UTC
 */

import { LearningService, createLearningService, LearningMetrics } from '../_shared/learning/service'

// D1 Database interface
interface D1Database {
  prepare(query: string): any
  batch<T = unknown>(statements: any[]): Promise<any[]>
  exec(query: string): Promise<any>
}

export interface Env {
  AUTH_DB: D1Database
}

/**
 * Cloudflare Worker scheduled handler
 */
export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log('🚀 Starting scheduled learning cycle...')
    const startTime = Date.now()

    try {
      // Create learning service instance
      const learningService = createLearningService({
        patternConfidenceThreshold: 0.55,
        llmFallbackThreshold: 0.4,
        minExamplesForPattern: 2
      })

      // Run the learning cycle
      const metrics = await learningService.runLearningCycle(env)

      // Run cleanup operations
      const cleanedPatterns = await learningService.cleanupOldPatterns(env)
      const deactivatedPatterns = await learningService.deactivateLowQualityPatterns(env)

      // Log metrics for monitoring
      await logMetrics(metrics, cleanedPatterns, deactivatedPatterns, Date.now() - startTime)

      // Check for milestone achievements
      checkMilestones(metrics)

      console.log(`✅ Learning cycle completed in ${Date.now() - startTime}ms`)
    } catch (error) {
      console.error('❌ Learning cycle failed:', error)

      // Log error for monitoring
      await logError(error)
    }
  },
}

/**
 * Log metrics for monitoring
 */
async function logMetrics(
  metrics: LearningMetrics,
  cleanedPatterns: number,
  deactivatedPatterns: number,
  executionTimeMs: number
): Promise<void> {
  // In production, this could send to Cloudflare Analytics, DataDog, etc.
  const logData = {
    timestamp: new Date().toISOString(),
    event: 'learning_cycle_completed',
    metrics: {
      totalPatterns: metrics.totalPatterns,
      newPatternsLearned: metrics.newPatternsLearned,
      llmDependencyScore: metrics.llmDependencyScore.toFixed(3),
      accuracyScore: metrics.accuracyScore.toFixed(3),
      cleanedPatterns,
      deactivatedPatterns,
      executionTimeMs
    }
  }

  console.log('📊 Learning Metrics:', JSON.stringify(logData, null, 2))

  // Performance warnings
  if (executionTimeMs > 10000) {
    console.warn(`⚠️ Learning cycle took ${executionTimeMs}ms - consider optimization`)
  }
}

/**
 * Check for milestone achievements
 */
function checkMilestones(metrics: LearningMetrics): void {
  // High independence milestone
  if (metrics.llmDependencyScore < 0.3 && metrics.accuracyScore > 0.85) {
    console.log('🎉 MILESTONE: High independence achieved!')
    console.log(`   LLM Dependency: ${(metrics.llmDependencyScore * 100).toFixed(1)}%`)
    console.log(`   Local Accuracy: ${(metrics.accuracyScore * 100).toFixed(1)}%`)
  }

  // Pattern growth milestone
  if (metrics.totalPatterns >= 1000) {
    console.log(`🎉 MILESTONE: ${metrics.totalPatterns} patterns learned!`)
  }

  // New patterns learned
  if (metrics.newPatternsLearned > 10) {
    console.log(`📈 Learning rate high: ${metrics.newPatternsLearned} new patterns this cycle`)
  }

  // Low learning warning
  if (metrics.newPatternsLearned === 0 && metrics.llmDependencyScore > 0.8) {
    console.warn('⚠️ No new patterns learned and high LLM dependency - investigate data quality')
  }
}

/**
 * Log error for monitoring
 */
async function logError(error: unknown): Promise<void> {
  const errorData = {
    timestamp: new Date().toISOString(),
    event: 'learning_cycle_error',
    error: {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }
  }

  console.error('❌ Learning Error:', JSON.stringify(errorData, null, 2))
}

/**
 * Manual trigger endpoint (can be called via HTTP if needed)
 * Export for use with /api/learning/trigger
 */
export async function triggerLearningCycle(env: Env): Promise<LearningMetrics> {
  const learningService = createLearningService()
  return await learningService.runLearningCycle(env)
}
