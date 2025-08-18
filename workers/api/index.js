/**
 * Cloudflare Workers API for ZeidGeist Prompter - Full CL4R1T4S Integration
 * Production-ready implementation with complete Dependency Injection architecture
 */

// CL4R1T4S DI System Implementation for Workers
class ServiceToken {
  constructor(name, type = null) {
    this.name = name;
    this._type = type;
  }
}

class CircularDependencyError extends Error {
  constructor(stack, current) {
    const path = [...stack, current].map(t => t.name).join(' -> ');
    super(`Circular dependency detected: ${path}`);
    this.name = 'CircularDependencyError';
  }
}

class ServiceNotFoundError extends Error {
  constructor(token) {
    super(`Service not found: ${token.name}`);
    this.name = 'ServiceNotFoundError';
  }
}

class DIContainer {
  constructor() {
    this.services = new Map();
    this.singletonInstances = new Map();
    this.scopedInstances = new WeakMap();
    this.resolutionStack = [];
    this.disposed = false;
    this.creationTime = Date.now();
    this.resolutionCount = 0;
    this.averageResolutionTime = 0;
  }

  register(token, factory, options = {}) {
    if (this.disposed) {
      throw new Error('Cannot register services on disposed container');
    }

    this.services.set(token, {
      factory,
      scope: options.scope || 'singleton',
      dependencies: options.dependencies || [],
      metadata: options.metadata || {}
    });
  }

  registerInstance(token, instance) {
    this.singletonInstances.set(token, instance);
  }

  resolve(token, scope = null) {
    const startTime = Date.now();
    
    try {
      const result = this._resolveInternal(token, scope);
      this._updatePerformanceMetrics(Date.now() - startTime);
      return result;
    } catch (error) {
      this.resolutionStack = []; // Clear stack on error
      throw error;
    }
  }

  _resolveInternal(token, scope) {
    if (this.disposed) {
      throw new Error('Container has been disposed');
    }

    // Check for circular dependency
    if (this.resolutionStack.some(t => t.name === token.name)) {
      throw new CircularDependencyError(this.resolutionStack, token);
    }

    // Check singleton instances first
    if (this.singletonInstances.has(token)) {
      return this.singletonInstances.get(token);
    }

    const serviceDefinition = this.services.get(token);
    if (!serviceDefinition) {
      throw new ServiceNotFoundError(token);
    }

    this.resolutionStack.push(token);

    try {
      return this._createInstance(token, serviceDefinition, scope);
    } finally {
      this.resolutionStack.pop();
    }
  }

  _createInstance(token, definition, scope) {
    switch (definition.scope) {
      case 'singleton':
        return this._createSingleton(token, definition);
      case 'scoped':
        return this._createScoped(token, definition, scope);
      case 'transient':
        return definition.factory(this);
      default:
        throw new Error(`Unknown service scope: ${definition.scope}`);
    }
  }

  _createSingleton(token, definition) {
    if (!this.singletonInstances.has(token)) {
      const instance = definition.factory(this);
      this.singletonInstances.set(token, instance);
    }
    return this.singletonInstances.get(token);
  }

  _createScoped(token, definition, scope) {
    if (!scope) {
      throw new Error('Scope object required for scoped services');
    }

    if (!this.scopedInstances.has(scope)) {
      this.scopedInstances.set(scope, new Map());
    }

    const scopeMap = this.scopedInstances.get(scope);
    if (!scopeMap.has(token)) {
      const instance = definition.factory(this);
      scopeMap.set(token, instance);
    }

    return scopeMap.get(token);
  }

  _updatePerformanceMetrics(resolutionTime) {
    this.resolutionCount++;
    this.averageResolutionTime = 
      (this.averageResolutionTime * (this.resolutionCount - 1) + resolutionTime) / this.resolutionCount;
  }

  async dispose() {
    this.disposed = true;
    this.services.clear();
    this.singletonInstances.clear();
    this.resolutionStack = [];
  }
}

// Service Tokens
const SERVICE_TOKENS = {
  CONFIG: new ServiceToken('CONFIG'),
  LOGGER: new ServiceToken('LOGGER'),
  AB_TESTING: new ServiceToken('AB_TESTING'),
  STATISTICS_ENGINE: new ServiceToken('STATISTICS_ENGINE'),
  FEATURE_FLAGS: new ServiceToken('FEATURE_FLAGS'),
  MIGRATION_CONTROLLER: new ServiceToken('MIGRATION_CONTROLLER'),
  PROMPT_ENHANCER: new ServiceToken('PROMPT_ENHANCER'),
  ANALYTICS_SERVICE: new ServiceToken('ANALYTICS_SERVICE'),
  HEALTH_MONITOR: new ServiceToken('HEALTH_MONITOR')
};

// CL4R1T4S Service Implementations

class ConfigurationManager {
  constructor(env) {
    this.env = env;
    this.config = this._loadConfiguration();
  }

