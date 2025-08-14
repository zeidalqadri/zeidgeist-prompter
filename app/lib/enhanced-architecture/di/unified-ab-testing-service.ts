/**
 * Unified AB Testing Service - Consolidates the trinity of AB testing implementations
 * Replaces: ABTestingService, Phase2ABTestingService, Phase2ABTestManager
 * Features: Configuration-driven design, statistical rigor, performance optimization
 */

import { ServiceToken, SERVICE_TOKENS } from './service-token';
import { IServiceContainer } from './di-container';

export interface ABTestConfig {
  testId: string;
  name: string;
  description: string;
  variants: ABTestVariant[];
  trafficAllocation: number; // 0.0 to 1.0
  targetMetrics: string[];
  minSampleSize: number;
  significanceLevel: number; // alpha, typically 0.05
  power: number; // typically 0.8
  phase: 'phase1' | 'phase2' | 'both';
  environment: 'development' | 'staging' | 'production';
  startDate: Date;
  endDate?: Date;
  autoRollback: ABTestRollbackConfig;
}

export interface ABTestVariant {
  id: string;
  name: string;
  weight: number; // Relative weight for traffic splitting
  config: Record<string, any>;
  isControl: boolean;
}

export interface ABTestRollbackConfig {
  enabled: boolean;
  triggers: {
    errorRateThreshold: number;
    performanceDegradation: number;
    negativeMetricThreshold: number;
  };
  cooldownPeriod: number; // minutes
}

export interface ABTestAssignment {
  testId: string;
  variantId: string;
  userId: string;
  assignmentTime: Date;
  sessionId?: string;
  context: Record<string, any>;
}

export interface ABTestResult {
  testId: string;
  variant: string;
  metric: string;
  value: number;
  timestamp: Date;
  userId: string;
  sessionId?: string;
  context: Record<string, any>;
}

export interface StatisticalAnalysis {
  testId: string;
  metric: string;
  controlMean: number;
  treatmentMean: number;
  controlStdDev: number;
  treatmentStdDev: number;
  sampleSizeControl: number;
  sampleSizeTreatment: number;
  tStatistic: number;
  pValue: number;
  confidenceInterval: [number, number];
  effectSize: number;
  statisticalPower: number;
  isSignificant: boolean;
  recommendation: 'continue' | 'stop_winner' | 'stop_loser' | 'inconclusive';
}

export interface ABTestMetrics {
  testId: string;
  totalParticipants: number;
  variantParticipants: Map<string, number>;
  conversionRates: Map<string, number>;
  averageValues: Map<string, number>;
  errorRates: Map<string, number>;
  performanceImpact: Map<string, number>;
  lastUpdated: Date;
}

/**
 * Core unified AB testing implementation
 * Handles all AB testing concerns with optimal performance and statistical rigor
 */
export class UnifiedABTestingService {
  private activeTests = new Map<string, ABTestConfig>();
  private assignments = new Map<string, ABTestAssignment>(); // userId -> assignment
  private results = new Map<string, ABTestResult[]>(); // testId -> results
  private metrics = new Map<string, ABTestMetrics>();
  
  private container: IServiceContainer;
  private configManager: any;
  private auditLogger: any;
  private monitoringService: any;
  private statisticsEngine: any;

  constructor(container: IServiceContainer) {
    this.container = container;
    this.configManager = container.resolve(SERVICE_TOKENS.CONFIG);
    this.auditLogger = container.resolve(SERVICE_TOKENS.LOGGER);
    this.monitoringService = container.resolve(SERVICE_TOKENS.METRICS);
    this.statisticsEngine = container.resolve(SERVICE_TOKENS.STATISTICS_ENGINE);
  }

