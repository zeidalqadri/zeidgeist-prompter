/**
 * Centralized Prompt Repository
 * Manages prompt versions, categories, and templates
 */

import { db } from '../db';
import { prompts, promptVersions } from '../db/schema';
import { eq, desc, and, like, sql } from 'drizzle-orm';
import crypto from 'crypto';

export interface PromptSearchFilters {
  category?: string;
  tags?: string[];
  quality_min?: number;
  date_from?: Date;
  date_to?: Date;
  text_search?: string;
}

export interface PromptMetadata {
  domain: string;
  complexity_level: 'basic' | 'intermediate' | 'advanced';
  estimated_tokens: number;
  language?: string;
  use_cases: string[];
}

export class PromptRepository {
  private static instance: PromptRepository;

  private constructor() {}

  static getInstance(): PromptRepository {
    if (!PromptRepository.instance) {
      PromptRepository.instance = new PromptRepository();
    }
    return PromptRepository.instance;
  }

  /**
   * Get system prompts for different enhancement types
   */
  getSystemPrompt(_type: string, _variant: string): string {
    // For now, return a basic template - this could be expanded to load from database
    return "Enhanced system prompt template";
  }
  
  /**
   * Store a new prompt with versioning
   */
  async storePrompt(data: {
    original: string;
    enhanced: string;
    context?: string;
    category_id: string;
    metadata: PromptMetadata;
    quality_score?: number;
    source: string;
  }): Promise<string> {
    return await db.transaction(async (tx) => {
      // Check if similar prompt exists
      const existing = await this.findSimilarPrompt(data.original);
      
      if (existing) {
        // Create new version
        const [version] = await tx.insert(promptVersions).values({
          promptId: existing.id,
          enhancedText: data.enhanced,
          qualityScore: data.quality_score || 0,
          metricsData: JSON.stringify(data.metadata),
          enhancementSource: data.source,
          versionNumber: existing.latestVersion + 1
        }).returning({ id: promptVersions.id });
        
        // Update main prompt record
        await tx.update(prompts).set({
          latestVersion: existing.latestVersion + 1,
          updatedAt: new Date()
        }).where(eq(prompts.id, existing.id));
        
        return version.id;
      } else {
        // Create new prompt
        const textHash = crypto.createHash('sha256').update(data.original).digest('hex');
        const [prompt] = await tx.insert(prompts).values({
          originalText: data.original,
          textHash: textHash,
          categoryId: data.category_id || null,
          latestVersion: 1,
          totalUses: 0
        }).returning({ id: prompts.id });
        
        // Create first version
        const [version] = await tx.insert(promptVersions).values({
          promptId: prompt.id,
          enhancedText: data.enhanced,
          qualityScore: data.quality_score || 0,
          metricsData: JSON.stringify(data.metadata),
          enhancementSource: data.source,
          versionNumber: 1
        }).returning({ id: promptVersions.id });
        
        return version.id;
      }
    });
  }
  
  /**
   * Retrieve prompt with all versions
   */
  async getPromptVersions(promptId: string): Promise<{
    prompt: any;
    versions: any[];
  }> {
    const prompt = await db.select()
      .from(prompts)
      .where(eq(prompts.id, promptId))
      .limit(1);
    
    if (!prompt.length) {
      throw new Error('Prompt not found');
    }
    
    const versions = await db.select()
      .from(promptVersions)
      .where(eq(promptVersions.promptId, promptId))
      .orderBy(desc(promptVersions.versionNumber));
    
    return {
      prompt: prompt[0],
      versions
    };
  }
  
  /**
   * Search prompts with basic filtering
   */
  async searchPrompts(
    filters: PromptSearchFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    prompts: any[];
    total: number;
  }> {
    // Build conditions
    const conditions = [];
    
    if (filters.text_search) {
      conditions.push(like(prompts.originalText, `%${filters.text_search}%`));
    }
    
    // Build query with or without conditions
    const baseQuery = db.select({
      id: prompts.id,
      originalText: prompts.originalText,
      latestVersion: prompts.latestVersion,
      totalUses: prompts.totalUses,
      createdAt: prompts.createdAt
    }).from(prompts);
    
    const results = conditions.length > 0 
      ? await baseQuery
          .where(and(...conditions))
          .limit(limit)
          .offset(offset)
          .orderBy(desc(prompts.createdAt))
      : await baseQuery
          .limit(limit)
          .offset(offset)
          .orderBy(desc(prompts.createdAt));
    
    // Get total count for pagination
    const totalQuery = await db.select().from(prompts);
    
    return {
      prompts: results,
      total: totalQuery.length
    };
  }
  
  /**
   * Get prompt recommendations based on similarity
   */
  async getRecommendations(
    promptText: string,
    limit: number = 10
  ): Promise<any[]> {
    // Simple keyword-based similarity for now
    // In production, this would use vector similarity
    const keywords = this.extractKeywords(promptText);
    
    if (keywords.length === 0) {
      return [];
    }
    
    const results = await db.select({
      id: prompts.id,
      originalText: prompts.originalText,
      totalUses: prompts.totalUses
    })
    .from(prompts)
    .where(like(prompts.originalText, `%${keywords[0]}%`))
    .limit(limit)
    .orderBy(desc(prompts.totalUses));
    
    return results;
  }
  
  /**
   * Create or get prompt category (simplified)
   */
  async getOrCreateCategory(_name: string, _description?: string): Promise<string> {
    // For now, return a default category ID
    // This would be implemented when categories table is added
    return 'default';
  }
  
  /**
   * Update prompt usage statistics
   */
  async recordUsage(promptId: string, _success: boolean): Promise<void> {
    await db.update(prompts).set({
      totalUses: sql`${prompts.totalUses} + 1`,
      updatedAt: new Date()
    }).where(eq(prompts.id, promptId));
  }
  
  /**
   * Find similar existing prompt
   */
  private async findSimilarPrompt(text: string): Promise<any | null> {
    // Simple similarity check - in production use vector similarity
    const textWords = new Set(text.toLowerCase().split(/\s+/));
    const minSimilarity = 0.7;
    
    const candidates = await db.select()
      .from(prompts)
      .limit(100); // Get recent prompts for comparison
    
    for (const candidate of candidates) {
      const candidateWords = new Set(candidate.originalText.toLowerCase().split(/\s+/));
      const intersection = new Set([...textWords].filter(x => candidateWords.has(x)));
      const union = new Set([...textWords, ...candidateWords]);
      const similarity = intersection.size / union.size;
      
      if (similarity >= minSimilarity) {
        return candidate;
      }
    }
    
    return null;
  }
  
  /**
   * Extract keywords from prompt text
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'is', 'are', 'was', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this',
      'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Top 10 keywords
  }
  
  /**
   * Get trending prompts based on recent usage
   */
  async getTrendingPrompts(limit: number = 20): Promise<any[]> {
    return await db.select({
      id: prompts.id,
      originalText: prompts.originalText,
      totalUses: prompts.totalUses
    })
    .from(prompts)
    .orderBy(desc(prompts.totalUses))
    .limit(limit);
  }
}