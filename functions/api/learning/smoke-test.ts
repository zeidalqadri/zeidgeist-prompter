/**
 * Smoke Test API Endpoint for Learning System
 *
 * GET /api/learning/smoke-test
 *
 * Tests the Workers-native learning system with D1 database.
 * Returns JSON with test results.
 */

import { createLearningService, createAdaptiveEnhancer } from '../../_shared/learning';
import { createDb } from '../../_shared/db';

interface CloudflareContext {
  request: Request;
  env: any;
}

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

export async function onRequestGet(context: CloudflareContext): Promise<Response> {
  const { env } = context;
  const startTime = Date.now();

  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    dbAvailable: false,
    tests: {}
  };

  try {
    // Check database availability
    const db = createDb(env);
    results.dbAvailable = !!db;

    // Test LearningService
    const learningService = createLearningService();

    // Test 1: shouldUseLocalEnhancement
    try {
      const shouldUseLocal = await learningService.shouldUseLocalEnhancement(
        env,
        'Create a website for a restaurant'
      );
      results.tests.shouldUseLocalEnhancement = {
        status: 'pass',
        result: shouldUseLocal
      };
    } catch (error) {
      results.tests.shouldUseLocalEnhancement = {
        status: 'fail',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // Test 2: findRelatedPatterns
    try {
      const patterns = await learningService.findRelatedPatterns(
        env,
        'Write a blog post about AI'
      );
      results.tests.findRelatedPatterns = {
        status: 'pass',
        count: patterns.length
      };
    } catch (error) {
      results.tests.findRelatedPatterns = {
        status: 'fail',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // Test 3: getBestPattern
    try {
      const bestPattern = await learningService.getBestPattern(
        env,
        'Create an app for task management'
      );
      results.tests.getBestPattern = {
        status: 'pass',
        found: !!bestPattern
      };
    } catch (error) {
      results.tests.getBestPattern = {
        status: 'fail',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // Test AdaptiveEnhancer
    const enhancer = createAdaptiveEnhancer();

    // Test 4: enhance
    try {
      const enhanced = await enhancer.enhance(env, 'Make a todo app');
      results.tests.enhance = {
        status: 'pass',
        confidence: enhanced.confidence,
        source: enhanced.source,
        patternsUsed: enhanced.patternsUsed.length
      };
    } catch (error) {
      results.tests.enhance = {
        status: 'fail',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // Test 5: enhance with context
    try {
      const enhanced = await enhancer.enhance(
        env,
        'Design a dashboard',
        'For a SaaS analytics platform'
      );
      results.tests.enhanceWithContext = {
        status: 'pass',
        confidence: enhanced.confidence,
        source: enhanced.source
      };
    } catch (error) {
      results.tests.enhanceWithContext = {
        status: 'fail',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // Test 6: getStatistics
    try {
      const stats = await enhancer.getStatistics(env);
      results.tests.getStatistics = {
        status: 'pass',
        stats: stats
      };
    } catch (error) {
      results.tests.getStatistics = {
        status: 'fail',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // Test 7: Learning Cycle (lightweight - just metrics calculation)
    try {
      // Don't run full cycle, just test metrics
      const metrics = await learningService.runLearningCycle(env);
      results.tests.learningCycle = {
        status: 'pass',
        metrics: {
          totalPatterns: metrics.totalPatterns,
          newPatternsLearned: metrics.newPatternsLearned,
          llmDependencyScore: metrics.llmDependencyScore,
          accuracyScore: metrics.accuracyScore
        }
      };
    } catch (error) {
      results.tests.learningCycle = {
        status: 'fail',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // Calculate summary
    const testResults = Object.values(results.tests) as Array<{ status: string }>;
    results.summary = {
      total: testResults.length,
      passed: testResults.filter(t => t.status === 'pass').length,
      failed: testResults.filter(t => t.status === 'fail').length
    };

    results.duration = Date.now() - startTime;

    return new Response(JSON.stringify(results, null, 2), {
      headers: getCorsHeaders()
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Smoke test failed',
      message: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime
    }, null, 2), {
      status: 500,
      headers: getCorsHeaders()
    });
  }
}
