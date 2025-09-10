/**
 * Preview Environment Configuration
 * Configuration settings specific to preview deployments
 */

/**
 * Preview environment configuration
 */
export const previewConfig = {
  // Environment identification
  environment: 'preview',
  isPreview: true,
  isDevelopment: false,
  isProduction: false,
  
  // Database configuration
  database: {
    // Use staging database for preview deployments
    useProduction: false,
    poolSize: 5, // Smaller pool for preview
    connectionTimeout: 10000,
    queryTimeout: 30000
  },
  
  // Authentication settings
  auth: {
    sessionTimeout: 60 * 60 * 1000, // 1 hour (shorter for preview)
    jwtExpiry: '1h',
    requireEmailVerification: false, // Relaxed for testing
    allowTestAccounts: true
  },
  
  // API configuration
  api: {
    enableCors: true,
    corsOrigins: ['*'], // Permissive CORS for testing
    enableSwagger: true, // API docs available in preview
    enableMetrics: false, // Minimal metrics collection
    timeout: 30000
  },
  
  // Security settings (relaxed for testing)
  security: {
    rateLimit: {
      enabled: true,
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000, // Relaxed limit
      skipSuccessfulRequests: true
    },
    csrf: {
      enabled: true,
      sameSite: 'lax' // Relaxed for cross-origin testing
    },
    headers: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.claude.ai", "https://api.openai.com"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"]
        }
      }
    }
  },
  
  // Feature flags for preview
  features: {
    enableDebugTools: true,
    enableExperimentalFeatures: true,
    enablePerformanceMetrics: true,
    enableDetailedLogging: true,
    enableTestingMode: true,
    enableMockData: false,
    enableA11yTools: true
  },
  
  // Logging configuration
  logging: {
    level: 'debug',
    enableConsoleOutput: true,
    enableFileOutput: false,
    enableRemoteLogging: false,
    includeStackTrace: true,
    logRequests: true,
    logResponses: true,
    maskSensitiveData: true
  },
  
  // Caching settings
  cache: {
    enabled: true,
    ttl: 5 * 60, // 5 minutes (shorter for preview)
    maxSize: 100, // Smaller cache size
    enableEtags: true
  },
  
  // External API settings
  externalAPIs: {
    timeout: 30000,
    retries: 2,
    enableMocking: false,
    rateLimitBypass: true // Allow more requests for testing
  },
  
  // File upload settings
  uploads: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'text/plain', 'application/json'],
    enableVirusScanning: false, // Disabled for preview
    tempDirectory: '/tmp/uploads'
  },
  
  // Performance settings
  performance: {
    enableGzip: true,
    enableBrotli: false,
    maxRequestSize: '10mb',
    requestTimeout: 30000,
    enableKeepAlive: true
  },
  
  // Monitoring and analytics
  monitoring: {
    enableHealthChecks: true,
    enableMetrics: false,
    enableApm: false,
    enableErrorTracking: true,
    enableUptime: false
  },
  
  // Preview-specific settings
  preview: {
    prNumber: process.env.PR_NUMBER,
    branch: process.env.GITHUB_HEAD_REF,
    commit: process.env.GITHUB_SHA,
    deploymentUrl: process.env.DEPLOYMENT_URL,
    allowDataSeeding: true,
    enableTestDataGeneration: true,
    showEnvironmentBanner: true,
    enableDeveloperTools: true
  }
};

/**
 * Get preview-specific environment variables
 */
export function getPreviewEnvironment() {
  return {
    NODE_ENV: 'preview',
    APP_ENV: 'preview',
    
    // Preview URLs
    API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || `https://preview-pr-${process.env.PR_NUMBER}.zeidgeist-prompter.pages.dev`,
    CLIENT_URL: process.env.NEXT_PUBLIC_API_URL || `https://preview-pr-${process.env.PR_NUMBER}.zeidgeist-prompter.pages.dev`,
    
    // Preview identification
    IS_PREVIEW: 'true',
    PREVIEW_PR_NUMBER: process.env.PR_NUMBER,
    PREVIEW_BRANCH: process.env.GITHUB_HEAD_REF,
    PREVIEW_COMMIT: process.env.GITHUB_SHA,
    
    // Feature flags
    FEATURE_FLAGS: JSON.stringify(previewConfig.features),
    
    // Security (relaxed)
    CORS_ORIGIN: '*',
    RATE_LIMIT_MAX: '1000',
    RATE_LIMIT_WINDOW: '900000', // 15 minutes
    
    // Logging
    LOG_LEVEL: 'debug',
    ENABLE_REQUEST_LOGGING: 'true',
    ENABLE_CONSOLE_LOGGING: 'true'
  };
}

/**
 * Validate preview environment configuration
 */
export function validatePreviewEnvironment() {
  const errors = [];
  
  // Check required preview variables
  if (!process.env.PR_NUMBER) {
    errors.push('PR_NUMBER is required for preview deployments');
  }
  
  if (!process.env.GITHUB_HEAD_REF) {
    errors.push('GITHUB_HEAD_REF is required for preview deployments');
  }
  
  if (!process.env.GITHUB_SHA) {
    errors.push('GITHUB_SHA is required for preview deployments');
  }
  
  // Check essential API keys (at least one should be present)
  const apiKeys = [
    'CLAUDE_API_KEY',
    'OPENAI_API_KEY',
    'MISTRAL_API_KEY'
  ];
  
  const hasApiKey = apiKeys.some(key => process.env[key]);
  if (!hasApiKey) {
    console.warn('⚠️  No AI API keys configured - functionality will be limited');
  }
  
  // Check database connection
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }
  
  // Check authentication secrets
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is required');
  }
  
  if (!process.env.NEXTAUTH_SECRET) {
    errors.push('NEXTAUTH_SECRET is required');
  }
  
  if (errors.length > 0) {
    throw new Error(`Preview environment validation failed:\n${errors.join('\n')}`);
  }
  
  console.log('✅ Preview environment validation passed');
  return true;
}

/**
 * Get preview deployment metadata
 */
export function getPreviewMetadata() {
  return {
    environment: 'preview',
    prNumber: process.env.PR_NUMBER,
    branch: process.env.GITHUB_HEAD_REF,
    commit: process.env.GITHUB_SHA,
    timestamp: new Date().toISOString(),
    deploymentUrl: process.env.DEPLOYMENT_URL || `https://preview-pr-${process.env.PR_NUMBER}.zeidgeist-prompter.pages.dev`,
    features: Object.keys(previewConfig.features).filter(key => previewConfig.features[key]),
    limitations: [
      'Uses staging database',
      'No production monitoring',
      'Relaxed rate limiting',
      'Permissive CORS policy',
      'No analytics tracking',
      'Temporary deployment (deleted when PR closes)'
    ]
  };
}

export default previewConfig;