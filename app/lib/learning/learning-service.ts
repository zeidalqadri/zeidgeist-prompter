/**
 * @deprecated This file is deprecated and will be removed in a future release.
 * Use functions/_shared/learning/service.ts instead (Workers-only).
 *
 * Migration: Learning system has been consolidated to Cloudflare Workers
 * to leverage D1 database and edge runtime. This Node.js version is kept
 * for reference only.
 */
import { db, trainingExamples, enhancementLogs, feedback } from '../db';
import { PatternExtractor, EnhancementPattern } from './pattern-extractor';
import { eq, and, gte } from 'drizzle-orm';

export interface LearningMetrics {
  totalPatterns: number;
  newPatternsLearned: number;
  llmDependencyScore: number; // 0-1, lower is better
  accuracyScore: number; // 0-1, higher is better
  lastLearningCycle: Date;
}

export class LearningService {
  private patternExtractor: PatternExtractor;
  private readonly LEARNING_CYCLE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  // PHASE 3: Lowered thresholds to enable more pattern usage
  private readonly PATTERN_CONFIDENCE_THRESHOLD = 0.55; // Was 0.75 - more permissive
  private readonly LLM_FALLBACK_THRESHOLD = 0.4; // Was 0.6 - enable hybrid mode

  constructor() {
    this.patternExtractor = new PatternExtractor();
  }

