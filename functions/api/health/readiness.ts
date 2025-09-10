/**
 * Readiness probe endpoint - checks if the service is ready to serve traffic
 * Used for deployment validation and traffic routing decisions
 */

import { readinessCheck } from '../../../app/lib/health/health-checks';

export async function onRequestGet(context: any) {
  try {
    const result = await readinessCheck(context.env);
    const status = result.status === 'healthy' ? 200 : 503;
    
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
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Readiness check failed',
        details: {
          message: 'Service is not ready to handle requests',
        },
      },
      { status: 503 }
    );
  }
}