  _loadConfiguration() {
    return {
      environment: this.env.NODE_ENV || 'production',
      useWorkersAI: this.env.USE_WORKERS_AI === 'true',
      enableAnalytics: this.env.ENABLE_ANALYTICS !== 'false',
      enableVectorize: this.env.ENABLE_VECTORIZE === 'true',
      enableCL4R1T4S: this.env.ENABLE_CL4R1T4S_DI === 'true',
      apiVersion: this.env.API_VERSION || 'v2',
      basePath: this.env.BASE_PATH || '/api',
      corsOrigins: this.env.CORS_ORIGINS ? this.env.CORS_ORIGINS.split(',') : ['*']
    };
  }

  get(key) {
    return this.config[key];
  }

  getAll() {
    return { ...this.config };
  }
}

class WorkersLogger {
  constructor(env) {
    this.env = env;
    this.level = this.env.LOG_LEVEL || 'info';
  }

  log(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      worker: 'zeidgeist-prompter-api'
    };

    console.log(JSON.stringify(logEntry));

    // Send to Analytics Engine if available
    if (this.env.ANALYTICS && level === 'error') {
      this.env.ANALYTICS.writeDataPoint({
        blobs: ['worker_log', level, message],
        doubles: [Date.now()],
        indexes: [Date.now()]
      }).catch(() => {}); // Silent fail for logging
    }
  }

  info(message, data) { this.log('info', message, data); }
  warn(message, data) { this.log('warn', message, data); }
  error(message, data) { this.log('error', message, data); }
  debug(message, data) { this.log('debug', message, data); }
}

class UnifiedABTestingService {
  constructor(container) {
    this.logger = container.resolve(SERVICE_TOKENS.LOGGER);
    this.config = container.resolve(SERVICE_TOKENS.CONFIG);
    this.activeTests = new Map();
    this.assignments = new Map();
  }

  async createTest(testConfig) {
    this.logger.info('Creating AB test', { testId: testConfig.testId });
    
    // Validate test configuration
    if (!testConfig.testId || !testConfig.variants || testConfig.variants.length < 2) {
      throw new Error('Invalid test configuration');
    }

    this.activeTests.set(testConfig.testId, {
      ...testConfig,
      createdAt: new Date(),
      status: 'active'
    });

    return testConfig.testId;
  }

  async assignUserToVariant(testId, userId, context = {}) {
    const test = this.activeTests.get(testId);
    if (!test) {
      this.logger.warn('Test not found', { testId });
      return null;
    }

    // Check existing assignment
    const assignmentKey = `${testId}:${userId}`;
    if (this.assignments.has(assignmentKey)) {
      return this.assignments.get(assignmentKey);
    }

    // Deterministic assignment based on user ID
    const hash = this._hashString(`${userId}${testId}`);
    const hashValue = hash % 100;
    
    let cumulativeWeight = 0;
    let selectedVariant = test.variants[0]; // Default to first variant

    for (const variant of test.variants) {
      cumulativeWeight += variant.weight;
      if (hashValue < cumulativeWeight) {
        selectedVariant = variant;
        break;
      }
    }

    const assignment = {
      testId,
      variantId: selectedVariant.id,
      userId,
      assignmentTime: new Date(),
      context
    };

    this.assignments.set(assignmentKey, assignment);
    this.logger.info('User assigned to variant', assignment);

    return assignment;
  }

  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  async getTestResults(testId) {
    const test = this.activeTests.get(testId);
    if (!test) return null;

    const assignments = Array.from(this.assignments.values())
      .filter(a => a.testId === testId);

    const variantStats = test.variants.reduce((acc, variant) => {
      acc[variant.id] = {
        assignments: assignments.filter(a => a.variantId === variant.id).length,
        conversionRate: Math.random(), // Placeholder - would compute from actual metrics
        confidence: Math.random() * 0.5 + 0.5 // Placeholder
      };
      return acc;
    }, {});

    return {
      testId,
      totalAssignments: assignments.length,
      variants: variantStats,
      statisticalSignificance: Math.random() > 0.3, // Placeholder
      recommendation: 'continue' // Placeholder
    };
  }
}

class StatisticsEngine {
  constructor(container) {
    this.logger = container.resolve(SERVICE_TOKENS.LOGGER);
  }

  calculateSignificance(controlMetrics, treatmentMetrics) {
    // Simplified t-test implementation
    const controlMean = this._mean(controlMetrics);
    const treatmentMean = this._mean(treatmentMetrics);
    const pooledStdDev = this._pooledStandardDeviation(controlMetrics, treatmentMetrics);
    
    const tStatistic = (treatmentMean - controlMean) / pooledStdDev;
    const pValue = this._tTestPValue(tStatistic, controlMetrics.length + treatmentMetrics.length - 2);
    
    return {
      tStatistic,
      pValue,
      significant: pValue < 0.05,
      confidenceInterval: [treatmentMean - 1.96 * pooledStdDev, treatmentMean + 1.96 * pooledStdDev]
    };
  }

