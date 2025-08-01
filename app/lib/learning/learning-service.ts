import { db, trainingExamples, enhancementLogs, feedback } from '../db';
import { PatternExtractor, EnhancementPattern } from './pattern-extractor';
import { eq, desc, and, gte } from 'drizzle-orm';

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
  private readonly PATTERN_CONFIDENCE_THRESHOLD = 0.75;
  private readonly LLM_FALLBACK_THRESHOLD = 0.6;

  constructor() {
    this.patternExtractor = new PatternExtractor();
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
      const existingWords = new Set(
        existing.rawPrompt.toLowerCase().split(/\s+/)
      );
      const patternWords = new Set(pattern.originalText.toLowerCase().split(/\s+/));
      
      const intersection = new Set(
        [...existingWords].filter(x => patternWords.has(x))
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
        gte(feedback.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
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

    return patterns.filter(pattern => {
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
      .where(gte(enhancementLogs.createdAt, oneWeekAgo));

    if (recentEnhancements.length === 0) return 1; // Fully dependent

    const localEnhancements = recentEnhancements.filter(
      e => e.source === 'local'
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
          gte(enhancementLogs.createdAt, oneWeekAgo)
        )
      );

    if (localEnhancementsWithFeedback.length === 0) return 0;

    const successfulCount = localEnhancementsWithFeedback.filter(
      e => e.successful === true && (e.score || 0) >= 4
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
      relatedPatterns.reduce((sum, p) => sum + p.quality, 0) /
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
    relatedPatterns.sort((a, b) => {
      const scoreA = a.quality * 0.7 + (a.usageCount / 100) * 0.3;
      const scoreB = b.quality * 0.7 + (b.usageCount / 100) * 0.3;
      return scoreB - scoreA;
    });

    return relatedPatterns[0];
  }
}