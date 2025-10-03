// PHASE 6: Learning Metrics and Monitoring
import { db, enhancementLogs, trainingExamples, feedback } from '../db';
import { gte, eq, and, sql } from 'drizzle-orm';

export interface LearningMetricsSnapshot {
  // Usage metrics
  totalRequests: number;
  localUsageCount: number;
  hybridUsageCount: number;
  llmUsageCount: number;
  localUsagePercentage: number;
  hybridUsagePercentage: number;
  llmUsagePercentage: number;

  // Performance metrics
  avgLocalResponseTime: number;
  avgLlmResponseTime: number;
  speedupFactor: number;

  // Quality metrics
  localQualityScore: number;
  llmQualityScore: number;
  qualityDelta: number; // Difference between local and LLM quality

  // Learning velocity
  totalPatterns: number;
  newPatternsLastWeek: number;
  patternsPerDay: number;

  // Cost metrics
  estimatedCostSavings: number; // In USD
  costReductionPercentage: number;

  // Pattern health
  highConfidencePatterns: number;
  mediumConfidencePatterns: number;
  lowConfidencePatterns: number;
  avgPatternConfidence: number;

  // Confidence distribution
  confidenceDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];

  // Top performing patterns
  topPatterns: {
    id: string;
    usageCount: number;
    quality: number;
    category: string;
  }[];

  // Timestamp
  timestamp: Date;
}

