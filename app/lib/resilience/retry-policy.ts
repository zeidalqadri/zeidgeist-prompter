/**
 * Retry Policy
 *
 * Implements retry logic with exponential backoff and jitter
 */

import { RetryOptions, RetryContext } from './types';

export class RetryPolicy {
  private options: Required<RetryOptions>;

  constructor(options: RetryOptions = {}) {
    this.options = {
      maxAttempts: options.maxAttempts ?? 3,
      initialDelay: options.initialDelay ?? 1000,
      maxDelay: options.maxDelay ?? 10000,
      backoffMultiplier: options.backoffMultiplier ?? 2,
      jitterFactor: options.jitterFactor ?? 0.1,
      retryableErrors: options.retryableErrors ?? [
        'ETIMEDOUT',
        'ECONNREFUSED',
        'ENOTFOUND',
        'ENETUNREACH',
        'EAI_AGAIN'
      ]
    };
  }

  /**
   * Execute function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    context: { name?: string } = {}
  ): Promise<T> {
    let lastError: Error | null = null;
    let totalDelay = 0;

    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (!this.isRetryableError(error as Error)) {
          console.warn(`[Retry Policy] Non-retryable error for ${context.name}:`, error);
          throw error;
        }

        // Don't retry if this was the last attempt
        if (attempt >= this.options.maxAttempts) {
          console.error(
            `[Retry Policy] Max retries (${this.options.maxAttempts}) reached for ${context.name}`
          );
          throw error;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt);
        totalDelay += delay;

        console.warn(
          `[Retry Policy] Attempt ${attempt}/${this.options.maxAttempts} failed for ${context.name}. ` +
          `Retrying in ${delay}ms...`
        );

        await this.sleep(delay);
      }
    }

    // This should never be reached, but TypeScript requires it
    throw lastError || new Error('Retry failed');
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    // Exponential backoff: initialDelay * (backoffMultiplier ^ (attempt - 1))
    const exponentialDelay = this.options.initialDelay * Math.pow(
      this.options.backoffMultiplier,
      attempt - 1
    );

    // Cap at maxDelay
    const cappedDelay = Math.min(exponentialDelay, this.options.maxDelay);

    // Add jitter: random value between (1 - jitter) and (1 + jitter) times the delay
    const jitterRange = cappedDelay * this.options.jitterFactor;
    const jitter = (Math.random() * 2 - 1) * jitterRange;

    return Math.round(cappedDelay + jitter);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    // Check error code
    if ('code' in error && typeof error.code === 'string') {
      if (this.options.retryableErrors.includes(error.code)) {
        return true;
      }
    }

    // Check error message for common retryable patterns
    const message = error.message.toLowerCase();
    const retryablePatterns = [
      'timeout',
      'connection',
      'network',
      'econnrefused',
      'enotfound',
      'etimedout',
      '503',
      '502',
      '504',
      'rate limit'
    ];

    return retryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get retry options
   */
  getOptions(): Required<RetryOptions> {
    return { ...this.options };
  }
}

/**
 * Convenience function to retry an operation
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const policy = new RetryPolicy(options);
  return policy.execute(fn);
}