  /**
   * Start a new AB test with comprehensive configuration
   */
  async startTest(config: ABTestConfig): Promise<void> {
    await this.validateTestConfig(config);
    
    this.activeTests.set(config.testId, {
      ...config,
      startDate: new Date()
    });

    // Initialize metrics tracking
    this.metrics.set(config.testId, {
      testId: config.testId,
      totalParticipants: 0,
      variantParticipants: new Map(config.variants.map(v => [v.id, 0])),
      conversionRates: new Map(config.variants.map(v => [v.id, 0])),
      averageValues: new Map(config.variants.map(v => [v.id, 0])),
      errorRates: new Map(config.variants.map(v => [v.id, 0])),
      performanceImpact: new Map(config.variants.map(v => [v.id, 0])),
      lastUpdated: new Date()
    });

    this.results.set(config.testId, []);

    await this.auditLogger.log({
      event: 'ab_test_started',
      testId: config.testId,
      config,
      timestamp: new Date()
    });

    await this.monitoringService.recordEvent('ab_test_started', {
      test_id: config.testId,
      phase: config.phase,
      variants: config.variants.length
    });
  }

  /**
   * Assign user to test variant with deterministic, consistent assignment
   */
  assignUserToTest(
    testId: string, 
    userId: string, 
    context: Record<string, any> = {}
  ): ABTestAssignment | null {
    const test = this.activeTests.get(testId);
    if (!test) return null;

    // Check if user already assigned
    const existingAssignment = this.assignments.get(`${testId}:${userId}`);
    if (existingAssignment) {
      return existingAssignment;
    }

    // Check traffic allocation
    if (!this.shouldIncludeUser(userId, test.trafficAllocation)) {
      return null;
    }

    // Deterministic variant selection based on user ID and test ID
    const variant = this.selectVariant(userId, testId, test.variants);
    
    const assignment: ABTestAssignment = {
      testId,
      variantId: variant.id,
      userId,
      assignmentTime: new Date(),
      sessionId: context.sessionId,
      context
    };

    this.assignments.set(`${testId}:${userId}`, assignment);
    
    // Update metrics
    const metrics = this.metrics.get(testId)!;
    metrics.totalParticipants++;
    metrics.variantParticipants.set(variant.id, 
      (metrics.variantParticipants.get(variant.id) || 0) + 1
    );
    metrics.lastUpdated = new Date();

    return assignment;
  }

  /**
   * Record test result with comprehensive data collection
   */
  async recordResult(
    testId: string,
    userId: string,
    metric: string,
    value: number,
    context: Record<string, any> = {}
  ): Promise<void> {
    const assignment = this.assignments.get(`${testId}:${userId}`);
    if (!assignment) return;

    const result: ABTestResult = {
      testId,
      variant: assignment.variantId,
      metric,
      value,
      timestamp: new Date(),
      userId,
      sessionId: context.sessionId,
      context
    };

    // Store result
    const testResults = this.results.get(testId) || [];
    testResults.push(result);
    this.results.set(testId, testResults);

    // Update real-time metrics
    await this.updateMetrics(testId, assignment.variantId, metric, value);

    // Check for automatic rollback triggers
    await this.checkRollbackTriggers(testId);
  }