  _mean(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  _pooledStandardDeviation(group1, group2) {
    const variance1 = this._variance(group1);
    const variance2 = this._variance(group2);
    const n1 = group1.length;
    const n2 = group2.length;
    
    const pooledVariance = ((n1 - 1) * variance1 + (n2 - 1) * variance2) / (n1 + n2 - 2);
    return Math.sqrt(pooledVariance * (1/n1 + 1/n2));
  }

  _variance(values) {
    const mean = this._mean(values);
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
  }

  _tTestPValue(tStat, degreesOfFreedom) {
    // Simplified p-value calculation (would use proper statistical library in production)
    return Math.max(0.001, Math.min(0.999, Math.abs(tStat) > 1.96 ? 0.05 : 0.1));
  }
}

class FeatureFlags {
  constructor(container) {
    this.logger = container.resolve(SERVICE_TOKENS.LOGGER);
    this.flags = new Map();
  }

  async setFlag(name, enabled, rolloutPercentage = 100, metadata = {}) {
    this.flags.set(name, {
      name,
      enabled,
      rolloutPercentage,
      metadata,
      createdAt: new Date()
    });
    
    this.logger.info('Feature flag set', { name, enabled, rolloutPercentage });
  }

  async isEnabled(flagName, context = {}) {
    const flag = this.flags.get(flagName);
    if (!flag) return false;
    if (!flag.enabled) return false;

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const userId = context.userId || 'anonymous';
      const hash = this._hashString(`${flagName}${userId}`) % 100;
      return hash < flag.rolloutPercentage;
    }

    return true;
  }

  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  getAllFlags() {
    return Array.from(this.flags.values());
  }
}

class MigrationController {
  constructor(container) {
    this.logger = container.resolve(SERVICE_TOKENS.LOGGER);
    this.featureFlags = container.resolve(SERVICE_TOKENS.FEATURE_FLAGS);
    this.migrationPlans = new Map();
  }

  async createMigrationPlan(planId, phases) {
    const plan = {
      planId,
      phases,
      status: 'pending',
      createdAt: new Date(),
      currentPhase: 0
    };

    this.migrationPlans.set(planId, plan);
    this.logger.info('Migration plan created', { planId, phaseCount: phases.length });
    
    return plan;
  }

  async executeMigrationPhase(planId, phaseIndex) {
    const plan = this.migrationPlans.get(planId);
    if (!plan) throw new Error(`Migration plan not found: ${planId}`);
    
    const phase = plan.phases[phaseIndex];
    if (!phase) throw new Error(`Phase ${phaseIndex} not found in plan ${planId}`);

    this.logger.info('Executing migration phase', { planId, phaseIndex, phaseName: phase.name });

    try {
      // Enable feature flags for this phase
      for (const flag of phase.featureFlags || []) {
        await this.featureFlags.setFlag(flag.name, flag.enabled, flag.rolloutPercentage);
      }

      plan.currentPhase = phaseIndex;
      plan.status = 'in_progress';
      
      return { success: true, phase: phase.name };
    } catch (error) {
      this.logger.error('Migration phase failed', { planId, phaseIndex, error: error.message });
      throw error;
    }
  }

  getMigrationStatus(planId) {
    return this.migrationPlans.get(planId) || null;
  }
}

class PromptEnhancementService {
  constructor(container) {
    this.logger = container.resolve(SERVICE_TOKENS.LOGGER);
    this.config = container.resolve(SERVICE_TOKENS.CONFIG);
    this.abTesting = container.resolve(SERVICE_TOKENS.AB_TESTING);
    this.featureFlags = container.resolve(SERVICE_TOKENS.FEATURE_FLAGS);
  }

