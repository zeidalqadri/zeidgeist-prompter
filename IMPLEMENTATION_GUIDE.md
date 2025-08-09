# Prompt System Implementation Guide

## Quick Start Integration

This guide provides step-by-step instructions for integrating the enhanced prompt system into the existing codebase.

## 1. Migration Path

### Phase 1: Non-Breaking Integration (Week 1)

#### Step 1.1: Install Enhanced Prompts Alongside Existing System

```typescript
// app/lib/llm-enhancer-v2.ts
import { 
  CHAIN_OF_THOUGHT_ENHANCEMENT_PROMPT,
  ITERATIVE_REFINEMENT_PROMPT 
} from '../../prompts/enhanced-system-prompts';
import { PromptManager } from '../../prompts/prompt-manager';

// Add feature flag for gradual rollout
const USE_ENHANCED_PROMPTS = process.env.USE_ENHANCED_PROMPTS === 'true';

export async function enhancePrompt(
  rawPrompt: string,
  context: string = "",
  isRefinement: boolean = false
): Promise<string> {
  if (USE_ENHANCED_PROMPTS) {
    // Use new system
    const manager = new PromptManager();
    const result = await manager.enhance(rawPrompt, {
      useChainOfThought: true,
      validateSafety: true,
      domain: detectDomain(rawPrompt)
    });
    return result.enhanced;
  }
  
  // Fall back to existing implementation
  return existingEnhancePrompt(rawPrompt, context, isRefinement);
}
```

#### Step 1.2: Add A/B Testing Capability

```typescript
// app/lib/ab-testing.ts
export class ABTestManager {
  private readonly testAllocation = 0.2; // 20% get new system
  
  shouldUseNewSystem(userId?: string): boolean {
    if (!userId) {
      return Math.random() < this.testAllocation;
    }
    
    // Consistent assignment based on user ID
    const hash = this.hashUserId(userId);
    return (hash % 100) < (this.testAllocation * 100);
  }
  
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
```

### Phase 2: Quality Monitoring (Week 2)

#### Step 2.1: Implement Metrics Collection

```typescript
// app/lib/metrics-collector.ts
import { MetricsCalculator } from '../../prompts/prompt-manager';

export class EnhancementMetricsCollector {
  private calculator = new MetricsCalculator();
  
  async collectMetrics(
    original: string,
    enhanced: string,
    source: 'old' | 'new'
  ): Promise<void> {
    const comparison = this.calculator.compare(original, enhanced);
    
    // Log to analytics
    await this.logToAnalytics({
      timestamp: new Date(),
      source,
      improvement: comparison.improvement,
      metrics: comparison.metrics,
      originalLength: original.length,
      enhancedLength: enhanced.length
    });
    
    // Store for learning
    if (comparison.improvement > 30) {
      await this.storeHighQualityExample(original, enhanced);
    }
  }
  
  private async logToAnalytics(data: any): Promise<void> {
    // Send to your analytics service
    console.log('Enhancement metrics:', data);
  }
  
  private async storeHighQualityExample(
    original: string,
    enhanced: string
  ): Promise<void> {
    // Store in database for training
  }
}
```

#### Step 2.2: Add Dashboard for Monitoring

```typescript
// components/metrics-dashboard.tsx
import { useEffect, useState } from 'react';

export function MetricsDashboard() {
  const [metrics, setMetrics] = useState({
    oldSystem: { avgImprovement: 0, count: 0 },
    newSystem: { avgImprovement: 0, count: 0 }
  });
  
  useEffect(() => {
    // Fetch metrics from API
    fetchMetrics().then(setMetrics);
  }, []);
  
  return (
    <div className="metrics-dashboard">
      <h2>Enhancement System Performance</h2>
      <div className="comparison">
        <div>
          <h3>Current System</h3>
          <p>Avg Improvement: {metrics.oldSystem.avgImprovement}%</p>
          <p>Enhancements: {metrics.oldSystem.count}</p>
        </div>
        <div>
          <h3>New System</h3>
          <p>Avg Improvement: {metrics.newSystem.avgImprovement}%</p>
          <p>Enhancements: {metrics.newSystem.count}</p>
        </div>
      </div>
    </div>
  );
}
```

### Phase 3: Testing Framework (Week 3)

#### Step 3.1: Create Test Suite

