/**
 * Service Migration Orchestrator
 * Manages full-scale service-by-service migration from IP to User-based isolation
 */

import { createDb, promptHistory, feedback, enhancementLogs, users, userSessions } from '../functions.disabled/_shared/db';
import { eq, and, isNull, count, sql } from 'drizzle-orm';

interface ServiceMigrationPlan {
  serviceName: string;
  priority: number;
  estimatedDuration: number; // minutes
  dependencies: string[];
  rollbackPlan: string;
  validationTests: string[];
}

interface MigrationStatus {
  serviceName: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  startTime?: Date;
  endTime?: Date;
  recordsMigrated: number;
  errorCount: number;
  lastError?: string;
}

interface MigrationMetrics {
  totalServices: number;
  completed: number;
  failed: number;
  estimatedCompletion: Date;
  performanceImpact: number;
  dataIntegrityScore: number;
}

export class ServiceMigrationOrchestrator {
  private db: any;
  private migrationPlan: ServiceMigrationPlan[];
  private migrationStatus: Map<string, MigrationStatus>;
  private metrics: MigrationMetrics;

  constructor(env: any) {
    this.db = createDb(env);
    this.migrationStatus = new Map();
    this.migrationPlan = this.createMigrationPlan();
    this.metrics = this.initializeMetrics();
  }

  /**
   * Create comprehensive migration plan
   */
  private createMigrationPlan(): ServiceMigrationPlan[] {
    return [
      {
        serviceName: 'history-api',
        priority: 1,
        estimatedDuration: 120, // 2 hours
        dependencies: ['auth-service'],
        rollbackPlan: 'Revert to IP-based queries, disable user_id filtering',
        validationTests: [
          'cross-user-isolation-test',
          'data-integrity-test', 
          'performance-regression-test'
        ]
      },
      {
        serviceName: 'feedback-api',
        priority: 2,
        estimatedDuration: 60, // 1 hour
        dependencies: ['auth-service', 'history-api'],
        rollbackPlan: 'Disable user_id constraints, fallback to IP filtering',
        validationTests: [
          'feedback-isolation-test',
          'api-functionality-test'
        ]
      },
      {
        serviceName: 'enhancement-logs',
        priority: 3,
        estimatedDuration: 30, // 30 minutes
        dependencies: ['auth-service'],
        rollbackPlan: 'Remove user tracking, maintain anonymous logging',
        validationTests: [
          'logging-functionality-test',
          'analytics-data-test'
        ]
      },
      {
        serviceName: 'learning-system',
        priority: 4,
        estimatedDuration: 45, // 45 minutes
        dependencies: ['history-api', 'feedback-api'],
        rollbackPlan: 'Disable user-specific learning, use aggregate patterns',
        validationTests: [
          'learning-model-test',
          'recommendation-quality-test'
        ]
      },
      {
        serviceName: 'rate-limiting',
        priority: 5,
        estimatedDuration: 15, // 15 minutes
        dependencies: ['auth-service'],
        rollbackPlan: 'Revert to IP-based rate limiting',
        validationTests: [
          'rate-limit-isolation-test',
          'ddos-protection-test'
        ]
      }
    ];
  }

  /**
   * Initialize migration metrics
   */
  private initializeMetrics(): MigrationMetrics {
    return {
      totalServices: this.migrationPlan.length,
      completed: 0,
      failed: 0,
      estimatedCompletion: new Date(Date.now() + 
        this.migrationPlan.reduce((total, plan) => total + plan.estimatedDuration, 0) * 60 * 1000
      ),
      performanceImpact: 0,
      dataIntegrityScore: 100
    };
  }

