/**
 * Service Registry - Central orchestration point for the DI system
 * Provides service discovery, health monitoring, and lifecycle management
 */

import { DIContainer, IServiceContainer, ServiceDefinition } from './di-container';
import { SERVICE_TOKENS } from './service-token';
import { UnifiedABTestingService } from './unified-ab-testing-service';
import { StatisticsEngine } from './statistics-engine';
import { MigrationController } from './migration-controller';
import { FeatureFlags } from './feature-flags';

export interface ServiceRegistryConfig {
  enableHealthChecks: boolean;
  healthCheckInterval: number; // milliseconds
  enablePerformanceMonitoring: boolean;
  circuitBreakerEnabled: boolean;
  autoRecovery: boolean;
}

export interface ServiceHealth {
  serviceName: string;
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  lastCheck: Date;
  responseTime: number;
  errorCount: number;
  successRate: number;
  dependencies: string[];
  metadata: Record<string, any>;
}

export interface RegistryMetrics {
  totalServices: number;
  healthyServices: number;
  unhealthyServices: number;
  averageResponseTime: number;
  totalResolutions: number;
  failedResolutions: number;
  circuitBreakerTrips: number;
  memoryUsage: number;
  uptime: number;
}

export interface CircuitBreakerState {
  serviceName: string;
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  lastFailureTime: number;
  nextRetryTime: number;
  successCount: number;
  configuration: CircuitBreakerConfig;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number; // milliseconds
  successThreshold: number; // for half-open to closed transition
  timeout: number; // operation timeout
}

/**
 * Central service registry with comprehensive monitoring and reliability features
 */
export class ServiceRegistry {
  private container: DIContainer;
  private healthChecks = new Map<string, ServiceHealth>();
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private performanceMetrics = new Map<string, number[]>(); // Response times
  
  private config: ServiceRegistryConfig;
  private healthCheckTimer?: NodeJS.Timeout;
  private startTime = Date.now();
  
  // Performance tracking
  private totalResolutions = 0;
  private failedResolutions = 0;
  private circuitBreakerTrips = 0;

  constructor(config: Partial<ServiceRegistryConfig> = {}) {
    this.config = {
      enableHealthChecks: true,
      healthCheckInterval: 30000, // 30 seconds
      enablePerformanceMonitoring: true,
      circuitBreakerEnabled: true,
      autoRecovery: true,
      ...config
    };

    this.container = new DIContainer();
    this.initializeServices();
    
    if (this.config.enableHealthChecks) {
      this.startHealthChecks();
    }
  }

  /**
   * Get the DI container instance
   */
  getContainer(): IServiceContainer {
    return this.container;
  }

  /**
   * Resolve service with circuit breaker protection
   */
  async resolveWithProtection<T>(serviceName: string): Promise<T> {
    const startTime = performance.now();
    this.totalResolutions++;

    try {
      // Check circuit breaker
      if (this.config.circuitBreakerEnabled) {
        const circuitBreakerState = this.getCircuitBreakerState(serviceName);
        
        if (circuitBreakerState.state === 'open') {
          if (Date.now() < circuitBreakerState.nextRetryTime) {
            throw new Error(`Circuit breaker open for service: ${serviceName}`);
          } else {
            // Transition to half-open
            circuitBreakerState.state = 'half_open';
            circuitBreakerState.successCount = 0;
          }
        }
      }

      // Resolve service
      const token = this.getServiceToken(serviceName);
      const service = this.container.resolve<T>(token);
      
      // Record success
      const responseTime = performance.now() - startTime;
      this.recordSuccess(serviceName, responseTime);
      
      return service;

    } catch (error) {
      this.failedResolutions++;
      this.recordFailure(serviceName, error);
      throw error;
    }
  }

  /**
   * Get comprehensive service health status
   */
  async getServiceHealth(serviceName?: string): Promise<ServiceHealth | ServiceHealth[]> {
    if (serviceName) {
      return this.healthChecks.get(serviceName) || this.createEmptyHealth(serviceName);
    }
    
    return Array.from(this.healthChecks.values());
  }

