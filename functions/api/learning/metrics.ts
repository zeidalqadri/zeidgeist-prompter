// API endpoint for learning metrics dashboard
import { getLearningMetrics } from '../../../app/lib/learning/learning-metrics';

function getCorsHeaders(request: Request) {
  const origin = request.headers.get('Origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin'
  }
}

// Handle CORS preflight
export async function onRequestOptions(context: any): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: getCorsHeaders(context.request),
  })
}

// GET /api/learning/metrics - Get learning metrics snapshot
export async function onRequestGet(context: any): Promise<Response> {
  const { request } = context
  const url = new URL(request.url)
  const timeWindow = parseInt(url.searchParams.get('days') || '7', 10)
  const format = url.searchParams.get('format') || 'json' // 'json' or 'text'

  const corsHeaders = getCorsHeaders(request)

  try {
    const metricsService = getLearningMetrics()

    if (format === 'text') {
      // Return text-based dashboard summary
      const summary = await metricsService.generateDashboardSummary(timeWindow)
      return new Response(summary, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain'
        }
      })
    }

    // Return JSON metrics
    const metrics = await metricsService.getMetricsSnapshot(timeWindow)

    // Optionally include trends if requested
    if (url.searchParams.get('trends') === 'true') {
      const [velocityTrend, dependencyTrend] = await Promise.all([
        metricsService.getLearningVelocityTrend(timeWindow),
        metricsService.getLLMDependencyTrend(timeWindow)
      ])

      return new Response(JSON.stringify({
        metrics,
        trends: {
          learningVelocity: velocityTrend,
          llmDependency: dependencyTrend
        }
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      })
    }

    return new Response(JSON.stringify(metrics), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    console.error('Error fetching learning metrics:', error)
    return new Response(JSON.stringify({
      error: 'Failed to fetch learning metrics',
      message: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })
  }
}
