/**
 * Advanced Dependency Injection Container
 * Replaces singleton pattern with proper DI implementation
 * Features: Circular dependency detection, lifecycle management, performance optimization
 */

import { ServiceToken } from './service-token';

export type ServiceScope = 'singleton' | 'transient' | 'scoped';

export interface ServiceFactory<T> {
  (container: IServiceContainer): T | Promise<T>;
}

export interface ServiceDefinition<T = any> {
  factory: ServiceFactory<T>;
  scope: ServiceScope;
  dependencies: ServiceToken[];
  metadata?: ServiceMetadata;
}

export interface ServiceMetadata {
  description?: string;
  version?: string;
  tags?: string[];
  healthCheck?: () => Promise<boolean>;
}

export interface ServiceOptions {
  scope?: ServiceScope;
  dependencies?: ServiceToken[];
  metadata?: ServiceMetadata;
}

export interface IServiceContainer {
  register<T>(token: ServiceToken<T>, factory: ServiceFactory<T>, options?: ServiceOptions): void;
  registerInstance<T>(token: ServiceToken<T>, instance: T): void;
  resolve<T>(token: ServiceToken<T>, scope?: object): T;
  resolveOptional<T>(token: ServiceToken<T>, scope?: object): T | null;
  createScope(): IServiceContainer;
  dispose(): Promise<void>;
  validateConfiguration(): Promise<ValidationResult[]>;
  getServiceGraph(): ServiceDependencyGraph;
}

export class CircularDependencyError extends Error {
  constructor(stack: ServiceToken[], current: ServiceToken) {
    const path = [...stack, current].map(t => t.name).join(' -> ');
    super(`Circular dependency detected: ${path}`);
    this.name = 'CircularDependencyError';
  }
}

export class ServiceNotFoundError extends Error {
  constructor(token: ServiceToken) {
    super(`Service not found: ${token.name}`);
    this.name = 'ServiceNotFoundError';
  }
}

export interface ValidationResult {
  service: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ServiceDependencyGraph {
  nodes: { id: string; label: string; type: ServiceScope }[];
  edges: { from: string; to: string }[];
}

/**
 * Core DI Container Implementation
 * Optimized for performance and memory efficiency
 */
export class DIContainer implements IServiceContainer {
  private services = new Map<ServiceToken, ServiceDefinition>();
  private singletonInstances = new Map<ServiceToken, any>();
  private scopedInstances = new WeakMap<object, Map<ServiceToken, any>>();
  private resolutionStack: ServiceToken[] = [];
  private disposed = false;
  private readonly creationTime = Date.now();

  // Performance metrics
  private resolutionCount = 0;
  private averageResolutionTime = 0;

  register<T>(
    token: ServiceToken<T>, 
    factory: ServiceFactory<T>, 
    options: ServiceOptions = {}
  ): void {
    if (this.disposed) {
      throw new Error('Cannot register services on disposed container');
    }

    this.services.set(token, {
      factory,
      scope: options.scope || 'singleton',
      dependencies: options.dependencies || [],
      metadata: options.metadata
    });
  }

  registerInstance<T>(token: ServiceToken<T>, instance: T): void {
    if (this.disposed) {
      throw new Error('Cannot register services on disposed container');
    }

    this.services.set(token, {
      factory: () => instance,
      scope: 'singleton',
      dependencies: []
    });
    
    this.singletonInstances.set(token, instance);
  }

  resolve<T>(token: ServiceToken<T>, scope?: object): T {
    const startTime = performance.now();
    
    try {
      const result = this.doResolve(token, scope);
      this.updatePerformanceMetrics(performance.now() - startTime);
      return result;
    } catch (error) {
      // Clear resolution stack on error
      this.resolutionStack = [];
      throw error;
    }
  }

  private doResolve<T>(token: ServiceToken<T>, scope?: object): T {
    if (this.disposed) {
      throw new Error('Cannot resolve services from disposed container');
    }

    // Circular dependency detection
    if (this.resolutionStack.includes(token)) {
      throw new CircularDependencyError(this.resolutionStack, token);
    }

    const definition = this.services.get(token);
    if (!definition) {
      throw new ServiceNotFoundError(token);
    }

    return this.createInstance(token, definition, scope);
  }

  private createInstance<T>(
    token: ServiceToken<T>, 
    definition: ServiceDefinition<T>, 
    scope?: object
  ): T {
    switch (definition.scope) {
      case 'singleton':
        return this.getSingleton(token, definition);
      case 'scoped':
        if (!scope) {
          throw new Error(`Scoped service ${token.name} requires a scope object`);
        }
        return this.getScoped(token, definition, scope);
      case 'transient':
        return this.createTransient(token, definition);
      default:
        throw new Error(`Unknown service scope: ${(definition as any).scope}`);
    }
  }