export class LearningMetrics {
  /**
   * Get comprehensive learning metrics for the dashboard
   */
  async getMetricsSnapshot(timeWindow: number = 7): Promise<LearningMetricsSnapshot> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeWindow);

    // Get enhancement logs from the time window
    const enhancements = await db
      .select()
      .from(enhancementLogs)
      .where(gte(enhancementLogs.createdAt, startDate));

    // Calculate usage metrics
    const totalRequests = enhancements.length;
    const localUsageCount = enhancements.filter((e: any) => e.source === 'local').length;
    const hybridUsageCount = enhancements.filter((e: any) => e.source === 'hybrid').length;
    const llmUsageCount = totalRequests - localUsageCount - hybridUsageCount;

    const localUsagePercentage = totalRequests > 0 ? (localUsageCount / totalRequests) * 100 : 0;
    const hybridUsagePercentage = totalRequests > 0 ? (hybridUsageCount / totalRequests) * 100 : 0;
    const llmUsagePercentage = totalRequests > 0 ? (llmUsageCount / totalRequests) * 100 : 0;

    // Calculate performance metrics
    const localEnhancements = enhancements.filter((e: any) => e.source === 'local');
    const llmEnhancements = enhancements.filter((e: any) =>
      e.source !== 'local' && e.source !== 'hybrid' && e.source !== 'fallback'
    );

    const avgLocalResponseTime = localEnhancements.length > 0
      ? localEnhancements.reduce((sum: number, e: any) => sum + (e.processingTime || 0), 0) / localEnhancements.length
      : 0;

    const avgLlmResponseTime = llmEnhancements.length > 0
      ? llmEnhancements.reduce((sum: number, e: any) => sum + (e.processingTime || 0), 0) / llmEnhancements.length
      : 0;

    const speedupFactor = avgLlmResponseTime > 0 ? avgLlmResponseTime / avgLocalResponseTime : 0;

    // Get quality scores from feedback
    const localQuality = await this.calculateQualityScore('local', startDate);
    const llmQuality = await this.calculateQualityScore('llm', startDate);
    const qualityDelta = localQuality - llmQuality;

    // Get pattern statistics
    const allPatterns = await db.select().from(trainingExamples);
    const totalPatterns = allPatterns.length;

    const recentPatterns = await db
      .select()
      .from(trainingExamples)
      .where(gte(trainingExamples.createdAt, startDate));
    const newPatternsLastWeek = recentPatterns.length;
    const patternsPerDay = newPatternsLastWeek / timeWindow;

    // Calculate cost savings (assuming average LLM call costs $0.001)
    const avgLlmCost = 0.001; // $0.001 per LLM call
    const savedCalls = localUsageCount + (hybridUsageCount * 0.5); // Hybrid saves ~50%
    const estimatedCostSavings = savedCalls * avgLlmCost;
    const costReductionPercentage = totalRequests > 0 ? (savedCalls / totalRequests) * 100 : 0;

    // Pattern health metrics
    const highConfidencePatterns = allPatterns.filter((p: any) => (p.quality || 0) >= 75).length;
    const mediumConfidencePatterns = allPatterns.filter((p: any) => (p.quality || 0) >= 50 && (p.quality || 0) < 75).length;
    const lowConfidencePatterns = allPatterns.filter((p: any) => (p.quality || 0) < 50).length;

    const avgPatternConfidence = allPatterns.length > 0
      ? allPatterns.reduce((sum: number, p: any) => sum + (p.quality || 0), 0) / allPatterns.length
      : 0;

    // Confidence distribution
    const confidenceDistribution = this.calculateConfidenceDistribution(allPatterns);

    // Top performing patterns
    const topPatterns = allPatterns
      .sort((a: any, b: any) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 10)
      .map((p: any) => ({
        id: p.id,
        usageCount: p.usageCount || 0,
        quality: p.quality || 0,
        category: p.category || 'general'
      }));

    return {
      totalRequests,
      localUsageCount,
      hybridUsageCount,
      llmUsageCount,
      localUsagePercentage,
      hybridUsagePercentage,
      llmUsagePercentage,
      avgLocalResponseTime,
      avgLlmResponseTime,
      speedupFactor,
      localQualityScore: localQuality,
      llmQualityScore: llmQuality,
      qualityDelta,
      totalPatterns,
      newPatternsLastWeek,
      patternsPerDay,
      estimatedCostSavings,
      costReductionPercentage,
      highConfidencePatterns,
      mediumConfidencePatterns,
      lowConfidencePatterns,
      avgPatternConfidence,
      confidenceDistribution,
      topPatterns,
      timestamp: new Date()
    };
  }

  /**
   * Calculate quality score for a specific source type
   */
  private async calculateQualityScore(sourceType: 'local' | 'llm', startDate: Date): Promise<number> {
    const feedbackRecords = await db
      .select({
        enhancementId: feedback.enhancementId,
        score: feedback.score,
        successful: feedback.wasSuccessful,
        source: enhancementLogs.source
      })
      .from(feedback)
      .leftJoin(enhancementLogs, eq(feedback.enhancementId, enhancementLogs.id))
      .where(
        and(
          gte(feedback.createdAt, startDate),
          eq(feedback.wasSuccessful, true)
        )
      );

    let relevantFeedback;
    if (sourceType === 'local') {
      relevantFeedback = feedbackRecords.filter((f: any) =>
        f.source === 'local' || f.source === 'hybrid'
      );
    } else {
      relevantFeedback = feedbackRecords.filter((f: any) =>
        f.source !== 'local' && f.source !== 'hybrid' && f.source !== 'fallback'
      );
    }

    if (relevantFeedback.length === 0) return 0;

    const avgScore = relevantFeedback.reduce((sum: number, f: any) => sum + (f.score || 0), 0) / relevantFeedback.length;
    return (avgScore / 5) * 100; // Convert to percentage
  }

  /**
   * Calculate confidence distribution across patterns
   */
  private calculateConfidenceDistribution(patterns: any[]): Array<{range: string, count: number, percentage: number}> {
    const ranges = [
      { range: '0-20', min: 0, max: 20 },
      { range: '20-40', min: 20, max: 40 },
      { range: '40-60', min: 40, max: 60 },
      { range: '60-80', min: 60, max: 80 },
      { range: '80-100', min: 80, max: 100 }
    ];

    const total = patterns.length;

    return ranges.map(({ range, min, max }) => {
      const count = patterns.filter((p: any) => {
        const quality = p.quality || 0;
        return quality >= min && quality < max;
      }).length;

      return {
        range,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      };
    });
  }

  /**
   * Get learning velocity trend (patterns learned over time)
   */
  async getLearningVelocityTrend(days: number = 30): Promise<Array<{date: string, patternsLearned: number}>> {
    const trend: Array<{date: string, patternsLearned: number}> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const patterns = await db
        .select()
        .from(trainingExamples)
        .where(
          and(
            gte(trainingExamples.createdAt, startOfDay),
            sql`${trainingExamples.createdAt} <= ${endOfDay}`
          )
        );

      trend.push({
        date: startOfDay.toISOString().split('T')[0],
        patternsLearned: patterns.length
      });
    }

    return trend;
  }

  /**
   * Get LLM dependency trend over time
   */
  async getLLMDependencyTrend(days: number = 30): Promise<Array<{date: string, llmPercentage: number}>> {
    const trend: Array<{date: string, llmPercentage: number}> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const enhancements = await db
        .select()
        .from(enhancementLogs)
        .where(
          and(
            gte(enhancementLogs.createdAt, startOfDay),
            sql`${enhancementLogs.createdAt} <= ${endOfDay}`
          )
        );

      const total = enhancements.length;
      const llmCount = enhancements.filter((e: any) =>
        e.source !== 'local' && e.source !== 'hybrid'
      ).length;

      trend.push({
        date: startOfDay.toISOString().split('T')[0],
        llmPercentage: total > 0 ? (llmCount / total) * 100 : 100
      });
    }

    return trend;
  }

  /**
   * Generate a simple text-based dashboard summary
   */
  async generateDashboardSummary(timeWindow: number = 7): Promise<string> {
    const metrics = await this.getMetricsSnapshot(timeWindow);

    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🧠 LEARNING ENGINE METRICS (Last ${timeWindow} days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 USAGE STATISTICS
  Total Requests:        ${metrics.totalRequests}
  ├─ Local:             ${metrics.localUsageCount} (${metrics.localUsagePercentage.toFixed(1)}%)
  ├─ Hybrid:            ${metrics.hybridUsageCount} (${metrics.hybridUsagePercentage.toFixed(1)}%)
  └─ LLM:               ${metrics.llmUsageCount} (${metrics.llmUsagePercentage.toFixed(1)}%)

⚡ PERFORMANCE
  Local Avg Time:        ${metrics.avgLocalResponseTime.toFixed(0)}ms
  LLM Avg Time:          ${metrics.avgLlmResponseTime.toFixed(0)}ms
  Speedup Factor:        ${metrics.speedupFactor.toFixed(1)}x faster

🎯 QUALITY SCORES
  Local Quality:         ${metrics.localQualityScore.toFixed(1)}%
  LLM Quality:           ${metrics.llmQualityScore.toFixed(1)}%
  Delta:                 ${metrics.qualityDelta >= 0 ? '+' : ''}${metrics.qualityDelta.toFixed(1)}%

📚 PATTERN LIBRARY
  Total Patterns:        ${metrics.totalPatterns}
  New This Week:         ${metrics.newPatternsLastWeek}
  Learning Velocity:     ${metrics.patternsPerDay.toFixed(1)} patterns/day

💰 COST SAVINGS
  Estimated Savings:     $${metrics.estimatedCostSavings.toFixed(2)}
  Cost Reduction:        ${metrics.costReductionPercentage.toFixed(1)}%

🏥 PATTERN HEALTH
  High Confidence:       ${metrics.highConfidencePatterns} (≥75%)
  Medium Confidence:     ${metrics.mediumConfidencePatterns} (50-75%)
  Low Confidence:        ${metrics.lowConfidencePatterns} (<50%)
  Avg Confidence:        ${metrics.avgPatternConfidence.toFixed(1)}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Generated: ${metrics.timestamp.toISOString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  }
}

// Singleton instance
let metricsInstance: LearningMetrics | null = null;

export function getLearningMetrics(): LearningMetrics {
  if (!metricsInstance) {
    metricsInstance = new LearningMetrics();
  }
  return metricsInstance;
}
