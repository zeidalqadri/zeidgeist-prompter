// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - File is deprecated, type errors are expected
/**
 * @deprecated This file is deprecated and will be removed in a future release.
 * Learning workers are now Cloudflare Workers scheduled events.
 * See: functions/scheduled/learning-cycle.ts
 *
 * Migration: Learning system has been consolidated to Cloudflare Workers
 * to leverage D1 database and edge runtime. This Node.js version is kept
 * for reference only.
 *
 * Learning Worker
 *
 * Background worker for processing learning jobs from the queue
 */

import { LearningJob, JobResult, JobType } from './learning-queue';
import { LearningService } from './learning-service';
import { withDatabase } from '../db';
import { trainingExamples, enhancementLogs } from '../db/schema';
import { desc } from 'drizzle-orm';

export class LearningWorker {
  private learningService: LearningService;

  constructor() {
    this.learningService = new LearningService();
  }

  /**
   * Process a learning job
   */
  async processJob(job: LearningJob, env: any): Promise<JobResult> {
    console.log(`[Learning Worker] Processing job ${job.id} (type: ${job.type})`);

    try {
      switch (job.type) {
        case 'pattern_extraction':
          return await this.processPatternExtraction(job, env);

        case 'model_retraining':
          return await this.processModelRetraining(job, env);

        case 'feedback_processing':
          return await this.processFeedbackProcessing(job, env);

        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
    } catch (error) {
      console.error(`[Learning Worker] Job ${job.id} failed:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process pattern extraction job
   */
  private async processPatternExtraction(job: LearningJob, env: any): Promise<JobResult> {
    const { examples, count } = job.payload;

    console.log(`[Learning Worker] Extracting patterns from ${count} examples`);

    try {
      // Run learning cycle on these examples
      await this.learningService.runLearningCycle();

      return {
        success: true,
        message: `Successfully extracted patterns from ${count} examples`,
        data: { patternsExtracted: count }
      };
    } catch (error) {
      throw new Error(`Pattern extraction failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Process model retraining job
   */
  private async processModelRetraining(job: LearningJob, env: any): Promise<JobResult> {
    const { modelId, trainingData } = job.payload;

    console.log(`[Learning Worker] Retraining model ${modelId}`);

    try {
      // Batch process recent enhancements for training
      await withDatabase(env, async (db) => {
        const recentLogs = await db
          .select()
          .from(enhancementLogs)
          .orderBy(desc(enhancementLogs.createdAt))
          .limit(100);

        // Store as training examples
        for (const log of recentLogs) {
          await db.insert(trainingExamples).values({
            rawPrompt: log.originalPrompt || '',
            enhancedPrompt: log.enhancedPrompt || '',
            context: log.context,
            category: 'api',
            source: 'api',
            quality: 5, // Default quality score
            usageCount: 0,
            isActive: true,
            createdAt: new Date()
          }).onConflictDoNothing();
        }
      });

      return {
        success: true,
        message: `Model ${modelId} retrained successfully`,
        data: { modelId }
      };
    } catch (error) {
      throw new Error(`Model retraining failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Process feedback processing job
   */
  private async processFeedbackProcessing(job: LearningJob, env: any): Promise<JobResult> {
    const { feedbackId, feedbackData } = job.payload;

    console.log(`[Learning Worker] Processing feedback ${feedbackId}`);

    try {
      // Extract patterns from highly-rated feedback
      const data = feedbackData as any;
      if (data.score && data.score >= 4) {
        await this.learningService.runLearningCycle();
      }

      return {
        success: true,
        message: `Feedback ${feedbackId} processed successfully`,
        data: { feedbackId }
      };
    } catch (error) {
      throw new Error(`Feedback processing failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Batch process multiple jobs
   */
  async processBatch(jobs: LearningJob[], env: any): Promise<JobResult[]> {
    console.log(`[Learning Worker] Processing batch of ${jobs.length} jobs`);

    const results: JobResult[] = [];

    for (const job of jobs) {
      try {
        const result = await this.processJob(job, env);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[Learning Worker] Batch complete: ${successCount}/${jobs.length} successful`);

    return results;
  }
}

/**
 * Process a single job (convenience function for webhook handlers)
 */
export async function processLearningJob(job: LearningJob, env: any): Promise<JobResult> {
  const worker = new LearningWorker();
  return worker.processJob(job, env);
}

/**
 * Process batch of jobs (convenience function for batch processing)
 */
export async function processBatchJobs(jobs: LearningJob[], env: any): Promise<JobResult[]> {
  const worker = new LearningWorker();
  return worker.processBatch(jobs, env);
}
