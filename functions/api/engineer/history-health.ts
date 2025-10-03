/**
 * Health Check for History Dual-Mode API
 * GET /api/engineer/history-health
 */

import { getSecurityHeaders } from "../../_shared/privacy-guard"

export async function onRequestGet(context: any): Promise<Response> {
  const { request, env } = context

  const corsHeaders = {
    ...getSecurityHeaders(request.headers.get('Origin') || undefined),
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  }

  const healthStatus: any = {
    status: 'checking',
    timestamp: new Date().toISOString(),
    checks: {}
  }

  // Check 1: Environment variables and their effective values
  const getFeatures = (env: any) => {
    return {
      USER_AUTH_ENABLED: env?.USER_AUTH_ENABLED === 'true' || false,
      IP_FALLBACK_ENABLED: env?.IP_FALLBACK_ENABLED === 'false' ? false : true,
      DUAL_MODE_ENABLED: env?.DUAL_MODE_ENABLED === 'false' ? false : true,
      FORCE_USER_AUTH: env?.FORCE_USER_AUTH === 'true' || false
    };
  }

  const features = getFeatures(env)

  healthStatus.checks.environment = {
    DATABASE_URL: !!env?.DATABASE_URL,
    USER_AUTH_ENABLED: `${features.USER_AUTH_ENABLED} (env: ${env?.USER_AUTH_ENABLED || 'not set'})`,
    IP_FALLBACK_ENABLED: `${features.IP_FALLBACK_ENABLED} (env: ${env?.IP_FALLBACK_ENABLED || 'not set'})`,
    DUAL_MODE_ENABLED: `${features.DUAL_MODE_ENABLED} (env: ${env?.DUAL_MODE_ENABLED || 'not set'})`,
    FORCE_USER_AUTH: `${features.FORCE_USER_AUTH} (env: ${env?.FORCE_USER_AUTH || 'not set'})`
  }

  healthStatus.checks.features = {
    description: 'Effective feature flag values',
    USER_AUTH_ENABLED: features.USER_AUTH_ENABLED,
    IP_FALLBACK_ENABLED: features.IP_FALLBACK_ENABLED,
    DUAL_MODE_ENABLED: features.DUAL_MODE_ENABLED,
    FORCE_USER_AUTH: features.FORCE_USER_AUTH,
    mode: features.DUAL_MODE_ENABLED ? 'Dual mode (IP + User auth)' :
          features.USER_AUTH_ENABLED ? 'User auth only' : 'IP-based only'
  }

  // Check 2: Database connectivity
  if (env?.DATABASE_URL) {
    try {
      const { createDb } = await import("../../_shared/db")
      const db = createDb(env)

      // Try a simple query to test connection
      const result = await db.execute('SELECT 1 as test')

      healthStatus.checks.database = {
        status: 'connected',
        test: result ? 'success' : 'failed'
      }
    } catch (dbError) {
      healthStatus.checks.database = {
        status: 'error',
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
        hint: 'Check DATABASE_URL configuration and network connectivity'
      }
    }
  } else {
    healthStatus.checks.database = {
      status: 'not configured',
      error: 'DATABASE_URL environment variable is missing',
      hint: 'Add DATABASE_URL to Cloudflare Pages environment variables'
    }
  }

  // Check 3: Required modules
  try {
    await import("../../_shared/privacy-guard")
    await import("../../_shared/privacy-monitor")
    await import("../../_shared/db-pool")
    healthStatus.checks.modules = {
      status: 'loaded',
      modules: ['privacy-guard', 'privacy-monitor', 'db-pool']
    }
  } catch (moduleError) {
    healthStatus.checks.modules = {
      status: 'error',
      error: moduleError instanceof Error ? moduleError.message : 'Module loading failed'
    }
  }

  // Determine overall status
  if (healthStatus.checks.database?.status === 'connected') {
    healthStatus.status = 'healthy'
  } else if (healthStatus.checks.database?.status === 'not configured') {
    healthStatus.status = 'misconfigured'
  } else {
    healthStatus.status = 'unhealthy'
  }

  // Return appropriate status code based on health
  const statusCode = healthStatus.status === 'healthy' ? 200 :
                      healthStatus.status === 'misconfigured' ? 503 : 500

  return new Response(JSON.stringify(healthStatus, null, 2), {
    status: statusCode,
    headers: corsHeaders
  })
}