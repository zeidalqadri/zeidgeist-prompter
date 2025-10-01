/**
 * OpenTelemetry Tracing Configuration
 *
 * Provides distributed tracing across LLM requests, database queries, and API calls
 */

import { trace, Span, SpanStatusCode, Context, context } from '@opentelemetry/api';

const tracer = trace.getTracer('zeidgeist-prompter', '1.0.0');

export interface TraceAttributes {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Create a new span for tracing an operation
 */
export function createSpan(name: string, attributes?: TraceAttributes): Span {
  return tracer.startSpan(name, {
    attributes: attributes || {}
  });
}

/**
 * Wrap an async function with tracing
 */
export async function traceAsync<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: TraceAttributes
): Promise<T> {
  const span = createSpan(name, attributes);

  try {
    const result = await fn();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Wrap a synchronous function with tracing
 */
export function traceSync<T>(
  name: string,
  fn: () => T,
  attributes?: TraceAttributes
): T {
  const span = createSpan(name, attributes);

  try {
    const result = fn();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Get current trace ID for correlation
 */
export function getCurrentTraceId(): string | undefined {
  const span = trace.getActiveSpan();
  if (!span) return undefined;

  const spanContext = span.spanContext();
  return spanContext.traceId;
}

/**
 * Get current span ID
 */
export function getCurrentSpanId(): string | undefined {
  const span = trace.getActiveSpan();
  if (!span) return undefined;

  const spanContext = span.spanContext();
  return spanContext.spanId;
}

/**
 * Add attributes to current span
 */
export function addSpanAttributes(attributes: TraceAttributes): void {
  const span = trace.getActiveSpan();
  if (span) {
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined) {
        span.setAttribute(key, value);
      }
    });
  }
}

/**
 * Add an event to current span
 */
export function addSpanEvent(name: string, attributes?: TraceAttributes): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
}

/**
 * Trace an LLM request
 */
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
  const attributes: TraceAttributes = {
    'llm.provider': provider,
    'llm.model': model,
    'llm.temperature': options?.temperature,
    'llm.max_tokens': options?.maxTokens,
    'llm.input_tokens': options?.inputTokens,
  };

  return traceAsync(`llm.request.${provider}`, fn, attributes);
}

/**
 * Trace a database query
 */
export async function traceDBQuery<T>(
  operation: string,
  table: string,
  fn: () => Promise<T>
): Promise<T> {
  const attributes: TraceAttributes = {
    'db.operation': operation,
    'db.table': table,
    'db.system': 'postgresql',
  };

  return traceAsync(`db.${operation}`, fn, attributes);
}

/**
 * Trace an HTTP request
 */
export async function traceHTTPRequest<T>(
  method: string,
  url: string,
  fn: () => Promise<T>
): Promise<T> {
  const attributes: TraceAttributes = {
    'http.method': method,
    'http.url': url,
  };

  return traceAsync(`http.${method.toLowerCase()}`, fn, attributes);
}

/**
 * Context propagation for async operations
 */
export function withTraceContext<T>(fn: () => T): T {
  return context.with(context.active(), fn);
}

/**
 * Extract trace context for logging
 */
export interface TraceContext {
  traceId?: string;
  spanId?: string;
  traceparent?: string;
}

export function getTraceContext(): TraceContext {
  const traceId = getCurrentTraceId();
  const spanId = getCurrentSpanId();

  // W3C Trace Context format: version-traceId-spanId-flags
  const traceparent = traceId && spanId
    ? `00-${traceId}-${spanId}-01`
    : undefined;

  return {
    traceId,
    spanId,
    traceparent
  };
}
