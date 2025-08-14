/**
 * CL4R1T4S Refactoring Initiative - DI System Entry Point
 * This file bootstraps the new dependency injection architecture
 */

export { DIContainer, IServiceContainer, ServiceDefinition, CircularDependencyError, ServiceNotFoundError } from './di-container';
export { ServiceToken, SERVICE_TOKENS, createServiceToken } from './service-token';
export { ServiceRegistry, globalServiceRegistry } from './service-registry';
export { UnifiedABTestingService } from './unified-ab-testing-service';
export { StatisticsEngine } from './statistics-engine';
export { MigrationController } from './migration-controller';
export { FeatureFlags } from './feature-flags';

// Re-export types for external use
export type {
  ServiceScope,
  ServiceFactory,
  ServiceOptions,
  ServiceMetadata,
  ValidationResult,
  ServiceDependencyGraph
} from './di-container';

export type {
  ABTestConfig,
  ABTestVariant,
  ABTestAssignment,
  ABTestResult,
  StatisticalAnalysis,
  ABTestMetrics
} from './unified-ab-testing-service';

export type {
  FeatureFlag,
  FeatureFlagCondition,
  FeatureFlagContext,
  FeatureFlagEvaluation,
  FeatureFlagMetrics
} from './feature-flags';

export type {
  MigrationPlan,
  MigrationPhase,
  MigrationStatus,
  MigrationAction
} from './migration-controller';

/**
 * Initialize the CL4R1T4S DI system
 */
export async function initializeCL4R1TAS(): Promise<ServiceRegistry> {
  const registry = globalServiceRegistry;
  
  console.log('🚀 Initializing CL4R1T4S Dependency Injection System...');
  
  // Validate all service configurations
  const validationResults = await registry.validateServices();
  const hasErrors = validationResults.some(result => !result.valid);
  
  if (hasErrors) {
    console.error('❌ Service validation failed:');
    validationResults
      .filter(result => !result.valid)
      .forEach(result => {
        console.error(`  - ${result.service}: ${result.errors.join(', ')}`);
      });
    throw new Error('DI system initialization failed due to service validation errors');
  }
  
  console.log('✅ All services validated successfully');
  
  // Initialize feature flags for migration
  const container = registry.getContainer();
  const featureFlags = container.resolve(SERVICE_TOKENS.FEATURE_FLAGS);
  
  await featureFlags.setFlag('use_di_container', true, 100, {
    description: 'Enable DI container for all service resolution',
    category: 'migration',
    owner: 'cl4r1tas-initiative',
    riskLevel: 'low'
  });
  
  console.log('🎛️  Feature flags initialized for migration');
  
  // Register migration plan
  const migrationController = container.resolve(SERVICE_TOKENS.MIGRATION_CONTROLLER);
  console.log('🔄 Migration controller ready');
  
  // Display system metrics
  const metrics = registry.getMetrics();
  console.log('📊 System Status:', {
    totalServices: metrics.totalServices,
    healthyServices: metrics.healthyServices,
    memoryUsage: `${(metrics.memoryUsage / 1024 / 1024).toFixed(2)} MB`
  });
  
  console.log('🎉 CL4R1T4S DI System initialized successfully!');
  
  return registry;
}

/**
 * Helper function to get service instances with proper typing
 */
export function getService<T>(serviceName: keyof typeof SERVICE_TOKENS): T {
  const token = SERVICE_TOKENS[serviceName];
  return globalServiceRegistry.getContainer().resolve<T>(token);
}

/**
 * Helper function for safe service resolution with fallback
 */
export function getServiceSafe<T>(serviceName: keyof typeof SERVICE_TOKENS, fallback?: T): T | null {
  try {
    const token = SERVICE_TOKENS[serviceName];
    return globalServiceRegistry.getContainer().resolve<T>(token);
  } catch {
    return fallback || null;
  }
}

/**
 * Migration utility - gradually replace singleton usage
 */
export async function migrateFromSingleton<T>(
  singletonClass: any,
  serviceName: keyof typeof SERVICE_TOKENS,
  context: any = {}
): Promise<T> {
  const featureFlags = getService<FeatureFlags>('FEATURE_FLAGS');
  const flagName = `use_di_${serviceName.toLowerCase()}`;
  
  const useDI = await featureFlags.isEnabled(flagName, {
    environment: process.env.NODE_ENV || 'development',
    customAttributes: context
  });
  
  if (useDI) {
    // Use new DI system
    return getService<T>(serviceName);
  } else {
    // Fall back to singleton (legacy)
    return singletonClass.getInstance();
  }
}

/**
 * Graceful shutdown of the DI system
 */
export async function shutdownCL4R1TAS(): Promise<void> {
  console.log('🛑 Shutting down CL4R1T4S DI System...');
  
  await globalServiceRegistry.shutdown();
  
  console.log('✅ CL4R1T4S DI System shut down gracefully');
}

// Default export for convenience
export default {
  initialize: initializeCL4R1TAS,
  getService,
  getServiceSafe,
  migrateFromSingleton,
  shutdown: shutdownCL4R1TAS,
  registry: globalServiceRegistry
};