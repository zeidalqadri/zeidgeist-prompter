/**
 * Advanced prompt testing framework
 * Validates prompt outputs against predefined criteria and expectations
 */

import { MetricsCalculator, QualityMetrics, ComparisonMetrics } from './metrics-calculator';

export interface TestCriteria {
  minLength?: number;
  maxLength?: number;
  requiredPatterns?: RegExp[];
  forbiddenPatterns?: RegExp[];
  requiredSections?: string[];
  minQualityScore?: number;
  specificDomains?: string[];
  outputFormat?: 'text' | 'structured' | 'list' | 'json';
}

export interface TestResult {
  passed: boolean;
  score: number;
  criteria: TestCriteria;
  metrics: QualityMetrics;
  comparisonMetrics?: ComparisonMetrics;
  violations: TestViolation[];
  recommendations: string[];
  executionTime: number;
}

export interface TestViolation {
  type: 'length' | 'pattern' | 'section' | 'quality' | 'format' | 'domain';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  expectedValue?: string;
  actualValue?: string;
}

export interface TestSuite {
  name: string;
  description: string;
  tests: PromptTest[];
}

export interface PromptTest {
  name: string;
  description: string;
  inputPrompt: string;
  inputContext?: string;
  criteria: TestCriteria;
  expectedImprovements?: string[];
}

export class PromptTestRunner {
  private metricsCalculator: MetricsCalculator;

  constructor() {
    this.metricsCalculator = new MetricsCalculator();
  }

  /**
   * Run a single test on a prompt enhancement
   */
  async runTest(
    originalPrompt: string,
    enhancedPrompt: string,
    criteria: TestCriteria,
    context?: string
  ): Promise<TestResult> {
    const startTime = Date.now();
    
    const metrics = this.metricsCalculator.calculateMetrics(enhancedPrompt);
    const comparisonMetrics = this.metricsCalculator.comparePrompts(originalPrompt, enhancedPrompt);
    
    const violations = this.validateCriteria(enhancedPrompt, criteria, metrics);
    const passed = violations.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0;
    
    const score = this.calculateTestScore(metrics, violations, comparisonMetrics);
    const recommendations = this.generateTestRecommendations(violations, metrics);
    
    const executionTime = Date.now() - startTime;

    return {
      passed,
      score,
      criteria,
      metrics,
      comparisonMetrics,
      violations,
      recommendations,
      executionTime
    };
  }

  /**
   * Run a complete test suite
   */
  async runTestSuite(
    testSuite: TestSuite,
    enhancementFunction: (prompt: string, context?: string) => Promise<string>
  ): Promise<{ suite: TestSuite; results: TestResult[]; summary: TestSummary }> {
    const results: TestResult[] = [];
    
    for (const test of testSuite.tests) {
      try {
        const enhancedPrompt = await enhancementFunction(test.inputPrompt, test.inputContext);
        const result = await this.runTest(
          test.inputPrompt,
          enhancedPrompt,
          test.criteria,
          test.inputContext
        );
        results.push(result);
      } catch (error) {
        // Add failed test result
        results.push({
          passed: false,
          score: 0,
          criteria: test.criteria,
          metrics: this.metricsCalculator.calculateMetrics(''),
          violations: [{
            type: 'quality',
            severity: 'critical',
            message: `Test execution failed: ${error}`,
            actualValue: 'error'
          }],
          recommendations: ['Fix the enhancement function error'],
          executionTime: 0
        });
      }
    }

    const summary = this.generateTestSummary(results);
    
    return { suite: testSuite, results, summary };
  }

  /**
   * Create standard test suites for different domains
   */
  createStandardTestSuite(domain: 'web' | 'medical' | 'academic' | 'business' | 'general'): TestSuite {
    switch (domain) {
      case 'web':
        return this.createWebDevelopmentTestSuite();
      case 'medical':
        return this.createMedicalTestSuite();
      case 'academic':
        return this.createAcademicTestSuite();
      case 'business':
        return this.createBusinessTestSuite();
      default:
        return this.createGeneralTestSuite();
    }
  }

