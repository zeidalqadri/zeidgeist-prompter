/**
 * Metrics Endpoint
 *
 * Exposes Prometheus-formatted metrics for scraping by monitoring systems
 */

import { NextResponse } from 'next/server';
import { getMetricsPrometheus, getMetricsJSON } from '@/app/lib/observability/metrics';

/**
 * GET /api/metrics
 *
 * Returns metrics in Prometheus text format by default
 * Add ?format=json for JSON format
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'prometheus';

    if (format === 'json') {
      return NextResponse.json(getMetricsJSON(), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Content-Type-Options': 'nosniff'
        }
      });
    }

    // Prometheus text format
    const metrics = getMetricsPrometheus();

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    console.error('Error exporting metrics:', error);
    return NextResponse.json(
      { error: 'Failed to export metrics' },
      { status: 500 }
    );
  }
}
