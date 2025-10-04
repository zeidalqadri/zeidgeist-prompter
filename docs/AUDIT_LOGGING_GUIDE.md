# Audit Logging Guide

## Overview

This document describes the comprehensive audit logging system for zeidgeist-prompter, covering compliance requirements, event types, usage patterns, and analysis procedures.

**Migration**: `drizzle/migrations/0004_add_audit_logging.sql`
**Service**: `app/lib/audit/audit-logger.ts`
**Schema**: `app/lib/db/schema.ts` (auditLogs table)

**Compliance**: SOC 2 Type II, GDPR Article 30, HIPAA 164.312(b), PCI-DSS 10.2

---

## Why Audit Logging?

### 1. **Security Incident Response**
- Forensic analysis of security breaches
- Track attacker behavior and lateral movement
- Identify compromised accounts
- Determine blast radius of incidents

### 2. **Compliance Requirements**
- **SOC 2 Type II**: Detailed activity logs for auditors
- **GDPR Article 30**: Record of processing activities
- **HIPAA 164.312(b)**: Audit controls for PHI access
- **PCI-DSS 10.2**: Track access to cardholder data

### 3. **Operational Insights**
- User behavior analysis
- Performance bottleneck identification
- Feature usage metrics
- Error pattern detection

---

## Audit Log Structure

### Event Classification

```typescript
interface AuditLog {
  // Who?
  userId: string;
  userEmail: string;
  userIpAddress: string;
  sessionId: string;

  // What?
  eventType: string;      // 'auth.login', 'data.prompt.read'
  eventCategory: string;  // 'authentication', 'data_access'
  action: string;         // 'create', 'read', 'update', 'delete'
  resourceType: string;   // 'user', 'prompt', 'feedback'
  resourceId: string;     // UUID of resource

  // When?
  timestamp: Date;

  // How?
  requestMethod: string;  // 'GET', 'POST', etc.
  requestPath: string;    // '/api/prompts/123'
  responseStatusCode: number;  // 200, 404, 500

  // Context
  metadata: object;       // Event-specific data
  tags: string[];         // ['gdpr', 'pii', 'admin']

  // Security
  isSuspicious: boolean;
  riskScore: number;      // 0-100
  threatIndicators: string[];
}
```

---

## Event Types & Categories

### 1. **Authentication Events** (`eventCategory: 'authentication'`)

| Event Type | Description | Severity | Example |
|------------|-------------|----------|---------|
| `auth.login` | Successful login | info | User logs in with email/password |
| `auth.login_failed` | Failed login attempt | warning | Wrong password entered |
| `auth.logout` | User logout | info | User clicks logout |
| `auth.mfa_enabled` | MFA enabled for account | info | User enables TOTP |
| `auth.mfa_disabled` | MFA disabled | warning | User disables TOTP (security downgrade) |
| `auth.password_reset` | Password reset request | warning | Forgot password initiated |
| `auth.password_changed` | Password updated | warning | User changes password |

**Example**:
```typescript
await logAuthEvent(env, 'login', {
  userEmail: 'user@example.com',
  userIpAddress: '203.0.113.42',
  metadata: { loginMethod: 'email_password', mfaUsed: true },
  tags: ['authentication', 'mfa']
});
```

---

### 2. **Data Access Events** (`eventCategory: 'data_access'`)

| Event Type | Description | Severity | Tags |
|------------|-------------|----------|------|
| `data.prompt.read` | Prompt viewed | info | ['data_access', 'prompt'] |
| `data.prompt.create` | New prompt created | info | ['data_access', 'prompt'] |
| `data.prompt.update` | Prompt modified | info | ['data_access', 'prompt'] |
| `data.prompt.delete` | Prompt deleted | warning | ['data_access', 'prompt'] |
| `data.feedback.read` | Feedback viewed | info | ['data_access', 'feedback'] |
| `data.user.export` | User data exported (GDPR) | warning | ['data_access', 'gdpr', 'export'] |

**Example**:
```typescript
await logDataAccess(env, 'read', {
  userId: 'user-uuid',
  resourceType: 'prompt',
  resourceId: 'prompt-uuid',
  resourceName: 'My Coding Prompt',
  metadata: { containsPII: false },
  tags: ['data_access', 'prompt']
});
```

---

### 3. **Admin Events** (`eventCategory: 'admin'`)