  private validateCriteria(prompt: string, criteria: TestCriteria, metrics: QualityMetrics): TestViolation[] {
    const violations: TestViolation[] = [];

    // Length validation
    if (criteria.minLength && prompt.length < criteria.minLength) {
      violations.push({
        type: 'length',
        severity: 'high',
        message: `Prompt too short (${prompt.length} chars, minimum ${criteria.minLength})`,
        expectedValue: `${criteria.minLength}+`,
        actualValue: `${prompt.length}`
      });
    }

    if (criteria.maxLength && prompt.length > criteria.maxLength) {
      violations.push({
        type: 'length',
        severity: 'medium',
        message: `Prompt too long (${prompt.length} chars, maximum ${criteria.maxLength})`,
        expectedValue: `${criteria.maxLength}-`,
        actualValue: `${prompt.length}`
      });
    }

    // Pattern validation
    if (criteria.requiredPatterns) {
      for (const pattern of criteria.requiredPatterns) {
        if (!pattern.test(prompt)) {
          violations.push({
            type: 'pattern',
            severity: 'high',
            message: `Required pattern not found: ${pattern.source}`,
            expectedValue: pattern.source,
            actualValue: 'missing'
          });
        }
      }
    }

    if (criteria.forbiddenPatterns) {
      for (const pattern of criteria.forbiddenPatterns) {
        if (pattern.test(prompt)) {
          violations.push({
            type: 'pattern',
            severity: 'medium',
            message: `Forbidden pattern found: ${pattern.source}`,
            expectedValue: 'absent',
            actualValue: 'present'
          });
        }
      }
    }

    // Section validation
    if (criteria.requiredSections) {
      for (const section of criteria.requiredSections) {
        if (!prompt.toLowerCase().includes(section.toLowerCase())) {
          violations.push({
            type: 'section',
            severity: 'high',
            message: `Required section missing: ${section}`,
            expectedValue: section,
            actualValue: 'missing'
          });
        }
      }
    }

    // Quality validation
    if (criteria.minQualityScore && metrics.overall < criteria.minQualityScore) {
      violations.push({
        type: 'quality',
        severity: 'critical',
        message: `Quality score too low (${metrics.overall.toFixed(2)}, minimum ${criteria.minQualityScore})`,
        expectedValue: `${criteria.minQualityScore}+`,
        actualValue: `${metrics.overall.toFixed(2)}`
      });
    }

    // Domain validation
    if (criteria.specificDomains) {
      const domainFound = criteria.specificDomains.some(domain => 
        prompt.toLowerCase().includes(domain.toLowerCase())
      );
      if (!domainFound) {
        violations.push({
          type: 'domain',
          severity: 'medium',
          message: `No domain-specific terms found from: ${criteria.specificDomains.join(', ')}`,
          expectedValue: criteria.specificDomains.join(' OR '),
          actualValue: 'none found'
        });
      }
    }

    return violations;
  }

  private calculateTestScore(
    metrics: QualityMetrics,
    violations: TestViolation[],
    comparisonMetrics: ComparisonMetrics
  ): number {
    let score = metrics.overall * 100;

    // Deduct points for violations
    violations.forEach(violation => {
      switch (violation.severity) {
        case 'critical': score -= 25; break;
        case 'high': score -= 15; break;
        case 'medium': score -= 10; break;
        case 'low': score -= 5; break;
      }
    });

    // Bonus for improvement
    score += comparisonMetrics.improvementScore;

    return Math.max(0, Math.min(100, score));
  }

