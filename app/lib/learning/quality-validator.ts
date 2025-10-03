// PHASE 5: A/B Testing Framework for Quality Validation
import { db, enhancementLogs, NewEnhancementLog } from '../db';
import { sql } from 'drizzle-orm';

export interface QualityComparison {
  originalPrompt: string;
  localEnhanced: string;
  llmEnhanced: string;
  localConfidence: number;
  comparisonResults: {
    lengthScore: number; // How much detail added
    structureScore: number; // How well organized
    clarityScore: number; // How clear the instructions
    overallScore: number; // Combined score
  };
  winner: 'local' | 'llm' | 'tie';
  timestamp: Date;
}

export interface ABTestResults {
  totalTests: number;
  localWins: number;
  llmWins: number;
  ties: number;
  localWinRate: number;
  avgLocalQuality: number;
  avgLlmQuality: number;
  avgTimeSaved: number;
  recommendation: string;
}

export class QualityValidator {
  private readonly AB_TEST_PERCENTAGE = 10; // Test 10% of requests

  /**
   * Determine if this request should be A/B tested
   */
  shouldRunABTest(): boolean {
    return Math.random() * 100 < this.AB_TEST_PERCENTAGE;
  }

  /**
   * Compare local and LLM enhancements
   */
  async compareEnhancements(
    original: string,
    localEnhanced: string,
    localConfidence: number,
    llmEnhanced: string
  ): Promise<QualityComparison> {
    // Calculate quality scores for both enhancements
    const localScores = this.calculateQualityScores(original, localEnhanced);
    const llmScores = this.calculateQualityScores(original, llmEnhanced);

    // Determine winner
    let winner: 'local' | 'llm' | 'tie';
    const scoreDiff = localScores.overallScore - llmScores.overallScore;

    if (Math.abs(scoreDiff) < 5) {
      winner = 'tie'; // Within 5 points = tie
    } else if (scoreDiff > 0) {
      winner = 'local';
    } else {
      winner = 'llm';
    }

    const comparison: QualityComparison = {
      originalPrompt: original,
      localEnhanced,
      llmEnhanced,
      localConfidence,
      comparisonResults: {
        lengthScore: localScores.lengthScore - llmScores.lengthScore,
        structureScore: localScores.structureScore - llmScores.structureScore,
        clarityScore: localScores.clarityScore - llmScores.clarityScore,
        overallScore: localScores.overallScore - llmScores.overallScore
      },
      winner,
      timestamp: new Date()
    };

    // Store comparison results for analysis
    await this.storeComparison(comparison);

    console.log(`🧪 A/B Test Result: ${winner} (local: ${localScores.overallScore.toFixed(1)}, llm: ${llmScores.overallScore.toFixed(1)})`);

    return comparison;
  }

  /**
   * Calculate quality scores for an enhancement
   */
  private calculateQualityScores(original: string, enhanced: string): {
    lengthScore: number;
    structureScore: number;
    clarityScore: number;
    overallScore: number;
  } {
    // 1. Length Score (0-30 points) - measures detail added
    const originalWords = original.split(/\s+/).length;
    const enhancedWords = enhanced.split(/\s+/).length;
    const expansionRatio = enhancedWords / originalWords;

    // Ideal expansion: 2-5x original length
    let lengthScore = 0;
    if (expansionRatio >= 2 && expansionRatio <= 5) {
      lengthScore = 30;
    } else if (expansionRatio > 5) {
      lengthScore = 30 - Math.min(10, (expansionRatio - 5) * 2); // Penalty for too long
    } else if (expansionRatio > 1) {
      lengthScore = (expansionRatio - 1) * 30; // Proportional for < 2x
    }

    // 2. Structure Score (0-35 points) - measures organization
    let structureScore = 0;

    // Check for numbered lists
    if (/\d+\.\s/.test(enhanced)) structureScore += 10;

    // Check for bullet points
    if (/[•\-\*]\s/.test(enhanced)) structureScore += 8;

    // Check for sections/headers
    if (/:\s*\n/.test(enhanced) || /\n\n/.test(enhanced)) structureScore += 7;

    // Check for clear sentence structure
    const sentences = enhanced.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length >= 3) structureScore += 10;