  /**
   * PHASE 2: Real-time learning - Store successful enhancement immediately
   * This method is called after every successful LLM enhancement
   */
  async storeSuccessfulEnhancement(
    original: string,
    enhanced: string,
    source: string,
    metadata: Record<string, any>
  ): Promise<void> {
    console.log('📚 Processing enhancement for learning...');

    try {
      // Extract patterns immediately from this single enhancement
      const enhancement = {
        original,
        enhanced,
        context: metadata.context || '',
        feedbackScore: 4, // Default positive score (will be updated by actual feedback)
      };

      const patterns = await this.patternExtractor.extractTransformations(
        enhancement.original,
        enhancement.enhanced
      );

      console.log(`🔍 Extracted ${patterns.length} transformation patterns`);

      // Store patterns with confidence >= 0.6 (lowered threshold)
      for (const pattern of patterns) {
        // Calculate initial confidence based on transformation quality
        const confidence = this.calculatePatternConfidence(pattern);

        if (confidence >= 0.6) { // Lower threshold for real-time learning
          console.log(`✅ Storing pattern with confidence ${confidence.toFixed(2)}`);

          // Create enhancement pattern
          const enhancementPattern: EnhancementPattern = {
            originalText: original,
            enhancedText: enhanced,
            context: metadata.context || '',
            keywords: this.extractKeywords(original),
            transformations: [pattern],
            confidence
          };

          await this.storePatterns([enhancementPattern]);
        }
      }

      console.log('✅ Real-time learning complete');
    } catch (error) {
      console.error('Error in real-time learning:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Extract transformations from a single enhancement (helper for real-time learning)
   */
  private async extractTransformations(
    original: string,
    enhanced: string
  ): Promise<any[]> {
    return this.patternExtractor.extractTransformations(original, enhanced);
  }

  /**
   * Calculate confidence for a pattern based on transformation quality
   */
  private calculatePatternConfidence(pattern: any): number {
    let confidence = 0.6; // Base confidence

    // Boost confidence for specific transformations
    if (pattern.type === 'addition') {
      confidence += 0.1; // Additions are generally good
    }
    if (pattern.type === 'replacement') {
      confidence += 0.05; // Replacements are moderately good
    }

    // Boost for longer transformations (more substantial changes)
    if (pattern.to && pattern.to.length > 20) {
      confidence += 0.1;
    }

    // Cap at 0.85 for initial patterns (will increase with positive feedback)
    return Math.min(0.85, confidence);
  }

  /**
   * Extract keywords from text (helper method)
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
      'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is',
    ]);

    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Top 10 keywords
  }

  /**
   * PHASE 8: Reinforce patterns based on positive feedback
   */
  async reinforcePatterns(prompt: string, score: number): Promise<void> {
    console.log(`🔼 Reinforcing patterns for prompt (score: ${score})`);

    try {
      // Find related patterns
      const relatedPatterns = await this.findRelatedPatterns(prompt);

      for (const pattern of relatedPatterns) {
        // Calculate quality adjustment based on score
        // Score 5 = +10 points, Score 4 = +5 points, Score 3 = +2 points
        const qualityAdjustment = Math.max(0, (score - 3) * 5);

        const newQuality = Math.min(100, (pattern.quality || 0) + qualityAdjustment);

        await db
          .update(trainingExamples)
          .set({
            quality: newQuality,
            usageCount: (pattern.usageCount || 0) + 1,
            updatedAt: new Date()
          })
          .where(eq(trainingExamples.id, pattern.id));

        console.log(`✅ Reinforced pattern ${pattern.id}: ${pattern.quality} → ${newQuality}`);
      }

      console.log(`✅ Reinforced ${relatedPatterns.length} patterns`);
    } catch (error) {
      console.error('Error reinforcing patterns:', error);
      throw error;
    }
  }

  /**
   * PHASE 8: Penalize patterns based on negative feedback
   */
  async penalizePatterns(prompt: string, score: number): Promise<void> {
    console.log(`🔽 Penalizing patterns for prompt (score: ${score})`);

    try {
      // Find related patterns
      const relatedPatterns = await this.findRelatedPatterns(prompt);

      for (const pattern of relatedPatterns) {
        // Calculate quality adjustment based on score
        // Score 1 = -20 points, Score 2 = -10 points
        const qualityAdjustment = (3 - score) * 10;

        const newQuality = Math.max(0, (pattern.quality || 0) - qualityAdjustment);

        await db
          .update(trainingExamples)
          .set({
            quality: newQuality,
            updatedAt: new Date()
          })
          .where(eq(trainingExamples.id, pattern.id));

        console.log(`⚠️ Penalized pattern ${pattern.id}: ${pattern.quality} → ${newQuality}`);

        // If quality drops below threshold, deactivate pattern
        if (newQuality < 20) {
          await db
            .update(trainingExamples)
            .set({ isActive: false })
            .where(eq(trainingExamples.id, pattern.id));
          console.log(`❌ Deactivated pattern ${pattern.id} (quality too low)`);
        }
      }

      console.log(`✅ Penalized ${relatedPatterns.length} patterns`);
    } catch (error) {
      console.error('Error penalizing patterns:', error);
      throw error;
    }
  }

  /**
   * Main learning cycle - should be run periodically
   */
  async runLearningCycle(): Promise<LearningMetrics> {
    console.log('Starting learning cycle...');
    
    // Extract patterns from recent successful enhancements
    const patterns = await this.patternExtractor.extractPatterns(7); // Last 7 days
    
    // Store high-confidence patterns
    const newPatterns = await this.storePatterns(patterns);
    
    // Update existing patterns based on feedback
    await this.updatePatternQuality();
    
    // Calculate metrics
    const metrics = await this.calculateMetrics(newPatterns);
    
    console.log('Learning cycle completed:', metrics);
    return metrics;
  }

  /**
   * Store learned patterns in the database
   */
  private async storePatterns(
    patterns: EnhancementPattern[]
  ): Promise<number> {
    let newPatternsCount = 0;

    for (const pattern of patterns) {
      if (pattern.confidence < this.PATTERN_CONFIDENCE_THRESHOLD) continue;

      // Check if similar pattern exists
      const existingPattern = await this.findSimilarPattern(pattern);

      if (existingPattern) {
        // Update existing pattern
        await this.updatePattern(existingPattern.id, pattern);
      } else {
        // Create new pattern
        await db.insert(trainingExamples).values({
          rawPrompt: pattern.originalText,
          enhancedPrompt: pattern.enhancedText,
          context: pattern.context,
          source: 'learning',
          quality: Math.round(pattern.confidence * 100), // Convert to integer scale
          usageCount: 1,
        });
        newPatternsCount++;
      }
    }

    return newPatternsCount;
  }

  /**
   * Find similar existing pattern
   */
  private async findSimilarPattern(
    pattern: EnhancementPattern
  ): Promise<any | null> {
    const keywordOverlapThreshold = 0.5;
    
    const existingPatterns = await db
      .select()
      .from(trainingExamples)
      .where(eq(trainingExamples.source, 'learning'));

    for (const existing of existingPatterns) {
      // Simple similarity check based on prompt text overlap
      const existingWords = new Set<string>(
        (existing.rawPrompt || '').toLowerCase().split(/\s+/)
      );
      const patternWords = new Set<string>((pattern.originalText || '').toLowerCase().split(/\s+/));
      
      const intersection = new Set<string>(
        [...existingWords].filter((x: string) => patternWords.has(x))
      );
      const overlap = intersection.size / patternWords.size;

      if (overlap >= keywordOverlapThreshold) {
        return existing;
      }
    }

    return null;
  }

  /**
   * Update existing pattern with new information
   */
  private async updatePattern(
    patternId: string,
    newPattern: EnhancementPattern
  ): Promise<void> {
    const existing = await db
      .select()
      .from(trainingExamples)
      .where(eq(trainingExamples.id, patternId))
      .limit(1);

    if (existing.length === 0) return;

    const currentPattern = existing[0];
    const updatedQuality = Math.round(
      ((currentPattern.quality || 0) + newPattern.confidence * 100) / 2
    );
    const updatedUsageCount = (currentPattern.usageCount || 0) + 1;

    await db
      .update(trainingExamples)
      .set({
        quality: updatedQuality,
        usageCount: updatedUsageCount,
      })
      .where(eq(trainingExamples.id, patternId));
  }

  /**
   * Update pattern quality based on user feedback
   */
  private async updatePatternQuality(): Promise<void> {
    const recentFeedback = await db
      .select({
        enhancementId: feedback.enhancementId,
        score: feedback.score,
        successful: feedback.wasSuccessful,
      })
      .from(feedback)
      .where(
        gte(feedback.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      );

    for (const fb of recentFeedback) {
      if (!fb.enhancementId) continue;

      // Get the enhancement details
      const enhancement = await db
        .select()
        .from(enhancementLogs)
        .where(eq(enhancementLogs.id, fb.enhancementId))
        .limit(1);

      if (enhancement.length === 0) continue;

      // Find and update related patterns
      const relatedPatterns = await this.findRelatedPatterns(
        enhancement[0].originalPrompt || ''
      );

      for (const pattern of relatedPatterns) {
        const qualityAdjustment = fb.successful
          ? ((fb.score || 3) - 3) * 0.1 // Positive adjustment for scores > 3
          : -0.2; // Negative adjustment for unsuccessful

        const newQuality = Math.max(
          0,
          Math.min(100, (pattern.quality || 0) + qualityAdjustment * 10)
        );

        await db
          .update(trainingExamples)
          .set({ quality: newQuality })
          .where(eq(trainingExamples.id, pattern.id));
      }
    }
  }

  /**
   * Find patterns related to a given prompt
   */
  private async findRelatedPatterns(prompt: string): Promise<any[]> {
    const promptKeywords = prompt
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2);

    const patterns = await db
      .select()
      .from(trainingExamples)
      .where(gte(trainingExamples.quality, 0.5));

    return patterns.filter((pattern: any) => {
      const patternWords = new Set(
        pattern.rawPrompt.toLowerCase().split(/\s+/)
      );
      return promptKeywords.some(k => patternWords.has(k));
    });
  }

  /**
   * Categorize pattern based on content
   */
  private categorizePattern(pattern: EnhancementPattern): string {
    const text = pattern.originalText.toLowerCase();
    
    if (text.includes('website') || text.includes('web') || text.includes('app')) {
      return 'website';
    } else if (text.includes('write') || text.includes('essay') || text.includes('article')) {
      return 'writing';
    } else if (text.includes('plan') || text.includes('organize') || text.includes('schedule')) {
      return 'planning';
    } else if (text.includes('code') || text.includes('program') || text.includes('develop')) {
      return 'coding';
    } else if (text.includes('analyze') || text.includes('data') || text.includes('research')) {
      return 'analysis';
    }
    
    return 'general';
  }

  /**
   * Calculate learning metrics
   */
  async calculateMetrics(
    newPatterns: number
  ): Promise<LearningMetrics> {
    // Get total patterns
    const totalPatternsResult = await db
      .select({ count: trainingExamples.id })
      .from(trainingExamples);
    const totalPatterns = totalPatternsResult.length;

    // Calculate LLM dependency score
    const llmDependency = await this.calculateLLMDependency();

    // Calculate accuracy score
    const accuracy = await this.calculateAccuracy();

    return {
      totalPatterns,
      newPatternsLearned: newPatterns,
      llmDependencyScore: llmDependency,
      accuracyScore: accuracy,
      lastLearningCycle: new Date(),
    };
  }

  /**
   * Calculate how dependent the system is on LLMs
   */
  private async calculateLLMDependency(): Promise<number> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Get enhancement logs from last week
    const recentEnhancements = await db
      .select({
        source: enhancementLogs.source,
      })
      .from(enhancementLogs)
      .where(gte(enhancementLogs.createdAt, oneWeekAgo.toISOString()));

    if (recentEnhancements.length === 0) return 1; // Fully dependent

    const localEnhancements = recentEnhancements.filter(
      (e: any) => e.source === 'local'
    ).length;
    
    return 1 - (localEnhancements / recentEnhancements.length);
  }

  /**
   * Calculate accuracy of local enhancements
   */
  private async calculateAccuracy(): Promise<number> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Get local enhancements with feedback
    const localEnhancementsWithFeedback = await db
      .select({
        successful: feedback.wasSuccessful,
        score: feedback.score,
      })
      .from(enhancementLogs)
      .leftJoin(feedback, eq(feedback.enhancementId, enhancementLogs.id))
      .where(
        and(
          eq(enhancementLogs.source, 'local'),
          gte(enhancementLogs.createdAt, oneWeekAgo.toISOString())
        )
      );

    if (localEnhancementsWithFeedback.length === 0) return 0;

    const successfulCount = localEnhancementsWithFeedback.filter(
      (e: any) => e.successful === true && (e.score || 0) >= 4
    ).length;

    return successfulCount / localEnhancementsWithFeedback.length;
  }

  /**
   * Check if system should use local enhancement instead of LLM
   */
  async shouldUseLocalEnhancement(prompt: string): Promise<boolean> {
    const relatedPatterns = await this.findRelatedPatterns(prompt);
    
    if (relatedPatterns.length === 0) return false;

    // Calculate average quality of related patterns
    const avgQuality =
      relatedPatterns.reduce((sum: number, p: any) => sum + p.quality, 0) /
      relatedPatterns.length;

    return avgQuality >= this.LLM_FALLBACK_THRESHOLD;
  }

  /**
   * Get best pattern for a given prompt
   */
  async getBestPattern(prompt: string): Promise<any | null> {
    const relatedPatterns = await this.findRelatedPatterns(prompt);
    
    if (relatedPatterns.length === 0) return null;

    // Sort by quality score and usage count
    relatedPatterns.sort((a: any, b: any) => {
      const scoreA = a.quality * 0.7 + (a.usageCount / 100) * 0.3;
      const scoreB = b.quality * 0.7 + (b.usageCount / 100) * 0.3;
      return scoreB - scoreA;
    });

    return relatedPatterns[0];
  }
}
