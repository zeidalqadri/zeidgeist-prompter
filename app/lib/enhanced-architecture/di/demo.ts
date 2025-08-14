/**
 * CL4R1T4S DI System Demonstration
 * Shows how to use the new dependency injection architecture
 * Run this to see the system in action: npm run demo
 */

import CL4R1TAS, { 
  initializeCL4R1TAS, 
  getService, 
  migrateFromSingleton,
  SERVICE_TOKENS 
} from './index';

import type { 
  UnifiedABTestingService,
  FeatureFlags, 
  MigrationController,
  ABTestConfig 
} from './index';

async function demonstrateCL4R1TAS() {
  console.log('🎯 CL4R1T4S Dependency Injection System Demo');
  console.log('='.repeat(50));

  try {
    // Initialize the system
    const registry = await initializeCL4R1TAS();

    // Demo 1: Feature Flags System
    console.log('\n📋 Demo 1: Feature Flag System');
    console.log('-'.repeat(30));
    
    const featureFlags = getService<FeatureFlags>('FEATURE_FLAGS');
    
    // Set up a feature flag for AB testing migration
    await featureFlags.setFlag('new_ab_testing_engine', true, 50, {
      description: 'Gradual rollout of unified AB testing service',
      category: 'migration',
      owner: 'engineering-team',
      riskLevel: 'medium'
    });

    // Test flag evaluation with different contexts
    const contexts = [
      { userId: 'user123', environment: 'production' },
      { userId: 'user456', environment: 'production' },
      { sessionId: 'session789', environment: 'staging' }
    ];

    for (const context of contexts) {
      const enabled = await featureFlags.isEnabled('new_ab_testing_engine', context);
      console.log(`  User ${context.userId || context.sessionId}: ${enabled ? '✅ Enabled' : '❌ Disabled'}`);
    }

    // Demo 2: Unified AB Testing Service
    console.log('\n🧪 Demo 2: Unified AB Testing Service');
    console.log('-'.repeat(30));
    
    const abTesting = getService<UnifiedABTestingService>('AB_TESTING');
    
    // Create a sample AB test
    const testConfig: ABTestConfig = {
      testId: 'prompt_optimization_test',
      name: 'Prompt Optimization Test',
      description: 'Test different prompt optimization strategies',
      variants: [
        { id: 'control', name: 'Current System', weight: 50, config: { strategy: 'current' }, isControl: true },
        { id: 'treatment', name: 'Enhanced System', weight: 50, config: { strategy: 'enhanced' }, isControl: false }
      ],
      trafficAllocation: 1.0, // 100% of users
      targetMetrics: ['conversion_rate', 'response_quality', 'latency'],
      minSampleSize: 100,
      significanceLevel: 0.05,
      power: 0.8,
      phase: 'phase2',
      environment: 'production',
      startDate: new Date(),
      autoRollback: {
        enabled: true,
        triggers: {
          errorRateThreshold: 0.05,
          performanceDegradation: 200,
          negativeMetricThreshold: -0.10
        },
        cooldownPeriod: 30
      }
    };

    await abTesting.startTest(testConfig);
    console.log('  ✅ AB test started:', testConfig.name);

    // Assign users to test variants
    const testUsers = ['user001', 'user002', 'user003', 'user004', 'user005'];
    for (const userId of testUsers) {
      const assignment = abTesting.assignUserToTest(testConfig.testId, userId, { 
        sessionId: `session_${userId}`,
        source: 'demo'
      });
      if (assignment) {
        console.log(`  👤 ${userId} assigned to: ${assignment.variantId}`);
        
        // Simulate some test results
        const conversionRate = Math.random() * 0.3 + 0.1; // 10-40% conversion
        const responseQuality = Math.random() * 40 + 60; // 60-100 quality score
        const latency = Math.random() * 100 + 50; // 50-150ms latency
        
        await abTesting.recordResult(testConfig.testId, userId, 'conversion_rate', conversionRate);
        await abTesting.recordResult(testConfig.testId, userId, 'response_quality', responseQuality);
        await abTesting.recordResult(testConfig.testId, userId, 'latency', latency);
      }
    }

    // Get test metrics
    const testMetrics = abTesting.getTestMetrics(testConfig.testId);
    if (testMetrics) {
      console.log('  📊 Test Metrics:');
      console.log(`    Total participants: ${testMetrics.totalParticipants}`);
      console.log(`    Control participants: ${testMetrics.variantParticipants.get('control') || 0}`);
      console.log(`    Treatment participants: ${testMetrics.variantParticipants.get('treatment') || 0}`);
    }

    // Demo 3: Migration System
    console.log('\n🔄 Demo 3: Migration System');
    console.log('-'.repeat(30));
    
    const migrationController = getService<MigrationController>('MIGRATION_CONTROLLER');
    
    // List available migration plans
    const migrationPlans = migrationController.getMigrationPlans();
    console.log(`  📋 Available migration plans: ${migrationPlans.length}`);
    
    for (const plan of migrationPlans) {
      console.log(`    • ${plan.name} (${plan.riskLevel} risk, ~${plan.estimatedDuration}min)`);
    }

    // Simulate starting a migration (dry run)
    if (migrationPlans.length > 0) {
      const plan = migrationPlans[0];
      console.log(`  🚀 Starting migration: ${plan.name} (dry run)`);
      
      const migrationId = await migrationController.startMigration(plan.id, { dryRun: true });
      console.log(`    Migration ID: ${migrationId}`);
      
      // Check status periodically
      setTimeout(async () => {
        const status = migrationController.getMigrationStatus(migrationId);
        if (status) {
          console.log(`    Status: ${status.status} (${status.progress}% complete)`);
        }
      }, 1000);
    }

    // Demo 4: Service Health Monitoring
    console.log('\n💓 Demo 4: Service Health Monitoring');
    console.log('-'.repeat(30));
    
    const healthStatuses = await registry.getServiceHealth();
    const healthArray = Array.isArray(healthStatuses) ? healthStatuses : [healthStatuses];
    
    for (const health of healthArray) {
      const statusIcon = health.status === 'healthy' ? '✅' : 
                        health.status === 'unhealthy' ? '❌' : 
                        health.status === 'degraded' ? '⚠️' : '❓';
      
      console.log(`  ${statusIcon} ${health.serviceName}: ${health.status} (${health.responseTime.toFixed(2)}ms)`);
    }

    // Demo 5: Performance Metrics
    console.log('\n📈 Demo 5: System Performance Metrics');  
    console.log('-'.repeat(30));
    
    const systemMetrics = registry.getMetrics();
    console.log('  🔧 System Metrics:');
    console.log(`    Total Services: ${systemMetrics.totalServices}`);
    console.log(`    Healthy Services: ${systemMetrics.healthyServices}/${systemMetrics.totalServices}`);
    console.log(`    Average Response Time: ${systemMetrics.averageResponseTime.toFixed(2)}ms`);
    console.log(`    Total Resolutions: ${systemMetrics.totalResolutions}`);
    console.log(`    Memory Usage: ${(systemMetrics.memoryUsage / 1024).toFixed(2)} KB`);
    console.log(`    Uptime: ${(systemMetrics.uptime / 1000).toFixed(1)} seconds`);

    // Demo 6: Legacy Migration Pattern
    console.log('\n🔀 Demo 6: Legacy Migration Pattern');
    console.log('-'.repeat(30));
    
    // Show how to gradually migrate from singleton to DI
    console.log('  Demonstrating gradual migration from singleton pattern...');
    
    // Simulate legacy singleton class
    class LegacyABTestingService {
      private static instance: LegacyABTestingService;
      static getInstance() {
        if (!this.instance) {
          this.instance = new LegacyABTestingService();
        }
        return this.instance;
      }
      
      getName() {
        return 'Legacy AB Testing Service';
      }
    }

    // Use migration helper to gradually switch
    const service = await migrateFromSingleton<UnifiedABTestingService>(
      LegacyABTestingService,
      'AB_TESTING',
      { userId: 'demo_user' }
    );

    console.log(`  📦 Service resolved: ${service.constructor.name}`);
    console.log('  🎉 Migration pattern working correctly!');

    // Demo 7: Service Dependency Graph
    console.log('\n🕸️  Demo 7: Service Dependency Graph');
    console.log('-'.repeat(30));
    
    const dependencyGraph = registry.getServiceDependencyGraph();
    console.log(`  📊 Service Graph: ${dependencyGraph.nodes.length} services, ${dependencyGraph.edges.length} dependencies`);
    
    for (const node of dependencyGraph.nodes) {
      const dependencies = dependencyGraph.edges
        .filter(edge => edge.to === node.id)
        .map(edge => edge.from);
      
      if (dependencies.length > 0) {
        console.log(`    ${node.id} depends on: ${dependencies.join(', ')}`);
      }
    }

    console.log('\n🎉 Demo completed successfully!');
    console.log('='.repeat(50));
    
    // Clean up test
    await abTesting.stopTest(testConfig.testId, 'demo_completed');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run demo if this file is executed directly
if (require.main === module) {
  demonstrateCL4R1TAS().catch(console.error);
}

export default demonstrateCL4R1TAS;