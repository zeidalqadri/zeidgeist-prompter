/**
 * Test endpoint to store a learning example
 *
 * POST /api/learning/test-store
 */

import { createLearningService } from '../../_shared/learning';

interface CloudflareContext {
  request: Request;
  env: any;
}

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: getCorsHeaders()
  });
}

export async function onRequestPost(context: CloudflareContext): Promise<Response> {
  const { request, env } = context;

  try {
    const body = await request.json() as any;
    const { original, enhanced, source } = body;

    if (!original || !enhanced) {
      return new Response(JSON.stringify({
        error: 'Missing original or enhanced prompt'
      }), {
        status: 400,
        headers: getCorsHeaders()
      });
    }

    const learningService = createLearningService();

    // Store the enhancement
    await learningService.storeSuccessfulEnhancement(
      env,
      original,
      enhanced,
      source || 'test',
      { context: 'smoke-test', processingTime: 100 }
    );

    // Reinforce the pattern with a high score
    await learningService.reinforcePatterns(env, original, 5);

    // Check if we can now find patterns
    const patterns = await learningService.findRelatedPatterns(env, original);
    const shouldUseLocal = await learningService.shouldUseLocalEnhancement(env, original);

    return new Response(JSON.stringify({
      success: true,
      stored: true,
      reinforced: true,
      patternsFound: patterns.length,
      shouldUseLocal
    }), {
      headers: getCorsHeaders()
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Test store failed',
      message: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: getCorsHeaders()
    });
  }
}
