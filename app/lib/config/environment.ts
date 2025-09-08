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
export function validateEnvironment(): void {
  const env = process.env.NODE_ENV || 'development';
  const missing: string[] = [];

  // Check required vars for all environments
  for (const varName of REQUIRED_VARS.all) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Check environment-specific vars
  if (env === 'production') {
    const envVars = REQUIRED_VARS[env as keyof typeof REQUIRED_VARS];
    if (Array.isArray(envVars)) {
      for (const varName of envVars) {
        if (!process.env[varName]) {
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
export function getConfig(): EnvironmentConfig {
  validateEnvironment();

  const env = process.env.NODE_ENV || 'development';
  const appEnv = (process.env.APP_ENV as any) || env;
  
  return {
    app: {
      env: appEnv,
      name: 'zeidgeist-prompter',
      version: process.env.APP_VERSION || '1.0.0',
      baseUrl: process.env.API_BASE_URL || 
        (appEnv === 'production' ? 'https://mstprmpt.zeidgeist.com' :
         appEnv === 'staging' ? 'https://staging.mstprmpt.zeidgeist.com' :
         'http://localhost:8788'),
    },
    database: {
      url: process.env.DATABASE_URL!,
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '3'),
    },
    security: {
      jwtSecret: process.env.JWT_SECRET!,
      nextAuthSecret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET!,
      corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
        'https://mstprmpt.zeidgeist.com',
        'https://staging.mstprmpt.zeidgeist.com',
        ...(env === 'development' ? ['http://localhost:3000', 'http://localhost:8788'] : [])
      ],
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
      },
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '86400000'), // 24 hours
    },
    apis: {
      claudeApiKey: process.env.CLAUDE_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      deepseekApiKey: process.env.DEEPSEEK_API_KEY,
      mistralApiKey: process.env.MISTRAL_API_KEY,
      moonshotApiKey: process.env.MOONSHOT_API_KEY,
    },
    monitoring: {
      logLevel: (process.env.LOG_LEVEL as any) || (appEnv === 'production' ? 'info' : 'debug'),
      enablePerformanceLogging: process.env.ENABLE_PERFORMANCE_LOGGING === 'true' || appEnv !== 'production',
      enableErrorTracking: process.env.ENABLE_ERROR_TRACKING !== 'false',
      sentryDsn: process.env.SENTRY_DSN,
    },
    features: {
      enableAnalytics: process.env.ENABLE_ANALYTICS !== 'false' && appEnv === 'production',
      enableErrorReporting: process.env.ENABLE_ERROR_REPORTING !== 'false',
      enablePerformanceMonitoring: process.env.ENABLE_PERFORMANCE_MONITORING !== 'false',
    },
  };
}

/**
 * Check if we're in a specific environment
 */
export function isProduction(): boolean {
  return getConfig().app.env === 'production';
}

export function isStaging(): boolean {
  return getConfig().app.env === 'staging';
}

export function isDevelopment(): boolean {
  return getConfig().app.env === 'development';
}

/**
 * Get database configuration with connection pooling
 */
export function getDatabaseConfig(): DatabaseConfig {
  return getConfig().database;
}

/**
 * Get security configuration
 */
export function getSecurityConfig(): SecurityConfig {
  return getConfig().security;
}

/**
 * Get available API configurations
 */
export function getApiConfig(): ApiConfig {
  return getConfig().apis;
}

/**
 * Get monitoring configuration  
 */
export function getMonitoringConfig(): MonitoringConfig {
  return getConfig().monitoring;
}

/**
 * Mask sensitive values for logging
 */
export function getMaskedConfig(): Partial<EnvironmentConfig> {
  const config = getConfig();
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