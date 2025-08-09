/**
 * Advanced Context Management System
 * Handles context compression, prioritization, and optimization
 */

import { LRUCache } from 'lru-cache';

export interface ContextChunk {
  id: string;
  content: string;
  type: 'system' | 'user' | 'assistant' | 'context';
  priority: number;
  tokens: number;
  metadata: {
    domain?: string;
    timestamp?: Date;
    source?: string;
    relevance_score?: number;
  };
}

export interface ContextWindow {
  total_tokens: number;
  chunks: ContextChunk[];
  compression_ratio: number;
  strategy_used: string;
}

export class AdvancedContextManager {
  private tokenCache: LRUCache<string, number>;
  private compressionCache: LRUCache<string, string>;
  private readonly maxTokens: number;
  
  constructor(maxTokens: number = 4096) {
    this.maxTokens = maxTokens;
    this.tokenCache = new LRUCache<string, number>({ max: 1000 });
    this.compressionCache = new LRUCache<string, string>({ max: 500 });
  }
  
  /**
   * Intelligent context optimization with multiple strategies
   */
  async optimizeContext(chunks: ContextChunk[]): Promise<ContextWindow> {
    // Calculate initial token usage
    const totalTokens = chunks.reduce((sum, chunk) => sum + this.estimateTokens(chunk.content), 0);
    
    if (totalTokens <= this.maxTokens) {
      return {
        total_tokens: totalTokens,
        chunks,
        compression_ratio: 1.0,
        strategy_used: 'no_compression'
      };
    }
    
    // Apply optimization strategies in order of preference
    const strategies = [
      this.priorityBasedSelection,
      this.semanticCompression,
      this.hierarchicalCompression,
      this.aggressiveCompression
    ];
    
    for (const strategy of strategies) {
      const result = await strategy.call(this, chunks);
      if (result.total_tokens <= this.maxTokens) {
        return result;
      }
    }
    
    // Fallback: Use only highest priority chunks
    return await this.emergencyTruncation(chunks);
  }
  
  /**
   * Priority-based chunk selection
   */
  private async priorityBasedSelection(chunks: ContextChunk[]): Promise<ContextWindow> {
    const sorted = [...chunks].sort((a, b) => b.priority - a.priority);
    const selected: ContextChunk[] = [];
    let tokenCount = 0;
    
    for (const chunk of sorted) {
      const chunkTokens = this.estimateTokens(chunk.content);
      if (tokenCount + chunkTokens <= this.maxTokens) {
        selected.push(chunk);
        tokenCount += chunkTokens;
      }
    }
    
    return {
      total_tokens: tokenCount,
      chunks: selected,
      compression_ratio: selected.length / chunks.length,
      strategy_used: 'priority_selection'
    };
  }
  
  /**
   * Semantic compression using abstractive summarization
   */
  private async semanticCompression(chunks: ContextChunk[]): Promise<ContextWindow> {
    const compressedChunks: ContextChunk[] = [];
    let totalTokens = 0;
    
    for (const chunk of chunks) {
      const compressed = await this.compressChunk(chunk);
      compressedChunks.push(compressed);
      totalTokens += compressed.tokens;
    }
    
    return {
      total_tokens: totalTokens,
      chunks: compressedChunks,
      compression_ratio: totalTokens / chunks.reduce((sum, c) => sum + c.tokens, 0),
      strategy_used: 'semantic_compression'
    };
  }
  
  /**
   * Hierarchical compression - compress less important sections more aggressively
   */
  private async hierarchicalCompression(chunks: ContextChunk[]): Promise<ContextWindow> {
    const strategyMap = new Map([
      [1.0, 0.3], // High priority: 30% compression
      [0.8, 0.5], // Medium priority: 50% compression
      [0.6, 0.7], // Low priority: 70% compression
      [0.4, 0.8], // Very low priority: 80% compression
    ]);
    
    const processedChunks: ContextChunk[] = [];
    
    for (const chunk of chunks) {
      const targetRatio = this.getCompressionRatio(chunk.priority, strategyMap);
      const targetTokens = Math.ceil(chunk.tokens * (1 - targetRatio));
      
      if (targetTokens < chunk.tokens) {
        const compressed = await this.compressToTarget(chunk, targetTokens);
        processedChunks.push(compressed);
      } else {
        processedChunks.push(chunk);
      }
    }
    
    const totalTokens = processedChunks.reduce((sum, c) => sum + c.tokens, 0);
    
    return {
      total_tokens: totalTokens,
      chunks: processedChunks,
      compression_ratio: totalTokens / chunks.reduce((sum, c) => sum + c.tokens, 0),
      strategy_used: 'hierarchical_compression'
    };
  }
  
  /**
   * Aggressive compression for extreme cases
   */
  private async aggressiveCompression(chunks: ContextChunk[]): Promise<ContextWindow> {
    // Keep only system prompts and highest priority user content
    const systemChunks = chunks.filter(c => c.type === 'system');
    const otherChunks = chunks
      .filter(c => c.type !== 'system')
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3); // Keep only top 3 non-system chunks
    