  /**
   * Get registry performance metrics
   */
  getMetrics(): RegistryMetrics {
    const healthyCount = Array.from(this.healthChecks.values())
      .filter(h => h.status === 'healthy').length;
    
    const unhealthyCount = Array.from(this.healthChecks.values())
      .filter(h => h.status === 'unhealthy').length;

    // Calculate average response time across all services
    const allResponseTimes: number[] = [];
    for (const times of this.performanceMetrics.values()) {
      allResponseTimes.push(...times);
    }
    const avgResponseTime = allResponseTimes.length > 0 
      ? allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length 
      : 0;

    return {
      totalServices: this.healthChecks.size,
      healthyServices: healthyCount,
      unhealthyServices: unhealthyCount,
      averageResponseTime: avgResponseTime,
      totalResolutions: this.totalResolutions,
      failedResolutions: this.failedResolutions,
      circuitBreakerTrips: this.circuitBreakerTrips,
      memoryUsage: this.container.getPerformanceMetrics().memoryUsage,
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Get circuit breaker states
   */
  getCircuitBreakerStates(): CircuitBreakerState[] {
    return Array.from(this.circuitBreakers.values());
  }

  /**
   * Manually reset circuit breaker
   */
  resetCircuitBreaker(serviceName: string): boolean {
    const state = this.circuitBreakers.get(serviceName);
    if (!state) return false;

    state.state = 'closed';
    state.failureCount = 0;
    state.successCount = 0;
    state.lastFailureTime = 0;
    state.nextRetryTime = 0;

    return true;
  }

  /**
   * Update service registry configuration
   */
  updateConfig(newConfig: Partial<ServiceRegistryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart health checks if interval changed
    if (newConfig.healthCheckInterval && this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.startHealthChecks();
    }
  }

  /**
   * Graceful shutdown with service cleanup
   */
  async shutdown(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Dispose of container and all services
    await this.container.dispose();
  }

  /**
   * Export service dependency graph for visualization
   */
  getServiceDependencyGraph() {
    return this.container.getServiceGraph();
  }

  /**
   * Validate all service configurations
   */
  async validateServices(): Promise<Array<{ service: string; valid: boolean; errors: string[] }>> {
    const containerResults = await this.container.validateConfiguration();
    return containerResults.map(result => ({
      service: result.service,
      valid: result.valid,
      errors: result.errors
    }));
  }

  // Private implementation methods

  private initializeServices(): void {
    // Register core infrastructure services
    this.container.registerInstance(SERVICE_TOKENS.CONFIG, this.createConfigManager());
    this.container.registerInstance(SERVICE_TOKENS.LOGGER, this.createAuditLogger());
    this.container.registerInstance(SERVICE_TOKENS.METRICS, this.createMonitoringService());

    // Register statistics engine
    this.container.register(
      SERVICE_TOKENS.STATISTICS_ENGINE,
      (container) => new StatisticsEngine(),
      { 
        scope: 'singleton',
        metadata: {
          description: 'Advanced statistical analysis for AB testing',
          healthCheck: async () => {
            const engine = container.resolve(SERVICE_TOKENS.STATISTICS_ENGINE);
            return engine.healthCheck();
          }
        }
      }
    );

    // Register feature flags
    this.container.register(
      SERVICE_TOKENS.FEATURE_FLAGS,
      (container) => new FeatureFlags(container),
      { 
        scope: 'singleton',
        dependencies: [SERVICE_TOKENS.CONFIG, SERVICE_TOKENS.LOGGER, SERVICE_TOKENS.METRICS],
        metadata: {
          description: 'Feature flag system for gradual rollouts',
          healthCheck: async () => {
            const flags = container.resolve(SERVICE_TOKENS.FEATURE_FLAGS);
            return flags.healthCheck();
          }
        }
      }
    );

    // Register unified AB testing service
    this.container.register(
      SERVICE_TOKENS.AB_TESTING,
      (container) => new UnifiedABTestingService(container),
      { 
        scope: 'singleton',
        dependencies: [SERVICE_TOKENS.CONFIG, SERVICE_TOKENS.LOGGER, SERVICE_TOKENS.METRICS, SERVICE_TOKENS.STATISTICS_ENGINE],
        metadata: {
          description: 'Unified AB testing service replacing legacy implementations',
          version: '2.0.0',
          tags: ['testing', 'analytics', 'optimization'],
          healthCheck: async () => {
            const abTesting = container.resolve(SERVICE_TOKENS.AB_TESTING);
            return abTesting.healthCheck();
          }
        }
      }
    );

    // Register migration controller
    this.container.register(
      SERVICE_TOKENS.MIGRATION_CONTROLLER,
      (container) => new MigrationController(container),
      { 
        scope: 'singleton',
        dependencies: [SERVICE_TOKENS.LOGGER, SERVICE_TOKENS.METRICS, SERVICE_TOKENS.FEATURE_FLAGS],
        metadata: {
          description: 'Automated migration tooling with rollback capabilities',
          healthCheck: async () => {
            const migration = container.resolve(SERVICE_TOKENS.MIGRATION_CONTROLLER);
            return migration.healthCheck();
          }
        }
      }
    );

    // Initialize health checks for all registered services
    this.initializeHealthChecks();
    
    // Initialize circuit breakers
    this.initializeCircuitBreakers();
  }

  private initializeHealthChecks(): void {
    // Create health check entries for all registered services
    for (const [token] of this.container['services']) {
      this.healthChecks.set(token.name, {
        serviceName: token.name,
        status: 'unknown',
        lastCheck: new Date(),
        responseTime: 0,
        errorCount: 0,
        successRate: 1.0,
        dependencies: [],
        metadata: {}
      });
    }
  }

  private initializeCircuitBreakers(): void {
    const defaultConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      successThreshold: 3,
      timeout: 5000 // 5 seconds
    };

    for (const [token] of this.container['services']) {
      this.circuitBreakers.set(token.name, {
        serviceName: token.name,
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        nextRetryTime: 0,
        successCount: 0,
        configuration: defaultConfig
      });
    }
  }

  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);

