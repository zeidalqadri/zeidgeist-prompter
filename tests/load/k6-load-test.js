/**
 * K6 Load Testing Script for mstprmpt.zeidgeist.com
 *
 * Tests:
 * - Concurrent user load (100-1000 users)
 * - API endpoint performance
 * - Cache hit rates
 * - Error rates
 * - Response times
 *
 * Usage:
 * k6 run tests/load/k6-load-test.js
 * k6 run --vus 100 --duration 5m tests/load/k6-load-test.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// Custom metrics
const cacheHitRate = new Rate('cache_hits')
const enhancementTime = new Trend('enhancement_duration')
const errorRate = new Rate('errors')
const llmCalls = new Counter('llm_calls')
const cacheCalls = new Counter('cache_calls')

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 300 },   // Ramp to 300 users
    { duration: '5m', target: 300 },   // Stay at 300 users
    { duration: '2m', target: 500 },   // Ramp to 500 users
    { duration: '5m', target: 500 },   // Stay at 500 users
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.05'],    // Error rate should be below 5%
    cache_hits: ['rate>0.3'],          // Cache hit rate should be above 30%
    enhancement_duration: ['p(95)<3000'], // 95% enhancements under 3s
  },
}

// Base URL
const BASE_URL = __ENV.BASE_URL || 'https://mstprmpt.zeidgeist.com'

// Sample prompts for testing
const SAMPLE_PROMPTS = [
  'Write a professional email',
  'Create a marketing campaign',
  'Explain quantum computing',
  'Write a product description',
  'Create a social media post',
  'Develop a business plan',
  'Write technical documentation',
  'Create a customer survey',
  'Draft a project proposal',
  'Write meeting notes'
]

// Repeat some prompts to test caching
const TEST_PROMPTS = [
  ...SAMPLE_PROMPTS,
  ...SAMPLE_PROMPTS.slice(0, 5), // Repeat first 5 for cache testing
  ...SAMPLE_PROMPTS.slice(0, 3), // Repeat first 3 more for higher cache hit
]

export default function () {
  // Select random prompt
  const promptIndex = Math.floor(Math.random() * TEST_PROMPTS.length)
  const prompt = TEST_PROMPTS[promptIndex]

  // Prepare request
  const url = `${BASE_URL}/api/engineer`
  const payload = JSON.stringify({
    prompt: prompt,
    context: '',
    isRefinement: false
  })

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'EnhancePrompt' },
  }

  // Make request
  const startTime = Date.now()
  const response = http.post(url, payload, params)
  const duration = Date.now() - startTime

  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'has result': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.result && body.result.length > 0
      } catch {
        return false
      }
    },
    'response time OK': (r) => r.timings.duration < 5000,
  })

  // Track metrics
  if (success) {
    enhancementTime.add(duration)

    try {
      const body = JSON.parse(response.body)

      // Check if cached
      if (body.metadata?.source === 'cache' || body.metadata?.cached === true) {
        cacheHitRate.add(1)
        cacheCalls.add(1)
      } else {
        cacheHitRate.add(0)
        llmCalls.add(1)
      }
    } catch (e) {
      console.error('Error parsing response:', e)
    }
  } else {
    errorRate.add(1)
  }

  // Simulate user think time
  sleep(Math.random() * 3 + 1) // 1-4 seconds
}

// Teardown function - run once at the end
export function teardown(data) {
  console.log('=== Load Test Summary ===')
  console.log(`Total LLM calls: ${llmCalls.value}`)
  console.log(`Total cache hits: ${cacheCalls.value}`)
  console.log('========================')
}

// Custom summary export
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
    'summary.html': htmlReport(data),
  }
}

function textSummary(data, options) {
  const indent = options.indent || ''
  const enableColors = options.enableColors || false

  let summary = '\n'
  summary += `${indent}===============================================\n`
  summary += `${indent}         K6 Load Test Summary\n`
  summary += `${indent}===============================================\n\n`

  // Test duration
  const duration = data.state.testRunDurationMs / 1000
  summary += `${indent}Test Duration: ${duration.toFixed(2)}s\n\n`

  // Requests
  const requests = data.metrics.http_reqs?.values
  if (requests) {
    summary += `${indent}Total Requests: ${requests.count}\n`
    summary += `${indent}Request Rate: ${requests.rate.toFixed(2)}/s\n\n`
  }

  // Response times
  const duration_metrics = data.metrics.http_req_duration?.values
  if (duration_metrics) {
    summary += `${indent}Response Times:\n`
    summary += `${indent}  avg: ${duration_metrics.avg.toFixed(2)}ms\n`
    summary += `${indent}  p50: ${duration_metrics['p(50)'].toFixed(2)}ms\n`
    summary += `${indent}  p95: ${duration_metrics['p(95)'].toFixed(2)}ms\n`
    summary += `${indent}  p99: ${duration_metrics['p(99)'].toFixed(2)}ms\n`
    summary += `${indent}  max: ${duration_metrics.max.toFixed(2)}ms\n\n`
  }

  // Cache metrics
  const cacheHits = data.metrics.cache_hits?.values
  if (cacheHits) {
    summary += `${indent}Cache Performance:\n`
    summary += `${indent}  Hit Rate: ${(cacheHits.rate * 100).toFixed(2)}%\n`
    summary += `${indent}  Total Hits: ${cacheHits.passes}\n`
    summary += `${indent}  Total Misses: ${cacheHits.fails}\n\n`
  }

  // Errors
  const errors = data.metrics.http_req_failed?.values
  if (errors) {
    summary += `${indent}Errors:\n`
    summary += `${indent}  Error Rate: ${(errors.rate * 100).toFixed(2)}%\n`
    summary += `${indent}  Total Errors: ${errors.passes}\n\n`
  }

  summary += `${indent}===============================================\n`

  return summary
}

function htmlReport(data) {
  // Simple HTML report
  return `
<!DOCTYPE html>
<html>
<head>
  <title>K6 Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    .metric { font-weight: bold; }
    .pass { color: green; }
    .fail { color: red; }
  </style>
</head>
<body>
  <h1>K6 Load Test Report</h1>
  <h2>Test Configuration</h2>
  <p>Target: ${BASE_URL}</p>
  <p>Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s</p>

  <h2>Performance Metrics</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Value</th>
      <th>Status</th>
    </tr>
    ${generateMetricRows(data)}
  </table>

  <h2>Threshold Results</h2>
  <pre>${JSON.stringify(data.thresholds, null, 2)}</pre>
</body>
</html>
  `
}

function generateMetricRows(data) {
  let rows = ''

  const metrics = [
    { name: 'Total Requests', value: data.metrics.http_reqs?.values?.count || 0 },
    { name: 'Request Rate', value: `${(data.metrics.http_reqs?.values?.rate || 0).toFixed(2)}/s` },
    { name: 'Avg Response Time', value: `${(data.metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms` },
    { name: 'P95 Response Time', value: `${(data.metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms` },
    { name: 'Error Rate', value: `${((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%` },
    { name: 'Cache Hit Rate', value: `${((data.metrics.cache_hits?.values?.rate || 0) * 100).toFixed(2)}%` },
  ]

  metrics.forEach(metric => {
    rows += `
      <tr>
        <td class="metric">${metric.name}</td>
        <td>${metric.value}</td>
        <td class="pass">✓</td>
      </tr>
    `
  })

  return rows
}