| Event Type | Description | Severity | Impact |
|------------|-------------|----------|--------|
| `admin.user.create` | New user created by admin | warning | New account |
| `admin.user.delete` | User deleted by admin | error | Account removed |
| `admin.user.update` | User modified by admin | warning | Profile changed |
| `admin.settings.update` | System settings changed | error | Config change |
| `admin.role.granted` | Role assigned to user | warning | Privilege escalation |
| `admin.role.revoked` | Role removed from user | warning | Privilege reduction |

**Example**:
```typescript
await logAdminAction(env, 'delete', {
  userId: 'admin-uuid',
  resourceType: 'user',
  resourceId: 'deleted-user-uuid',
  oldValues: { email: 'user@example.com', isActive: true },
  newValues: { email: 'user@example.com', isActive: false },
  metadata: { reason: 'Terms of Service violation' },
  tags: ['admin', 'user', 'deletion']
});
```

---

### 4. **Security Events** (`eventCategory: 'security'`)

| Event Type | Description | Severity | Threat Indicators |
|------------|-------------|----------|-------------------|
| `security.suspicious_login` | Login from unusual location | error | ['unusual_location', 'new_device'] |
| `security.brute_force` | Multiple failed logins | error | ['brute_force', 'password_spray'] |
| `security.sql_injection_attempt` | SQL injection detected | critical | ['sql_injection', 'injection'] |
| `security.xss_attempt` | XSS attack detected | critical | ['xss', 'injection'] |
| `security.rate_limit_exceeded` | Rate limit triggered | warning | ['rate_limit', 'abuse'] |
| `security.privilege_escalation` | Unauthorized access attempt | critical | ['privilege_escalation', 'unauthorized'] |

**Example**:
```typescript
await logSecurityEvent(env, 'sql_injection_attempt', {
  userIpAddress: '198.51.100.42',
  requestPath: '/api/search',
  metadata: {
    maliciousInput: "admin' OR '1'='1",
    detectedBy: 'input_validation'
  },
  isSuspicious: true,
  riskScore: 95,
  threatIndicators: ['sql_injection', 'owasp_a03'],
  tags: ['security', 'injection', 'blocked']
});
```

---

### 5. **GDPR Compliance Events** (`eventCategory: 'compliance'`)

| Event Type | Description | Retention | Required By |
|------------|-------------|-----------|-------------|
| `compliance.gdpr.dsar_request` | Data Subject Access Request | 7 years | GDPR Article 15 |
| `compliance.gdpr.data_export` | User data exported | 7 years | GDPR Article 20 |
| `compliance.gdpr.data_deletion` | User data deleted | 7 years | GDPR Article 17 |
| `compliance.gdpr.consent_updated` | Privacy consent changed | 7 years | GDPR Article 7 |

**Example**:
```typescript
await logGDPREvent(env, 'dsar_request', {
  userId: 'user-uuid',
  userEmail: 'user@example.com',
  metadata: {
    requestType: 'access',
    requestDate: new Date().toISOString(),
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  },
  tags: ['gdpr', 'dsar', 'compliance']
});
```

---

## Usage Patterns

### Pattern 1: Logging Authentication

```typescript
import { logAuthEvent, AuditLogger } from '../audit/audit-logger';

export async function loginUser(env: any, email: string, password: string, request: Request) {
  const requestContext = AuditLogger.extractRequestContext(request);

  try {
    const user = await authenticateUser(email, password);

    // Log successful login
    await logAuthEvent(env, 'login', {
      userId: user.id,
      userEmail: email,
      ...requestContext,
      metadata: {
        loginMethod: 'email_password',
        mfaUsed: user.mfaEnabled
      }
    });

    return user;
  } catch (error) {
    // Log failed login
    await logAuthEvent(env, 'login_failed', {
      userEmail: email,
      ...requestContext,
      metadata: {
        failureReason: error.message
      },
      isSuspicious: true,
      riskScore: 50
    });

    throw error;
  }
}
```

---

### Pattern 2: Logging Data Modifications

```typescript
import { logDataModification } from '../audit/audit-logger';

export async function updatePrompt(
  env: any,
  promptId: string,
  oldData: Prompt,
  newData: Partial<Prompt>,
  userId: string
) {
  const updated = await db.update(prompts)
    .set(newData)
    .where(eq(prompts.id, promptId))
    .returning();

  // Log modification with before/after values
  await logDataModification(env, 'update', {
    userId,
    resourceType: 'prompt',
    resourceId: promptId,
    resourceName: oldData.originalText.substring(0, 50),
    oldValues: {
      text: oldData.originalText,
      isPublic: oldData.isPublic
    },
    newValues: {
      text: newData.originalText,
      isPublic: newData.isPublic
    },
    metadata: {
      changedFields: Object.keys(newData)
    },
    tags: ['data_modification', 'prompt', 'update']
  });

  return updated;
}
```