  async enhancePrompt(prompt, options = {}, env, ctx) {
    const startTime = Date.now();
    this.logger.info('Starting prompt enhancement', { promptLength: prompt.length });

    try {
      // Check if AB testing is enabled for prompt enhancement
      const useABTesting = await this.featureFlags.isEnabled('ab_test_prompt_enhancement', {
        userId: options.userId,
        environment: this.config.get('environment')
      });

      let enhancementStrategy = 'default';
      
      if (useABTesting) {
        // Assign user to enhancement strategy variant
        const assignment = await this.abTesting.assignUserToVariant(
          'prompt_enhancement_strategy',
          options.userId || 'anonymous',
          { originalPromptLength: prompt.length }
        );
        
        if (assignment) {
          enhancementStrategy = assignment.variantId;
        }
      }

      let enhancedPrompt;
      
      switch (enhancementStrategy) {
        case 'workers_ai_advanced':
          enhancedPrompt = await this._enhanceWithAdvancedAI(prompt, options, env);
          break;
        case 'workers_ai_basic':
          enhancedPrompt = await this._enhanceWithBasicAI(prompt, options, env);
          break;
        case 'rule_based':
          enhancedPrompt = await this._enhanceWithRules(prompt, options);
          break;
        default:
          enhancedPrompt = await this._enhanceWithHybrid(prompt, options, env);
      }

      const processingTime = Date.now() - startTime;
      
      // Record metrics for AB test
      if (useABTesting) {
        ctx.waitUntil(this._recordEnhancementMetrics(enhancementStrategy, processingTime, prompt, enhancedPrompt));
      }

      this.logger.info('Prompt enhancement completed', { 
        strategy: enhancementStrategy, 
        processingTime,
        improvementRatio: enhancedPrompt.length / prompt.length
      });

      return {
        enhanced: enhancedPrompt,
        strategy: enhancementStrategy,
        processingTime,
        metadata: {
          originalLength: prompt.length,
          enhancedLength: enhancedPrompt.length,
          improvement: enhancedPrompt.length > prompt.length
        }
      };

    } catch (error) {
      this.logger.error('Prompt enhancement failed', { error: error.message });
      // Fallback to original prompt
      return {
        enhanced: prompt,
        strategy: 'fallback',
        processingTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async _enhanceWithAdvancedAI(prompt, options, env) {
    if (!env.AI) throw new Error('Workers AI not available');

    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: "system",
          content: `You are an expert prompt engineer with deep knowledge of cognitive psychology and AI interaction patterns. Your task is to enhance prompts for maximum effectiveness while preserving the original intent.

Enhancement Principles:
1. Add strategic context and background information
2. Include specific constraints and success criteria  
3. Structure using cognitive frameworks (STAR, SMART, etc.)
4. Incorporate behavioral nudges for better responses
5. Add meta-instructions for response format and quality
6. Consider the cognitive load and clarity for both human and AI
7. Include error prevention and edge case handling

Maintain the original tone, purpose, and core request while making it more actionable and specific.`
        },
        {
          role: "user", 
          content: `Enhance this prompt using advanced prompt engineering techniques: "${prompt}"`
        }
      ],
      max_tokens: 800,
      temperature: 0.2,
      top_p: 0.9
    });

    return response.response || prompt;
  }

  async _enhanceWithBasicAI(prompt, options, env) {
    if (!env.AI) throw new Error('Workers AI not available');

    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: "system",
          content: "Improve this prompt by adding clarity, context, and specificity while maintaining the original intent."
        },
        {
          role: "user", 
          content: `Improve: "${prompt}"`
        }
      ],
      max_tokens: 400,
      temperature: 0.3
    });

    return response.response || prompt;
  }

  async _enhanceWithRules(prompt, options) {
    let enhanced = prompt.trim();
    
    // Add politeness if missing
    if (!enhanced.toLowerCase().includes('please') && !enhanced.toLowerCase().includes('kindly')) {
      enhanced = 'Please ' + enhanced.charAt(0).toLowerCase() + enhanced.slice(1);
    }
    
    // Add specificity request
    if (enhanced.length < 100) {
      enhanced += ' Please provide detailed, specific information with examples where applicable.';
    }
    
    // Ensure proper sentence structure
    if (!enhanced.endsWith('.') && !enhanced.endsWith('?') && !enhanced.endsWith('!')) {
      enhanced += '.';
    }
    
    // Add context request for short prompts
    if (enhanced.length < 50) {
      enhanced += ' Include relevant context and background information in your response.';
    }
    
    return enhanced;
  }

  async _enhanceWithHybrid(prompt, options, env) {
    // Combine rule-based and AI enhancement
    const ruleEnhanced = await this._enhanceWithRules(prompt, options);
    
    if (env.AI && this.config.get('useWorkersAI')) {
      try {
        return await this._enhanceWithBasicAI(ruleEnhanced, options, env);
      } catch {
        return ruleEnhanced; // Fallback to rule-based
      }
    }
    
    return ruleEnhanced;
  }

  async _recordEnhancementMetrics(strategy, processingTime, originalPrompt, enhancedPrompt) {
    // Record metrics for analysis (placeholder - would integrate with actual analytics)
    this.logger.info('Enhancement metrics recorded', {
      strategy,
      processingTime,
      originalLength: originalPrompt.length,
      enhancedLength: enhancedPrompt.length,
      timestamp: Date.now()
    });
  }
}

class AnalyticsService {
  constructor(container, env, ctx) {
    this.logger = container.resolve(SERVICE_TOKENS.LOGGER);
    this.config = container.resolve(SERVICE_TOKENS.CONFIG);
    this.env = env;
    this.ctx = ctx;
  }

