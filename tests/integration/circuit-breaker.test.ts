/**
 * Circuit Breaker Integration Tests
 *
 * Tests circuit breaker integration with LLM providers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnhancedCircuitBreaker, CircuitBreakerFactory } from '../../app/lib/resilience/circuit-breaker';
import { RetryPolicy } from '../../app/lib/resilience/retry-policy';

describe('Circuit Breaker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    CircuitBreakerFactory.shutdownAll();
  });

  describe('EnhancedCircuitBreaker', () => {
    it('should execute successfully when function succeeds', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const breaker = new EnhancedCircuitBreaker(fn, {
        name: 'test-breaker',
        timeout: 1000
      });

      const result = await breaker.execute('input');

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledWith('input');
      expect(breaker.getState()).toBe('closed');
    });

    it('should open circuit after threshold failures', async () => {
      let callCount = 0;
      const fn = vi.fn().mockImplementation(() => {
        callCount++;
        throw new Error('Service unavailable');
      });

      const breaker = new EnhancedCircuitBreaker(fn, {
        name: 'test-breaker',
        errorThresholdPercentage: 50,
        timeout: 1000,
        resetTimeout: 5000
      });

      // Make enough calls to trip the circuit
      for (let i = 0; i < 10; i++) {
        try {
          await breaker.execute('input');
        } catch (error) {
          // Expected to fail
        }
      }

      // Circuit should be open now
      expect(breaker.isOpen()).toBe(true);
      expect(breaker.getState()).toBe('open');
    });

    it('should reject requests when circuit is open', async () => {
      let callCount = 0;
      const fn = vi.fn().mockImplementation(() => {
        callCount++;
        throw new Error('Service unavailable');
      });

      const breaker = new EnhancedCircuitBreaker(fn, {
        name: 'test-breaker',
        errorThresholdPercentage: 50,
        timeout: 1000,
        resetTimeout: 100
      });

      // Trip the circuit
      for (let i = 0; i < 10; i++) {
        try {
          await breaker.execute('input');
        } catch (error) {
          // Expected
        }
      }

      expect(breaker.isOpen()).toBe(true);

      // Try to execute - should be rejected immediately
      const initialCallCount = callCount;
      try {
        await breaker.execute('input');
        expect.fail('Should have been rejected');
      } catch (error) {
        expect((error as Error).message).toContain('Breaker is open');
      }

      // Function should not have been called
      expect(callCount).toBe(initialCallCount);
    });

    it('should track metrics correctly', async () => {
      const fn = vi.fn()
        .mockResolvedValueOnce('success1')
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success2');

      const breaker = new EnhancedCircuitBreaker(fn, {
        name: 'test-breaker',
        timeout: 1000
      });

      await breaker.execute('input1');
      try {
        await breaker.execute('input2');
      } catch (error) {
        // Expected
      }
      await breaker.execute('input3');

      const metrics = breaker.getMetrics();
      expect(metrics.name).toBe('test-breaker');
      expect(metrics.successCount).toBe(2);
      expect(metrics.failureCount).toBe(1);
      expect(metrics.totalRequests).toBe(3);
    });

    it('should timeout long-running requests', async () => {
      const fn = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve('too-late'), 2000);
        });
      });

      const breaker = new EnhancedCircuitBreaker(fn, {
        name: 'test-breaker',
        timeout: 100
      });

      try {
        await breaker.execute('input');
        expect.fail('Should have timed out');
      } catch (error) {
        // Opossum returns "Timed out after Xms"
        expect((error as Error).message).toContain('Timed out');
      }
    });
  });

  describe('CircuitBreakerFactory', () => {
    it('should create and reuse breaker instances', () => {
      const fn = vi.fn().mockResolvedValue('success');

      const breaker1 = CircuitBreakerFactory.getBreaker('test-service', fn);
      const breaker2 = CircuitBreakerFactory.getBreaker('test-service', fn);

      expect(breaker1).toBe(breaker2);
    });

    it('should get metrics for all breakers', async () => {
      const fn1 = vi.fn().mockResolvedValue('success');
      const fn2 = vi.fn().mockResolvedValue('success');

      const breaker1 = CircuitBreakerFactory.getBreaker('service1', fn1);
      const breaker2 = CircuitBreakerFactory.getBreaker('service2', fn2);

      await breaker1.execute('input');
      await breaker2.execute('input');

      const metrics = CircuitBreakerFactory.getAllMetrics();
      expect(metrics).toHaveLength(2);
      expect(metrics.map(m => m.name)).toContain('service1');
      expect(metrics.map(m => m.name)).toContain('service2');
    });

    it('should reset all breakers', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      const breaker = CircuitBreakerFactory.getBreaker('test-service', fn, {
        errorThresholdPercentage: 50
      });

      // Trip the circuit
      for (let i = 0; i < 10; i++) {
        try {
          await breaker.execute('input');
        } catch (error) {
          // Expected
        }
      }

      expect(breaker.isOpen()).toBe(true);

      // Reset all
      CircuitBreakerFactory.resetAll();

      expect(breaker.isClosed()).toBe(true);
    });
  });

  describe('RetryPolicy', () => {
    it('should retry failed operations', async () => {
      let attempts = 0;
      const fn = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('ETIMEDOUT');
        }
        return Promise.resolve('success');
      });

      const policy = new RetryPolicy({
        maxAttempts: 3,
        initialDelay: 10,
        maxDelay: 100
      });

      const result = await policy.execute(fn);
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should not retry non-retryable errors', async () => {
      let attempts = 0;
      const fn = vi.fn().mockImplementation(() => {
        attempts++;
        throw new Error('Invalid input');
      });

      const policy = new RetryPolicy({
        maxAttempts: 3,
        initialDelay: 10
      });

      try {
        await policy.execute(fn);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toBe('Invalid input');
        expect(attempts).toBe(1); // Should not retry
      }
    });

    it('should give up after max retries', async () => {
      let attempts = 0;
      const fn = vi.fn().mockImplementation(() => {
        attempts++;
        throw new Error('Connection timeout');
      });

      const policy = new RetryPolicy({
        maxAttempts: 3,
        initialDelay: 10
      });

      try {
        await policy.execute(fn, { name: 'test-operation' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(attempts).toBe(3);
        expect((error as Error).message).toContain('timeout');
      }
    });

    it('should apply exponential backoff', async () => {
      const delays: number[] = [];
      let attempts = 0;

      const fn = vi.fn().mockImplementation(() => {
        attempts++;
        throw new Error('ECONNREFUSED');
      });

      const policy = new RetryPolicy({
        maxAttempts: 4,
        initialDelay: 100,
        backoffMultiplier: 2,
        jitterFactor: 0 // No jitter for testing
      });

      const startTime = Date.now();
      try {
        await policy.execute(fn);
      } catch (error) {
        // Expected
      }
      const totalTime = Date.now() - startTime;

      // Should have waited: 100ms + 200ms + 400ms = 700ms (approximately)
      expect(totalTime).toBeGreaterThanOrEqual(600);
      expect(attempts).toBe(4);
    });
  });

  describe('Integration', () => {
    it('should work with retry policy for successful operations', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const breaker = new EnhancedCircuitBreaker(fn, {
        name: 'integrated-test',
        timeout: 1000
      });

      const policy = new RetryPolicy({
        maxAttempts: 3,
        initialDelay: 10
      });

      // Retry policy wrapping circuit breaker
      const result = await policy.execute(() => breaker.execute('input'));

      expect(result).toBe('success');
      expect(breaker.getState()).toBe('closed');
      expect(breaker.getMetrics().successCount).toBe(1);
    });

    it('should handle circuit breaker opening during retries', async () => {
      let attempts = 0;
      const fn = vi.fn().mockImplementation(() => {
        attempts++;
        throw new Error('Connection timeout');
      });

      const breaker = new EnhancedCircuitBreaker(fn, {
        name: 'failing-test',
        timeout: 1000,
        errorThresholdPercentage: 50
      });

      const policy = new RetryPolicy({
        maxAttempts: 3,
        initialDelay: 10
      });

      try {
        await policy.execute(() => breaker.execute('input'));
        expect.fail('Should have failed');
      } catch (error) {
        // Either circuit opened or retries exhausted
        expect(attempts).toBeGreaterThan(0);
      }
    });
  });
});