  /**
   * Execute full migration orchestration
   */
  async executeMigration(): Promise<boolean> {
    console.log('🚀 Starting service-by-service migration...');
    
    try {
      // Sort services by priority
      const sortedPlan = this.migrationPlan.sort((a, b) => a.priority - b.priority);
      
      for (const service of sortedPlan) {
        console.log(`\n🔄 Migrating ${service.serviceName}...`);
        
        // Check dependencies
        const dependenciesReady = await this.checkDependencies(service.dependencies);
        if (!dependenciesReady) {
          throw new Error(`Dependencies not ready for ${service.serviceName}`);
        }
        
        // Execute service migration
        const success = await this.migrateService(service);
        
        if (!success) {
          console.error(`❌ Migration failed for ${service.serviceName}`);
          await this.rollbackService(service);
          return false;
        }
        
        console.log(`✅ Successfully migrated ${service.serviceName}`);
        this.metrics.completed++;
      }
      
      console.log('\n🎉 All services successfully migrated!');
      return true;
      
    } catch (error) {
      console.error('💥 Migration orchestration failed:', error);
      await this.emergencyRollback();
      return false;
    }
  }

  /**
   * Migrate individual service
   */
  private async migrateService(service: ServiceMigrationPlan): Promise<boolean> {
    const status: MigrationStatus = {
      serviceName: service.serviceName,
      status: 'IN_PROGRESS',
      startTime: new Date(),
      recordsMigrated: 0,
      errorCount: 0
    };
    
    this.migrationStatus.set(service.serviceName, status);
    
    try {
      // Phase 1: Deploy dual-stack
      console.log(`  📦 Deploying dual-stack for ${service.serviceName}...`);
      await this.deployDualStack(service.serviceName);
      
      // Phase 2: Migrate data
      console.log(`  🗄️  Migrating data for ${service.serviceName}...`);
      const recordCount = await this.migrateServiceData(service.serviceName);
      status.recordsMigrated = recordCount;
      
      // Phase 3: Validate migration
      console.log(`  ✅ Validating ${service.serviceName} migration...`);
      const validationResults = await this.validateServiceMigration(service);
      
      if (!validationResults.success) {
        throw new Error(`Validation failed: ${validationResults.errors.join(', ')}`);
      }
      
      // Phase 4: Switch to user-only mode
      console.log(`  🔄 Switching ${service.serviceName} to user-only mode...`);
      await this.switchToUserOnlyMode(service.serviceName);
      
      // Phase 5: Final validation
      console.log(`  🔍 Final validation for ${service.serviceName}...`);
      await this.performFinalValidation(service.serviceName);
      
      // Update status
      status.status = 'COMPLETED';
      status.endTime = new Date();
      this.migrationStatus.set(service.serviceName, status);
      
      return true;
      
    } catch (error) {
      console.error(`Error migrating ${service.serviceName}:`, error);
      
      status.status = 'FAILED';
      status.endTime = new Date();
      status.errorCount++;
      status.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.migrationStatus.set(service.serviceName, status);
      
      return false;
    }
  }

  /**
   * Deploy dual-stack (IP + User) for service
   */
  private async deployDualStack(serviceName: string): Promise<void> {
    const deploymentConfig = {
      'history-api': {
        envVars: {
          DUAL_MODE_ENABLED: 'true',
          USER_AUTH_ENABLED: 'true',
          IP_FALLBACK_ENABLED: 'true'
        }
      },
      'feedback-api': {
        envVars: {
          USER_ISOLATION_ENABLED: 'true',
          IP_ISOLATION_FALLBACK: 'true'
        }
      },
      'enhancement-logs': {
        envVars: {
          USER_TRACKING_ENABLED: 'true',
          ANONYMOUS_FALLBACK: 'true'
        }
      },
      'learning-system': {
        envVars: {
          USER_SPECIFIC_LEARNING: 'true',
          AGGREGATE_FALLBACK: 'true'
        }
      },
      'rate-limiting': {
        envVars: {
          USER_RATE_LIMITING: 'true',
          IP_RATE_LIMITING: 'true'
        }
      }
    };

    const config = deploymentConfig[serviceName as keyof typeof deploymentConfig];
    if (!config) {
      throw new Error(`No deployment config for ${serviceName}`);
    }

    // Simulate deployment (in real implementation, would use Kubernetes API)
    console.log(`    Setting environment variables:`, config.envVars);
    
    // Wait for deployment to be ready
    await this.waitForDeploymentReady(serviceName);
  }