    // Initial health check
    this.performHealthChecks();
  }

  private async performHealthChecks(): Promise<void> {
    for (const [serviceName, health] of this.healthChecks) {
      try {
        const startTime = performance.now();
        
        // Get service and run health check if available
        const token = this.getServiceToken(serviceName);
        const definition = this.container['services'].get(token);
        
        if (definition?.metadata?.healthCheck) {
          const isHealthy = await Promise.race([
            definition.metadata.healthCheck(),
            new Promise<boolean>((_, reject) => 
              setTimeout(() => reject(new Error('Health check timeout')), 5000)
            )
          ]);

          const responseTime = performance.now() - startTime;
          
          health.status = isHealthy ? 'healthy' : 'unhealthy';
          health.responseTime = responseTime;
          health.lastCheck = new Date();
          
          if (isHealthy) {
            health.errorCount = Math.max(0, health.errorCount - 1);
          } else {
            health.errorCount++;
          }
          
        } else {
          // No health check available, assume healthy if service can be resolved
          try {
            this.container.resolve(token);
            health.status = 'healthy';
            health.lastCheck = new Date();
          } catch {
            health.status = 'unhealthy';
            health.errorCount++;
          }
        }

        // Update success rate
        const totalChecks = Math.max(1, health.errorCount + 10); // Assume some successful checks
        health.successRate = (totalChecks - health.errorCount) / totalChecks;

      } catch (error) {
        health.status = 'unhealthy';
        health.errorCount++;
        health.lastCheck = new Date();
      }
    }
  }

  private recordSuccess(serviceName: string, responseTime: number): void {
    // Update circuit breaker
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (circuitBreaker) {
      if (circuitBreaker.state === 'half_open') {
        circuitBreaker.successCount++;
        if (circuitBreaker.successCount >= circuitBreaker.configuration.successThreshold) {
          circuitBreaker.state = 'closed';
          circuitBreaker.failureCount = 0;
        }
      } else if (circuitBreaker.state === 'closed') {
        circuitBreaker.failureCount = Math.max(0, circuitBreaker.failureCount - 1);
      }
    }

    // Record performance metrics
    if (this.config.enablePerformanceMonitoring) {
      const metrics = this.performanceMetrics.get(serviceName) || [];
      metrics.push(responseTime);
      
      // Keep only last 100 measurements
      if (metrics.length > 100) {
        metrics.shift();
      }
      
      this.performanceMetrics.set(serviceName, metrics);
    }
  }

  private recordFailure(serviceName: string, error: any): void {
    // Update circuit breaker
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (circuitBreaker) {
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailureTime = Date.now();

      if (circuitBreaker.state === 'closed' && 
          circuitBreaker.failureCount >= circuitBreaker.configuration.failureThreshold) {
        // Open circuit breaker
        circuitBreaker.state = 'open';
        circuitBreaker.nextRetryTime = Date.now() + circuitBreaker.configuration.recoveryTimeout;
        this.circuitBreakerTrips++;
      } else if (circuitBreaker.state === 'half_open') {
        // Back to open
        circuitBreaker.state = 'open';
        circuitBreaker.nextRetryTime = Date.now() + circuitBreaker.configuration.recoveryTimeout;
        this.circuitBreakerTrips++;
      }
    }

    // Update health check
    const health = this.healthChecks.get(serviceName);
    if (health) {
      health.errorCount++;
      health.status = 'unhealthy';
    }
  }

  private getCircuitBreakerState(serviceName: string): CircuitBreakerState {
    let state = this.circuitBreakers.get(serviceName);
    if (!state) {
      // Create default circuit breaker state
      state = {
        serviceName,
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        nextRetryTime: 0,
        successCount: 0,
        configuration: {
          failureThreshold: 5,
          recoveryTimeout: 60000,
          successThreshold: 3,
          timeout: 5000
        }
      };
      this.circuitBreakers.set(serviceName, state);
    }
    return state;
  }

  private getServiceToken(serviceName: string) {
    // Map service names to tokens
    const tokenMap = new Map([
      ['CONFIG', SERVICE_TOKENS.CONFIG],
      ['LOGGER', SERVICE_TOKENS.LOGGER],
      ['METRICS', SERVICE_TOKENS.METRICS],
      ['AB_TESTING', SERVICE_TOKENS.AB_TESTING],
      ['STATISTICS_ENGINE', SERVICE_TOKENS.STATISTICS_ENGINE],
      ['FEATURE_FLAGS', SERVICE_TOKENS.FEATURE_FLAGS],
      ['MIGRATION_CONTROLLER', SERVICE_TOKENS.MIGRATION_CONTROLLER]
    ]);

    const token = tokenMap.get(serviceName);
    if (!token) {
      throw new Error(`Unknown service: ${serviceName}`);
    }
    
    return token;
  }

  private createEmptyHealth(serviceName: string): ServiceHealth {
    return {
      serviceName,
      status: 'unknown',
      lastCheck: new Date(),
      responseTime: 0,
      errorCount: 0,
      successRate: 1.0,
      dependencies: [],
      metadata: {}
    };
  }

  // Mock service implementations for dependency injection
  private createConfigManager() {
    return {
      get: (key: string) => process.env[key] || null,
      set: (key: string, value: any) => { process.env[key] = String(value); },
      getAll: () => ({ ...process.env }),
      healthCheck: async () => true
    };
  }

  private createAuditLogger() {
    return {
      log: async (event: any) => {
        console.log(`[AUDIT] ${new Date().toISOString()}:`, JSON.stringify(event));
      },
      healthCheck: async () => true
    };
  }

  private createMonitoringService() {
    return {
      recordEvent: async (name: string, data: any) => {
        console.log(`[METRICS] ${name}:`, data);
      },
      recordMetrics: async (name: string, metrics: any) => {
        console.log(`[METRICS] ${name}:`, metrics);
      },
      healthCheck: async () => true
    };
  }
}

/**
 * Global service registry instance
 */
export const globalServiceRegistry = new ServiceRegistry();
export default globalServiceRegistry;