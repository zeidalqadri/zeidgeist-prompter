/**
 * @deprecated This file is deprecated and will be removed in a future release.
 * Job queuing is now handled by Cloudflare Workers with waitUntil().
 *
 * Migration: Learning system has been consolidated to Cloudflare Workers
 * to leverage D1 database and edge runtime. This Node.js version is kept
 * for reference only.
 *
 * Learning Queue Service
 *
 * Queue abstraction for asynchronous learning job processing
 * Development: In-memory queue
 * Production: Cloudflare Queues
 */

export type JobType = 'pattern_extraction' | 'model_retraining' | 'feedback_processing';

export interface LearningJob {
  id: string;
  type: JobType;
  payload: Record<string, unknown>;
  createdAt: Date;
  attempts?: number;
  maxAttempts?: number;
}

export interface JobResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// QUEUE INTERFACE
// ============================================================================

export interface ILearningQueue {
  enqueue(job: Omit<LearningJob, 'id' | 'createdAt'>): Promise<string>;
  dequeue(): Promise<LearningJob | null>;
  markComplete(jobId: string, result: JobResult): Promise<void>;
  markFailed(jobId: string, error: Error): Promise<void>;
  getQueueSize(): Promise<number>;
}

// ============================================================================
// IN-MEMORY QUEUE (Development)
// ============================================================================

class InMemoryQueue implements ILearningQueue {
  private queue: LearningJob[] = [];
  private processing: Set<string> = new Set();
  private dlq: LearningJob[] = []; // Dead Letter Queue

  async enqueue(job: Omit<LearningJob, 'id' | 'createdAt'>): Promise<string> {
    const learningJob: LearningJob = {
      ...job,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: job.maxAttempts || 3
    };

    this.queue.push(learningJob);
    console.log(`[Learning Queue] Enqueued job ${learningJob.id} (type: ${learningJob.type})`);

    return learningJob.id;
  }

  async dequeue(): Promise<LearningJob | null> {
    const job = this.queue.shift();

    if (job) {
      this.processing.add(job.id);
      console.log(`[Learning Queue] Dequeued job ${job.id}`);
    }

    return job || null;
  }

  async markComplete(jobId: string, result: JobResult): Promise<void> {
    this.processing.delete(jobId);
    console.log(`[Learning Queue] Job ${jobId} completed:`, result);
  }

  async markFailed(jobId: string, error: Error): Promise<void> {
    this.processing.delete(jobId);

    // Find job in queue or processing
    const jobIndex = this.queue.findIndex(j => j.id === jobId);
    let job: LearningJob | undefined;

    if (jobIndex !== -1) {
      job = this.queue[jobIndex];
      this.queue.splice(jobIndex, 1);
    }

    if (job) {
      job.attempts = (job.attempts || 0) + 1;

      if (job.attempts < (job.maxAttempts || 3)) {
        // Retry with exponential backoff
        console.log(`[Learning Queue] Job ${jobId} failed, retrying (attempt ${job.attempts}/${job.maxAttempts})`);
        this.queue.push(job);
      } else {
        // Move to DLQ
        console.error(`[Learning Queue] Job ${jobId} moved to DLQ after ${job.attempts} attempts:`, error);
        this.dlq.push(job);
      }
    }
  }

  async getQueueSize(): Promise<number> {
    return this.queue.length + this.processing.size;
  }

  // Utility: Get DLQ for monitoring
  getDLQ(): LearningJob[] {
    return this.dlq;
  }
}

// ============================================================================
// CLOUDFLARE QUEUE (Production)
// ============================================================================

class CloudflareQueue implements ILearningQueue {
  private queueName: string;
  private env: any;

  constructor(queueName: string, env: any) {
    this.queueName = queueName;
    this.env = env;
  }

  async enqueue(job: Omit<LearningJob, 'id' | 'createdAt'>): Promise<string> {
    const learningJob: LearningJob = {
      ...job,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: job.maxAttempts || 3
    };

    // Send to Cloudflare Queue
    await this.env.LEARNING_QUEUE.send(learningJob);

    console.log(`[Cloudflare Queue] Enqueued job ${learningJob.id} (type: ${learningJob.type})`);
    return learningJob.id;
  }

  async dequeue(): Promise<LearningJob | null> {
    // Cloudflare Queues are consumed via webhook, not pulled
    throw new Error('Cloudflare Queues use push model - use webhook handler instead');
  }

  async markComplete(jobId: string, result: JobResult): Promise<void> {
    console.log(`[Cloudflare Queue] Job ${jobId} completed:`, result);
    // Cloudflare automatically acknowledges on successful processing
  }

  async markFailed(jobId: string, error: Error): Promise<void> {
    console.error(`[Cloudflare Queue] Job ${jobId} failed:`, error);
    // Cloudflare automatically retries on failure
  }

  async getQueueSize(): Promise<number> {
    // Not directly available in Cloudflare Queues
    return -1;
  }
}

// ============================================================================
// QUEUE FACTORY
// ============================================================================

let queueInstance: ILearningQueue | null = null;

export class LearningQueueFactory {
  static getQueue(env?: any): ILearningQueue {
    if (!queueInstance) {
      // Check if we're in Cloudflare Workers environment
      if (env && env.LEARNING_QUEUE) {
        console.log('[Learning Queue] Using Cloudflare Queues');
        queueInstance = new CloudflareQueue('learning-queue', env);
      } else {
        console.log('[Learning Queue] Using in-memory queue (development mode)');
        queueInstance = new InMemoryQueue();
      }
    }

    return queueInstance;
  }

  // For testing: reset queue
  static resetQueue(): void {
    queueInstance = null;
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Enqueue pattern extraction job
 */
export async function enqueuePatternExtraction(
  examples: Array<{ rawPrompt: string; enhancedPrompt: string; context?: string }>,
  env?: any
): Promise<string> {
  const queue = LearningQueueFactory.getQueue(env);

  return queue.enqueue({
    type: 'pattern_extraction',
    payload: {
      examples,
      count: examples.length
    },
    maxAttempts: 3
  });
}

/**
 * Enqueue model retraining job
 */
export async function enqueueModelRetraining(
  modelId: string,
  trainingData: Record<string, unknown>,
  env?: any
): Promise<string> {
  const queue = LearningQueueFactory.getQueue(env);

  return queue.enqueue({
    type: 'model_retraining',
    payload: {
      modelId,
      trainingData
    },
    maxAttempts: 2
  });
}

/**
 * Enqueue feedback processing job
 */
export async function enqueueFeedbackProcessing(
  feedbackId: string,
  feedbackData: Record<string, unknown>,
  env?: any
): Promise<string> {
  const queue = LearningQueueFactory.getQueue(env);

  return queue.enqueue({
    type: 'feedback_processing',
    payload: {
      feedbackId,
      feedbackData
    },
    maxAttempts: 3
  });
}
