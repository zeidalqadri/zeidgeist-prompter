/**
 * Service Token System for Type-Safe Dependency Injection
 * Provides compile-time type safety for service resolution
 */

export interface ServiceToken<T = any> {
  readonly name: string;
  readonly _type?: T; // Phantom type for TypeScript inference
}

export function createServiceToken<T>(name: string): ServiceToken<T> {
  return { name } as ServiceToken<T>;
}

// Core service tokens replacing singleton instances
export const SERVICE_TOKENS = {
  // Core Infrastructure
  CONFIG: createServiceToken<import('../configuration-manager').ConfigurationManager>('CONFIG'),
  LOGGER: createServiceToken<import('../audit-logger').AuditLogger>('LOGGER'),
  METRICS: createServiceToken<import('../monitoring-service').MonitoringService>('METRICS'),
  HEALTH_CHECK: createServiceToken<import('../health-check-service').HealthCheckService>('HEALTH_CHECK'),

  // AB Testing Services (consolidating the trinity)
  AB_TESTING: createServiceToken<import('./unified-ab-testing-service').UnifiedABTestingService>('AB_TESTING'),
  TRAFFIC_SPLITTER: createServiceToken<import('../traffic-splitter').TrafficSplitter>('TRAFFIC_SPLITTER'),
  EXPERIMENT_MANAGER: createServiceToken<import('../experiment-manager').ExperimentManager>('EXPERIMENT_MANAGER'),
  STATISTICS_ENGINE: createServiceToken<import('./statistics-engine').StatisticsEngine>('STATISTICS_ENGINE'),

  // Test Runner Services (consolidating proliferation)
  TEST_RUNNER: createServiceToken<import('./unified-test-runner').UnifiedTestRunner>('TEST_RUNNER'),
  VALIDATION_ENGINE: createServiceToken<import('./validation-engine').ValidationEngine>('VALIDATION_ENGINE'),
  REPORT_GENERATOR: createServiceToken<import('./report-generator').ReportGenerator>('REPORT_GENERATOR'),

  // Orchestrator Services (reducing complexity)
  PROMPT_ORCHESTRATOR: createServiceToken<import('../prompt-orchestrator').PromptOrchestrator>('PROMPT_ORCHESTRATOR'),
  PHASE2_ORCHESTRATOR: createServiceToken<import('../phase2-orchestrator').Phase2Orchestrator>('PHASE2_ORCHESTRATOR'),
  ROLLBACK_ORCHESTRATOR: createServiceToken<import('../rollback-orchestrator').RollbackOrchestrator>('ROLLBACK_ORCHESTRATOR'),

  // Utility Services
  EMERGENCY_PROCEDURES: createServiceToken<import('../emergency-procedures').EmergencyProcedures>('EMERGENCY_PROCEDURES'),
  PROMPT_REPOSITORY: createServiceToken<import('../prompt-repository').PromptRepository>('PROMPT_REPOSITORY'),
  BASELINE_METRICS: createServiceToken<import('../baseline-metrics-collector').BaselineMetricsCollector>('BASELINE_METRICS'),

  // Migration Support
  FEATURE_FLAGS: createServiceToken<import('./feature-flags').FeatureFlags>('FEATURE_FLAGS'),
  MIGRATION_CONTROLLER: createServiceToken<import('./migration-controller').MigrationController>('MIGRATION_CONTROLLER')
} as const;

export type ServiceTokens = typeof SERVICE_TOKENS;