  private generateTestRecommendations(violations: TestViolation[], metrics: QualityMetrics): string[] {
    const recommendations: string[] = [];

    violations.forEach(violation => {
      switch (violation.type) {
        case 'length':
          recommendations.push(violation.message.includes('too short') 
            ? 'Add more detailed instructions and context'
            : 'Simplify and make more concise');
          break;
        case 'pattern':
          recommendations.push(`Ensure the prompt includes: ${violation.expectedValue}`);
          break;
        case 'section':
          recommendations.push(`Add section about: ${violation.expectedValue}`);
          break;
        case 'quality':
          recommendations.push('Improve overall prompt quality with more specific details');
          break;
        case 'domain':
          recommendations.push(`Include domain-specific terminology: ${violation.expectedValue}`);
          break;
      }
    });

    // Add metrics-based recommendations
    if (metrics.clarity < 0.8) recommendations.push('Improve clarity with better structure');
    if (metrics.specificity < 0.8) recommendations.push('Add more specific requirements');
    if (metrics.actionability < 0.8) recommendations.push('Include more actionable instructions');

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private createWebDevelopmentTestSuite(): TestSuite {
    return {
      name: 'Web Development',
      description: 'Tests for web development related prompts',
      tests: [
        {
          name: 'Basic Website Prompt',
          description: 'Test enhancement of basic website creation prompts',
          inputPrompt: 'website for a doctor',
          criteria: {
            minLength: 100,
            requiredSections: ['services', 'contact', 'credentials'],
            specificDomains: ['website', 'professional', 'medical'],
            minQualityScore: 0.7
          }
        },
        {
          name: 'E-commerce Site',
          description: 'Test enhancement of e-commerce prompts',
          inputPrompt: 'online store for selling books',
          criteria: {
            minLength: 150,
            requiredSections: ['products', 'payment', 'shipping', 'search'],
            specificDomains: ['e-commerce', 'online', 'store'],
            minQualityScore: 0.8
          }
        }
      ]
    };
  }

  private createMedicalTestSuite(): TestSuite {
    return {
      name: 'Medical',
      description: 'Tests for medical and healthcare related prompts',
      tests: [
        {
          name: 'Healthcare Website',
          description: 'Test enhancement of medical website prompts',
          inputPrompt: 'website for a dental clinic',
          criteria: {
            minLength: 120,
            requiredSections: ['services', 'appointments', 'insurance'],
            specificDomains: ['dental', 'healthcare', 'medical', 'clinic'],
            minQualityScore: 0.8
          }
        }
      ]
    };
  }

  private createAcademicTestSuite(): TestSuite {
    return {
      name: 'Academic',
      description: 'Tests for academic and research related prompts',
      tests: [
        {
          name: 'Research Paper Prompt',
          description: 'Test enhancement of academic writing prompts',
          inputPrompt: 'write about climate change',
          criteria: {
            minLength: 100,
            requiredSections: ['research', 'analysis', 'sources'],
            specificDomains: ['academic', 'scholarly', 'research'],
            minQualityScore: 0.75
          }
        }
      ]
    };
  }

  private createBusinessTestSuite(): TestSuite {
    return {
      name: 'Business',
      description: 'Tests for business related prompts',
      tests: [
        {
          name: 'Business Plan Prompt',
          description: 'Test enhancement of business planning prompts',
          inputPrompt: 'business plan for a startup',
          criteria: {
            minLength: 150,
            requiredSections: ['market', 'strategy', 'financial', 'competition'],
            specificDomains: ['business', 'strategy', 'market'],
            minQualityScore: 0.8
          }
        }
      ]
    };
  }

  private createGeneralTestSuite(): TestSuite {
    return {
      name: 'General',
      description: 'General purpose tests for various prompt types',
      tests: [
        {
          name: 'Basic Enhancement',
          description: 'Test basic prompt enhancement capabilities',
          inputPrompt: 'help me with my project',
          criteria: {
            minLength: 50,
            minQualityScore: 0.6
          }
        }
      ]
    };
  }

  private generateTestSummary(results: TestResult[]): TestSummary {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / totalTests;
    const avgExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / totalTests;

    const violationsByType = results.reduce((acc, result) => {
      result.violations.forEach(v => {
        acc[v.type] = (acc[v.type] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      passRate: (passedTests / totalTests) * 100,
      avgScore,
      avgExecutionTime,
      violationsByType,
      recommendations: this.generateSuiteRecommendations(results)
    };
  }

  private generateSuiteRecommendations(results: TestResult[]): string[] {
    const allRecommendations = results.flatMap(r => r.recommendations);
    const recommendationCounts = allRecommendations.reduce((acc, rec) => {
      acc[rec] = (acc[rec] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(recommendationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([rec]) => rec);
  }
}

export interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
  avgScore: number;
  avgExecutionTime: number;
  violationsByType: Record<string, number>;
  recommendations: string[];
}