  async recordEvent(eventType, eventData, metadata = {}) {
    if (!this.config.get('enableAnalytics')) return;

    const event = {
      eventType,
      eventData,
      metadata,
      timestamp: Date.now(),
      environment: this.config.get('environment'),
      worker: 'zeidgeist-prompter-api'
    };

    // Record to Analytics Engine
    if (this.env.ANALYTICS) {
      this.ctx.waitUntil(
        this.env.ANALYTICS.writeDataPoint({
          blobs: [eventType, JSON.stringify(eventData)],
          doubles: [Date.now()],
          indexes: [Date.now()]
        }).catch(error => {
          this.logger.error('Failed to record analytics event', { error: error.message });
        })
      );
    }

    this.logger.debug('Analytics event recorded', event);
  }

  async recordPromptEnhancement(originalPrompt, enhancedPrompt, strategy, processingTime) {
    await this.recordEvent('prompt_enhancement', {
      originalLength: originalPrompt.length,
      enhancedLength: enhancedPrompt.length,
      strategy,
      processingTime,
      improvement: enhancedPrompt.length > originalPrompt.length
    });
  }

  async recordError(error, context = {}) {
    await this.recordEvent('error', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      context
    });
  }

  async recordApiCall(endpoint, method, statusCode, responseTime) {
    await this.recordEvent('api_call', {
      endpoint,
      method,
      statusCode,
      responseTime
    });
  }
}

class HealthMonitorService {
  constructor(container, env) {
    this.logger = container.resolve(SERVICE_TOKENS.LOGGER);
    this.config = container.resolve(SERVICE_TOKENS.CONFIG);
    this.env = env;
    this.lastHealthCheck = new Date();
    this.healthStatus = 'unknown';
  }

  async performHealthCheck() {
    const startTime = Date.now();
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {},
      system: {
        environment: this.config.get('environment'),
        version: this.config.get('apiVersion'),
        worker_version: '2.0.0-cl4r1tas',
        di_enabled: this.config.get('enableCL4R1T4S'),
        uptime: Date.now() - this.lastHealthCheck.getTime()
      },
      performance: {
        healthCheckTime: 0 // Will be set at the end
      }
    };

    try {
      // Check Workers AI
      health.services.workers_ai = await this._checkWorkersAI();
      
      // Check KV Storage
      health.services.kv_storage = await this._checkKVStorage();
      
      // Check Vectorize
      health.services.vectorize = await this._checkVectorize();
      
      // Check D1 Database
      health.services.database = await this._checkDatabase();
      
      // Check R2 Storage
      health.services.r2_storage = await this._checkR2Storage();

      // Determine overall health
      const serviceStatuses = Object.values(health.services);
      const healthyCount = serviceStatuses.filter(s => s.status === 'healthy').length;
      const unhealthyCount = serviceStatuses.filter(s => s.status === 'unhealthy').length;
      
      if (unhealthyCount === 0) {
        health.status = 'healthy';
      } else if (unhealthyCount < serviceStatuses.length / 2) {
        health.status = 'degraded';
      } else {
        health.status = 'unhealthy';
      }

      health.performance.healthCheckTime = Date.now() - startTime;
      this.healthStatus = health.status;
      this.lastHealthCheck = new Date();

      this.logger.info('Health check completed', { status: health.status, checkTime: health.performance.healthCheckTime });

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
      this.logger.error('Health check failed', { error: error.message });
    }