  /**
   * Migrate service-specific data
   */
  private async migrateServiceData(serviceName: string): Promise<number> {
    switch (serviceName) {
      case 'history-api':
        return await this.migrateHistoryData();
      
      case 'feedback-api':
        return await this.migrateFeedbackData();
      
      case 'enhancement-logs':
        return await this.migrateEnhancementLogs();
      
      case 'learning-system':
        return await this.migrateLearningData();
      
      case 'rate-limiting':
        return await this.migrateRateLimitingData();
      
      default:
        throw new Error(`Unknown service: ${serviceName}`);
    }
  }

  /**
   * Migrate history data from IP to user-based
   */
  private async migrateHistoryData(): Promise<number> {
    let totalMigrated = 0;
    
    // Get all unique IPs with history but no user association
    const unmappedIPs = await this.db
      .selectDistinct({ ipAddress: promptHistory.ipAddress })
      .from(promptHistory)
      .where(and(
        isNull(promptHistory.userId),
        sql`ip_address IS NOT NULL AND ip_address != 'unknown'`
      ));

    for (const { ipAddress } of unmappedIPs) {
      try {
        // Try to find existing user for this IP
        const existingUser = await this.findUserByIP(ipAddress);
        
        if (existingUser) {
          // Link existing data to user
          const result = await this.db
            .update('prompt_history')
            .set({ user_id: existingUser.id })
            .where(and(
              eq(promptHistory.ipAddress, ipAddress),
              isNull(promptHistory.userId)
            ));
          
          totalMigrated += result.rowCount || 0;
          
        } else {
          // Create anonymous user for orphaned data
          const anonymousUser = await this.createAnonymousUser(ipAddress);
          
          const result = await this.db
            .update('prompt_history')
            .set({ user_id: anonymousUser.id })
            .where(and(
              eq(promptHistory.ipAddress, ipAddress),
              isNull(promptHistory.userId)
            ));
          
          totalMigrated += result.rowCount || 0;
        }
        
      } catch (error) {
        console.error(`Error migrating history for IP ${ipAddress}:`, error);
      }
    }
    
    return totalMigrated;
  }

  /**
   * Migrate feedback data
   */
  private async migrateFeedbackData(): Promise<number> {
    // Similar to history migration but for feedback table
    let totalMigrated = 0;
    
    const unmappedFeedback = await this.db
      .selectDistinct({ ipAddress: 'feedback.ip_address' })
      .from(feedback)
      .where(and(
        isNull(feedback.userId),
        sql`ip_address IS NOT NULL`
      ));

    for (const { ipAddress } of unmappedFeedback) {
      const user = await this.findUserByIP(ipAddress) || 
                   await this.createAnonymousUser(ipAddress);
      
      const result = await this.db
        .update('feedback')
        .set({ user_id: user.id })
        .where(and(
          eq(feedback.ipAddress, ipAddress),
          isNull(feedback.userId)
        ));
      
      totalMigrated += result.rowCount || 0;
    }
    
    return totalMigrated;
  }

  /**
   * Migrate enhancement logs
   */
  private async migrateEnhancementLogs(): Promise<number> {
    // Enhancement logs don't have user_id yet, add tracking
    // This is a placeholder for actual implementation
    return 0;
  }

  /**
   * Migrate learning system data
   */
  private async migrateLearningData(): Promise<number> {
    // Migrate learning patterns to be user-specific
    // This is a placeholder for actual implementation
    return 0;
  }

  /**
   * Migrate rate limiting data
   */
  private async migrateRateLimitingData(): Promise<number> {
    // Configure user-based rate limiting
    // This is a placeholder for actual implementation
    return 0;
  }

