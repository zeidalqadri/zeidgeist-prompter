/**
 * Environment configuration and validation
 * Provides type-safe environment variable access with validation
 */

export interface DatabaseConfig {
  url: string;
  maxConnections: number;
  connectionTimeout: number;
  retryAttempts: number;
}

export interface SecurityConfig {
  jwtSecret: string;
  nextAuthSecret: string;
  corsOrigins: string[];
  rateLimit: {
    windowMs: number;
    max: number;
  };
  sessionTimeout: number;
}

export interface ApiConfig {
  claudeApiKey?: string;
  openaiApiKey?: string;
  deepseekApiKey?: string;
  mistralApiKey?: string;
  moonshotApiKey?: string;
}

export interface MonitoringConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enablePerformanceLogging: boolean;
  enableErrorTracking: boolean;
  sentryDsn?: string;
}

export interface EnvironmentConfig {
  app: {
    env: 'development' | 'staging' | 'production';
    name: string;
    version: string;
    baseUrl: string;
  };
  database: DatabaseConfig;
  security: SecurityConfig;
  apis: ApiConfig;
  monitoring: MonitoringConfig;
  features: {
    enableAnalytics: boolean;
    enableErrorReporting: boolean;
    enablePerformanceMonitoring: boolean;
  };
}

/**
 * Required environment variables by environment
 */
const REQUIRED_VARS = {
  all: ['NODE_ENV', 'DATABASE_URL', 'JWT_SECRET'],
  production: ['NEXTAUTH_SECRET', 'APP_ENV'],
  staging: ['NEXTAUTH_SECRET', 'APP_ENV'],
} as const;

/**
 * Validate required environment variables
 */
export function validateEnvironment(env?: Record<string, string>): void {
  // Use provided env or fallback to process.env (Node.js) or empty object (Workers)
  const environment = env || (typeof process !== 'undefined' ? process.env : {});
  const nodeEnv = environment.NODE_ENV || 'development';
  const missing: string[] = [];

  // Check required vars for all environments
  for (const varName of REQUIRED_VARS.all) {
    if (!environment[varName]) {
      missing.push(varName);
    }
  }

  // Check environment-specific vars
  if (nodeEnv === 'production') {
    const envVars = REQUIRED_VARS[nodeEnv as keyof typeof REQUIRED_VARS];
    if (Array.isArray(envVars)) {
      for (const varName of envVars) {
        if (!environment[varName]) {
          missing.push(varName);
        }
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please set these variables before starting the application.`
    );
  }
}

/**
 * Get typed environment configuration
 */
export function getConfig(env?: Record<string, string>): EnvironmentConfig {
  validateEnvironment(env);

  // Use provided env or fallback to process.env (Node.js) or empty object (Workers)
  const environment = env || (typeof process !== 'undefined' ? process.env : {});
  const nodeEnv = environment.NODE_ENV || 'development';
  const appEnv = (environment.APP_ENV as any) || nodeEnv;
  
  return {
    app: {
      env: appEnv,
      name: 'zeidgeist-prompter',
      version: environment.APP_VERSION || '1.0.0',
      baseUrl: environment.API_BASE_URL || 
        (appEnv === 'production' ? 'https://mstprmpt.zeidgeist.com' :
         appEnv === 'staging' ? 'https://staging.mstprmpt.zeidgeist.com' :
         'http://localhost:8788'),
    },
    database: {
      url: environment.DATABASE_URL!,
      maxConnections: parseInt(environment.DB_MAX_CONNECTIONS || '10'),
      connectionTimeout: parseInt(environment.DB_CONNECTION_TIMEOUT || '30000'),
      retryAttempts: parseInt(environment.DB_RETRY_ATTEMPTS || '3'),
    },
    security: {
      jwtSecret: environment.JWT_SECRET!,
      nextAuthSecret: environment.NEXTAUTH_SECRET || environment.JWT_SECRET!,
      corsOrigins: environment.CORS_ORIGINS?.split(',') || [
        'https://mstprmpt.zeidgeist.com',
        'https://staging.mstprmpt.zeidgeist.com',
        ...(nodeEnv === 'development' ? ['http://localhost:3000', 'http://localhost:8788'] : [])
      ],
      rateLimit: {
        windowMs: parseInt(environment.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
        max: parseInt(environment.RATE_LIMIT_MAX || '100'),
      },
      sessionTimeout: parseInt(environment.SESSION_TIMEOUT || '86400000'), // 24 hours
    },
    apis: {
      claudeApiKey: environment.CLAUDE_API_KEY,
      openaiApiKey: environment.OPENAI_API_KEY,
      deepseekApiKey: environment.DEEPSEEK_API_KEY,
      mistralApiKey: environment.MISTRAL_API_KEY,
      moonshotApiKey: environment.MOONSHOT_API_KEY,
    },
    monitoring: {
      logLevel: (environment.LOG_LEVEL as any) || (appEnv === 'production' ? 'info' : 'debug'),
      enablePerformanceLogging: environment.ENABLE_PERFORMANCE_LOGGING === 'true' || appEnv !== 'production',
      enableErrorTracking: environment.ENABLE_ERROR_TRACKING !== 'false',
      sentryDsn: environment.SENTRY_DSN,
    },
    features: {
      enableAnalytics: environment.ENABLE_ANALYTICS !== 'false' && appEnv === 'production',
      enableErrorReporting: environment.ENABLE_ERROR_REPORTING !== 'false',
      enablePerformanceMonitoring: environment.ENABLE_PERFORMANCE_MONITORING !== 'false',
    },
  };
}

/**
 * Check if we're in a specific environment
 */
export function isProduction(env?: Record<string, string>): boolean {
  return getConfig(env).app.env === 'production';
}

export function isStaging(env?: Record<string, string>): boolean {
  return getConfig(env).app.env === 'staging';
}

export function isDevelopment(env?: Record<string, string>): boolean {
  return getConfig(env).app.env === 'development';
}

/**
 * Get database configuration with connection pooling
 */
export function getDatabaseConfig(env?: Record<string, string>): DatabaseConfig {
  return getConfig(env).database;
}

/**
 * Get security configuration
 */
export function getSecurityConfig(env?: Record<string, string>): SecurityConfig {
  return getConfig(env).security;
}

/**
 * Get available API configurations
 */
export function getApiConfig(env?: Record<string, string>): ApiConfig {
  return getConfig(env).apis;
}

/**
 * Get monitoring configuration  
 */
export function getMonitoringConfig(env?: Record<string, string>): MonitoringConfig {
  return getConfig(env).monitoring;
}

/**
 * Mask sensitive values for logging
 */
export function getMaskedConfig(env?: Record<string, string>): Partial<EnvironmentConfig> {
  const config = getConfig(env);
  return {
    ...config,
    security: {
      ...config.security,
      jwtSecret: '***masked***',
      nextAuthSecret: '***masked***',
    },
    apis: {
      claudeApiKey: config.apis.claudeApiKey ? '***masked***' : undefined,
      openaiApiKey: config.apis.openaiApiKey ? '***masked***' : undefined,
      deepseekApiKey: config.apis.deepseekApiKey ? '***masked***' : undefined,
      mistralApiKey: config.apis.mistralApiKey ? '***masked***' : undefined,
      moonshotApiKey: config.apis.moonshotApiKey ? '***masked***' : undefined,
    },
  };
}