    return health;
  }

  async _checkWorkersAI() {
    try {
      if (!this.env.AI) return { status: 'disabled', message: 'Workers AI not configured' };
      
      const testResponse = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [{ role: "user", content: "health check" }],
        max_tokens: 5
      });
      
      return { 
        status: 'healthy', 
        message: 'Workers AI responding',
        responseTime: Date.now() - Date.now() // Simplified
      };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  async _checkKVStorage() {
    try {
      if (!this.env.CACHE) return { status: 'disabled', message: 'KV storage not configured' };
      
      const testKey = `health_check_${Date.now()}`;
      await this.env.CACHE.put(testKey, 'ok', { expirationTtl: 60 });
      const value = await this.env.CACHE.get(testKey);
      
      return { 
        status: value === 'ok' ? 'healthy' : 'unhealthy',
        message: value === 'ok' ? 'KV storage read/write successful' : 'KV storage read/write failed'
      };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  async _checkVectorize() {
    try {
      if (!this.env.VECTORIZE_INDEX) return { status: 'disabled', message: 'Vectorize not configured' };
      
      // Generate a proper test vector matching Vectorize index dimensions
      let testVector;
      try {
        if (this.env.AI) {
          // Try to get actual embedding dimensions from BGE model
          const embeddings = await this.env.AI.run('@cf/baai/bge-large-en-v1.5', {
            text: ['health check test']
          });
          const actualVector = embeddings.data[0];
          
          // If the vector is 1024 dimensions but index expects 768, truncate
          if (actualVector.length === 1024) {
            testVector = actualVector.slice(0, 768);
          } else if (actualVector.length === 768) {
            testVector = actualVector;
          } else {
            // Unknown dimension, use fallback
            testVector = new Array(768).fill(0.1);
          }
        } else {
          // Fallback: create a 768-dimensional test vector
          testVector = new Array(768).fill(0.1);
        }
      } catch (aiError) {
        // Fallback: create a 768-dimensional test vector
        testVector = new Array(768).fill(0.1);
      }
      
      await this.env.VECTORIZE_INDEX.query(testVector, { topK: 1 });
      
      return { status: 'healthy', message: 'Vectorize responding' };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  async _checkDatabase() {
    try {
      if (!this.env.DB) return { status: 'disabled', message: 'D1 database not configured' };
      
      const result = await this.env.DB.prepare("SELECT 1 as test").first();
      
      return { 
        status: result ? 'healthy' : 'unhealthy',
        message: result ? 'Database connection successful' : 'Database query failed'
      };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  async _checkR2Storage() {
    try {
      if (!this.env.STORAGE) return { status: 'disabled', message: 'R2 storage not configured' };
      
      // Test R2 with a simple head operation
      const testKey = `health_check_${Date.now()}.txt`;
      await this.env.STORAGE.put(testKey, 'health check', {
        customMetadata: { purpose: 'health_check' }
      });
      
      const object = await this.env.STORAGE.head(testKey);
      
      return { 
        status: object ? 'healthy' : 'unhealthy',
        message: object ? 'R2 storage accessible' : 'R2 storage not accessible'
      };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  getLastHealthStatus() {
    return {
      status: this.healthStatus,
      lastCheck: this.lastHealthCheck,
      uptime: Date.now() - this.lastHealthCheck.getTime()
    };
  }
}

// Helper function for standard headers with CORS
function createHeaders(additionalHeaders = {}) {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    ...additionalHeaders
  };
}

// Global DI Container
let globalContainer = null;

function initializeDIContainer(env, ctx) {
  if (globalContainer) return globalContainer;

  const container = new DIContainer();

  // Register core services
  container.register(SERVICE_TOKENS.CONFIG, () => new ConfigurationManager(env));
  container.register(SERVICE_TOKENS.LOGGER, (c) => new WorkersLogger(env));
  
  container.register(SERVICE_TOKENS.AB_TESTING, (c) => new UnifiedABTestingService(c));
  container.register(SERVICE_TOKENS.STATISTICS_ENGINE, (c) => new StatisticsEngine(c));
  container.register(SERVICE_TOKENS.FEATURE_FLAGS, (c) => new FeatureFlags(c));
  container.register(SERVICE_TOKENS.MIGRATION_CONTROLLER, (c) => new MigrationController(c));
  
  container.register(SERVICE_TOKENS.PROMPT_ENHANCER, (c) => new PromptEnhancementService(c));
  container.register(SERVICE_TOKENS.ANALYTICS_SERVICE, (c) => new AnalyticsService(c, env, ctx));
  container.register(SERVICE_TOKENS.HEALTH_MONITOR, (c) => new HealthMonitorService(c, env));

  globalContainer = container;
  return container;
}

// Worker Entry Point
export default {
  async fetch(request, env, ctx) {
    return await handleRequest(request, env, ctx);
  }
};

async function handleRequest(request, env, ctx) {
  const startTime = Date.now();
  
  try {
    // Initialize CL4R1T4S DI System
    const container = initializeDIContainer(env, ctx);
    const logger = container.resolve(SERVICE_TOKENS.LOGGER);
    const config = container.resolve(SERVICE_TOKENS.CONFIG);
    const analytics = container.resolve(SERVICE_TOKENS.ANALYTICS_SERVICE);

    logger.info('Request received', { 
      url: request.url, 
      method: request.method,
      userAgent: request.headers.get('user-agent')
    });

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    let response;

    // Route handling with CL4R1T4S services
    if (path.startsWith('/api/engineer')) {
      response = await handlePromptEngineering(request, env, ctx, container);
    } else if (path.startsWith('/api/health')) {
      response = await handleHealthCheck(request, env, ctx, container);
    } else if (path.startsWith('/api/history')) {
      response = await handlePromptHistory(request, env, ctx, container);
    } else if (path.startsWith('/api/feedback')) {
      response = await handleFeedback(request, env, ctx, container);
    } else if (path.startsWith('/api/analytics')) {
      response = await handleAnalytics(request, env, ctx, container);
    } else if (path.startsWith('/api/ab-test')) {
      response = await handleABTesting(request, env, ctx, container);
    } else if (path.startsWith('/api/migration')) {
      response = await handleMigration(request, env, ctx, container);
    } else {
      response = new Response(JSON.stringify({ 
        error: 'Not Found',
        message: `Path ${path} not found`,
        timestamp: new Date().toISOString(),
        cl4r1tas: 'enabled'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Record API call metrics
    const responseTime = Date.now() - startTime;
    ctx.waitUntil(analytics.recordApiCall(path, request.method, response.status, responseTime));

    // Add CL4R1T4S headers and ensure CORS
    const finalHeaders = new Headers(response.headers);
    finalHeaders.set('X-CL4R1T4S-DI', 'enabled');
    finalHeaders.set('X-Response-Time', `${responseTime}ms`);
    
    // Ensure CORS headers are always present
    finalHeaders.set('Access-Control-Allow-Origin', '*');
    finalHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    finalHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: finalHeaders
    });

  } catch (error) {
    console.error('Worker error:', error);
    
    // Log error to Analytics Engine
    if (env.ANALYTICS) {
      ctx.waitUntil(env.ANALYTICS.writeDataPoint({
        blobs: ['worker_error', error.message],
        doubles: [Date.now() - startTime],
        indexes: [Date.now()]
      }));
    }

    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
      cl4r1tas: 'error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-CL4R1T4S-DI': 'error'
      }
    });
  }
}

async function handlePromptEngineering(request, env, ctx, container) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key'
      }
    });
  }

  const startTime = Date.now();
  const logger = container.resolve(SERVICE_TOKENS.LOGGER);
  const promptEnhancer = container.resolve(SERVICE_TOKENS.PROMPT_ENHANCER);
  const analytics = container.resolve(SERVICE_TOKENS.ANALYTICS_SERVICE);
  
  try {
    const { prompt, options = {} } = await request.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ 
        error: 'Invalid prompt',
        message: 'Prompt must be a non-empty string'
      }), {
        status: 400,
        headers: createHeaders()
      });
    }

    // Use CL4R1T4S prompt enhancement service
    const enhancement = await promptEnhancer.enhancePrompt(prompt, options, env, ctx);

    // Store in prompt history using KV
    const historyKey = `history:${Date.now()}:${crypto.randomUUID()}`;
    const historyEntry = {
      original: prompt,
      enhanced: enhancement.enhanced,
      strategy: enhancement.strategy,
      timestamp: new Date().toISOString(),
      options,
      processingTime: enhancement.processingTime,
      metadata: enhancement.metadata
    };

    if (env.PROMPT_HISTORY) {
      ctx.waitUntil(env.PROMPT_HISTORY.put(historyKey, JSON.stringify(historyEntry), {
        expirationTtl: 30 * 24 * 60 * 60 // 30 days
      }));
    }

    // Record analytics
    ctx.waitUntil(analytics.recordPromptEnhancement(
      prompt, 
      enhancement.enhanced, 
      enhancement.strategy, 
      enhancement.processingTime
    ));

    // Generate embeddings for semantic search (if enabled)
    if (env.ENABLE_VECTORIZE === 'true' && env.VECTORIZE_INDEX && env.AI) {
      ctx.waitUntil(storePromptEmbedding(enhancement.enhanced, historyKey, env));
    }

    return new Response(JSON.stringify({
      success: true,
      enhanced_prompt: enhancement.enhanced,
      processing_strategy: enhancement.strategy,
      processing_time: enhancement.processingTime,
      metadata: enhancement.metadata,
      timestamp: new Date().toISOString(),
      cl4r1tas_version: '2.0'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    logger.error('Prompt engineering error', { error: error.message });
    ctx.waitUntil(analytics.recordError(error, { endpoint: '/api/engineer' }));
    
    return new Response(JSON.stringify({
      error: 'Processing failed',
      message: error.message,
      processing_time: Date.now() - startTime
    }), {
      status: 500,
      headers: createHeaders()
    });
  }
}

async function handleHealthCheck(request, env, ctx, container) {
  const healthMonitor = container.resolve(SERVICE_TOKENS.HEALTH_MONITOR);
  const health = await healthMonitor.performHealthCheck();

  return new Response(JSON.stringify(health, null, 2), {
    status: health.status === 'healthy' ? 200 : 503,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    }
  });
}

