/**
 * Feature Flags System - Enables gradual rollout and safe architectural migration
 * Supports percentage rollouts, A/B testing integration, and real-time toggling
 */

import { IServiceContainer } from './di-container';
import { SERVICE_TOKENS } from './service-token';

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  conditions: FeatureFlagCondition[];
  metadata: FeatureFlagMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureFlagCondition {
  type: 'user_id' | 'session_id' | 'environment' | 'time_window' | 'custom';
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  field?: string; // For custom conditions
}

export interface FeatureFlagMetadata {
  description: string;
  owner: string;
  category: 'migration' | 'experiment' | 'killswitch' | 'operational';
  tags: string[];
  dependencies: string[]; // Other flags this depends on
  expiration?: Date;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface FeatureFlagContext {
  userId?: string;
  sessionId?: string;
  environment: string;
  userAgent?: string;
  ipAddress?: string;
  customAttributes: Record<string, any>;
  timestamp: Date;
}

export interface FeatureFlagEvaluation {
  flagName: string;
  enabled: boolean;
  reason: string;
  context: FeatureFlagContext;
  evaluatedAt: Date;
  matchedConditions: string[];
}

export interface FeatureFlagMetrics {
  flagName: string;
  totalEvaluations: number;
  enabledEvaluations: number;
  disabledEvaluations: number;
  uniqueUsers: number;
  errorRate: number;
  averageEvaluationTime: number;
  lastEvaluated: Date;
}

export interface FeatureFlagRule {
  id: string;
  flagName: string;
  priority: number;
  conditions: FeatureFlagCondition[];
  override: boolean | null; // null = use default, true/false = force
  description: string;
  isActive: boolean;
}

/**
 * High-performance feature flag system with advanced targeting
 */
export class FeatureFlags {
  private flags = new Map<string, FeatureFlag>();
  private rules = new Map<string, FeatureFlagRule[]>();
  private metrics = new Map<string, FeatureFlagMetrics>();
  private cache = new Map<string, { value: boolean; expiry: number }>();
  
  private container: IServiceContainer;
  private configManager: any;
  private auditLogger: any;
  private monitoringService: any;
  
  // Performance optimization
  private evaluationCount = 0;
  private totalEvaluationTime = 0;
  private cacheHitRate = 0;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(container: IServiceContainer) {
    this.container = container;
    this.configManager = container.resolve(SERVICE_TOKENS.CONFIG);
    this.auditLogger = container.resolve(SERVICE_TOKENS.LOGGER);
    this.monitoringService = container.resolve(SERVICE_TOKENS.METRICS);

    // Initialize with system flags for migration
    this.initializeSystemFlags();
    
    // Start background tasks
    this.startMetricsCollection();
    this.startCacheCleanup();
  }

