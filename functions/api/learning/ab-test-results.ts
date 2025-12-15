/**
 * @deprecated This endpoint uses the deprecated Node.js quality validator.
 * TODO: Port A/B testing to Workers or remove if not needed
 */
// API endpoint for A/B test results
// @ts-ignore - Using deprecated module pending migration
import { getQualityValidator } from '../../../app/lib/learning/quality-validator';

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

// GET /api/learning/ab-test-results - Get A/B testing results
export async function onRequestGet(context: any): Promise<Response> {
  const { request } = context
  const url = new URL(request.url)
  const days = parseInt(url.searchParams.get('days') || '7', 10)

  const corsHeaders = {
    ...getCorsHeaders(request),
    'Content-Type': 'application/json'
  }

  try {
    const validator = getQualityValidator()

    // Get A/B test results
    const results = await validator.getABTestResults(days)

    // Optionally get threshold recommendations
    if (url.searchParams.get('recommendations') === 'true') {
      const tuning = await validator.autoTuneThresholds(days)

      return new Response(JSON.stringify({
        results,
        tuning
      }), {
        headers: corsHeaders
      })
    }

    return new Response(JSON.stringify(results), {
      headers: corsHeaders
    })
  } catch (error) {
    console.error('Error fetching A/B test results:', error)
    return new Response(JSON.stringify({
      error: 'Failed to fetch A/B test results',
      message: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: corsHeaders
    })
  }
}
