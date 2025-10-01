/**
 * Prompt Engineer Service
 *
 * Business logic layer for prompt enhancement operations
 * Separates data operations from UI components
 */

export interface EnhancedPrompt {
  enhanced: string;
  metadata?: {
    source?: string;
    processingTime?: number;
  };
}

export interface HistoryItem {
  original: string;
  refined: string;
  context?: string;
  timestamp: Date;
  metadata?: {
    source?: string;
    model?: string;
    processingTime?: number;
  };
}

export interface FeedbackData {
  originalPrompt: string;
  enhancedPrompt: string;
  wasSuccessful: boolean;
  score: number;
  feedbackText?: string;
}

export class PromptEngineerService {
  private baseUrl: string;
  private maxRetries: number;
  private retryDelay: number;

  constructor(baseUrl: string = '/api', maxRetries: number = 3, retryDelay: number = 1000) {
    this.baseUrl = baseUrl;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  /**
   * Enhance a prompt
   */
  async enhancePrompt(
    prompt: string,
    context?: string,
    isRefinement: boolean = false
  ): Promise<EnhancedPrompt> {
    const startTime = Date.now();

    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/enhance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          context: context || undefined,
          isRefinement
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `Enhancement failed with status ${response.status}`);
      }

      const data = await response.json();
      const processingTime = Date.now() - startTime;

      return {
        enhanced: data.result,
        metadata: {
          source: data.metadata?.source,
          processingTime: data.metadata?.processingTime || processingTime
        }
      };
    } catch (error) {
      console.error('[Prompt Service] Enhancement failed:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to enhance prompt'
      );
    }
  }

  /**
   * Get prompt history
   */
  async getHistory(limit: number = 20): Promise<HistoryItem[]> {
    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/history?limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.status}`);
      }

      const data = await response.json();

      // Transform API response to HistoryItem format
      return (data.items || []).map((item: any) => ({
        original: item.original,
        refined: item.refined,
        context: item.context,
        timestamp: new Date(item.timestamp),
        metadata: item.metadata
      }));
    } catch (error) {
      console.error('[Prompt Service] Failed to fetch history:', error);
      // Return empty array on error to allow UI to function
      return [];
    }
  }

  /**
   * Submit feedback
   */
  async submitFeedback(feedback: FeedbackData): Promise<void> {
    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedback),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit feedback: ${response.status}`);
      }

      console.log('[Prompt Service] Feedback submitted successfully');
    } catch (error) {
      console.error('[Prompt Service] Failed to submit feedback:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to submit feedback'
      );
    }
  }

  /**
   * Fetch with automatic retry logic
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attempt: number = 1
  ): Promise<Response> {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000) // 30s timeout
      });

      // Retry on 5xx errors
      if (response.status >= 500 && attempt < this.maxRetries) {
        console.warn(`[Prompt Service] Request failed (${response.status}), retrying (${attempt}/${this.maxRetries})...`);
        await this.delay(this.retryDelay * attempt); // Exponential backoff
        return this.fetchWithRetry(url, options, attempt + 1);
      }

      return response;
    } catch (error) {
      // Retry on network errors
      if (attempt < this.maxRetries) {
        console.warn(`[Prompt Service] Network error, retrying (${attempt}/${this.maxRetries})...`);
        await this.delay(this.retryDelay * attempt);
        return this.fetchWithRetry(url, options, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate prompt input
   */
  static validatePrompt(prompt: string): { valid: boolean; error?: string } {
    if (!prompt || prompt.trim() === '') {
      return { valid: false, error: 'Prompt cannot be empty' };
    }

    if (prompt.length > 10000) {
      return { valid: false, error: 'Prompt is too long (max 10,000 characters)' };
    }

    return { valid: true };
  }

  /**
   * Validate context input
   */
  static validateContext(context: string): { valid: boolean; error?: string } {
    if (context && context.length > 5000) {
      return { valid: false, error: 'Context is too long (max 5,000 characters)' };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const promptService = new PromptEngineerService();