    // 3. Clarity Score (0-35 points) - measures instruction quality
    let clarityScore = 0;

    // Check for action verbs
    const actionVerbs = ['create', 'design', 'develop', 'implement', 'build', 'include',
                        'ensure', 'provide', 'specify', 'define', 'establish'];
    const hasActionVerbs = actionVerbs.some(verb =>
      enhanced.toLowerCase().includes(verb)
    );
    if (hasActionVerbs) clarityScore += 10;

    // Check for specificity keywords
    const specificityKeywords = ['specific', 'detailed', 'comprehensive', 'clear',
                                 'precise', 'exact', 'particular', 'explicit'];
    const specificityCount = specificityKeywords.filter(keyword =>
      enhanced.toLowerCase().includes(keyword)
    ).length;
    clarityScore += Math.min(10, specificityCount * 3);

    // Check for requirements/criteria language
    if (enhanced.toLowerCase().includes('requirement') ||
        enhanced.toLowerCase().includes('criteria')) {
      clarityScore += 8;
    }

    // Check for examples or specifics
    if (enhanced.includes('example') || enhanced.includes('such as') ||
        enhanced.includes('including')) {
      clarityScore += 7;
    }

    const overallScore = lengthScore + structureScore + clarityScore;

    return {
      lengthScore,
      structureScore,
      clarityScore,
      overallScore
    };
  }

  /**
   * Store A/B test comparison results
   */
  private async storeComparison(comparison: QualityComparison): Promise<void> {
    try {
      // Store in a metadata field in enhancement logs for now
      // In production, you might want a dedicated table
      const metadata = JSON.stringify({
        type: 'ab_test',
        ...comparison,
        localScores: this.calculateQualityScores(
          comparison.originalPrompt,
          comparison.localEnhanced
        ),
        llmScores: this.calculateQualityScores(
          comparison.originalPrompt,
          comparison.llmEnhanced
        )
      });

      await db.insert(enhancementLogs).values({
        originalPrompt: comparison.originalPrompt,
        enhancedPrompt: comparison.localEnhanced,
        promptLength: comparison.originalPrompt.length,
        hasContext: false,
        isRefinement: false,
        isExpansion: false,
        repeatCount: 0,
        source: 'ab_test',
        enhancementModel: 'quality-validator',
        responseTime: 0,
        processingTime: 0,
        wasIdentical: false,
        hadError: false,
        context: metadata
      } as NewEnhancementLog);

      console.log('✅ A/B test results stored');
    } catch (error) {
      console.error('Failed to store A/B test results:', error);
    }
  }

  /**
   * Get A/B test results summary
   */
  async getABTestResults(days: number = 7): Promise<ABTestResults> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Query A/B test results
      const results = await db
        .select()
        .from(enhancementLogs)
        .where(
          sql`${enhancementLogs.source} = 'ab_test' AND ${enhancementLogs.createdAt} >= ${startDate}`
        );

      if (results.length === 0) {
        return {
          totalTests: 0,
          localWins: 0,
          llmWins: 0,
          ties: 0,
          localWinRate: 0,
          avgLocalQuality: 0,
          avgLlmQuality: 0,
          avgTimeSaved: 0,
          recommendation: 'Not enough data - run more A/B tests'
        };
      }

      // Parse results
      let localWins = 0;
      let llmWins = 0;
      let ties = 0;
      let totalLocalQuality = 0;
      let totalLlmQuality = 0;

      for (const result of results) {
        try {
          const metadata = JSON.parse(result.context || '{}');
          if (metadata.type === 'ab_test') {
            if (metadata.winner === 'local') localWins++;
            else if (metadata.winner === 'llm') llmWins++;
            else ties++;

            totalLocalQuality += metadata.localScores?.overallScore || 0;
            totalLlmQuality += metadata.llmScores?.overallScore || 0;
          }
        } catch (parseError) {
          console.error('Failed to parse A/B test metadata:', parseError);
        }
      }

      const totalTests = results.length;
      const localWinRate = (localWins / totalTests) * 100;
      const avgLocalQuality = totalLocalQuality / totalTests;
      const avgLlmQuality = totalLlmQuality / totalTests;

      // Estimate time saved (local ~100ms, LLM ~2000ms)
      const avgTimeSaved = (localWins / totalTests) * 1900; // 1.9 seconds per local win

      // Generate recommendation
      let recommendation = '';
      if (localWinRate >= 60) {
        recommendation = '✅ Local patterns are performing well! Increase usage thresholds.';
      } else if (localWinRate >= 40) {
        recommendation = '⚖️ Local and LLM quality are comparable. Continue gradual rollout.';
      } else {
        recommendation = '⚠️ LLM is outperforming local patterns. Lower usage thresholds or improve patterns.';
      }

      return {
        totalTests,
        localWins,
        llmWins,
        ties,
        localWinRate,
        avgLocalQuality,
        avgLlmQuality,
        avgTimeSaved,
        recommendation
      };
    } catch (error) {
      console.error('Error getting A/B test results:', error);
      throw error;
    }
  }

  /**
   * Auto-tune confidence thresholds based on A/B test results
   */
  async autoTuneThresholds(days: number = 7): Promise<{
    currentThresholds: { local: number; hybrid: number };
    suggestedThresholds: { local: number; hybrid: number };
    reasoning: string;
  }> {
    const results = await this.getABTestResults(days);

    // Current thresholds (from learning modules)
    const currentThresholds = {
      local: 0.7, // MIN_CONFIDENCE_FOR_LOCAL in engineer.ts
      hybrid: 0.4  // Hybrid mode threshold
    };

    let suggestedLocal = currentThresholds.local;
    let suggestedHybrid = currentThresholds.hybrid;
    let reasoning = '';

    if (results.totalTests < 10) {
      reasoning = 'Not enough A/B test data yet. Keep current thresholds and gather more data.';
    } else if (results.localWinRate >= 70) {
      // Local is performing excellently - lower threshold to use more
      suggestedLocal = Math.max(0.5, currentThresholds.local - 0.1);
      suggestedHybrid = Math.max(0.3, currentThresholds.hybrid - 0.05);
      reasoning = `Local patterns are winning ${results.localWinRate.toFixed(1)}% of tests. Lower thresholds to increase usage.`;
    } else if (results.localWinRate >= 50) {
      // Local is performing well - slight reduction
      suggestedLocal = Math.max(0.6, currentThresholds.local - 0.05);
      reasoning = `Local patterns are competitive (${results.localWinRate.toFixed(1)}% win rate). Slight threshold reduction recommended.`;
    } else if (results.localWinRate < 30) {
      // Local is underperforming - increase threshold
      suggestedLocal = Math.min(0.85, currentThresholds.local + 0.1);
      suggestedHybrid = Math.min(0.6, currentThresholds.hybrid + 0.1);
      reasoning = `Local patterns are underperforming (${results.localWinRate.toFixed(1)}% win rate). Increase thresholds to be more conservative.`;
    } else {
      reasoning = `Local patterns performing adequately (${results.localWinRate.toFixed(1)}% win rate). Keep current thresholds.`;
    }

    return {
      currentThresholds,
      suggestedThresholds: {
        local: suggestedLocal,
        hybrid: suggestedHybrid
      },
      reasoning
    };
  }
}

// Singleton instance
let validatorInstance: QualityValidator | null = null;

export function getQualityValidator(): QualityValidator {
  if (!validatorInstance) {
    validatorInstance = new QualityValidator();
  }
  return validatorInstance;
}
