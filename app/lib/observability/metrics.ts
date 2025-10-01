/**
 * Metrics Collection System
 *
 * Golden signals: Latency, Errors, Saturation, Traffic
 */

export interface MetricValue {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface Histogram {
  count: number;
  sum: number;
  buckets: Map<number, number>; // bucket upper bound -> count
}

export interface Counter {
  value: number;
  labels: Record<string, string>;
}

export interface Gauge {
  value: number;
  labels: Record<string, string>;
}

/**
 * In-memory metrics store
 */
class MetricsStore {
  private counters: Map<string, Counter> = new Map();
  private gauges: Map<string, Gauge> = new Map();
  private histograms: Map<string, Histogram> = new Map();

  /**
   * Increment a counter
   */
  incrementCounter(name: string, value: number = 1, labels: Record<string, string> = {}): void {
    const key = this.getKey(name, labels);
    const existing = this.counters.get(key);

    if (existing) {
      existing.value += value;
    } else {
      this.counters.set(key, { value, labels });
    }
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.getKey(name, labels);
    this.gauges.set(key, { value, labels });
  }

  /**
   * Record a histogram value
   */
  recordHistogram(name: string, value: number, buckets: number[] = [10, 50, 100, 500, 1000, 5000]): void {
    const key = name;
    let histogram = this.histograms.get(key);

    if (!histogram) {
      histogram = {
        count: 0,
        sum: 0,
        buckets: new Map(buckets.map(b => [b, 0]))
      };
      this.histograms.set(key, histogram);
    }

    histogram.count++;
    histogram.sum += value;

    // Update buckets
    for (const [bucket, _] of histogram.buckets) {
      if (value <= bucket) {
        histogram.buckets.set(bucket, (histogram.buckets.get(bucket) || 0) + 1);
      }
    }
  }

  /**
   * Get all metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    // Export counters
    for (const [key, counter] of this.counters) {
      const labelsStr = this.formatLabels(counter.labels);
      lines.push(`${key}${labelsStr} ${counter.value}`);
    }

    // Export gauges
    for (const [key, gauge] of this.gauges) {
      const labelsStr = this.formatLabels(gauge.labels);
      lines.push(`${key}${labelsStr} ${gauge.value}`);
    }

    // Export histograms
    for (const [name, histogram] of this.histograms) {
      lines.push(`${name}_count ${histogram.count}`);
      lines.push(`${name}_sum ${histogram.sum}`);

      for (const [bucket, count] of histogram.buckets) {
        lines.push(`${name}_bucket{le="${bucket}"} ${count}`);
      }
      lines.push(`${name}_bucket{le="+Inf"} ${histogram.count}`);
    }

    return lines.join('\n');
  }

  /**
   * Get metrics as JSON
   */
  exportJSON(): object {
    return {
      counters: Array.from(this.counters.entries()).map(([key, value]) => ({
        name: key,
        ...value
      })),
      gauges: Array.from(this.gauges.entries()).map(([key, value]) => ({
        name: key,
        ...value
      })),
      histograms: Array.from(this.histograms.entries()).map(([name, hist]) => ({
        name,
        count: hist.count,
        sum: hist.sum,
        mean: hist.count > 0 ? hist.sum / hist.count : 0,
        buckets: Array.from(hist.buckets.entries()).map(([le, count]) => ({ le, count }))
      }))
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  private getKey(name: string, labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) {
      return name;
    }
    const labelStr = this.formatLabels(labels);
    return `${name}${labelStr}`;
  }

  private formatLabels(labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) {
      return '';
    }
    const pairs = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `{${pairs}}`;
  }
}

// Global metrics store
const metricsStore = new MetricsStore();

/**
 * Golden Signals Metrics
 */

// Latency metrics
export function recordLatency(operation: string, durationMs: number, labels?: Record<string, string>): void {
  metricsStore.recordHistogram(
    `operation_duration_ms`,
    durationMs,
    [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
  );

  metricsStore.incrementCounter(
    'operation_total',
    1,
    { operation, ...labels }
  );
}

// Error metrics
export function recordError(operation: string, errorType: string, labels?: Record<string, string>): void {
  metricsStore.incrementCounter(
    'operation_errors_total',
    1,
    { operation, error_type: errorType, ...labels }
  );
}

// Traffic metrics
export function recordRequest(endpoint: string, method: string, statusCode: number): void {
  metricsStore.incrementCounter(
    'http_requests_total',
    1,
    { endpoint, method, status: statusCode.toString() }
  );
}

// Saturation metrics
export function recordQueueDepth(queue: string, depth: number): void {
  metricsStore.setGauge(
    'queue_depth',
    depth,
    { queue }
  );
}

export function recordConnectionPoolUsage(pool: string, active: number, idle: number, total: number): void {
  metricsStore.setGauge('connection_pool_active', active, { pool });
  metricsStore.setGauge('connection_pool_idle', idle, { pool });
  metricsStore.setGauge('connection_pool_total', total, { pool });
}

/**
 * LLM-specific metrics
 */
export function recordLLMRequest(
  provider: string,
  model: string,
  durationMs: number,
  success: boolean,
  inputTokens?: number,
  outputTokens?: number
): void {
  const labels = { provider, model, status: success ? 'success' : 'error' };

  metricsStore.recordHistogram('llm_request_duration_ms', durationMs);
  metricsStore.incrementCounter('llm_requests_total', 1, labels);

  if (inputTokens) {
    metricsStore.incrementCounter('llm_tokens_input_total', inputTokens, { provider, model });
  }

  if (outputTokens) {
    metricsStore.incrementCounter('llm_tokens_output_total', outputTokens, { provider, model });
  }
}

/**
 * Circuit breaker metrics
 */
export function recordCircuitBreakerState(name: string, state: 'open' | 'closed' | 'half-open'): void {
  metricsStore.setGauge('circuit_breaker_state', state === 'open' ? 1 : 0, { name, state });
}

export function recordCircuitBreakerEvent(name: string, event: 'success' | 'failure' | 'timeout' | 'reject'): void {
  metricsStore.incrementCounter('circuit_breaker_events_total', 1, { name, event });
}

/**
 * Database metrics
 */
export function recordDBQuery(operation: string, table: string, durationMs: number, success: boolean): void {
  metricsStore.recordHistogram('db_query_duration_ms', durationMs);
  metricsStore.incrementCounter('db_queries_total', 1, {
    operation,
    table,
    status: success ? 'success' : 'error'
  });
}

/**
 * Cache metrics
 */
export function recordCacheOperation(operation: 'hit' | 'miss' | 'set' | 'delete', key: string): void {
  metricsStore.incrementCounter('cache_operations_total', 1, { operation });
}

/**
 * Export metrics
 */
export function getMetricsPrometheus(): string {
  return metricsStore.exportPrometheus();
}

export function getMetricsJSON(): object {
  return metricsStore.exportJSON();
}

export function resetMetrics(): void {
  metricsStore.reset();
}

/**
 * Metric decorators
 */
export function withMetrics<T extends (...args: any[]) => Promise<any>>(
  operation: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();

    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;
      recordLatency(operation, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      recordLatency(operation, duration);
      recordError(operation, error instanceof Error ? error.name : 'Unknown');
      throw error;
    }
  }) as T;
}
