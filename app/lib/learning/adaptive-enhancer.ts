import { db, trainingExamples, enhancementLogs } from '../db';
import { LearningService } from './learning-service';
import { gte, desc } from 'drizzle-orm';

export interface AdaptiveEnhancement {
  enhanced: string;
  confidence: number;
  source: 'learned' | 'hybrid' | 'fallback';
  patterns: Array<{
    id: number;
    transformation: string;
    confidence: number;
  }>;
}

export class AdaptiveEnhancer {
  private learningService: LearningService;
  private readonly MIN_CONFIDENCE_FOR_LOCAL = 0.7;
  private readonly HYBRID_THRESHOLD = 0.5;

  constructor() {
    this.learningService = new LearningService();
  }

  /**
   * Enhance prompt using learned patterns
   */
  async enhance(prompt: string): Promise<AdaptiveEnhancement> {
    // Check if we should use local enhancement
    const shouldUseLocal = await this.learningService.shouldUseLocalEnhancement(prompt);
    
    if (shouldUseLocal) {
      return await this.localEnhance(prompt);
    }

    // Check if we should use hybrid approach
    const bestPattern = await this.learningService.getBestPattern(prompt);
    if (bestPattern && bestPattern.quality >= this.HYBRID_THRESHOLD) {
      return await this.hybridEnhance(prompt, bestPattern);
    }

    // Fallback to LLM
    return {
      enhanced: prompt, // Return original for LLM to handle
      confidence: 0,
      source: 'fallback',
      patterns: [],
    };
  }

  /**
   * Enhance using only learned patterns
   */
  private async localEnhance(prompt: string): Promise<AdaptiveEnhancement> {
    const patterns = await this.findApplicablePatterns(prompt);
    
    if (patterns.length === 0) {
      return {
        enhanced: prompt,
        confidence: 0,
        source: 'fallback',
        patterns: [],
      };
    }

    let enhanced = prompt;
    const appliedPatterns: Array<{
      id: number;
      transformation: string;
      confidence: number;
    }> = [];

    // Apply patterns in order of confidence
    for (const pattern of patterns) {
      const transformations = pattern.metadata?.transformations || [];
      
      for (const transformation of transformations) {
        if (transformation.type === 'replacement') {
          enhanced = enhanced.replace(
            new RegExp(`\\b${transformation.from}\\b`, 'gi'),
            transformation.to
          );
          appliedPatterns.push({
            id: pattern.id,
            transformation: `${transformation.from} → ${transformation.to}`,
            confidence: pattern.quality,
          });
        } else if (transformation.type === 'addition') {
          // Add contextual additions
          enhanced = this.applyAddition(enhanced, transformation.to, pattern);
          appliedPatterns.push({
            id: pattern.id,
            transformation: `+ ${transformation.to}`,
            confidence: pattern.quality,
          });
        }
      }
    }

    // Apply structural improvements
    enhanced = this.applyStructuralImprovements(enhanced, patterns);

    // Calculate overall confidence
    const avgConfidence = patterns.reduce((sum, p) => sum + p.quality, 0) / patterns.length;

    // Log the enhancement
    await this.logEnhancement(prompt, enhanced, 'local', appliedPatterns);

    return {
      enhanced,
      confidence: avgConfidence,
      source: 'learned',
      patterns: appliedPatterns,
    };
  }

  /**
   * Hybrid enhancement combining patterns with LLM refinement
   */
  private async hybridEnhance(
    prompt: string,
    bestPattern: any
  ): Promise<AdaptiveEnhancement> {
    // First apply known patterns
    const localResult = await this.localEnhance(prompt);
    
    // Then use the pattern as a template for further enhancement
    const template = bestPattern.enhancedPrompt;
    const enhanced = this.applyTemplate(localResult.enhanced, template);

    return {
      enhanced,
      confidence: (localResult.confidence + bestPattern.quality) / 2,
      source: 'hybrid',
      patterns: localResult.patterns,
    };
  }

  /**
   * Find patterns applicable to the given prompt
   */
  private async findApplicablePatterns(prompt: string): Promise<any[]> {
    const promptWords = this.extractKeywords(prompt);
    
    // Get high-quality patterns
    const patterns = await db
      .select()
      .from(trainingExamples)
      .where(gte(trainingExamples.quality, this.MIN_CONFIDENCE_FOR_LOCAL))
      .orderBy(desc(trainingExamples.quality))
      .limit(10);

    // Filter by keyword relevance
    return patterns.filter((pattern: any) => {
      const patternKeywords = new Set(pattern.keywords?.split(', ') || []);
      const overlap = promptWords.filter(w => patternKeywords.has(w)).length;
      return overlap >= Math.min(3, promptWords.length * 0.3);
    });
  }

