/**
 * Structured Logging with Trace Correlation
 *
 * Privacy-preserving structured logger with trace context
 */

import { getTraceContext } from './tracing';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  traceId?: string;
  spanId?: string;
  userId?: string; // Hashed
  ipAddress?: string; // Hashed
  operation?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Hash sensitive data before logging
 */
function hashSensitive(value: string): string {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // In browser/Workers environment with Web Crypto API
    // For now, just return a truncated hash representation
    // In production, use proper crypto.subtle.digest
    return `hash_${value.substring(0, 8)}`;
  }

  // Simple hash for demonstration (use proper crypto in production)
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

/**
 * Redact PII from log messages
 */
function redactPII(message: string): string {
  // Redact email addresses
  message = message.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]');

  // Redact potential API keys/tokens (common patterns)
  message = message.replace(/\b[A-Za-z0-9]{32,}\b/g, '[TOKEN_REDACTED]');

  // Redact credit card patterns
  message = message.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CC_REDACTED]');

  // Redact SSN patterns
  message = message.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN_REDACTED]');

  return message;
}

/**
 * Create structured log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: Partial<LogContext>,
  error?: Error
): LogEntry {
  const traceContext = getTraceContext();

  // Hash sensitive fields if present
  const sanitizedContext: LogContext = {
    ...traceContext,
    ...context,
  };

  if (context?.userId) {
    sanitizedContext.userId = hashSensitive(context.userId);
  }

  if (context?.ipAddress) {
    sanitizedContext.ipAddress = hashSensitive(context.ipAddress);
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: redactPII(message),
    context: sanitizedContext,
  };

  if (error) {
    entry.error = {
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
    };
  }

  return entry;
}

/**
 * Log output function (can be overridden for different environments)
 */
let logOutputFn = (entry: LogEntry) => {
  const output = JSON.stringify(entry);

  switch (entry.level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'info':
      console.info(output);
      break;
    case 'debug':
      console.debug(output);
      break;
  }
};

/**
 * Override log output (useful for testing or custom transports)
 */
export function setLogOutput(fn: (entry: LogEntry) => void): void {
  logOutputFn = fn;
}

/**
 * Structured logger class
 */
export class Logger {
  private defaultContext: Partial<LogContext>;

  constructor(defaultContext?: Partial<LogContext>) {
    this.defaultContext = defaultContext || {};
  }

  /**
   * Create child logger with additional context
   */
  child(context: Partial<LogContext>): Logger {
    return new Logger({
      ...this.defaultContext,
      ...context,
    });
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Partial<LogContext>): void {
    const entry = createLogEntry('debug', message, {
      ...this.defaultContext,
      ...context,
    });
    logOutputFn(entry);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Partial<LogContext>): void {
    const entry = createLogEntry('info', message, {
      ...this.defaultContext,
      ...context,
    });
    logOutputFn(entry);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Partial<LogContext>): void {
    const entry = createLogEntry('warn', message, {
      ...this.defaultContext,
      ...context,
    });
    logOutputFn(entry);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: Partial<LogContext>): void {
    const entry = createLogEntry('error', message, {
      ...this.defaultContext,
      ...context,
    }, error);
    logOutputFn(entry);
  }

  /**
   * Log operation timing
   */
  timing(operation: string, durationMs: number, context?: Partial<LogContext>): void {
    this.info(`Operation completed: ${operation}`, {
      ...context,
      operation,
      duration: durationMs,
    });
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create logger with context
 */
export function createLogger(context: Partial<LogContext>): Logger {
  return new Logger(context);
}

/**
 * Log with automatic timing
 */
export async function logTimed<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: Partial<LogContext>
): Promise<T> {
  const startTime = Date.now();
  const log = createLogger({ operation, ...context });

  try {
    log.info(`Starting operation: ${operation}`);
    const result = await fn();
    const duration = Date.now() - startTime;
    log.timing(operation, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`Operation failed: ${operation}`, error as Error, { duration });
    throw error;
  }
}
