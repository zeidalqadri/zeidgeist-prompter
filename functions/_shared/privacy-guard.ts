/**
 * Privacy Guard - Enhanced security layer for user data isolation
 * Provides additional validation and monitoring for privacy-sensitive operations
 */

// Use Web Crypto API for Cloudflare Workers compatibility
const crypto = globalThis.crypto;

/**
 * Helper function to create SHA-256 hash using Web Crypto API
 */
async function createSha256Hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface PrivacyContext {
  userId: string;
  ipAddress: string;
  sessionId?: string;
  userAgent?: string;
}

export interface PrivacyValidationResult {
  isValid: boolean;
  reason?: string;
  riskScore?: number;
}

// Privacy violation tracking for monitoring
const violationAttempts = new Map<string, number>();
const VIOLATION_THRESHOLD = 5;
const VIOLATION_WINDOW_MS = 3600000; // 1 hour

/**
 * Generate a privacy token combining multiple factors
 */
export async function generatePrivacyToken(context: PrivacyContext): Promise<string> {
  const components = [
    context.userId,
    context.ipAddress,
    context.sessionId || 'anonymous',
    context.userAgent || 'unknown',
    new Date().toISOString().split('T')[0] // Daily rotation
  ];
  
  const hash = await createSha256Hash(components.join('|'));
  return hash.substring(0, 16);
}

/**
 * Validate that a request is authorized to access specific user data
 */
export function validatePrivacyAccess(
  requestContext: PrivacyContext,
  dataOwnerId: string
): PrivacyValidationResult {
  // Check if request is for own data
  if (requestContext.userId !== dataOwnerId && requestContext.ipAddress !== dataOwnerId) {
    trackViolationAttempt(requestContext.ipAddress);
    
    return {
      isValid: false,
      reason: 'Unauthorized access attempt to another user\'s data',
      riskScore: 1.0
    };
  }
  
  // Check for suspicious patterns
  const violationCount = getViolationCount(requestContext.ipAddress);
  if (violationCount >= VIOLATION_THRESHOLD) {
    return {
      isValid: false,
      reason: 'Too many unauthorized access attempts',
      riskScore: 1.0
    };
  }
  
  return {
    isValid: true,
    riskScore: violationCount / VIOLATION_THRESHOLD
  };
}

/**
 * Track potential privacy violation attempts
 */
function trackViolationAttempt(identifier: string): void {
  const key = `violation:${identifier}:${Math.floor(Date.now() / VIOLATION_WINDOW_MS)}`;
  const current = violationAttempts.get(key) || 0;
  violationAttempts.set(key, current + 1);
  
  // Clean up old entries
  cleanupViolationTracking();
  
  // Log for monitoring
  console.warn(`Privacy violation attempt tracked for ${identifier}. Count: ${current + 1}`);
}

/**
 * Get violation count for an identifier
 */
function getViolationCount(identifier: string): number {
  const key = `violation:${identifier}:${Math.floor(Date.now() / VIOLATION_WINDOW_MS)}`;
  return violationAttempts.get(key) || 0;
}

/**
 * Clean up old violation tracking entries
 */
function cleanupViolationTracking(): void {
  const currentWindow = Math.floor(Date.now() / VIOLATION_WINDOW_MS);
  
  for (const key of violationAttempts.keys()) {
    const windowId = parseInt(key.split(':')[2]);
    if (windowId < currentWindow - 1) {
      violationAttempts.delete(key);
    }
  }
}

/**
 * Sanitize user data before sending to client
 */
export function sanitizeUserData<T extends Record<string, any>>(
  data: T,
  allowedFields: string[]
): Partial<T> {
  const sanitized: Partial<T> = {};
  
  for (const field of allowedFields) {
    if (field in data) {
      sanitized[field as keyof T] = data[field];
    }
  }
  
  return sanitized;
}

/**
 * Generate anonymous identifier from IP for logging
 */
export async function anonymizeIP(ipAddress: string): Promise<string> {
  if (!ipAddress || ipAddress === 'unknown') return 'anonymous';
  
  // Hash IP for privacy-preserving logging
  const hash = await createSha256Hash(ipAddress);
  return hash.substring(0, 8);
}

/**
 * Privacy audit log entry
 */
export interface PrivacyAuditLog {
  timestamp: Date;
  action: 'access' | 'denied' | 'violation';
  resource: string;
  requesterId: string;
  dataOwnerId?: string;
  reason?: string;
}

/**
 * Log privacy-related events for audit trail
 */
export async function logPrivacyEvent(event: PrivacyAuditLog): Promise<void> {
  // In production, this would write to a secure audit log
  const logEntry = {
    ...event,
    timestamp: event.timestamp.toISOString(),
    requesterId: await anonymizeIP(event.requesterId)
  };
  
  if (event.action === 'violation' || event.action === 'denied') {
    console.error('[PRIVACY AUDIT]', JSON.stringify(logEntry));
  } else {
    console.log('[PRIVACY AUDIT]', JSON.stringify(logEntry));
  }
}

/**
 * Check if IP address appears to be from a shared network
 */
export function isSharedNetwork(ipAddress: string): boolean {
  // Common patterns for shared networks
  const sharedPatterns = [
    /^10\./, // Private network
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private network
    /^192\.168\./, // Private network
    /^127\./, // Localhost
    /^::1$/, // IPv6 localhost
    /^fc00:/, // IPv6 private
    /^fe80:/, // IPv6 link-local
  ];
  
  return sharedPatterns.some(pattern => pattern.test(ipAddress));
}

/**
 * Generate a session fingerprint for additional validation
 */
export async function generateSessionFingerprint(request: Request): Promise<string> {
  const components = [
    request.headers.get('user-agent') || 'unknown',
    request.headers.get('accept-language') || 'unknown',
    request.headers.get('accept-encoding') || 'unknown',
    // Add more entropy sources as needed
  ];
  
  const hash = await createSha256Hash(components.join('|'));
  return hash.substring(0, 16);
}

/**
 * Enhanced CORS headers with security best practices
 */
export function getSecurityHeaders(origin?: string): Record<string, string> {
  const allowOrigin = resolveAllowedOrigin(origin)
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Credentials': 'false',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };
}

function resolveAllowedOrigin(origin?: string): string {
  if (!origin) return 'https://mstprmpt.zeidgeist.com'

  try {
    const url = new URL(origin)
    const host = url.host

    // Explicit allowlist
    const allowedHosts = new Set([
      'mstprmpt.zeidgeist.com',
      'preview.mstprmpt.zeidgeist.com',
      'localhost:3333',
      'localhost:8788',
    ])

    if (allowedHosts.has(host)) return origin

    // Allow Cloudflare Pages preview subdomains
    if (host.endsWith('.pages.dev')) return origin

    // Otherwise, do not reflect arbitrary origins. Default to primary domain.
    return 'https://mstprmpt.zeidgeist.com'
  } catch {
    return 'https://mstprmpt.zeidgeist.com'
  }
}

export default {
  generatePrivacyToken,
  validatePrivacyAccess,
  sanitizeUserData,
  anonymizeIP,
  logPrivacyEvent,
  isSharedNetwork,
  generateSessionFingerprint,
  getSecurityHeaders
};
