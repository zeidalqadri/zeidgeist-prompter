/**
 * Learning Queue Webhook Handler
 *
 * Cloudflare Queue consumer for processing learning jobs
 * This endpoint is called automatically by Cloudflare when jobs are queued
 */

import { NextRequest, NextResponse } from 'next/server';
import { processLearningJob } from '../../../lib/learning/learning-worker';
import { LearningJob } from '../../../lib/learning/learning-queue';

// This route handles Cloudflare Queue consumption
export const runtime = 'edge';

/**
 * POST /api/webhooks/learning
 *
 * Handles incoming learning jobs from Cloudflare Queues
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse the job from the request body
    const job: LearningJob = await req.json();

    console.log(`[Learning Webhook] Received job ${job.id} (type: ${job.type})`);

    // Get environment (Cloudflare Workers env is available via req context)
    const env = (req as any).env || process.env;

    // Process the job
    const result = await processLearningJob(job, env);

    const processingTime = Date.now() - startTime;

    if (result.success) {
      console.log(`[Learning Webhook] Job ${job.id} completed in ${processingTime}ms`);

      return NextResponse.json({
        success: true,
        jobId: job.id,
        result: result.data,
        processingTime
      }, { status: 200 });
    } else {
      console.error(`[Learning Webhook] Job ${job.id} failed:`, result.message);

      return NextResponse.json({
        success: false,
        jobId: job.id,
        error: result.message,
        processingTime
      }, { status: 500 });
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('[Learning Webhook] Error processing job:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime
    }, { status: 500 });
  }
}

/**
 * GET /api/webhooks/learning
 *
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'learning-queue-webhook',
    timestamp: new Date().toISOString()
  }, { status: 200 });
}