  private getSingleton<T>(token: ServiceToken<T>, definition: ServiceDefinition<T>): T {
    if (!this.singletonInstances.has(token)) {
      this.resolutionStack.push(token);
      try {
        const instance = definition.factory(this);
        this.singletonInstances.set(token, instance);
      } finally {
        this.resolutionStack.pop();
      }
    }
    return this.singletonInstances.get(token);
  }

  private getScoped<T>(
    token: ServiceToken<T>, 
    definition: ServiceDefinition<T>, 
    scope: object
  ): T {
    let scopedMap = this.scopedInstances.get(scope);
    if (!scopedMap) {
      scopedMap = new Map();
      this.scopedInstances.set(scope, scopedMap);
    }

    if (!scopedMap.has(token)) {
      this.resolutionStack.push(token);
      try {
        const instance = definition.factory(this);
        scopedMap.set(token, instance);
      } finally {
        this.resolutionStack.pop();
      }
    }

    return scopedMap.get(token);
  }

  private createTransient<T>(token: ServiceToken<T>, definition: ServiceDefinition<T>): T {
    this.resolutionStack.push(token);
    try {
      return definition.factory(this);
    } finally {
      this.resolutionStack.pop();
    }
  }

  resolveOptional<T>(token: ServiceToken<T>, scope?: object): T | null {
    try {
      return this.resolve(token, scope);
    } catch (error) {
      if (error instanceof ServiceNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  createScope(): IServiceContainer {
    const childContainer = new DIContainer();
    
    // Copy service definitions to child
    for (const [token, definition] of this.services) {
      childContainer.services.set(token, definition);
    }
    
    // Child containers share singleton instances with parent
    childContainer.singletonInstances = this.singletonInstances;
    
    return childContainer;
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;

    // Dispose singleton instances that implement IDisposable
    for (const instance of this.singletonInstances.values()) {
      if (instance && typeof instance.dispose === 'function') {
        try {
          await instance.dispose();
        } catch (error) {
          console.error('Error disposing service:', error);
        }
      }
    }

    this.singletonInstances.clear();
    this.services.clear();
    this.resolutionStack = [];
    this.disposed = true;
  }

  async validateConfiguration(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const [token, definition] of this.services) {
      const result: ValidationResult = {
        service: token.name,
        valid: true,
        errors: [],
        warnings: []
      };

      // Check dependencies exist
      for (const dependency of definition.dependencies) {
        if (!this.services.has(dependency)) {
          result.valid = false;
          result.errors.push(`Missing dependency: ${dependency.name}`);
        }
      }

      // Check for potential circular dependencies
      const visited = new Set<ServiceToken>();
      if (this.hasCircularDependency(token, visited)) {
        result.valid = false;
        result.errors.push('Potential circular dependency detected');
      }

      // Health check validation
      if (definition.metadata?.healthCheck) {
        try {
          const healthy = await definition.metadata.healthCheck();
          if (!healthy) {
            result.warnings.push('Service health check failed');
          }
        } catch (error) {
          result.warnings.push(`Health check error: ${error}`);
        }
      }

      results.push(result);
    }

    return results;
  }

  private hasCircularDependency(token: ServiceToken, visited: Set<ServiceToken>): boolean {
    if (visited.has(token)) return true;
    
    const definition = this.services.get(token);
    if (!definition) return false;

    visited.add(token);
    
    for (const dependency of definition.dependencies) {
      if (this.hasCircularDependency(dependency, new Set(visited))) {
        return true;
      }
    }
    
    visited.delete(token);
    return false;
  }

  getServiceGraph(): ServiceDependencyGraph {
    const nodes = Array.from(this.services.entries()).map(([token, definition]) => ({
      id: token.name,
      label: token.name,
      type: definition.scope
    }));

    const edges: { from: string; to: string }[] = [];
    for (const [token, definition] of this.services) {
      for (const dependency of definition.dependencies) {
        edges.push({
          from: dependency.name,
          to: token.name
        });
      }
    }

    return { nodes, edges };
  }

  // Performance monitoring
  private updatePerformanceMetrics(resolutionTime: number): void {
    this.resolutionCount++;
    this.averageResolutionTime = 
      (this.averageResolutionTime * (this.resolutionCount - 1) + resolutionTime) / this.resolutionCount;
  }

  getPerformanceMetrics() {
    return {
      totalResolutions: this.resolutionCount,
      averageResolutionTimeMs: this.averageResolutionTime,
      totalSingletons: this.singletonInstances.size,
      containerAgeMs: Date.now() - this.creationTime,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of container memory usage
    return (
      this.services.size * 100 + // Service definitions
      this.singletonInstances.size * 50 + // Instance references
      this.resolutionStack.length * 20 // Resolution stack
    );
  }
}