  /**
   * Apply contextual additions to the prompt
   */
  private applyAddition(
    text: string,
    addition: string,
    pattern: any
  ): string {
    // Intelligent addition based on pattern context
    const category = pattern.category;
    
    switch (category) {
      case 'website':
        if (addition.includes('responsive') || addition.includes('modern')) {
          return text + ` with ${addition}`;
        }
        break;
      case 'writing':
        if (addition.includes('engaging') || addition.includes('clear')) {
          return text.replace(/write/i, `write ${addition}`);
        }
        break;
      case 'planning':
        if (addition.includes('detailed') || addition.includes('comprehensive')) {
          return text.replace(/plan/i, `${addition} plan`);
        }
        break;
    }

    // Default: append to end
    return `${text} ${addition}`;
  }

  /**
   * Apply structural improvements based on patterns
   */
  private applyStructuralImprovements(
    text: string,
    patterns: any[]
  ): string {
    let improved = text;

    // Add specificity if missing
    if (!improved.includes('specific') && patterns.some(p => p.category === 'general')) {
      improved = improved.replace(/^(create|build|make|develop)/i, '$1 a specific');
    }

    // Add clear objectives
    if (!improved.includes('clear') && !improved.includes('objective')) {
      const hasActionVerb = /^(create|build|write|develop|design|implement)/i.test(improved);
      if (hasActionVerb) {
        improved += ' with clear objectives and measurable outcomes';
      }
    }

    // Add context if missing
    if (improved.split(' ').length < 10) {
      const category = patterns[0]?.category;
      const contextAdditions: Record<string, string> = {
        website: ' including user experience considerations and responsive design',
        writing: ' with engaging content and clear structure',
        planning: ' with timeline, milestones, and success metrics',
        coding: ' following best practices and clean code principles',
        analysis: ' with data-driven insights and actionable recommendations',
      };
      
      if (category && contextAdditions[category]) {
        improved += contextAdditions[category];
      }
    }

    return improved;
  }

  /**
   * Apply a template pattern to text
   */
  private applyTemplate(text: string, template: string): string {
    // Extract the structure from the template
    const templateStructure = this.extractStructure(template);
    const textStructure = this.extractStructure(text);

    // Merge structures intelligently
    let enhanced = text;

    // Add missing elements from template
    for (const element of templateStructure) {
      if (!textStructure.includes(element)) {
        enhanced += ` ${element}`;
      }
    }

    return enhanced;
  }

  /**
   * Extract structural elements from text
   */
  private extractStructure(text: string): string[] {
    const structures = [];
    
    // Extract key phrases
    const patterns = [
      /with\s+[\w\s]+(?:and|,)/gi,
      /including\s+[\w\s]+(?:and|,)/gi,
      /focusing on\s+[\w\s]+/gi,
      /that\s+[\w\s]+/gi,
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        structures.push(...matches);
      }
    }

    return structures;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
      'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is',
    ]);

    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }

  /**
   * Log enhancement for future learning
   */
  private async logEnhancement(
    original: string,
    enhanced: string,
    source: string,
    patterns: any[]
  ): Promise<void> {
    await db.insert(enhancementLogs).values({
      originalPrompt: original,
      enhancedPrompt: enhanced,
      promptLength: original.length,
      hasContext: false,
      isRefinement: false,
      isExpansion: false,
      source: source,
      enhancementModel: 'adaptive-local',
      responseTime: 50, // Local enhancement is fast
      context: JSON.stringify({ patterns }),
      createdAt: new Date(),
    });
  }

  /**
   * Get enhancement statistics
   */
  async getStats(): Promise<{
    totalEnhancements: number;
    localEnhancements: number;
    averageConfidence: number;
    topPatterns: any[];
  }> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Get enhancement stats
    const enhancements = await db
      .select()
      .from(enhancementLogs)
      .where(gte(enhancementLogs.createdAt, oneWeekAgo));

    const localEnhancements = enhancements.filter((e: any) => e.source === 'local');

    // Get top patterns
    const topPatterns = await db
      .select()
      .from(trainingExamples)
      .orderBy(desc(trainingExamples.usageCount))
      .limit(5);

    return {
      totalEnhancements: enhancements.length,
      localEnhancements: localEnhancements.length,
      averageConfidence: 
        topPatterns.reduce((sum: number, p: any) => sum + (p.quality || 0), 0) / topPatterns.length,
      topPatterns,
    };
  }
}