  /**
   * Get statistical analysis for a test with comprehensive reporting
   */
  async getStatisticalAnalysis(testId: string, metric: string): Promise<StatisticalAnalysis | null> {
    const test = this.activeTests.get(testId);
    const results = this.results.get(testId);
    
    if (!test || !results || results.length === 0) return null;

    // Group results by variant
    const variantResults = new Map<string, number[]>();
    results
      .filter(r => r.metric === metric)
      .forEach(result => {
        if (!variantResults.has(result.variant)) {
          variantResults.set(result.variant, []);
        }
        variantResults.get(result.variant)!.push(result.value);
      });

    // Identify control and treatment groups
    const controlVariant = test.variants.find(v => v.isControl);
    if (!controlVariant) return null;

    const controlValues = variantResults.get(controlVariant.id) || [];
    
    // For simplicity, compare control vs first non-control variant
    const treatmentVariant = test.variants.find(v => !v.isControl);
    if (!treatmentVariant) return null;

    const treatmentValues = variantResults.get(treatmentVariant.id) || [];

    if (controlValues.length === 0 || treatmentValues.length === 0) return null;

    // Calculate statistical metrics using injected statistics engine
    const analysis = await this.statisticsEngine.performTTest({
      controlValues,
      treatmentValues,
      significanceLevel: test.significanceLevel,
      power: test.power
    });

    const result: StatisticalAnalysis = {
      testId,
      metric,
      controlMean: analysis.controlMean,
      treatmentMean: analysis.treatmentMean,
      controlStdDev: analysis.controlStdDev,
      treatmentStdDev: analysis.treatmentStdDev,
      sampleSizeControl: controlValues.length,
      sampleSizeTreatment: treatmentValues.length,
      tStatistic: analysis.tStatistic,
      pValue: analysis.pValue,
      confidenceInterval: analysis.confidenceInterval,
      effectSize: analysis.effectSize,
      statisticalPower: analysis.power,
      isSignificant: analysis.pValue < test.significanceLevel,
      recommendation: this.generateRecommendation(analysis, test)
    };

    return result;
  }

  /**
   * Stop test with comprehensive cleanup and final analysis
   */
  async stopTest(testId: string, reason: string): Promise<StatisticalAnalysis[]> {
    const test = this.activeTests.get(testId);
    if (!test) throw new Error(`Test ${testId} not found`);

    // Generate final analysis for all target metrics
    const finalAnalyses: StatisticalAnalysis[] = [];
    for (const metric of test.targetMetrics) {
      const analysis = await this.getStatisticalAnalysis(testId, metric);
      if (analysis) {
        finalAnalyses.push(analysis);
      }
    }

    // Clean up
    this.activeTests.delete(testId);
    
    // Keep historical data for audit purposes but mark as completed
    await this.auditLogger.log({
      event: 'ab_test_stopped',
      testId,
      reason,
      finalAnalyses,
      timestamp: new Date()
    });

    await this.monitoringService.recordEvent('ab_test_stopped', {
      test_id: testId,
      reason,
      duration_hours: (Date.now() - test.startDate.getTime()) / (1000 * 60 * 60)
    });

    return finalAnalyses;
  }

  /**
   * Get comprehensive test metrics and status
   */
  getTestMetrics(testId: string): ABTestMetrics | null {
    return this.metrics.get(testId) || null;
  }

  /**
   * Get all active tests (for monitoring and management)
   */
  getActiveTests(): ABTestConfig[] {
    return Array.from(this.activeTests.values());
  }

  /**
   * Get user's current test assignments
   */
  getUserAssignments(userId: string): ABTestAssignment[] {
    return Array.from(this.assignments.values())
      .filter(assignment => assignment.userId === userId);
  }

  // Private implementation methods

  private async validateTestConfig(config: ABTestConfig): Promise<void> {
    const errors: string[] = [];

    if (config.variants.length < 2) {
      errors.push('Test must have at least 2 variants');
    }

    if (!config.variants.some(v => v.isControl)) {
      errors.push('Test must have a control variant');
    }

    const totalWeight = config.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.1) {
      errors.push('Variant weights must sum to 100');
    }

    if (config.trafficAllocation <= 0 || config.trafficAllocation > 1) {
      errors.push('Traffic allocation must be between 0 and 1');
    }

    if (this.activeTests.has(config.testId)) {
      errors.push(`Test ${config.testId} is already running`);
    }

