/**
 * Health check system for monitoring application status
 */

import { getDatabaseConfig } from '../config/environment';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  responseTime?: number;
  details?: Record<string, unknown>;
  error?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  checks: HealthCheck[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

/**
 * Database connectivity check
 */
async function checkDatabase(env?: Record<string, string>): Promise<HealthCheck> {
  const start = Date.now();
  const check: HealthCheck = {
    name: 'database',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  };

  try {
    const config = getDatabaseConfig(env);

    // Test actual database connection
    if (!config.url) {
      throw new Error('Database URL not configured');
    }

    // Actual database connection test using pg
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(config.url);

    // Simple query to verify connection
    await sql`SELECT 1 as health_check`;
    
    check.responseTime = Date.now() - start;
    check.details = {
      connectionTimeout: config.connectionTimeout,
      maxConnections: config.maxConnections,
    };

  } catch (error) {
    check.status = 'unhealthy';
    check.error = error instanceof Error ? error.message : 'Unknown database error';
    check.responseTime = Date.now() - start;
  }

  return check;
}

/**
 * Memory usage check
 */
async function checkMemory(): Promise<HealthCheck> {
  const check: HealthCheck = {
    name: 'memory',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  };

  try {
    // In Node.js environment
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      const usageInMB = {
        rss: Math.round(usage.rss / 1024 / 1024),
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
        external: Math.round(usage.external / 1024 / 1024),
      };

      // Check if memory usage is within acceptable limits
      const heapUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;
      
      if (heapUsagePercent > 90) {
        check.status = 'unhealthy';
        check.error = 'Memory usage critically high';
      } else if (heapUsagePercent > 75) {
        check.status = 'degraded';
      }

      check.details = {
        ...usageInMB,
        heapUsagePercent: Math.round(heapUsagePercent),
      };
    } else {
      // Cloudflare Workers environment
      check.details = { environment: 'cloudflare-workers', memoryInfo: 'not-available' };
    }

  } catch (error) {
    check.status = 'unhealthy';
    check.error = error instanceof Error ? error.message : 'Memory check failed';
  }

  return check;
}

/**
 * API dependencies check
 */
async function checkApiDependencies(): Promise<HealthCheck> {
  const start = Date.now();
  const check: HealthCheck = {
    name: 'api-dependencies',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  };

  try {
    // Check external API availability (simulated)
    const apis = ['claude', 'openai', 'mistral'];
    const results = await Promise.allSettled(
      apis.map(async (api) => {
        // Simulate API health check
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        if (Math.random() < 0.1) { // 10% chance of failure for testing
          throw new Error(`${api} API unavailable`);
        }
        return { api, status: 'healthy' };
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - successful;

    if (failed === results.length) {
      check.status = 'unhealthy';
      check.error = 'All external APIs unavailable';
    } else if (failed > 0) {
      check.status = 'degraded';
    }

    check.responseTime = Date.now() - start;
    check.details = {
      total: results.length,
      successful,
      failed,
      results: results.map((r, i) => ({
        api: apis[i],
        status: r.status === 'fulfilled' ? 'healthy' : 'unhealthy',
        error: r.status === 'rejected' ? r.reason?.message : undefined,
      })),
    };

  } catch (error) {
    check.status = 'unhealthy';
    check.error = error instanceof Error ? error.message : 'API dependency check failed';
    check.responseTime = Date.now() - start;
  }

  return check;
}

/**
 * Environment configuration check
 */
async function checkEnvironment(env?: Record<string, string>): Promise<HealthCheck> {
  const check: HealthCheck = {
    name: 'environment',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  };

  try {
    // Use provided env or fallback to process.env (Node.js) or empty object (Workers)
    const environment = env || (typeof process !== 'undefined' ? process.env : {});
    
    const requiredVars = ['DATABASE_URL', 'JWT_SECRET'];
    const missing = requiredVars.filter(varName => !environment[varName]);

    if (missing.length > 0) {
      check.status = 'unhealthy';
      check.error = `Missing environment variables: ${missing.join(', ')}`;
    }

    const configuredApis = [
      environment.CLAUDE_API_KEY && 'claude',
      environment.OPENAI_API_KEY && 'openai',
      environment.MISTRAL_API_KEY && 'mistral',
      environment.DEEPSEEK_API_KEY && 'deepseek',
      environment.MOONSHOT_API_KEY && 'moonshot',
    ].filter(Boolean);

    if (configuredApis.length === 0) {
      check.status = 'degraded';
      check.error = 'No external API keys configured, using local enhancement only';
    }

    check.details = {
      environment: environment.NODE_ENV || 'development',
      configuredApis,
      requiredVarsPresent: requiredVars.length - missing.length,
      totalRequiredVars: requiredVars.length,
    };

  } catch (error) {
    check.status = 'unhealthy';
    check.error = error instanceof Error ? error.message : 'Environment check failed';
  }

  return check;
}

/**
 * Run all health checks
 */
export async function runHealthChecks(env?: Record<string, string>): Promise<HealthStatus> {
  const startTime = Date.now();
  
  // Run all health checks in parallel
  const checks = await Promise.all([
    checkDatabase(env),
    checkMemory(),
    checkApiDependencies(),
    checkEnvironment(env),
  ]);

  // Calculate overall status
  const healthy = checks.filter(c => c.status === 'healthy').length;
  const degraded = checks.filter(c => c.status === 'degraded').length;
  const unhealthy = checks.filter(c => c.status === 'unhealthy').length;

  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
  if (unhealthy > 0) {
    overallStatus = 'unhealthy';
  } else if (degraded > 0) {
    overallStatus = 'degraded';
  }

  // Get uptime (in Cloudflare Workers, this would be request-scoped)
  const uptime = typeof process !== 'undefined' && process.uptime ? 
    Math.floor(process.uptime()) : 
    Math.floor((Date.now() - startTime) / 1000);

  // Use provided env or fallback to process.env (Node.js) or empty object (Workers)
  const environment = env || (typeof process !== 'undefined' ? process.env : {});

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: environment.APP_VERSION || '1.0.0',
    uptime,
    checks,
    summary: {
      total: checks.length,
      healthy,
      unhealthy,
      degraded,
    },
  };
}

/**
 * Simple liveness check (always returns healthy if the service is running)
 */
export async function livenessCheck(): Promise<{ status: 'healthy'; timestamp: string }> {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Readiness check (checks if the service is ready to handle requests)
 */
export async function readinessCheck(env?: Record<string, string>): Promise<HealthCheck> {
  // Check critical components only
  const dbCheck = await checkDatabase(env);
  const envCheck = await checkEnvironment(env);

  const criticalChecks = [dbCheck, envCheck];
  const unhealthy = criticalChecks.filter(c => c.status === 'unhealthy');

  if (unhealthy.length > 0) {
    return {
      name: 'readiness',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service not ready',
      details: {
        failedChecks: unhealthy.map(c => ({ name: c.name, error: c.error })),
      },
    };
  }

  return {
    name: 'readiness',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    details: {
      message: 'Service ready to handle requests',
    },
  };
}