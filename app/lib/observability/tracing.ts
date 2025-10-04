/**
 * OpenTelemetry Tracing Configuration
 *
 * Provides distributed tracing across LLM requests, database queries, and API calls
 * TEMPORARILY DISABLED: @opentelemetry/api dependency issue
 */

// Stub exports to maintain compatibility while tracing is disabled
export interface TraceAttributes {
  [key: string]: string | number | boolean | undefined;
}

export interface TraceContext {
  traceId?: string;
  spanId?: string;
  traceparent?: string;
}

// No-op implementations
export function createSpan(name: string, attributes?: TraceAttributes): any {
  return {
    setStatus: () => {},
    recordException: () => {},
    end: () => {},
    setAttribute: () => {},
    addEvent: () => {},
    spanContext: () => ({ traceId: 'disabled', spanId: 'disabled' })
  };
}

export async function traceAsync<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: TraceAttributes
): Promise<T> {
  return fn();
}

export function traceSync<T>(
  name: string,
  fn: () => T,
  attributes?: TraceAttributes
): T {
  return fn();
}

export function getCurrentTraceId(): string | undefined {
  return undefined;
}

export function getCurrentSpanId(): string | undefined {
  return undefined;
}

export function addSpanAttributes(attributes: TraceAttributes): void {
  // No-op
}

export function addSpanEvent(name: string, attributes?: TraceAttributes): void {
  // No-op
}

export async function traceLLMRequest<T>(
  provider: string,
  model: string,
  fn: () => Promise<T>,
  options?: {
    inputTokens?: number;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<T> {
  return fn();
}

export async function traceDBQuery<T>(
  operation: string,
  table: string,
  fn: () => Promise<T>
): Promise<T> {
  return fn();
}

export async function traceHTTPRequest<T>(
  method: string,
  url: string,
  fn: () => Promise<T>
): Promise<T> {
  return fn();
}

export function withTraceContext<T>(fn: () => T): T {
  return fn();
}

export function getTraceContext(): TraceContext {
  return {
    traceId: undefined,
    spanId: undefined,
    traceparent: undefined
  };
}