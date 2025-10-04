/**
 * Comprehensive Audit Logging Service
 *
 * Provides centralized audit logging for security, compliance, and incident response.
 * Logs all security-relevant events with full context for forensic analysis.
 *
 * Compliance: SOC 2 Type II, GDPR Article 30, HIPAA 164.312(b), PCI-DSS 10.2
 */

import { withDatabase } from '../db';
import { auditLogs, type NewAuditLog } from '../db/schema';
import { sanitizeJsonMetadata } from '../db/sql-utils';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type EventSeverity = 'info' | 'warning' | 'error' | 'critical';

export type EventCategory =
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'admin'
  | 'security'
  | 'system'
  | 'compliance';

export interface AuditEventData {
  // Event Classification (Required)
  eventType: string; // e.g., 'auth.login', 'data.prompt.read', 'admin.user.delete'
  eventCategory: EventCategory;
  severity: EventSeverity;
  action: string; // 'create', 'read', 'update', 'delete', 'login', 'logout', etc.

  // Actor (Who)
  userId?: string;
  userEmail?: string;
  userIpAddress?: string;
  userAgent?: string;
  sessionId?: string;

  // Resource (What)
  resourceType?: string; // 'user', 'prompt', 'feedback', 'settings'
  resourceId?: string;
  resourceName?: string;

  // Request Context
  requestMethod?: string;
  requestPath?: string;
  requestQueryParams?: Record<string, unknown>;
  requestHeaders?: Record<string, unknown>;

  // Response Context
  responseStatusCode?: number;
  responseTimeMs?: number;

  // Change Tracking (For auditing data modifications)
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;

  // Additional Context
  metadata?: Record<string, unknown>;
  tags?: string[];

  // Security Indicators
  isSuspicious?: boolean;
  riskScore?: number;
  threatIndicators?: string[];

  // Retention
  retentionPeriodDays?: number; // Default: 90 days
}

// ============================================================================
// AUDIT LOGGER CLASS
// ============================================================================