    if (errors.length > 0) {
      throw new Error(`Invalid test configuration: ${errors.join(', ')}`);
    }
  }

  private shouldIncludeUser(userId: string, trafficAllocation: number): boolean {
    // Use consistent hashing for deterministic traffic allocation
    const hash = this.hashString(userId);
    return (hash % 1000) / 1000 < trafficAllocation;
  }

  private selectVariant(userId: string, testId: string, variants: ABTestVariant[]): ABTestVariant {
    // Deterministic variant selection using combined hash
    const combinedHash = this.hashString(`${userId}:${testId}`);
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    const targetWeight = (combinedHash % totalWeight);
    
    let cumulativeWeight = 0;
    for (const variant of variants) {
      cumulativeWeight += variant.weight;
      if (targetWeight < cumulativeWeight) {
        return variant;
      }
    }
    
    return variants[0]; // Fallback
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

  private async updateMetrics(
    testId: string, 
    variantId: string, 
    metric: string, 
    value: number
  ): Promise<void> {
    const metrics = this.metrics.get(testId);
    if (!metrics) return;

    // Update conversion rates and averages
    const results = this.results.get(testId) || [];
    const variantResults = results.filter(r => r.variant === variantId && r.metric === metric);
    
    if (variantResults.length > 0) {
      const average = variantResults.reduce((sum, r) => sum + r.value, 0) / variantResults.length;
      metrics.averageValues.set(variantId, average);
      
      // For binary metrics, calculate conversion rate
      if (metric.includes('conversion') || metric.includes('success')) {
        const conversions = variantResults.filter(r => r.value > 0).length;
        const rate = conversions / variantResults.length;
        metrics.conversionRates.set(variantId, rate);
      }
    }

    metrics.lastUpdated = new Date();
  }

  private async checkRollbackTriggers(testId: string): Promise<void> {
    const test = this.activeTests.get(testId);
    const metrics = this.metrics.get(testId);
    
    if (!test || !test.autoRollback.enabled || !metrics) return;

    const triggers = test.autoRollback.triggers;
    
    // Check error rate threshold
    for (const [variantId, errorRate] of metrics.errorRates) {
      if (errorRate > triggers.errorRateThreshold) {
        await this.triggerAutoRollback(testId, variantId, 'error_rate_exceeded');
        return;
      }
    }

    // Check performance degradation
    for (const [variantId, perfImpact] of metrics.performanceImpact) {
      if (perfImpact > triggers.performanceDegradation) {
        await this.triggerAutoRollback(testId, variantId, 'performance_degraded');
        return;
      }
    }
  }

  private async triggerAutoRollback(
    testId: string, 
    variantId: string, 
    reason: string
  ): Promise<void> {
    await this.auditLogger.log({
      event: 'ab_test_auto_rollback',
      testId,
      variantId,
      reason,
      timestamp: new Date()
    });

    // Stop the problematic variant by adjusting traffic to 0
    const test = this.activeTests.get(testId);
    if (test) {
      const variant = test.variants.find(v => v.id === variantId);
      if (variant) {
        variant.weight = 0;
        await this.monitoringService.recordEvent('ab_test_auto_rollback', {
          test_id: testId,
          variant_id: variantId,
          reason
        });
      }
    }
  }

  private generateRecommendation(
    analysis: any, 
    test: ABTestConfig
  ): 'continue' | 'stop_winner' | 'stop_loser' | 'inconclusive' {
    if (analysis.pValue < test.significanceLevel && analysis.power >= test.power) {
      return analysis.treatmentMean > analysis.controlMean ? 'stop_winner' : 'stop_loser';
    } else if (analysis.sampleSizeControl < test.minSampleSize || 
               analysis.sampleSizeTreatment < test.minSampleSize) {
      return 'continue';
    } else {
      return 'inconclusive';
    }
  }

  // Health check for service registry
  async healthCheck(): Promise<boolean> {
    try {
      // Verify core dependencies are available
      const deps = [
        this.configManager,
        this.auditLogger,
        this.monitoringService,
        this.statisticsEngine
      ];

      for (const dep of deps) {
        if (!dep) return false;
      }

      // Verify data structures are intact
      if (!(this.activeTests instanceof Map) || 
          !(this.assignments instanceof Map) || 
          !(this.results instanceof Map)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}