```typescript
// tests/prompt-enhancement.test.ts
import { PromptTestRunner } from '../prompts/prompt-manager';

describe('Prompt Enhancement Tests', () => {
  const runner = new PromptTestRunner();
  
  beforeAll(() => {
    // Add standard tests
    runner.addTest({
      name: 'Basic Enhancement',
      description: 'Should enhance simple prompts',
      input: 'Write about dogs',
      expectations: {
        minLength: 100,
        minQualityScore: 70,
        requiredPatterns: [/specific|detail|comprehensive/i]
      }
    });
    
    runner.addTest({
      name: 'Technical Enhancement',
      description: 'Should handle technical prompts',
      input: 'Create API endpoint',
      expectations: {
        minQualityScore: 75,
        requiredSections: ['method', 'parameters', 'response'],
        requiredPatterns: [/HTTP|REST|endpoint/i]
      }
    });
  });
  
  test('should pass all enhancement tests', async () => {
    const testCases = [
      'Write about dogs',
      'Create API endpoint',
      'Design website for restaurant'
    ];
    
    for (const input of testCases) {
      const enhanced = await enhancePrompt(input);
      const results = await runner.runAllTests(enhanced);
      
      expect(results.passed).toBe(true);
      
      if (!results.passed) {
        console.log('Failed tests:', results.testResults);
      }
    }
  });
});
```

#### Step 3.2: Add Regression Testing

```typescript
// tests/regression.test.ts
import fs from 'fs';

describe('Regression Tests', () => {
  const goldenExamples = JSON.parse(
    fs.readFileSync('tests/golden-examples.json', 'utf-8')
  );
  
  test('should maintain quality on golden examples', async () => {
    for (const example of goldenExamples) {
      const enhanced = await enhancePrompt(example.input);
      const metrics = calculateMetrics(enhanced);
      
      // Ensure quality doesn't degrade
      expect(metrics.overall).toBeGreaterThanOrEqual(
        example.minQuality
      );
      
      // Check for required elements
      for (const required of example.requiredElements) {
        expect(enhanced.toLowerCase()).toContain(required.toLowerCase());
      }
    }
  });
});
```

### Phase 4: Full Migration (Week 4)

#### Step 4.1: Update API Endpoints

```typescript
// functions/api/engineer.ts
import { promptManager } from '../../prompts/prompt-manager';

export async function onRequestPost({ request, env }: RequestContext) {
  const { prompt, context, options } = await request.json();
  
  try {
    // Use new prompt manager
    const result = await promptManager.enhance(prompt, {
      domain: options?.domain,
      useChainOfThought: true,
      validateSafety: true,
      runTests: env.RUN_TESTS === 'true',
      generateVariations: options?.variations
    });
    
    // Return enhanced result with metadata
    return new Response(JSON.stringify({
      enhanced: result.enhanced,
      metrics: result.metrics,
      safety: result.safety,
      variations: result.variations
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // Fallback to simple enhancement
    const fallback = await basicEnhance(prompt);
    return new Response(JSON.stringify({
      enhanced: fallback,
      error: 'Advanced enhancement failed, using fallback'
    }));
  }
}
```

#### Step 4.2: Update UI Components

```typescript
// components/prompt-engineer.tsx
import { useState } from 'react';
import { promptManager } from '../prompts/prompt-manager';

export function PromptEngineer() {
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [options, setOptions] = useState({
    domain: undefined,
    useChainOfThought: true,
    validateSafety: true,
    showMetrics: false
  });
  
  const handleEnhance = async () => {
    const result = await promptManager.enhance(input, options);
    
    setEnhanced(result.enhanced);
    
    if (options.showMetrics) {
      setMetrics(result.metrics);
    }
    
    if (result.safety && !result.safety.safe) {
      showSafetyWarning(result.safety.issues);
    }
  };
  
  return (
    <div>
      {/* Existing UI */}
      
      {showAdvancedOptions && (
        <AdvancedOptions 
          options={options}
          onChange={setOptions}
        />
      )}
      
      {metrics && <MetricsDisplay metrics={metrics} />}
    </div>
  );
}
```

## 2. Configuration Management

### Environment Variables

```bash
# .env.local
USE_ENHANCED_PROMPTS=true
ENABLE_CHAIN_OF_THOUGHT=true
ENABLE_SAFETY_VALIDATION=true
RUN_PROMPT_TESTS=true
AB_TEST_PERCENTAGE=20
METRICS_COLLECTION=true
```

### Feature Flags

```typescript
// config/features.ts
export const features = {
  enhancedPrompts: {
    enabled: process.env.USE_ENHANCED_PROMPTS === 'true',
    chainOfThought: process.env.ENABLE_CHAIN_OF_THOUGHT === 'true',
    safetyValidation: process.env.ENABLE_SAFETY_VALIDATION === 'true',
    testing: process.env.RUN_PROMPT_TESTS === 'true'
  },
  
  abTesting: {
    enabled: true,
    percentage: parseInt(process.env.AB_TEST_PERCENTAGE || '20')
  },
  
  metrics: {
    enabled: process.env.METRICS_COLLECTION === 'true',
    dashboardEnabled: true
  }
};
```

## 3. Database Schema Updates

