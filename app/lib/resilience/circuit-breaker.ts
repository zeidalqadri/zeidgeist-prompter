/**
 * Circuit Breaker
 *
 * Wrapper around opossum circuit breaker with enhanced monitoring
 */

import CircuitBreaker from 'opossum';
import { CircuitBreakerOptions, CircuitBreakerMetrics, CircuitBreakerEvent, CircuitBreakerState } from './types';
import { logger } from '../observability/logger';
import { recordCircuitBreakerState, recordCircuitBreakerEvent } from '../observability/metrics';

export class EnhancedCircuitBreaker<TInput = any, TOutput = any> {
  private breaker: CircuitBreaker<[TInput], TOutput>;
  private name: string;
  private enabled: boolean;
  private events: CircuitBreakerEvent[] = [];
  private maxEventHistory: number = 100;

  constructor(
    fn: (input: TInput) => Promise<TOutput>,
    options: CircuitBreakerOptions = {}
  ) {
    this.name = options.name || 'unnamed-breaker';
    this.enabled = options.enabled ?? true;

    // Create opossum circuit breaker
    this.breaker = new CircuitBreaker(fn, {
      timeout: options.timeout ?? 10000, // 10s timeout
      errorThresholdPercentage: options.errorThresholdPercentage ?? 50, // 50% error rate opens circuit
      resetTimeout: options.resetTimeout ?? 30000, // 30s before attempting to close
      rollingCountTimeout: options.rollingCountTimeout ?? 10000, // 10s rolling window
      rollingCountBuckets: options.rollingCountBuckets ?? 10, // 10 buckets
      name: this.name,
      enabled: this.enabled
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Execute function through circuit breaker
   */
  async execute(input: TInput): Promise<TOutput> {
    if (!this.enabled) {
      // Circuit breaker disabled, execute directly
      return (this.breaker as any).action(input);
    }

    return this.breaker.fire(input);
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const stats = this.breaker.stats;
    const state = this.getState();

    return {
      name: this.name,
      state,
      failureCount: stats.failures,
      successCount: stats.successes,
      rejectedCount: stats.rejects,
      totalRequests: stats.fires,
      errorRate: stats.fires > 0 ? (stats.failures / stats.fires) * 100 : 0,
      lastStateChange: this.getLastStateChangeTime()
    };
  }

  /**
   * Get circuit breaker state
   */
  getState(): CircuitBreakerState {
    if (this.breaker.opened) return 'open';
    if (this.breaker.halfOpen) return 'half-open';
    return 'closed';
  }

  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.breaker.opened;
  }

  /**
   * Check if circuit is closed
   */
  isClosed(): boolean {
    return !this.breaker.opened && !this.breaker.halfOpen;
  }

  /**
   * Check if circuit is half-open
   */
  isHalfOpen(): boolean {
    return this.breaker.halfOpen;
  }

  /**
   * Manually open circuit
   */
  open(): void {
    this.breaker.open();
  }

  /**
   * Manually close circuit
   */
  close(): void {
    this.breaker.close();
  }

  /**
   * Get recent events
   */
  getEvents(limit?: number): CircuitBreakerEvent[] {
    if (limit) {
      return this.events.slice(-limit);
    }
    return [...this.events];
  }

  /**
   * Clear event history
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Enable circuit breaker
   */
  enable(): void {
    this.enabled = true;
    this.breaker.enable();
  }

  /**
   * Disable circuit breaker
   */
  disable(): void {
    this.enabled = false;
    this.breaker.disable();
  }

  /**
   * Shutdown circuit breaker
   */
  shutdown(): void {
    this.breaker.shutdown();
  }

  /**
   * Setup event listeners for monitoring
   */
  private setupEventListeners(): void {
    this.breaker.on('open', () => {
      const event: CircuitBreakerEvent = {
        type: 'open',
        timestamp: new Date()
      };
      this.addEvent(event);
      logger.warn(`Circuit breaker opened`, { name: this.name });
      recordCircuitBreakerState(this.name, 'open');
    });

    this.breaker.on('close', () => {
      const event: CircuitBreakerEvent = {
        type: 'close',
        timestamp: new Date()
      };
      this.addEvent(event);
      logger.info(`Circuit breaker closed`, { name: this.name });
      recordCircuitBreakerState(this.name, 'closed');
    });

    this.breaker.on('halfOpen', () => {
      const event: CircuitBreakerEvent = {
        type: 'halfOpen',
        timestamp: new Date()
      };
      this.addEvent(event);
      logger.info(`Circuit breaker half-open`, { name: this.name });
      recordCircuitBreakerState(this.name, 'half-open');
    });

    this.breaker.on('failure', (error: Error) => {
      const event: CircuitBreakerEvent = {
        type: 'failure',
        timestamp: new Date(),
        error
      };
      this.addEvent(event);
      logger.warn(`Circuit breaker failure`, { name: this.name, error: error.message });
      recordCircuitBreakerEvent(this.name, 'failure');
    });

    this.breaker.on('success', (result: TOutput) => {
      const event: CircuitBreakerEvent = {
        type: 'success',
        timestamp: new Date()
      };
      this.addEvent(event);
      recordCircuitBreakerEvent(this.name, 'success');
    });

    this.breaker.on('timeout', () => {
      const event: CircuitBreakerEvent = {
        type: 'timeout',
        timestamp: new Date(),
        error: new Error('Request timeout')
      };
      this.addEvent(event);
      logger.warn(`Circuit breaker timeout`, { name: this.name });
      recordCircuitBreakerEvent(this.name, 'timeout');
    });

    this.breaker.on('reject', () => {
      const event: CircuitBreakerEvent = {
        type: 'reject',
        timestamp: new Date(),
        error: new Error('Circuit breaker open')
      };
      this.addEvent(event);
      logger.warn(`Circuit breaker rejected request`, { name: this.name });
      recordCircuitBreakerEvent(this.name, 'reject');
    });
  }

  /**
   * Add event to history
   */
  private addEvent(event: CircuitBreakerEvent): void {
    this.events.push(event);

    // Keep only last N events
    if (this.events.length > this.maxEventHistory) {
      this.events = this.events.slice(-this.maxEventHistory);
    }
  }

  /**
   * Get last state change time
   */
  private getLastStateChangeTime(): Date {
    // Find most recent open/close/halfOpen event
    for (let i = this.events.length - 1; i >= 0; i--) {
      const event = this.events[i];
      if (event.type === 'open' || event.type === 'close' || event.type === 'halfOpen') {
        return event.timestamp;
      }
    }

    // No state change events, return current time
    return new Date();
  }
}

/**
 * Circuit Breaker Factory
 *
 * Manages circuit breaker instances per provider
 */
export class CircuitBreakerFactory {
  private static breakers: Map<string, EnhancedCircuitBreaker<any, any>> = new Map();

  /**
   * Get or create circuit breaker for a provider
   */
  static getBreaker<TInput = any, TOutput = any>(
    name: string,
    fn: (input: TInput) => Promise<TOutput>,
    options?: CircuitBreakerOptions
  ): EnhancedCircuitBreaker<TInput, TOutput> {
    if (!this.breakers.has(name)) {
      const breaker = new EnhancedCircuitBreaker(fn, {
        ...options,
        name
      });
      this.breakers.set(name, breaker);
    }

    return this.breakers.get(name) as EnhancedCircuitBreaker<TInput, TOutput>;
  }

  /**
   * Get all circuit breaker metrics
   */
  static getAllMetrics(): CircuitBreakerMetrics[] {
    return Array.from(this.breakers.values()).map(breaker => breaker.getMetrics());
  }

  /**
   * Get breaker by name
   */
  static getBreakerByName(name: string): EnhancedCircuitBreaker<any, any> | undefined {
    return this.breakers.get(name);
  }

  /**
   * Reset all circuit breakers
   */
  static resetAll(): void {
    this.breakers.forEach(breaker => {
      breaker.close();
      breaker.clearEvents();
    });
  }

  /**
   * Shutdown all circuit breakers
   */
  static shutdownAll(): void {
    this.breakers.forEach(breaker => breaker.shutdown());
    this.breakers.clear();
  }
}
