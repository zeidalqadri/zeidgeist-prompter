/**
 * Circuit breaker health endpoint
 * Returns the status of all circuit breakers in the system
 */

import { checkCircuitBreakers } from '../../../app/lib/health/health-checks';

export async function onRequestGet() {
  try {
    const result = await checkCircuitBreakers();

    // 200 for healthy/degraded, 503 for unhealthy
    const status = result.status === 'unhealthy' ? 503 : 200;

    return Response.json(result, {
      status,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return Response.json(
      {
        name: 'circuit-breakers',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Circuit breaker check failed',
        details: {
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}
