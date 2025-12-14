/**
 * Advanced quality metrics calculator for prompt evaluation
 * Provides objective measurements for prompt quality and enhancement effectiveness
 *
 * Extended with cost-aware optimization (Promptomatix-style lambda scoring)
 */

import { estimateTokens } from './token-counter';
import { CostOptimizationConfig, DEFAULT_COST_CONFIG } from './cost-config';

export interface QualityMetrics {
  clarity: number;
  specificity: number;
  completeness: number;
  structure: number;
  actionability: number;
  overall: number;
  details: {
    wordCount: number;
    sentenceCount: number;
    avgSentenceLength: number;
    specificityKeywords: number;
    structureElements: number;
    actionWords: number;
    domainSpecificTerms: number;
  };
}

export interface ComparisonMetrics {
  improvementScore: number;
  enhancementType: 'minimal' | 'moderate' | 'substantial' | 'extensive';
  strengthsGained: string[];
  weaknessesRemaining: string[];
  recommendations: string[];
}

/**
 * Cost-aware metrics extending quality metrics with token/cost information
 * Uses Promptomatix-style optimization: Score = Quality - (λ × TokenCount/1000)
 */
export interface CostAwareMetrics extends QualityMetrics {
  /** Estimated token count */
  tokenCount: number;

  /** Optimization score factoring in lambda penalty */
  optimizationScore: number;

  /** Quality per token ratio (efficiency metric) */
  lengthEfficiency: number;

  /** Cost estimates */
  costEstimate: {
    inputTokens: number;
    estimatedCost: number; // USD estimate
  };

  /** Lambda value used for calculation */
  lambdaUsed: number;
}

/**
 * Result of cost-aware comparison between original and optimized prompts
 */
export interface CostComparisonMetrics extends ComparisonMetrics {
  /** Token savings information */
  tokenSavings: {
    originalTokens: number;
    optimizedTokens: number;
    tokensSaved: number;
    percentageSaved: number;
  };

  /** Cost savings */
  costSavings: {
    originalCost: number;
    optimizedCost: number;
    costSaved: number;
  };

  /** Whether optimization maintained quality threshold */
  qualityMaintained: boolean;
}

export class MetricsCalculator {
  private readonly specificityKeywords = [
    'specific', 'detailed', 'comprehensive', 'thorough', 'precise',
    'include', 'ensure', 'incorporate', 'address', 'consider',
    'requirements', 'criteria', 'specifications', 'guidelines',
    'sections', 'elements', 'components', 'features', 'aspects'
  ];

  private readonly actionWords = [
    'create', 'design', 'develop', 'implement', 'build', 'establish',
    'analyze', 'evaluate', 'assess', 'review', 'examine',
    'write', 'compose', 'draft', 'generate', 'produce',
    'organize', 'structure', 'format', 'present', 'deliver'
  ];

  private readonly structureIndicators = [
    /\d+\.\s/,  // numbered lists
    /[•\-\*]\s/, // bullet points
    /:\s*\n/,   // colons with line breaks
    /\n\s*[-=]+\s*\n/, // section dividers
    /#{1,6}\s/, // markdown headers
    /\[(.*?)\]/, // brackets/sections
  ];

  /**
   * Calculate comprehensive quality metrics for a prompt
   */
  calculateMetrics(prompt: string): QualityMetrics {
    const words = prompt.trim().split(/\s+/).filter(w => w.length > 0);
    const sentences = prompt.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    const details = {
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgSentenceLength: words.length / Math.max(sentences.length, 1),
      specificityKeywords: this.countSpecificityKeywords(prompt),
      structureElements: this.countStructureElements(prompt),
      actionWords: this.countActionWords(prompt),
      domainSpecificTerms: this.countDomainTerms(prompt)
    };

    const clarity = this.calculateClarity(prompt, details);
    const specificity = this.calculateSpecificity(prompt, details);
    const completeness = this.calculateCompleteness(prompt, details);
    const structure = this.calculateStructure(prompt, details);
    const actionability = this.calculateActionability(prompt, details);

    const overall = (clarity + specificity + completeness + structure + actionability) / 5;

    return {
      clarity,
      specificity,
      completeness,
      structure,
      actionability,
      overall,
      details
    };
  }