```sql
-- Add tables for enhanced prompt system
CREATE TABLE prompt_versions (
  id TEXT PRIMARY KEY,
  prompt_id TEXT NOT NULL,
  version TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE enhancement_metrics (
  id SERIAL PRIMARY KEY,
  original_prompt TEXT NOT NULL,
  enhanced_prompt TEXT NOT NULL,
  metrics JSONB NOT NULL,
  source TEXT NOT NULL,
  user_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prompt_tests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  expectations JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE test_results (
  id SERIAL PRIMARY KEY,
  test_id TEXT REFERENCES prompt_tests(id),
  prompt TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_metrics_created_at ON enhancement_metrics(created_at);
CREATE INDEX idx_metrics_source ON enhancement_metrics(source);
CREATE INDEX idx_test_results_test_id ON test_results(test_id);
```

## 4. Monitoring Setup

### Prometheus Metrics

```typescript
// monitoring/metrics.ts
import { Counter, Histogram, register } from 'prom-client';

export const enhancementCounter = new Counter({
  name: 'prompt_enhancements_total',
  help: 'Total number of prompt enhancements',
  labelNames: ['source', 'domain']
});

export const enhancementDuration = new Histogram({
  name: 'prompt_enhancement_duration_seconds',
  help: 'Duration of prompt enhancement',
  labelNames: ['source'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

export const qualityScore = new Histogram({
  name: 'prompt_quality_score',
  help: 'Quality score of enhanced prompts',
  labelNames: ['source', 'domain'],
  buckets: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
});

register.registerMetric(enhancementCounter);
register.registerMetric(enhancementDuration);
register.registerMetric(qualityScore);
```

### Grafana Dashboard Config

```json
{
  "dashboard": {
    "title": "Prompt Enhancement System",
    "panels": [
      {
        "title": "Enhancement Rate",
        "targets": [
          {
            "expr": "rate(prompt_enhancements_total[5m])"
          }
        ]
      },
      {
        "title": "Quality Score Distribution",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, prompt_quality_score)"
          }
        ]
      },
      {
        "title": "Enhancement Duration",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, prompt_enhancement_duration_seconds)"
          }
        ]
      }
    ]
  }
}
```

## 5. Rollback Plan

### Quick Rollback

```bash
# Disable enhanced system immediately
export USE_ENHANCED_PROMPTS=false

# Restart services
npm run restart
```

### Database Rollback

```sql
-- Keep data but disable new system
UPDATE feature_flags 
SET enabled = false 
WHERE feature_name = 'enhanced_prompts';

-- If needed, restore from backup
-- pg_restore -d prompter backup_before_migration.sql
```

### Code Rollback

```bash
# Revert to previous version
git checkout main
git revert <migration-commit>
git push

# Or use feature branch
git checkout -b rollback/remove-enhanced-prompts
git revert <commits>
git push
```

## 6. Success Metrics

### Week 1 Targets
- ✅ Enhanced system deployed behind feature flag
- ✅ A/B test running with 20% traffic
- ✅ No increase in error rate

### Week 2 Targets
- ✅ Quality improvement > 25% vs baseline
- ✅ User satisfaction maintained or improved
- ✅ Response time < 2s p95

### Week 3 Targets
- ✅ All tests passing
- ✅ Safety validation catching 100% of test injections
- ✅ Metrics dashboard operational

### Week 4 Targets
- ✅ Full migration complete
- ✅ Old system deprecated
- ✅ Documentation updated

## 7. Troubleshooting

### Common Issues and Solutions

#### Issue: High latency with Chain-of-Thought
```typescript
// Solution: Add caching
const cacheKey = hash(prompt + options);
const cached = await cache.get(cacheKey);
if (cached) return cached;
```

#### Issue: Memory usage increase
```typescript
// Solution: Implement cleanup
setInterval(() => {
  promptManager.clearCache();
  consistencyValidator.reset();
}, 60000); // Every minute
```

#### Issue: Quality regression
```typescript
// Solution: Increase test coverage
beforeDeploy(() => {
  runRegressionTests();
  checkQualityThresholds();
});
```

## 8. Team Training

### Developer Training
1. Review enhanced-system-prompts.ts
2. Understand PromptManager API
3. Practice writing tests
4. Review monitoring dashboards

### QA Training
1. Understand quality metrics
2. Learn to identify enhancement issues
3. Practice regression testing
4. Review safety validation

### Support Training
1. Understand feature flags
2. Learn rollback procedures
3. Review common issues
4. Practice incident response

## Next Steps

1. **Week 1**: Deploy behind feature flag
2. **Week 2**: Monitor metrics and gather feedback
3. **Week 3**: Expand test coverage
4. **Week 4**: Complete migration
5. **Week 5**: Optimize based on data
6. **Week 6**: Document learnings

## Contact

For questions or issues:
- Technical Lead: [Your Name]
- Slack: #prompt-enhancement
- Docs: /docs/prompt-system