/**
 * Resilience Types
 *
 * Type definitions for circuit breakers and retry policies
 */

export interface CircuitBreakerOptions {
  timeout?: number; // Request timeout in ms (default: 10000)
  errorThresholdPercentage?: number; // % of failures to open circuit (default: 50)
  resetTimeout?: number; // Time before attempting to close circuit (default: 30000)
  rollingCountTimeout?: number; // Rolling window for error calculation (default: 10000)
  rollingCountBuckets?: number; // Number of buckets in rolling window (default: 10)
  name?: string; // Circuit breaker name for monitoring
  enabled?: boolean; // Whether circuit breaker is enabled (default: true)
}

export interface CircuitBreakerMetrics {
  name: string;
  state: 'open' | 'closed' | 'half-open';
  failureCount: number;
  successCount: number;
  rejectedCount: number;
  totalRequests: number;
  errorRate: number;
  lastStateChange: Date;
}

export interface RetryOptions {
  maxAttempts?: number; // Maximum retry attempts (default: 3)
  initialDelay?: number; // Initial delay in ms (default: 1000)
  maxDelay?: number; // Maximum delay in ms (default: 10000)
  backoffMultiplier?: number; // Multiplier for exponential backoff (default: 2)
  jitterFactor?: number; // Random jitter factor 0-1 (default: 0.1)
  retryableErrors?: string[]; // Error types that should trigger retry
}

export interface RetryContext {
  attempt: number;
  maxAttempts: number;
  lastError: Error;
  totalDelay: number;
}

export type CircuitBreakerState = 'open' | 'closed' | 'half-open';

export interface CircuitBreakerEvent {
  type: 'open' | 'close' | 'halfOpen' | 'failure' | 'success' | 'timeout' | 'reject';
  timestamp: Date;
  error?: Error;
  duration?: number;
}
