/**
 * Liveness probe endpoint - checks if the service is alive
 * Used by Cloudflare and load balancers for basic health checks
 */

import { livenessCheck } from '../../../app/lib/health/health-checks';

export async function onRequestGet() {
  try {
    const result = await livenessCheck();
    
    return Response.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return Response.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Liveness check failed',
      },
      { status: 500 }
    );
  }
}