  /**
   * Compare original and enhanced prompts
   */
  comparePrompts(original: string, enhanced: string): ComparisonMetrics {
    const originalMetrics = this.calculateMetrics(original);
    const enhancedMetrics = this.calculateMetrics(enhanced);

    const improvement = enhancedMetrics.overall - originalMetrics.overall;
    const improvementScore = Math.round(improvement * 100);

    let enhancementType: ComparisonMetrics['enhancementType'];
    if (improvement < 0.1) enhancementType = 'minimal';
    else if (improvement < 0.3) enhancementType = 'moderate';
    else if (improvement < 0.5) enhancementType = 'substantial';
    else enhancementType = 'extensive';

    const strengthsGained = this.identifyStrengths(originalMetrics, enhancedMetrics);
    const weaknessesRemaining = this.identifyWeaknesses(enhancedMetrics);
    const recommendations = this.generateRecommendations(enhancedMetrics);

    return {
      improvementScore,
      enhancementType,
      strengthsGained,
      weaknessesRemaining,
      recommendations
    };
  }

  /**
   * Calculate clarity score based on readability and structure
   */
  private calculateClarity(prompt: string, details: any): number {
    let score = 0.5; // Base score

    // Sentence length variety (good readability)
    const avgLength = details.avgSentenceLength;
    if (avgLength >= 10 && avgLength <= 25) score += 0.2;
    else if (avgLength >= 8 && avgLength <= 30) score += 0.1;

    // Presence of clear structure
    if (details.structureElements > 0) score += 0.2;
    if (details.structureElements >= 3) score += 0.1;

    // Avoid overly complex sentences
    const longSentences = prompt.split(/[.!?]+/).filter(s => s.split(/\s+/).length > 40).length;
    if (longSentences === 0) score += 0.1;

    // Clear topic indicators
    if (prompt.toLowerCase().includes('purpose') || 
        prompt.toLowerCase().includes('goal') ||
        prompt.toLowerCase().includes('objective')) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate specificity based on detailed instructions and requirements
   */
  private calculateSpecificity(prompt: string, details: any): number {
    let score = 0.2; // Base score

    // Specificity keywords
    const keywordRatio = details.specificityKeywords / Math.max(details.wordCount, 1);
    score += Math.min(keywordRatio * 10, 0.3);

    // Domain-specific terms
    if (details.domainSpecificTerms > 0) score += 0.2;
    if (details.domainSpecificTerms >= 3) score += 0.1;

    // Concrete examples or requirements
    if (prompt.includes('example') || prompt.includes('such as') || 
        prompt.includes('including') || prompt.includes('e.g.')) {
      score += 0.2;
    }

    // Specific constraints or parameters
    if (/\d+/.test(prompt) || prompt.includes('must') || prompt.includes('required')) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate completeness based on comprehensiveness
   */
  private calculateCompleteness(prompt: string, details: any): number {
    let score = 0.3; // Base score

    // Word count indicates thoroughness
    if (details.wordCount >= 50) score += 0.2;
    if (details.wordCount >= 100) score += 0.2;
    if (details.wordCount >= 200) score += 0.1;

    // Multiple aspects covered
    if (details.structureElements >= 3) score += 0.2;

    // Context consideration
    if (prompt.toLowerCase().includes('context') || 
        prompt.toLowerCase().includes('background') ||
        prompt.toLowerCase().includes('considering')) {
      score += 0.1;
    }

    // Success criteria mentioned
    if (prompt.toLowerCase().includes('success') || 
        prompt.toLowerCase().includes('criteria') ||
        prompt.toLowerCase().includes('measure')) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate structure score based on organization
   */
  private calculateStructure(prompt: string, details: any): number {
    let score = 0.2; // Base score

    // Clear structure elements
    const structureRatio = details.structureElements / Math.max(details.sentenceCount, 1);
    score += Math.min(structureRatio * 2, 0.4);

    // Logical flow indicators
    const transitionWords = ['first', 'then', 'next', 'finally', 'also', 'additionally', 'furthermore'];
    const transitionCount = transitionWords.filter(word => 
      prompt.toLowerCase().includes(word)
    ).length;
    score += Math.min(transitionCount * 0.1, 0.2);

    // Paragraph structure (for longer prompts)
    if (prompt.length > 200) {
      const paragraphs = prompt.split('\n\n').filter(p => p.trim().length > 0);
      if (paragraphs.length >= 2) score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate actionability based on clear directives
   */
  private calculateActionability(prompt: string, details: any): number {
    let score = 0.2; // Base score

    // Action words present
    const actionRatio = details.actionWords / Math.max(details.wordCount, 1);
    score += Math.min(actionRatio * 20, 0.3);

    // Imperative language
    const imperatives = ['create', 'design', 'write', 'develop', 'implement', 'ensure', 'include'];
    const imperativeCount = imperatives.filter(word => 
      prompt.toLowerCase().includes(word)
    ).length;
    score += Math.min(imperativeCount * 0.1, 0.3);

    // Clear deliverables mentioned
    if (prompt.includes('deliverable') || prompt.includes('output') || 
        prompt.includes('result') || prompt.includes('product')) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private countSpecificityKeywords(prompt: string): number {
    const lowerPrompt = prompt.toLowerCase();
    return this.specificityKeywords.filter(keyword => 
      lowerPrompt.includes(keyword)
    ).length;
  }

  private countActionWords(prompt: string): number {
    const lowerPrompt = prompt.toLowerCase();
    return this.actionWords.filter(word => 
      lowerPrompt.includes(word)
    ).length;
  }

  private countStructureElements(prompt: string): number {
    return this.structureIndicators.filter(regex => 
      regex.test(prompt)
    ).length;
  }

  private countDomainTerms(prompt: string): number {
    // Domain-specific patterns
    const domains = {
      web: ['website', 'web', 'html', 'css', 'javascript', 'responsive', 'ui', 'ux'],
      medical: ['doctor', 'patient', 'medical', 'healthcare', 'clinic', 'treatment'],
      academic: ['research', 'study', 'analysis', 'academic', 'scholarly', 'peer-reviewed'],
      business: ['business', 'company', 'strategy', 'market', 'customer', 'revenue'],
      technical: ['api', 'database', 'system', 'architecture', 'framework', 'algorithm']
    };

    const lowerPrompt = prompt.toLowerCase();
    let count = 0;
    
    Object.values(domains).forEach(terms => {
      terms.forEach(term => {
        if (lowerPrompt.includes(term)) count++;
      });
    });

    return count;
  }

  private identifyStrengths(original: QualityMetrics, enhanced: QualityMetrics): string[] {
    const strengths: string[] = [];
    
    if (enhanced.clarity > original.clarity + 0.1) strengths.push('Improved clarity and readability');
    if (enhanced.specificity > original.specificity + 0.1) strengths.push('Added specific details and requirements');
    if (enhanced.completeness > original.completeness + 0.1) strengths.push('Enhanced comprehensiveness');
    if (enhanced.structure > original.structure + 0.1) strengths.push('Better organization and structure');
    if (enhanced.actionability > original.actionability + 0.1) strengths.push('More actionable instructions');

    return strengths;
  }

  private identifyWeaknesses(metrics: QualityMetrics): string[] {
    const weaknesses: string[] = [];
    
    if (metrics.clarity < 0.7) weaknesses.push('Could be clearer and more readable');
    if (metrics.specificity < 0.7) weaknesses.push('Needs more specific details');
    if (metrics.completeness < 0.7) weaknesses.push('Missing comprehensive coverage');
    if (metrics.structure < 0.7) weaknesses.push('Could benefit from better organization');
    if (metrics.actionability < 0.7) weaknesses.push('Needs more actionable directives');

    return weaknesses;
  }

  private generateRecommendations(metrics: QualityMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.clarity < 0.8) {
      recommendations.push('Break down complex sentences and add clear structure');
    }
    if (metrics.specificity < 0.8) {
      recommendations.push('Add specific examples, requirements, and constraints');
    }
    if (metrics.completeness < 0.8) {
      recommendations.push('Include more comprehensive coverage of the topic');
    }
    if (metrics.structure < 0.8) {
      recommendations.push('Use numbered lists, bullet points, or clear sections');
    }
    if (metrics.actionability < 0.8) {
      recommendations.push('Add more specific action verbs and clear deliverables');
    }

    return recommendations;
  }

  // ============================================
  // COST-AWARE OPTIMIZATION METHODS
  // ============================================

  /** Average cost per 1K tokens (rough estimate across providers) */
  private static readonly AVG_COST_PER_1K_TOKENS = 0.002;

  /**
   * Calculate cost-aware metrics incorporating lambda penalty
   *
   * Optimization objective (Promptomatix formula):
   * Score = Quality - (λ × TokenCount / 1000)
   *
   * @param prompt - The prompt text to analyze
   * @param lambda - Lambda value (0.0 to 0.02). Higher = more length penalty
   * @returns Cost-aware metrics including optimization score
   */
  calculateCostAwareMetrics(
    prompt: string,
    lambda: number = DEFAULT_COST_CONFIG.lambda
  ): CostAwareMetrics {
    // Get base quality metrics
    const baseMetrics = this.calculateMetrics(prompt);

    // Estimate token count
    const tokenCount = estimateTokens(prompt);

    // Calculate optimization score with lambda penalty
    // Normalize token count to thousands for reasonable scale
    const lengthPenalty = lambda * (tokenCount / 1000);
    const optimizationScore = Math.max(0, baseMetrics.overall - lengthPenalty);

    // Calculate efficiency (quality per token)
    const lengthEfficiency = tokenCount > 0
      ? baseMetrics.overall / tokenCount
      : 0;

    // Estimate cost
    const estimatedCost = (tokenCount / 1000) * MetricsCalculator.AVG_COST_PER_1K_TOKENS;

    return {
      ...baseMetrics,
      tokenCount,
      optimizationScore,
      lengthEfficiency,
      costEstimate: {
        inputTokens: tokenCount,
        estimatedCost
      },
      lambdaUsed: lambda
    };
  }

  /**
   * Compare original and optimized prompts with cost analysis
   *
   * @param original - Original prompt
   * @param optimized - Optimized/compressed prompt
   * @param config - Cost optimization configuration
   * @returns Comparison metrics with token and cost savings
   */
  compareCostAware(
    original: string,
    optimized: string,
    config: CostOptimizationConfig = DEFAULT_COST_CONFIG
  ): CostComparisonMetrics {
    // Get base comparison
    const baseComparison = this.comparePrompts(original, optimized);

    // Calculate token metrics
    const originalTokens = estimateTokens(original);
    const optimizedTokens = estimateTokens(optimized);
    const tokensSaved = originalTokens - optimizedTokens;
    const percentageSaved = originalTokens > 0
      ? (tokensSaved / originalTokens) * 100
      : 0;

    // Calculate cost metrics
    const originalCost = (originalTokens / 1000) * MetricsCalculator.AVG_COST_PER_1K_TOKENS;
    const optimizedCost = (optimizedTokens / 1000) * MetricsCalculator.AVG_COST_PER_1K_TOKENS;
    const costSaved = originalCost - optimizedCost;

    // Check if quality threshold is maintained
    const optimizedMetrics = this.calculateMetrics(optimized);
    const qualityMaintained = optimizedMetrics.overall >= config.minQualityThreshold;

    return {
      ...baseComparison,
      tokenSavings: {
        originalTokens,
        optimizedTokens,
        tokensSaved,
        percentageSaved: Math.round(percentageSaved * 10) / 10
      },
      costSavings: {
        originalCost,
        optimizedCost,
        costSaved
      },
      qualityMaintained
    };
  }

  /**
   * Determine if optimization is worthwhile based on config
   *
   * @param original - Original prompt
   * @param optimized - Optimized prompt
   * @param config - Cost optimization configuration
   * @returns Whether to use the optimized version
   */
  shouldUseOptimized(
    original: string,
    optimized: string,
    config: CostOptimizationConfig = DEFAULT_COST_CONFIG
  ): {
    useOptimized: boolean;
    reason: string;
    metrics: CostComparisonMetrics;
  } {
    const comparison = this.compareCostAware(original, optimized, config);

    // Check quality threshold
    if (!comparison.qualityMaintained) {
      return {
        useOptimized: false,
        reason: `Quality dropped below threshold (${config.minQualityThreshold})`,
        metrics: comparison
      };
    }

    // Check if optimization actually reduced length
    if (comparison.tokenSavings.tokensSaved <= 0) {
      return {
        useOptimized: false,
        reason: 'No token savings achieved',
        metrics: comparison
      };
    }

    // Check compression ratio limit
    const compressionRatio = comparison.tokenSavings.percentageSaved / 100;
    if (compressionRatio > config.maxCompressionRatio) {
      return {
        useOptimized: false,
        reason: `Compression exceeded max ratio (${config.maxCompressionRatio * 100}%)`,
        metrics: comparison
      };
    }

    // Lambda = 0 means no optimization desired
    if (config.lambda === 0) {
      return {
        useOptimized: false,
        reason: 'Lambda is 0 (max quality mode)',
        metrics: comparison
      };
    }

    return {
      useOptimized: true,
      reason: `Saved ${comparison.tokenSavings.tokensSaved} tokens (${comparison.tokenSavings.percentageSaved}%) while maintaining quality`,
      metrics: comparison
    };
  }
}