  /**
   * Set or update a feature flag
   */
  async setFlag(
    name: string, 
    enabled: boolean, 
    rolloutPercentage: number = 100,
    metadata: Partial<FeatureFlagMetadata> = {}
  ): Promise<void> {
    const existingFlag = this.flags.get(name);
    
    const flag: FeatureFlag = {
      name,
      enabled,
      rolloutPercentage: Math.max(0, Math.min(100, rolloutPercentage)),
      conditions: existingFlag?.conditions || [],
      metadata: {
        description: metadata.description || '',
        owner: metadata.owner || 'system',
        category: metadata.category || 'operational',
        tags: metadata.tags || [],
        dependencies: metadata.dependencies || [],
        expiration: metadata.expiration,
        riskLevel: metadata.riskLevel || 'low'
      },
      createdAt: existingFlag?.createdAt || new Date(),
      updatedAt: new Date()
    };

    this.flags.set(name, flag);
    
    // Clear cache for this flag
    this.invalidateCache(name);
    
    // Initialize metrics if new flag
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        flagName: name,
        totalEvaluations: 0,
        enabledEvaluations: 0,
        disabledEvaluations: 0,
        uniqueUsers: 0,
        errorRate: 0,
        averageEvaluationTime: 0,
        lastEvaluated: new Date()
      });
    }

    await this.auditLogger.log({
      event: 'feature_flag_updated',
      flagName: name,
      enabled,
      rolloutPercentage,
      metadata,
      timestamp: new Date()
    });

    await this.monitoringService.recordEvent('feature_flag_updated', {
      flag_name: name,
      enabled,
      rollout_percentage: rolloutPercentage,
      risk_level: flag.metadata.riskLevel
    });
  }

  /**
   * Evaluate feature flag with comprehensive context
   */
  async isEnabled(flagName: string, context: Partial<FeatureFlagContext> = {}): Promise<boolean> {
    const startTime = performance.now();
    
    try {
      const evaluation = await this.evaluateFlag(flagName, context);
      this.updateMetrics(flagName, evaluation.enabled, performance.now() - startTime);
      return evaluation.enabled;
    } catch (error) {
      this.recordEvaluationError(flagName, error);
      return false; // Fail closed
    }
  }

  /**
   * Get detailed flag evaluation with reasoning
   */
  async evaluateFlag(
    flagName: string, 
    context: Partial<FeatureFlagContext> = {}
  ): Promise<FeatureFlagEvaluation> {
    const fullContext: FeatureFlagContext = {
      environment: process.env.NODE_ENV || 'development',
      customAttributes: {},
      timestamp: new Date(),
      ...context
    };

    // Check cache first
    const cacheKey = this.generateCacheKey(flagName, fullContext);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      this.cacheHits++;
      return {
        flagName,
        enabled: cached.value,
        reason: 'cached_result',
        context: fullContext,
        evaluatedAt: new Date(),
        matchedConditions: []
      };
    }
    
    this.cacheMisses++;

    const flag = this.flags.get(flagName);
    if (!flag) {
      return {
        flagName,
        enabled: false,
        reason: 'flag_not_found',
        context: fullContext,
        evaluatedAt: new Date(),
        matchedConditions: []
      };
    }

    // Check if flag is globally disabled
    if (!flag.enabled) {
      this.cacheResult(cacheKey, false, 60000); // Cache for 1 minute
      return {
        flagName,
        enabled: false,
        reason: 'flag_disabled',
        context: fullContext,
        evaluatedAt: new Date(),
        matchedConditions: []
      };
    }

    // Check expiration
    if (flag.metadata.expiration && flag.metadata.expiration < new Date()) {
      this.cacheResult(cacheKey, false, 300000); // Cache for 5 minutes
      return {
        flagName,
        enabled: false,
        reason: 'flag_expired',
        context: fullContext,
        evaluatedAt: new Date(),
        matchedConditions: []
      };
    }

    // Check dependencies
    for (const dependency of flag.metadata.dependencies) {
      const dependencyEnabled = await this.isEnabled(dependency, context);
      if (!dependencyEnabled) {
        this.cacheResult(cacheKey, false, 30000); // Cache for 30 seconds
        return {
          flagName,
          enabled: false,
          reason: `dependency_disabled:${dependency}`,
          context: fullContext,
          evaluatedAt: new Date(),
          matchedConditions: []
        };
      }
    }

    // Evaluate rules (highest priority first)
    const flagRules = this.rules.get(flagName) || [];
    const activeRules = flagRules
      .filter(rule => rule.isActive)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of activeRules) {
      if (await this.evaluateConditions(rule.conditions, fullContext)) {
        const result = rule.override !== null ? rule.override : flag.enabled;
        this.cacheResult(cacheKey, result, 30000);
        return {
          flagName,
          enabled: result,
          reason: `rule_matched:${rule.id}`,
          context: fullContext,
          evaluatedAt: new Date(),
          matchedConditions: rule.conditions.map(c => `${c.type}:${c.operator}:${c.value}`)
        };
      }
    }

    // Evaluate flag conditions
    const matchedConditions: string[] = [];
    for (const condition of flag.conditions) {
      if (await this.evaluateCondition(condition, fullContext)) {
        matchedConditions.push(`${condition.type}:${condition.operator}:${condition.value}`);
      } else {
        this.cacheResult(cacheKey, false, 30000);
        return {
          flagName,
          enabled: false,
          reason: 'condition_not_met',
          context: fullContext,
          evaluatedAt: new Date(),
          matchedConditions: []
        };
      }
    }

    // Apply rollout percentage
    const enabled = this.shouldEnableForUser(flagName, fullContext, flag.rolloutPercentage);
    const reason = enabled ? 'rollout_included' : 'rollout_excluded';
    
    this.cacheResult(cacheKey, enabled, 60000); // Cache for 1 minute
    
    return {
      flagName,
      enabled,
      reason,
      context: fullContext,
      evaluatedAt: new Date(),
      matchedConditions
    };
  }

  /**
   * Add targeting rule for advanced flag control
   */
  async addRule(rule: Omit<FeatureFlagRule, 'id'>): Promise<string> {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullRule: FeatureFlagRule = {
      id: ruleId,
      ...rule
    };

    const existingRules = this.rules.get(rule.flagName) || [];
    existingRules.push(fullRule);
    existingRules.sort((a, b) => b.priority - a.priority);
    
    this.rules.set(rule.flagName, existingRules);
    
    // Clear cache for affected flag
    this.invalidateCache(rule.flagName);

    await this.auditLogger.log({
      event: 'feature_flag_rule_added',
      flagName: rule.flagName,
      ruleId,
      rule: fullRule,
      timestamp: new Date()
    });

    return ruleId;
  }

  /**
   * Remove targeting rule
   */
  async removeRule(flagName: string, ruleId: string): Promise<boolean> {
    const rules = this.rules.get(flagName) || [];
    const ruleIndex = rules.findIndex(r => r.id === ruleId);
    
    if (ruleIndex === -1) {
      return false;
    }

    rules.splice(ruleIndex, 1);
    this.rules.set(flagName, rules);
    
    this.invalidateCache(flagName);

    await this.auditLogger.log({
      event: 'feature_flag_rule_removed',
      flagName,
      ruleId,
      timestamp: new Date()
    });

    return true;
  }

  /**
   * Get all flags with their current status
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get flag metrics and performance data
   */
  getFlagMetrics(flagName?: string): FeatureFlagMetrics | FeatureFlagMetrics[] {
    if (flagName) {
      return this.metrics.get(flagName) || this.createEmptyMetrics(flagName);
    }
    return Array.from(this.metrics.values());
  }

  /**
   * Get system performance metrics
   */
  getSystemMetrics() {
    return {
      totalFlags: this.flags.size,
      totalEvaluations: this.evaluationCount,
      averageEvaluationTime: this.totalEvaluationTime / Math.max(1, this.evaluationCount),
      cacheHitRate: this.cacheHits / Math.max(1, this.cacheHits + this.cacheMisses),
      cacheSize: this.cache.size,
      activeRules: Array.from(this.rules.values()).reduce((sum, rules) => sum + rules.length, 0)
    };
  }

  /**
   * Force refresh cache for a flag
   */
  refreshFlag(flagName: string): void {
    this.invalidateCache(flagName);
  }

  /**
   * Bulk operations for efficient flag management
   */
  async bulkUpdateFlags(updates: { name: string; enabled: boolean; rolloutPercentage?: number }[]): Promise<void> {
    for (const update of updates) {
      await this.setFlag(update.name, update.enabled, update.rolloutPercentage);
    }

    await this.auditLogger.log({
      event: 'feature_flags_bulk_updated',
      updates,
      timestamp: new Date()
    });
  }

  // Private implementation methods

  private shouldEnableForUser(
    flagName: string, 
    context: FeatureFlagContext, 
    rolloutPercentage: number
  ): boolean {
    if (rolloutPercentage >= 100) return true;
    if (rolloutPercentage <= 0) return false;

    // Use consistent hashing for stable rollout
    const userIdentifier = context.userId || context.sessionId || context.ipAddress || 'anonymous';
    const hash = this.hashString(`${flagName}:${userIdentifier}`);
    const userPercentile = (hash % 10000) / 100; // 0-99.99
    
    return userPercentile < rolloutPercentage;
  }

  private async evaluateConditions(
    conditions: FeatureFlagCondition[], 
    context: FeatureFlagContext
  ): Promise<boolean> {
    // All conditions must be true (AND logic)
    for (const condition of conditions) {
      if (!await this.evaluateCondition(condition, context)) {
        return false;
      }
    }
    return true;
  }

  private async evaluateCondition(
    condition: FeatureFlagCondition, 
    context: FeatureFlagContext
  ): Promise<boolean> {
    let contextValue: any;

    switch (condition.type) {
      case 'user_id':
        contextValue = context.userId;
        break;
      case 'session_id':
        contextValue = context.sessionId;
        break;
      case 'environment':
        contextValue = context.environment;
        break;
      case 'time_window':
        contextValue = context.timestamp.getTime();
        break;
      case 'custom':
        contextValue = condition.field ? context.customAttributes[condition.field] : null;
        break;
      default:
        return false;
    }

    return this.evaluateOperator(contextValue, condition.operator, condition.value);
  }

  private evaluateOperator(contextValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return contextValue === expectedValue;
      case 'contains':
        return typeof contextValue === 'string' && contextValue.includes(expectedValue);
      case 'greater_than':
        return Number(contextValue) > Number(expectedValue);
      case 'less_than':
        return Number(contextValue) < Number(expectedValue);
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(contextValue);
      case 'not_in':
        return Array.isArray(expectedValue) && !expectedValue.includes(contextValue);
      default:
        return false;
    }
  }

  private generateCacheKey(flagName: string, context: FeatureFlagContext): string {
    // Generate stable cache key based on relevant context
    const relevantContext = {
      userId: context.userId,
      sessionId: context.sessionId,
      environment: context.environment
    };
    
    const contextHash = this.hashString(JSON.stringify(relevantContext));
    return `${flagName}:${contextHash}`;
  }

  private cacheResult(key: string, value: boolean, ttlMs: number): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs
    });
  }

  private invalidateCache(flagName: string): void {
    // Remove all cache entries for this flag
    const keysToRemove: string[] = [];
    for (const [key] of this.cache) {
      if (key.startsWith(flagName + ':')) {
        keysToRemove.push(key);
      }
    }
    
    for (const key of keysToRemove) {
      this.cache.delete(key);
    }
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private updateMetrics(flagName: string, enabled: boolean, evaluationTime: number): void {
    this.evaluationCount++;
    this.totalEvaluationTime += evaluationTime;

    const metrics = this.metrics.get(flagName);
    if (metrics) {
      metrics.totalEvaluations++;
      if (enabled) {
        metrics.enabledEvaluations++;
      } else {
        metrics.disabledEvaluations++;
      }
      metrics.averageEvaluationTime = 
        (metrics.averageEvaluationTime * (metrics.totalEvaluations - 1) + evaluationTime) / metrics.totalEvaluations;
      metrics.lastEvaluated = new Date();
    }
  }

  private recordEvaluationError(flagName: string, error: any): void {
    const metrics = this.metrics.get(flagName);
    if (metrics) {
      metrics.totalEvaluations++;
      metrics.errorRate = (metrics.errorRate * (metrics.totalEvaluations - 1) + 1) / metrics.totalEvaluations;
    }

    this.auditLogger.log({
      event: 'feature_flag_evaluation_error',
      flagName,
      error: error.message,
      timestamp: new Date()
    });
  }

  private createEmptyMetrics(flagName: string): FeatureFlagMetrics {
    return {
      flagName,
      totalEvaluations: 0,
      enabledEvaluations: 0,
      disabledEvaluations: 0,
      uniqueUsers: 0,
      errorRate: 0,
      averageEvaluationTime: 0,
      lastEvaluated: new Date()
    };
  }

  private initializeSystemFlags(): void {
    // Migration-related feature flags
    const migrationFlags = [
      { name: 'use_di_container', description: 'Enable DI container for service resolution' },
      { name: 'use_unified_ab_testing', description: 'Use UnifiedABTestingService instead of legacy services' },
      { name: 'use_unified_test_runner', description: 'Use UnifiedTestRunner instead of separate runners' },
      { name: 'enable_migration_tools', description: 'Enable automated migration tooling' },
      { name: 'enable_performance_monitoring', description: 'Enable enhanced performance monitoring' },
      { name: 'enable_circuit_breakers', description: 'Enable circuit breaker pattern for service calls' }
    ];

    for (const flag of migrationFlags) {
      this.setFlag(flag.name, false, 0, {
        description: flag.description,
        category: 'migration',
        owner: 'system',
        riskLevel: 'medium'
      });
    }
  }

  private startMetricsCollection(): void {
    // Collect metrics every minute
    setInterval(() => {
      this.monitoringService.recordMetrics('feature_flags', {
        total_flags: this.flags.size,
        total_evaluations: this.evaluationCount,
        cache_hit_rate: this.cacheHitRate,
        cache_size: this.cache.size
      });
    }, 60000);
  }

  private startCacheCleanup(): void {
    // Clean expired cache entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];
      
      for (const [key, value] of this.cache) {
        if (value.expiry <= now) {
          expiredKeys.push(key);
        }
      }
      
      for (const key of expiredKeys) {
        this.cache.delete(key);
      }
    }, 300000);
  }

  // Health check for service registry
  async healthCheck(): Promise<boolean> {
    try {
      // Test flag evaluation
      const testResult = await this.isEnabled('health_check_test', {
        environment: 'test'
      });
      
      // Verify core functionality
      return this.flags.size >= 0 && 
             this.cache instanceof Map &&
             typeof testResult === 'boolean';
    } catch {
      return false;
    }
  }
}