---

### Pattern 3: Logging with Request Context

```typescript
import { AuditLogger } from '../audit/audit-logger';

export async function onRequest(context: { request: Request; env: any }) {
  const { request, env } = context;
  const startTime = Date.now();

  try {
    const response = await handleRequest(request);
    const responseTime = Date.now() - startTime;

    // Log successful request
    await AuditLogger.log(env, {
      eventType: 'api.request',
      eventCategory: 'system',
      severity: 'info',
      action: 'request',
      ...AuditLogger.extractRequestContext(request),
      responseStatusCode: response.status,
      responseTimeMs: responseTime,
      metadata: {
        endpoint: new URL(request.url).pathname
      }
    });

    return response;
  } catch (error) {
    const responseTime = Date.now() - startTime;

    // Log failed request
    await AuditLogger.log(env, {
      eventType: 'api.error',
      eventCategory: 'system',
      severity: 'error',
      action: 'error',
      ...AuditLogger.extractRequestContext(request),
      responseStatusCode: 500,
      responseTimeMs: responseTime,
      metadata: {
        errorMessage: error.message,
        errorStack: error.stack
      }
    });

    throw error;
  }
}
```

---

## Querying Audit Logs

### SQL Queries

**User Audit Trail (GDPR Article 15)**:
```sql
SELECT
  timestamp,
  event_type,
  action,
  resource_type,
  resource_id,
  metadata
FROM audit_logs
WHERE user_id = 'user-uuid'
ORDER BY timestamp DESC
LIMIT 100;
```

**Failed Login Attempts (Brute-force Detection)**:
```sql
SELECT
  user_email,
  user_ip_address,
  COUNT(*) as attempt_count,
  MAX(timestamp) as last_attempt
FROM audit_logs
WHERE
  event_type = 'auth.login_failed'
  AND timestamp > (now() - INTERVAL '1 hour')
GROUP BY user_email, user_ip_address
HAVING COUNT(*) >= 5
ORDER BY attempt_count DESC;
```

**Suspicious Activity (Security Monitoring)**:
```sql
SELECT *
FROM audit_logs
WHERE
  is_suspicious = true
  AND timestamp > (now() - INTERVAL '24 hours')
ORDER BY risk_score DESC, timestamp DESC
LIMIT 50;
```

**Admin Actions (Compliance Auditing)**:
```sql
SELECT
  timestamp,
  user_email,
  event_type,
  resource_type,
  resource_id,
  old_values,
  new_values
FROM audit_logs
WHERE
  event_category = 'admin'
  AND timestamp BETWEEN '2025-01-01' AND '2025-01-31'
ORDER BY timestamp DESC;
```

**Data Access by Resource (Who accessed what?)**:
```sql
SELECT
  user_email,
  action,
  timestamp,
  user_ip_address
FROM audit_logs
WHERE
  resource_type = 'prompt'
  AND resource_id = 'prompt-uuid'
ORDER BY timestamp DESC;
```

---

## Pre-built Views

### 1. `recent_security_events`
```sql
SELECT * FROM recent_security_events LIMIT 20;
```
Shows security events from last 7 days.

### 2. `failed_login_attempts`
```sql
SELECT * FROM failed_login_attempts;
```
Lists failed logins in last hour with attempt counts.

### 3. `data_access_trail`
```sql
SELECT * FROM data_access_trail LIMIT 50;
```
GDPR-compliant data access log with sensitivity classification.

---

## Retention & Cleanup

### Default Retention Periods

| Event Category | Retention Period | Reason |
|----------------|------------------|--------|
| Authentication | 90 days | Standard security logs |
| Data Access | 90 days | GDPR compliance |
| Admin Actions | 365 days | Audit trail |
| Security Events | 365 days | Incident investigation |
| GDPR/Compliance | 7 years (2,555 days) | Legal requirements |

### Automated Cleanup

Scheduled cleanup runs daily via cron job:

```sql
SELECT cleanup_expired_audit_logs();
-- Returns: Count of deleted records
```

**Cron Configuration** (in `wrangler.toml`):
```toml
[[triggers.crons]]
cron = "0 3 * * *"  # Daily at 3 AM
routes = ["/__scheduled/audit-cleanup"]
```

---

## Security Features

### 1. **Immutability**
Audit logs cannot be modified or deleted (except by automated retention policy):