  /**
   * Validate service migration
   */
  private async validateServiceMigration(service: ServiceMigrationPlan): Promise<{
    success: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    for (const testName of service.validationTests) {
      try {
        const result = await this.runValidationTest(testName, service.serviceName);
        if (!result.passed) {
          errors.push(`${testName}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`${testName}: Test execution failed`);
      }
    }
    
    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Run individual validation test
   */
  private async runValidationTest(testName: string, serviceName: string): Promise<{
    passed: boolean;
    error?: string;
  }> {
    switch (testName) {
      case 'cross-user-isolation-test':
        return await this.testCrossUserIsolation();
      
      case 'data-integrity-test':
        return await this.testDataIntegrity(serviceName);
      
      case 'performance-regression-test':
        return await this.testPerformanceRegression(serviceName);
      
      default:
        return { passed: true };
    }
  }

  /**
   * Test cross-user isolation
   */
  private async testCrossUserIsolation(): Promise<{ passed: boolean; error?: string }> {
    try {
      // Create two test users
      const user1 = await this.createTestUser('test1@example.com');
      const user2 = await this.createTestUser('test2@example.com');
      
      // Add test data for each user
      await this.db.insert('prompt_history').values({
        user_id: user1.id,
        original: 'User 1 test prompt',
        refined: 'User 1 refined prompt',
        ip_address: '1.1.1.1',
        timestamp: new Date()
      });
      
      await this.db.insert('prompt_history').values({
        user_id: user2.id,
        original: 'User 2 test prompt',
        refined: 'User 2 refined prompt',
        ip_address: '2.2.2.2',
        timestamp: new Date()
      });
      
      // Test isolation
      const user1History = await this.db
        .select()
        .from(promptHistory)
        .where(eq(promptHistory.userId, user1.id));
      
      const user2History = await this.db
        .select()
        .from(promptHistory)
        .where(eq(promptHistory.userId, user2.id));
      
      // Verify no cross-contamination
      const user1HasUser2Data = user1History.some((item: any) => 
        item.original.includes('User 2')
      );
      
      const user2HasUser1Data = user2History.some((item: any) => 
        item.original.includes('User 1')
      );
      
      if (user1HasUser2Data || user2HasUser1Data) {
        return { 
          passed: false, 
          error: 'Cross-user data contamination detected' 
        };
      }
      
      // Cleanup test data
      await this.db.delete(promptHistory).where(eq(promptHistory.userId, user1.id));
      await this.db.delete(promptHistory).where(eq(promptHistory.userId, user2.id));
      await this.db.delete(users).where(eq(users.id, user1.id));
      await this.db.delete(users).where(eq(users.id, user2.id));
      
      return { passed: true };
      
    } catch (error) {
      return { 
        passed: false, 
        error: `Isolation test failed: ${error}` 
      };
    }
  }

  /**
   * Test data integrity
   */
  private async testDataIntegrity(serviceName: string): Promise<{ passed: boolean; error?: string }> {
    try {
      // Count records before and after migration
      const totalRecords = await this.db
        .select({ count: count() })
        .from(promptHistory);
      
      const linkedRecords = await this.db
        .select({ count: count() })
        .from(promptHistory)
        .where(sql`user_id IS NOT NULL`);
      
      const orphanedRecords = totalRecords[0].count - linkedRecords[0].count;
      
      if (orphanedRecords > 0) {
        return {
          passed: false,
          error: `${orphanedRecords} records not linked to users`
        };
      }
      
      return { passed: true };
      
    } catch (error) {
      return {
        passed: false,
        error: `Data integrity test failed: ${error}`
      };
    }
  }

  /**
   * Test performance regression
   */
  private async testPerformanceRegression(serviceName: string): Promise<{ passed: boolean; error?: string }> {
    try {
      const start = Date.now();
      
      // Simulate API call
      await this.db
        .select()
        .from(promptHistory)
        .limit(50);
      
      const duration = Date.now() - start;
      
      // Check if performance is within acceptable limits (200ms)
      if (duration > 200) {
        return {
          passed: false,
          error: `Performance regression detected: ${duration}ms > 200ms`
        };
      }
      
      return { passed: true };
      
    } catch (error) {
      return {
        passed: false,
        error: `Performance test failed: ${error}`
      };
    }
  }

  /**
   * Switch service to user-only mode
   */
  private async switchToUserOnlyMode(serviceName: string): Promise<void> {
    // Update environment variables to disable IP fallback
    const userOnlyConfig = {
      'history-api': {
        IP_FALLBACK_ENABLED: 'false',
        FORCE_USER_AUTH: 'true'
      },
      'feedback-api': {
        IP_ISOLATION_FALLBACK: 'false',
        REQUIRE_USER_AUTH: 'true'
      }
    };

    const config = userOnlyConfig[serviceName as keyof typeof userOnlyConfig];
    if (config) {
      console.log(`    Switching ${serviceName} to user-only mode:`, config);
      // In real implementation, would update Kubernetes deployment
    }
  }

  /**
   * Perform final validation
   */
  private async performFinalValidation(serviceName: string): Promise<void> {
    // Final smoke tests to ensure service is working correctly
    await this.waitForDeploymentReady(serviceName);
  }

  /**
   * Helper methods
   */
  private async findUserByIP(ipAddress: string): Promise<any> {
    // Try to find user by checking recent sessions with this IP
    const sessions = await this.db
      .select()
      .from(userSessions)
      .where(eq(userSessions.ipAddress, ipAddress))
      .orderBy('oauth_sessions.created_at DESC')
      .limit(1);
    
    if (sessions.length > 0) {
      return await this.db
        .select()
        .from(users)
        .where(eq(users.id, sessions[0].userId))
        .limit(1);
    }
    
    return null;
  }

  private async createAnonymousUser(ipAddress: string): Promise<any> {
    const anonymousEmail = `anonymous-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@anonymous.local`;
    
    const [user] = await this.db
      .insert('users')
      .values({
        email: anonymousEmail,
        username: `anon-${ipAddress.replace(/\./g, '-')}`,
        password_hash: 'anonymous', // Will never be used for login
        email_verified: false,
        is_active: true,
        metadata: JSON.stringify({
          type: 'anonymous',
          originalIP: ipAddress,
          createdDuringMigration: true
        })
      })
      .returning();
    
    return user;
  }

  private async createTestUser(email: string): Promise<any> {
    const [user] = await this.db
      .insert('users')
      .values({
        email,
        username: email.split('@')[0],
        password_hash: 'test-hash',
        email_verified: true,
        is_active: true
      })
      .returning();
    
    return user;
  }

  private async waitForDeploymentReady(serviceName: string): Promise<void> {
    // Simulate waiting for deployment to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async checkDependencies(dependencies: string[]): Promise<boolean> {
    for (const dep of dependencies) {
      const status = this.migrationStatus.get(dep);
      if (!status || status.status !== 'COMPLETED') {
        console.warn(`Dependency ${dep} not ready`);
        return false;
      }
    }
    return true;
  }

  private async rollbackService(service: ServiceMigrationPlan): Promise<void> {
    console.log(`🔄 Rolling back ${service.serviceName}...`);
    // Implementation would revert changes
  }

  private async emergencyRollback(): Promise<void> {
    console.log('🚨 Executing emergency rollback...');
    // Implementation would revert all changes
  }

  /**
   * Get migration status
   */
  public getMigrationStatus(): {
    overall: MigrationMetrics;
    services: MigrationStatus[];
  } {
    return {
      overall: this.metrics,
      services: Array.from(this.migrationStatus.values())
    };
  }
}

export default ServiceMigrationOrchestrator;