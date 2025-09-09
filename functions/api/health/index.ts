/**
 * Health check endpoints for monitoring and deployment validation
 */

import { runHealthChecks, livenessCheck, readinessCheck } from '../../../app/lib/health/health-checks';

export async function onRequestGet(context: any) {
  try {
    const url = new URL(context.request.url);
    const endpoint = url.pathname.split('/').pop();

    // Pass environment variables from Cloudflare Workers context
    const env = context.env;

    switch (endpoint) {
      case 'liveness':
        const liveness = await livenessCheck();
        return Response.json(liveness, { status: 200 });

      case 'readiness':
        const readiness = await readinessCheck(env);
        const status = readiness.status === 'healthy' ? 200 : 503;
        return Response.json(readiness, { status });

      case 'health':
      default:
        const health = await runHealthChecks(env);
        const healthStatus = 
          health.status === 'healthy' ? 200 :
          health.status === 'degraded' ? 200 :
          503;
        
        return Response.json(health, { 
          status: healthStatus,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Content-Type': 'application/json',
          },
        });
    }
  } catch (error) {
    console.error('Health check error:', error);
    return Response.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}