```sql
UPDATE audit_logs SET severity = 'info' WHERE id = '...';
-- ERROR: Audit logs are immutable and cannot be modified
```

### 2. **Header Sanitization**
Sensitive headers are automatically redacted:

```typescript
// Headers stored:
{
  "user-agent": "Mozilla/5.0...",
  "authorization": "[REDACTED]",    // Sensitive
  "cookie": "[REDACTED]",           // Sensitive
  "x-api-key": "[REDACTED]"         // Sensitive
}
```

### 3. **Size Limits**
JSON fields are limited to prevent DoS:
- Metadata: 10,000 bytes
- Request headers: 5,000 bytes
- Old/new values: 10,000 bytes each

---

## Compliance Reporting

### SOC 2 Type II Audit
```sql
-- All user actions in audit period
SELECT
  user_email,
  event_type,
  timestamp,
  resource_type,
  metadata
FROM audit_logs
WHERE
  timestamp BETWEEN '2025-01-01' AND '2025-12-31'
  AND event_category IN ('authentication', 'admin', 'data_access')
ORDER BY timestamp;
```

### GDPR Article 30 (Processing Activities)
```sql
-- Record of processing activities
SELECT
  resource_type,
  action,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(timestamp) as first_event,
  MAX(timestamp) as last_event
FROM audit_logs
WHERE
  event_category = 'data_access'
  AND timestamp > (now() - INTERVAL '30 days')
GROUP BY resource_type, action
ORDER BY event_count DESC;
```

### HIPAA 164.312(b) (Audit Controls)
```sql
-- Access to PHI (if applicable)
SELECT *
FROM audit_logs
WHERE
  tags @> ARRAY['pii', 'phi']
  AND timestamp > (now() - INTERVAL '6 years')
ORDER BY timestamp DESC;
```

---

## Monitoring & Alerting

### Key Metrics

1. **Failed Login Rate**
   ```sql
   SELECT
     (COUNT(*) FILTER (WHERE event_type = 'auth.login_failed')::FLOAT /
      NULLIF(COUNT(*) FILTER (WHERE event_type LIKE 'auth.login%'), 0)
     ) * 100 AS failed_login_percentage
   FROM audit_logs
   WHERE timestamp > (now() - INTERVAL '1 hour');
   ```

2. **Suspicious Activity Count**
   ```sql
   SELECT COUNT(*)
   FROM audit_logs
   WHERE
     is_suspicious = true
     AND timestamp > (now() - INTERVAL '24 hours');
   ```

3. **High-Risk Events**
   ```sql
   SELECT COUNT(*)
   FROM audit_logs
   WHERE
     risk_score > 70
     AND timestamp > (now() - INTERVAL '1 hour');
   ```

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Failed login rate | >10% | >25% | Block IP, notify admin |
| Suspicious events | >10/hour | >50/hour | Investigate, possible breach |
| High-risk events | >5/hour | >20/hour | Immediate SOC escalation |
| SQL injection attempts | >1 | >5 | Block IP, review logs |

---

## Best Practices

### 1. **Log Consistently**
Every security-relevant action should be logged:
- ✅ User authentication (success/failure)
- ✅ Data access (read/write/delete)
- ✅ Admin actions
- ✅ Security events
- ✅ API errors

### 2. **Include Context**
Always include:
- User ID and email
- IP address and user agent
- Request method and path
- Timestamp
- Resource affected

### 3. **Tag Appropriately**
Use tags for filtering:
- `['gdpr']` - GDPR-related events
- `['pii']` - Personal data access
- `['admin']` - Administrative actions
- `['security']` - Security events
- `['suspicious']` - Flagged as suspicious

### 4. **Calculate Risk Scores**
Use risk scoring for prioritization:
```typescript
const riskScore = calculateRiskScore({
  failedLoginAttempts: 5,
  suspiciousIpAddress: true,
  unusualAccessPattern: false
});
// riskScore = 80 (high risk)
```

### 5. **Never Block on Logging Failures**
Audit logging should never break application flow:
```typescript
try {
  await AuditLogger.log(env, eventData);
} catch (error) {
  console.error('[AUDIT] Failed to log:', error);
  // Continue execution
}
```

---

## Related Documentation

- [Security Configuration Guide](./SECURITY_CONFIGURATION.md)
- [SQL Injection Prevention](./SQL_INJECTION_PREVENTION.md)
- [SAST Security Scanning](./SAST_SECURITY_SCANNING.md)

---

**Last Updated**: 2025-10-01
**Maintained By**: Security & Compliance Team