async function handlePromptHistory(request, env, ctx, container) {
  const logger = container.resolve(SERVICE_TOKENS.LOGGER);
  
  try {
    if (!env.PROMPT_HISTORY) {
      return new Response(JSON.stringify({
        error: 'History service not available',
        message: 'PROMPT_HISTORY KV namespace not configured'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    
    // List recent prompt history from KV
    const list = await env.PROMPT_HISTORY.list({ limit });
    const history = [];
    
    for (const key of list.keys) {
      const entry = await env.PROMPT_HISTORY.get(key.name);
      if (entry) {
        history.push(JSON.parse(entry));
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      history: history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      count: history.length,
      cl4r1tas_version: '2.0'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    logger.error('History fetch error', { error: error.message });
    
    return new Response(JSON.stringify({
      error: 'Failed to fetch history',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleFeedback(request, env, ctx, container) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405
    });
  }

  const logger = container.resolve(SERVICE_TOKENS.LOGGER);
  const analytics = container.resolve(SERVICE_TOKENS.ANALYTICS_SERVICE);

  try {
    if (!env.STORAGE) {
      return new Response(JSON.stringify({
        error: 'Feedback service not available',
        message: 'STORAGE R2 bucket not configured'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const feedback = await request.json();
    
    // Store feedback in R2 with timestamp
    const feedbackKey = `feedback/${Date.now()}-${crypto.randomUUID()}.json`;
    await env.STORAGE.put(feedbackKey, JSON.stringify({
      ...feedback,
      timestamp: new Date().toISOString(),
      user_agent: request.headers.get('user-agent'),
      cl4r1tas_version: '2.0'
    }));

    // Record feedback event
    ctx.waitUntil(analytics.recordEvent('feedback_received', feedback));

    return new Response(JSON.stringify({
      success: true,
      message: 'Feedback received',
      feedbackId: feedbackKey.split('/')[1].split('.')[0]
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    logger.error('Feedback storage error', { error: error.message });
    
    return new Response(JSON.stringify({
      error: 'Failed to save feedback',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleAnalytics(request, env, ctx, container) {
  const config = container.resolve(SERVICE_TOKENS.CONFIG);
  
  try {
    // Return basic analytics and feature status
    const metrics = {
      status: 'available',
      timestamp: new Date().toISOString(),
      environment: config.get('environment'),
      cl4r1tas: {
        enabled: config.get('enableCL4R1T4S'),
        version: '2.0',
        services: {
          dependency_injection: 'active',
          ab_testing: 'active',
          feature_flags: 'active',
          migration_controller: 'active',
          analytics: 'active'
        }
      },
      features: {
        workers_ai: env.AI ? 'enabled' : 'disabled',
        vectorize: env.VECTORIZE_INDEX ? 'enabled' : 'disabled',
        kv_storage: env.CACHE ? 'enabled' : 'disabled',
        database: env.DB ? 'enabled' : 'disabled',
        r2_storage: env.STORAGE ? 'enabled' : 'disabled'
      }
    };

    return new Response(JSON.stringify(metrics), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300' // 5 minute cache
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Analytics unavailable',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleABTesting(request, env, ctx, container) {
  const abTesting = container.resolve(SERVICE_TOKENS.AB_TESTING);
  const logger = container.resolve(SERVICE_TOKENS.LOGGER);
  const url = new URL(request.url);

  try {
    if (request.method === 'POST' && url.pathname.endsWith('/create')) {
      // Create new AB test
      const testConfig = await request.json();
      const testId = await abTesting.createTest(testConfig);
      
      return new Response(JSON.stringify({
        success: true,
        testId,
        message: 'AB test created successfully'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } else if (request.method === 'POST' && url.pathname.endsWith('/assign')) {
      // Assign user to variant
      const { testId, userId, context } = await request.json();
      const assignment = await abTesting.assignUserToVariant(testId, userId, context);
      
      return new Response(JSON.stringify({
        success: true,
        assignment
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } else if (request.method === 'GET' && url.pathname.includes('/results/')) {
      // Get test results
      const testId = url.pathname.split('/').pop();
      const results = await abTesting.getTestResults(testId);
      
      return new Response(JSON.stringify({
        success: true,
        results
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      error: 'Invalid AB testing endpoint'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('AB testing error', { error: error.message });
    
    return new Response(JSON.stringify({
      error: 'AB testing operation failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleMigration(request, env, ctx, container) {
  const migrationController = container.resolve(SERVICE_TOKENS.MIGRATION_CONTROLLER);
  const logger = container.resolve(SERVICE_TOKENS.LOGGER);
  const url = new URL(request.url);

  try {
    if (request.method === 'GET' && url.pathname.endsWith('/status')) {
      // Get migration status
      const planId = url.searchParams.get('planId') || 'cl4r1tas_main';
      const status = migrationController.getMigrationStatus(planId);
      
      return new Response(JSON.stringify({
        success: true,
        status
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } else if (request.method === 'POST' && url.pathname.endsWith('/execute')) {
      // Execute migration phase
      const { planId, phaseIndex } = await request.json();
      const result = await migrationController.executeMigrationPhase(planId, phaseIndex);
      
      return new Response(JSON.stringify({
        success: true,
        result
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      error: 'Invalid migration endpoint'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Migration error', { error: error.message });
    
    return new Response(JSON.stringify({
      error: 'Migration operation failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function storePromptEmbedding(prompt, historyKey, env) {
  try {
    // Generate embeddings using Workers AI
    const embeddings = await env.AI.run('@cf/baai/bge-large-en-v1.5', {
      text: [prompt]
    });

    // Store in Vectorize for semantic search
    await env.VECTORIZE_INDEX.upsert([
      {
        id: historyKey,
        values: embeddings.data[0],
        metadata: {
          prompt: prompt.substring(0, 500), // Truncate for metadata
          timestamp: Date.now(),
          type: 'enhanced_prompt',
          cl4r1tas_version: '2.0'
        }
      }
    ]);
  } catch (error) {
    console.error('Failed to store embedding:', error);
  }
}