export class AuditLogger {
  /**
   * Log an audit event to the database
   *
   * @param env Cloudflare environment (for database access)
   * @param eventData Audit event data
   */
  static async log(env: any, eventData: AuditEventData): Promise<void> {
    try {
      // Sanitize JSON fields to prevent injection and size issues
      const sanitizedMetadata = eventData.metadata
        ? sanitizeJsonMetadata(eventData.metadata, 10000)
        : null;

      const sanitizedOldValues = eventData.oldValues
        ? sanitizeJsonMetadata(eventData.oldValues, 10000)
        : null;

      const sanitizedNewValues = eventData.newValues
        ? sanitizeJsonMetadata(eventData.newValues, 10000)
        : null;

      const sanitizedRequestParams = eventData.requestQueryParams
        ? sanitizeJsonMetadata(eventData.requestQueryParams, 5000)
        : null;

      const sanitizedRequestHeaders = eventData.requestHeaders
        ? sanitizeJsonMetadata(AuditLogger.sanitizeHeaders(eventData.requestHeaders), 5000)
        : null;

      // Prepare audit log entry
      const auditEntry: NewAuditLog = {
        eventType: eventData.eventType,
        eventCategory: eventData.eventCategory,
        severity: eventData.severity,
        action: eventData.action,

        userId: eventData.userId,
        userEmail: eventData.userEmail,
        userIpAddress: eventData.userIpAddress,
        userAgent: eventData.userAgent,
        sessionId: eventData.sessionId,

        resourceType: eventData.resourceType,
        resourceId: eventData.resourceId,
        resourceName: eventData.resourceName,

        requestMethod: eventData.requestMethod,
        requestPath: eventData.requestPath,
        requestQueryParams: sanitizedRequestParams,
        requestHeaders: sanitizedRequestHeaders,

        responseStatusCode: eventData.responseStatusCode,
        responseTimeMs: eventData.responseTimeMs,

        oldValues: sanitizedOldValues,
        newValues: sanitizedNewValues,

        metadata: sanitizedMetadata,
        tags: eventData.tags ? JSON.stringify(eventData.tags) : null,

        isSuspicious: eventData.isSuspicious || false,
        riskScore: eventData.riskScore || 0,
        threatIndicators: eventData.threatIndicators ? JSON.stringify(eventData.threatIndicators) : null,

        retentionPeriodDays: eventData.retentionPeriodDays || 90,
        isImmutable: true
      };

      // Insert audit log asynchronously (fire-and-forget for performance)
      await withDatabase(env, async (db) => {
        await db.insert(auditLogs).values(auditEntry);
      });

      // Also log critical events to console for immediate visibility
      if (eventData.severity === 'critical') {
        console.error('[AUDIT] CRITICAL EVENT:', {
          eventType: eventData.eventType,
          userId: eventData.userId,
          userIpAddress: eventData.userIpAddress,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      // NEVER let audit logging failures break application flow
      console.error('[AUDIT] Failed to log audit event:', error);
      console.error('[AUDIT] Event data:', {
        eventType: eventData.eventType,
        severity: eventData.severity
      });
    }
  }

  /**
   * Sanitize HTTP headers to remove sensitive data
   * (Authorization tokens, cookies, API keys, etc.)
   */
  private static sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveHeaders = new Set([
      'authorization',
      'cookie',
      'set-cookie',
      'x-api-key',
      'x-auth-token',
      'x-csrf-token',
      'proxy-authorization'
    ]);

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveHeaders.has(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Extract request context from Cloudflare Request object
   */
  static extractRequestContext(request: Request): Pick<AuditEventData, 'requestMethod' | 'requestPath' | 'userAgent' | 'userIpAddress' | 'requestHeaders'> {
    const url = new URL(request.url);

    return {
      requestMethod: request.method,
      requestPath: url.pathname,
      userAgent: request.headers.get('user-agent') || undefined,
      userIpAddress: request.headers.get('cf-connecting-ip') || undefined,
      requestHeaders: Object.fromEntries(request.headers.entries())
    };
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS (Pre-configured Event Types)
// ============================================================================

/**
 * Log authentication event (login, logout, MFA, etc.)
 */
export async function logAuthEvent(
  env: any,
  action: 'login' | 'logout' | 'login_failed' | 'mfa_enabled' | 'mfa_disabled' | 'password_reset',
  data: Partial<AuditEventData> & { userEmail: string }
): Promise<void> {
  await AuditLogger.log(env, {
    eventType: `auth.${action}`,
    eventCategory: 'authentication',
    severity: action === 'login_failed' ? 'warning' : 'info',
    action,
    ...data,
    tags: ['authentication', ...(data.tags || [])]
  });
}

/**
 * Log data access event (read, export, etc.)
 */
export async function logDataAccess(
  env: any,
  action: 'read' | 'export' | 'search',
  data: Partial<AuditEventData> & { resourceType: string; resourceId?: string }
): Promise<void> {
  await AuditLogger.log(env, {
    eventType: `data.${data.resourceType}.${action}`,
    eventCategory: 'data_access',
    severity: 'info',
    action,
    ...data,
    tags: ['data_access', data.resourceType, ...(data.tags || [])]
  });
}

/**
 * Log data modification event (create, update, delete)
 */
export async function logDataModification(
  env: any,
  action: 'create' | 'update' | 'delete',
  data: Partial<AuditEventData> & { resourceType: string; resourceId?: string; oldValues?: Record<string, unknown>; newValues?: Record<string, unknown> }
): Promise<void> {
  await AuditLogger.log(env, {
    eventType: `data.${data.resourceType}.${action}`,
    eventCategory: 'data_access',
    severity: action === 'delete' ? 'warning' : 'info',
    action,
    ...data,
    tags: ['data_modification', data.resourceType, ...(data.tags || [])]
  });
}

/**
 * Log admin action (user management, system configuration, etc.)
 */
export async function logAdminAction(
  env: any,
  action: string,
  data: Partial<AuditEventData> & { resourceType: string }
): Promise<void> {
  await AuditLogger.log(env, {
    eventType: `admin.${data.resourceType}.${action}`,
    eventCategory: 'admin',
    severity: 'warning', // Admin actions are elevated severity
    action,
    ...data,
    tags: ['admin', data.resourceType, ...(data.tags || [])]
  });
}

/**
 * Log security event (suspicious activity, failed access, etc.)
 */
export async function logSecurityEvent(
  env: any,
  eventType: string,
  data: Partial<AuditEventData> & { isSuspicious?: boolean; threatIndicators?: string[] }
): Promise<void> {
  await AuditLogger.log(env, {
    eventType: `security.${eventType}`,
    eventCategory: 'security',
    severity: data.isSuspicious ? 'error' : 'warning',
    action: eventType,
    ...data,
    isSuspicious: data.isSuspicious || true,
    tags: ['security', ...(data.tags || [])]
  });
}

/**
 * Log GDPR compliance event (DSAR request, data export, deletion)
 */
export async function logGDPREvent(
  env: any,
  action: 'dsar_request' | 'data_export' | 'data_deletion' | 'consent_updated',
  data: Partial<AuditEventData> & { userId: string }
): Promise<void> {
  await AuditLogger.log(env, {
    eventType: `compliance.gdpr.${action}`,
    eventCategory: 'compliance',
    severity: 'warning',
    action,
    ...data,
    tags: ['gdpr', 'compliance', ...(data.tags || [])],
    retentionPeriodDays: 2555 // 7 years for compliance
  });
}

/**
 * Calculate risk score based on event characteristics
 */
export function calculateRiskScore(indicators: {
  failedLoginAttempts?: number;
  suspiciousIpAddress?: boolean;
  unusualAccessPattern?: boolean;
  rareAction?: boolean;
  afterHours?: boolean;
}): number {
  let score = 0;

  if (indicators.failedLoginAttempts) {
    score += Math.min(indicators.failedLoginAttempts * 15, 50);
  }

  if (indicators.suspiciousIpAddress) {
    score += 30;
  }

  if (indicators.unusualAccessPattern) {
    score += 20;
  }

  if (indicators.rareAction) {
    score += 15;
  }

  if (indicators.afterHours) {
    score += 10;
  }

  return Math.min(score, 100); // Cap at 100
}