    const selectedChunks = [...systemChunks, ...otherChunks];
    
    // Compress all chunks by 60%
    const compressedChunks = await Promise.all(
      selectedChunks.map(chunk => this.compressToTarget(chunk, Math.ceil(chunk.tokens * 0.4)))
    );
    
    const totalTokens = compressedChunks.reduce((sum, c) => sum + c.tokens, 0);
    
    return {
      total_tokens: totalTokens,
      chunks: compressedChunks,
      compression_ratio: totalTokens / chunks.reduce((sum, c) => sum + c.tokens, 0),
      strategy_used: 'aggressive_compression'
    };
  }
  
  /**
   * Emergency truncation - last resort
   */
  private async emergencyTruncation(chunks: ContextChunk[]): Promise<ContextWindow> {
    const systemChunks = chunks.filter(c => c.type === 'system');
    let remainingTokens = this.maxTokens - systemChunks.reduce((sum, c) => sum + c.tokens, 0);
    
    const selectedChunks = [...systemChunks];
    
    const otherChunks = chunks
      .filter(c => c.type !== 'system')
      .sort((a, b) => b.priority - a.priority);
    
    for (const chunk of otherChunks) {
      if (remainingTokens <= 0) break;
      
      if (chunk.tokens <= remainingTokens) {
        selectedChunks.push(chunk);
        remainingTokens -= chunk.tokens;
      } else {
        // Truncate the chunk to fit
        const truncated = await this.truncateChunk(chunk, remainingTokens);
        selectedChunks.push(truncated);
        remainingTokens = 0;
      }
    }
    
    const totalTokens = selectedChunks.reduce((sum, c) => sum + c.tokens, 0);
    
    return {
      total_tokens: totalTokens,
      chunks: selectedChunks,
      compression_ratio: totalTokens / chunks.reduce((sum, c) => sum + c.tokens, 0),
      strategy_used: 'emergency_truncation'
    };
  }
  
  /**
   * Compress a single chunk
   */
  private async compressChunk(chunk: ContextChunk): Promise<ContextChunk> {
    const cacheKey = `compress_${chunk.id}_${chunk.content.length}`;
    const cached = this.compressionCache.get(cacheKey);
    
    if (cached) {
      return {
        ...chunk,
        content: cached,
        tokens: this.estimateTokens(cached)
      };
    }
    
    // Apply compression techniques
    let compressed = chunk.content;
    
    // Remove redundant whitespace
    compressed = compressed.replace(/\s+/g, ' ').trim();
    
    // Remove redundant punctuation
    compressed = compressed.replace(/\.{2,}/g, '.');
    compressed = compressed.replace(/,\s*,/g, ',');
    
    // Simplify verbose constructions
    const simplifications = [
      [/in order to/gi, 'to'],
      [/at the present time/gi, 'now'],
      [/in the event that/gi, 'if'],
      [/due to the fact that/gi, 'because'],
      [/in spite of the fact that/gi, 'although'],
      [/it is important to note that/gi, 'note:'],
      [/please keep in mind that/gi, 'remember:']
    ];
    
    for (const [pattern, replacement] of simplifications) {
      compressed = compressed.replace(pattern, replacement as string);
    }
    
    // Extract key sentences if still too long
    if (compressed.length > chunk.content.length * 0.8) {
      compressed = this.extractKeySentences(compressed, 0.7);
    }
    
    this.compressionCache.set(cacheKey, compressed);
    
    return {
      ...chunk,
      content: compressed,
      tokens: this.estimateTokens(compressed)
    };
  }
  
  /**
   * Compress chunk to specific token target
   */
  private async compressToTarget(chunk: ContextChunk, targetTokens: number): Promise<ContextChunk> {
    if (chunk.tokens <= targetTokens) {
      return chunk;
    }
    
    const compressionRatio = targetTokens / chunk.tokens;
    let compressed = chunk.content;
    
    // Apply increasingly aggressive compression
    if (compressionRatio > 0.8) {
      // Light compression: remove redundancy
      compressed = this.lightCompression(compressed);
    } else if (compressionRatio > 0.6) {
      // Medium compression: extract key sentences
      compressed = this.extractKeySentences(compressed, compressionRatio + 0.1);
    } else if (compressionRatio > 0.4) {
      // Heavy compression: extract key points
      compressed = this.extractKeyPoints(compressed);
    } else {
      // Extreme compression: bullet points only
      compressed = this.createBulletSummary(compressed);
    }
    
    return {
      ...chunk,
      content: compressed,
      tokens: this.estimateTokens(compressed)
    };
  }
  
  /**
   * Truncate chunk to fit token limit
   */
  private async truncateChunk(chunk: ContextChunk, maxTokens: number): Promise<ContextChunk> {
    const sentences = chunk.content.split(/(?<=[.!?])\s+/);
    let content = '';
    let tokens = 0;
    
    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence);
      if (tokens + sentenceTokens <= maxTokens) {
        content += sentence + ' ';
        tokens += sentenceTokens;
      } else {
        break;
      }
    }
    
    if (!content.trim()) {
      // If no complete sentence fits, truncate by words
      const words = chunk.content.split(/\s+/);
      const wordsPerToken = words.length / chunk.tokens;
      const maxWords = Math.floor(maxTokens * wordsPerToken);
      content = words.slice(0, maxWords).join(' ') + '...';
    }
    
    return {
      ...chunk,
      content: content.trim(),
      tokens: this.estimateTokens(content.trim())
    };
  }
  
  /**
   * Light compression - remove redundancy
   */
  private lightCompression(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\.{2,}/g, '.')
      .replace(/,\s*,/g, ',')
      .trim();
  }
  
  /**
   * Extract key sentences based on importance
   */
  private extractKeySentences(text: string, ratio: number): string {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const targetCount = Math.max(1, Math.ceil(sentences.length * ratio));
    
    // Score sentences by importance indicators
    const scoredSentences = sentences.map((sentence, index) => ({
      sentence,
      score: this.scoreSentence(sentence, index, sentences.length)
    }));
    
    // Select top sentences
    const selected = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, targetCount)
      .sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence))
      .map(item => item.sentence);
    
    return selected.join(' ');
  }
  
  /**
   * Extract key points as bullet list
   */
  private extractKeyPoints(text: string): string {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const keyPoints = sentences
      .filter(sentence => this.isKeyPoint(sentence))
      .slice(0, 5) // Max 5 key points
      .map(point => `• ${point.trim()}`)
      .join('\n');
    
    return keyPoints || text.substring(0, 200) + '...';
  }
  
  /**
   * Create bullet point summary
   */
  private createBulletSummary(text: string): string {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const bullets = sentences
      .slice(0, 3) // Max 3 bullets
      .map(sentence => `• ${sentence.trim().substring(0, 50)}...`)
      .join('\n');
    
    return bullets;
  }
  
  /**
   * Score sentence importance
   */
  private scoreSentence(sentence: string, index: number, total: number): number {
    let score = 0;
    
    // Position bonus (first and last sentences often important)
    if (index === 0) score += 2;
    if (index === total - 1) score += 1;
    if (index < total * 0.2) score += 1; // Early sentences
    
    // Content indicators
    const importanceWords = [
      'important', 'crucial', 'essential', 'key', 'main', 'primary',
      'must', 'should', 'required', 'necessary', 'critical', 'vital',
      'first', 'second', 'finally', 'conclusion', 'summary'
    ];
    
    const lowerSentence = sentence.toLowerCase();
    for (const word of importanceWords) {
      if (lowerSentence.includes(word)) {
        score += 1;
      }
    }
    
    // Length penalty (very short or very long sentences less important)
    const length = sentence.split(/\s+/).length;
    if (length < 5 || length > 30) score -= 1;
    
    return score;
  }
  
  /**
   * Check if sentence contains key point
   */
  private isKeyPoint(sentence: string): boolean {
    const indicators = [
      'important', 'key', 'main', 'primary', 'essential', 'crucial',
      'must', 'should', 'required', 'note that', 'remember'
    ];
    
    const lower = sentence.toLowerCase();
    return indicators.some(indicator => lower.includes(indicator));
  }
  
  /**
   * Estimate token count (cached)
   */
  private estimateTokens(text: string): number {
    const cached = this.tokenCache.get(text);
    if (cached !== undefined) {
      return cached;
    }
    
    // Improved token estimation
    // GPT-4 style: ~4 characters per token on average
    // But adjust for common patterns
    let tokens = Math.ceil(text.length / 4);
    
    // Adjust for common patterns
    const words = text.split(/\s+/).length;
    const punctuation = (text.match(/[.!?,;:]/g) || []).length;
    const numbers = (text.match(/\d+/g) || []).length;
    
    // More accurate estimation
    tokens = Math.ceil(words * 0.75 + punctuation * 0.25 + numbers * 0.5);
    
    this.tokenCache.set(text, tokens);
    return tokens;
  }
  
  /**
   * Get compression ratio based on priority
   */
  private getCompressionRatio(priority: number, strategyMap: Map<number, number>): number {
    for (const [threshold, ratio] of strategyMap) {
      if (priority >= threshold) {
        return ratio;
      }
    }
    return 0.8; // Default heavy compression
  }
  
  /**
   * Create context chunks from raw data
   */
  createChunks(data: Array<{
    content: string;
    type: 'system' | 'user' | 'assistant' | 'context';
    priority?: number;
    metadata?: any;
  }>): ContextChunk[] {
    return data.map((item, index) => ({
      id: `chunk_${index}_${Date.now()}`,
      content: item.content,
      type: item.type,
      priority: item.priority || this.calculateDefaultPriority(item.type),
      tokens: this.estimateTokens(item.content),
      metadata: item.metadata || {}
    }));
  }
  
  /**
   * Calculate default priority based on chunk type
   */
  private calculateDefaultPriority(type: string): number {
    const priorityMap = {
      'system': 1.0,
      'user': 0.8,
      'assistant': 0.6,
      'context': 0.4
    };
    return priorityMap[type as keyof typeof priorityMap] || 0.3;
  }
}