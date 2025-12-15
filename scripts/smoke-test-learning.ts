/**
 * Smoke Test for Learning System
 *
 * Tests the Workers-native learning system with D1 database.
 * This file provides test functions that can be called from a Worker.
 */

import { createLearningService, createAdaptiveEnhancer } from '../functions/_shared/learning';
import { createDb } from '../functions/_shared/db';

// Test env interface
interface TestEnv {
  AUTH_DB?: any;
}

export async function testLearningService(env: TestEnv): Promise<{ passed: number; failed: number; results: string[] }> {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  const learningService = createLearningService();

  // Test 1: shouldUseLocalEnhancement
  try {
    const shouldUseLocal = await learningService.shouldUseLocalEnhancement(env, 'Create a website for a restaurant');
    results.push(`shouldUseLocalEnhancement: ${shouldUseLocal} ✅`);
    passed++;
  } catch (error) {
    results.push(`shouldUseLocalEnhancement: FAIL - ${error}`);
    failed++;
  }

  // Test 2: findRelatedPatterns
  try {
    const patterns = await learningService.findRelatedPatterns(env, 'Write a blog post about AI');
    results.push(`findRelatedPatterns: found ${patterns.length} patterns ✅`);
    passed++;
  } catch (error) {
    results.push(`findRelatedPatterns: FAIL - ${error}`);
    failed++;
  }

  // Test 3: getBestPattern
  try {
    const bestPattern = await learningService.getBestPattern(env, 'Create an app for task management');
    results.push(`getBestPattern: ${bestPattern ? 'found' : 'none'} ✅`);
    passed++;
  } catch (error) {
    results.push(`getBestPattern: FAIL - ${error}`);
    failed++;
  }

  return { passed, failed, results };
}

export async function testAdaptiveEnhancer(env: TestEnv): Promise<{ passed: number; failed: number; results: string[] }> {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  const enhancer = createAdaptiveEnhancer();

  // Test 1: enhance with no patterns
  try {
    const result = await enhancer.enhance(env, 'Make a todo app');
    results.push(`enhance: confidence=${result.confidence.toFixed(2)}, source=${result.source} ✅`);
    passed++;
  } catch (error) {
    results.push(`enhance: FAIL - ${error}`);
    failed++;
  }

  // Test 2: enhance with context
  try {
    const result = await enhancer.enhance(
      env,
      'Design a dashboard',
      'For a SaaS analytics platform'
    );
    results.push(`enhance(with context): confidence=${result.confidence.toFixed(2)} ✅`);
    passed++;
  } catch (error) {
    results.push(`enhance(with context): FAIL - ${error}`);
    failed++;
  }

  // Test 3: getStatistics
  try {
    const stats = await enhancer.getStatistics(env);
    results.push(`getStatistics: ${stats ? 'returned data' : 'null (no db)'} ✅`);
    passed++;
  } catch (error) {
    results.push(`getStatistics: FAIL - ${error}`);
    failed++;
  }

  return { passed, failed, results };
}

export async function testLearningCycle(env: TestEnv): Promise<{ passed: number; failed: number; results: string[] }> {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  const learningService = createLearningService();

  try {
    const metrics = await learningService.runLearningCycle(env);
    results.push(`runLearningCycle: patterns=${metrics.totalPatterns}, new=${metrics.newPatternsLearned} ✅`);
    passed++;
  } catch (error) {
    results.push(`runLearningCycle: FAIL - ${error}`);
    failed++;
  }

  return { passed, failed, results };
}

export async function testStoreAndReinforce(env: TestEnv): Promise<{ passed: number; failed: number; results: string[] }> {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  const learningService = createLearningService();

  // Test: storeSuccessfulEnhancement
  try {
    await learningService.storeSuccessfulEnhancement(
      env,
      'Write code for a button',
      'Create a responsive, accessible button component with hover states, click handlers, and proper ARIA labels for screen readers.',
      'deepseek',
      { context: 'React component', processingTime: 1500 }
    );
    results.push('storeSuccessfulEnhancement: stored ✅');
    passed++;
  } catch (error) {
    results.push(`storeSuccessfulEnhancement: FAIL - ${error}`);
    failed++;
  }

  // Test: reinforcePatterns
  try {
    await learningService.reinforcePatterns(
      env,
      'Write code for a button',
      5 // High score
    );
    results.push('reinforcePatterns: reinforced ✅');
    passed++;
  } catch (error) {
    results.push(`reinforcePatterns: FAIL - ${error}`);
    failed++;
  }

  return { passed, failed, results };
}

// Main smoke test runner
export async function runAllSmokeTests(env: TestEnv): Promise<{
  summary: { total: number; passed: number; failed: number };
  sections: Record<string, { passed: number; failed: number; results: string[] }>;
  dbAvailable: boolean;
}> {
  const db = createDb(env);
  const dbAvailable = !!db;

  const sections: Record<string, { passed: number; failed: number; results: string[] }> = {};

  sections['LearningService'] = await testLearningService(env);
  sections['AdaptiveEnhancer'] = await testAdaptiveEnhancer(env);
  sections['LearningCycle'] = await testLearningCycle(env);
  sections['StoreAndReinforce'] = await testStoreAndReinforce(env);

  const summary = {
    total: 0,
    passed: 0,
    failed: 0
  };

  for (const section of Object.values(sections)) {
    summary.passed += section.passed;
    summary.failed += section.failed;
    summary.total += section.passed + section.failed;
  }

  return { summary, sections, dbAvailable };
}
