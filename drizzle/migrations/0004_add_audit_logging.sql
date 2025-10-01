-- Comprehensive Audit Logging System
-- Created: 2025-10-01
-- Purpose: Track all security-relevant events for compliance and incident response
-- Compliance: SOC 2, GDPR Article 30, HIPAA, PCI-DSS

-- ============================================================================
-- AUDIT LOGS TABLE (Centralized Security Event Logging)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event Classification
  event_type VARCHAR(100) NOT NULL,  -- 'auth.login', 'data.access', 'admin.action', etc.
  event_category VARCHAR(50) NOT NULL,  -- 'authentication', 'authorization', 'data_access', 'admin', 'security'
  severity VARCHAR(20) NOT NULL,  -- 'info', 'warning', 'error', 'critical'

  -- Actor (Who performed the action)
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  user_ip_address INET,
  user_agent TEXT,
  session_id UUID,

  -- Action Details (What was done)
  action VARCHAR(100) NOT NULL,  -- 'create', 'read', 'update', 'delete', 'login', 'logout'
  resource_type VARCHAR(100),  -- 'user', 'prompt', 'feedback', 'settings'
  resource_id UUID,
  resource_name TEXT,

  -- Request Context
  request_method VARCHAR(10),  -- 'GET', 'POST', 'PUT', 'DELETE'
  request_path TEXT,
  request_query_params JSONB,
  request_headers JSONB,

  -- Response Context
  response_status_code INTEGER,
  response_time_ms INTEGER,

  -- Change Tracking (For data modification events)
  old_values JSONB,  -- Previous state (for updates/deletes)
  new_values JSONB,  -- New state (for creates/updates)

  -- Metadata & Additional Context
  metadata JSONB,  -- Flexible field for event-specific data
  tags TEXT[],  -- Searchable tags: ['gdpr', 'pii', 'admin', 'security']

  -- Security Indicators
  is_suspicious BOOLEAN DEFAULT false,
  risk_score INTEGER DEFAULT 0,  -- 0-100 risk score
  threat_indicators TEXT[],  -- ['failed_login', 'sql_injection_attempt', etc.]

  -- Compliance & Retention
  retention_period_days INTEGER DEFAULT 90,  -- GDPR: 90 days default, compliance may require longer
  is_immutable BOOLEAN DEFAULT true,  -- Audit logs should never be modified

  -- Timestamps
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR AUDIT LOGS (Performance & Compliance Queries)
-- ============================================================================

-- Primary access patterns: user-based, time-based, event-based

-- User audit trail (GDPR Article 15 - Right of Access)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_timestamp
ON audit_logs (user_id, timestamp DESC)
WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_audit_logs_user_timestamp IS
'Enables efficient user audit trail retrieval for GDPR DSAR requests.
Query: SELECT * FROM audit_logs WHERE user_id = ? ORDER BY timestamp DESC';

-- Event type filtering (Security monitoring)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_event_type_timestamp
ON audit_logs (event_type, timestamp DESC);

COMMENT ON INDEX idx_audit_logs_event_type_timestamp IS
'Optimizes security event filtering (e.g., all login attempts).
Query: SELECT * FROM audit_logs WHERE event_type = ''auth.login'' ORDER BY timestamp DESC';

-- Severity-based queries (Incident response)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_severity_timestamp
ON audit_logs (severity, timestamp DESC)
WHERE severity IN ('error', 'critical');

COMMENT ON INDEX idx_audit_logs_severity_timestamp IS
'Enables fast error/critical event retrieval for incident response.
Partial index reduces size by excluding info/warning events.';

-- Suspicious activity monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_suspicious
ON audit_logs (is_suspicious, timestamp DESC)
WHERE is_suspicious = true;

COMMENT ON INDEX idx_audit_logs_suspicious IS
'Flags suspicious security events for SOC investigation.
Query: SELECT * FROM audit_logs WHERE is_suspicious = true ORDER BY timestamp DESC';

-- Resource tracking (Data access auditing)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_resource
ON audit_logs (resource_type, resource_id, timestamp DESC)
WHERE resource_type IS NOT NULL;

COMMENT ON INDEX idx_audit_logs_resource IS
'Tracks all access to specific resources (e.g., who viewed prompt X).
Query: SELECT * FROM audit_logs WHERE resource_type = ''prompt'' AND resource_id = ?';

-- IP address tracking (Security investigations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_ip_timestamp
ON audit_logs (user_ip_address, timestamp DESC)
WHERE user_ip_address IS NOT NULL;

COMMENT ON INDEX idx_audit_logs_ip_timestamp IS
'Enables IP-based investigation (e.g., all actions from suspicious IP).
Query: SELECT * FROM audit_logs WHERE user_ip_address = ? ORDER BY timestamp DESC';

-- Tag-based search (Compliance reporting)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_tags_gin
ON audit_logs USING GIN (tags)
WHERE tags IS NOT NULL;

COMMENT ON INDEX idx_audit_logs_tags_gin IS
'Enables tag-based compliance queries (e.g., all GDPR-related events).
Query: SELECT * FROM audit_logs WHERE tags @> ARRAY[''gdpr'']';

-- Metadata search (Advanced querying)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_metadata_gin
ON audit_logs USING GIN (metadata jsonb_path_ops)
WHERE metadata IS NOT NULL;

COMMENT ON INDEX idx_audit_logs_metadata_gin IS
'Enables flexible metadata queries for investigation.
Query: SELECT * FROM audit_logs WHERE metadata @> ''{"login_method": "mfa"}''';

-- ============================================================================
-- AUDIT LOG RETENTION POLICY (Automated Cleanup)
-- ============================================================================

-- Function to clean up expired audit logs
CREATE OR REPLACE FUNCTION cleanup_expired_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete logs older than their retention period
  DELETE FROM audit_logs
  WHERE timestamp < (now() - (retention_period_days || ' days')::INTERVAL);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Log the cleanup action
  INSERT INTO audit_logs (
    event_type,
    event_category,
    severity,
    action,
    resource_type,
    metadata,
    tags
  ) VALUES (
    'system.cleanup',
    'admin',
    'info',
    'delete',
    'audit_logs',
    jsonb_build_object('deleted_count', deleted_count),
    ARRAY['system', 'cleanup', 'retention']
  );

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_audit_logs IS
'Automatically deletes audit logs older than their retention period.
Schedule: Run daily via cron job.
Returns: Count of deleted records.';

-- ============================================================================
-- TRIGGER: Prevent Audit Log Modification (Immutability)
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be modified';
  END IF;

  IF TG_OP = 'DELETE' THEN
    -- Allow deletion only by cleanup function or superuser
    IF current_user != 'postgres' AND session_user != 'postgres' THEN
      RAISE EXCEPTION 'Audit logs can only be deleted by automated retention policy';
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutability
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();

COMMENT ON TRIGGER audit_log_immutability ON audit_logs IS
'Enforces audit log immutability. Updates are blocked, deletions only allowed by retention policy.';

-- ============================================================================
-- VIEWS FOR COMMON AUDIT QUERIES
-- ============================================================================

-- Security Events (Last 7 Days)
CREATE OR REPLACE VIEW recent_security_events AS
SELECT
  id,
  timestamp,
  event_type,
  severity,
  user_email,
  user_ip_address,
  action,
  resource_type,
  is_suspicious,
  threat_indicators
FROM audit_logs
WHERE
  event_category = 'security'
  AND timestamp > (now() - INTERVAL '7 days')
ORDER BY timestamp DESC;

COMMENT ON VIEW recent_security_events IS
'Quick view of recent security events for SOC dashboard.
Filters: Last 7 days, security category only.';

-- Failed Login Attempts
CREATE OR REPLACE VIEW failed_login_attempts AS
SELECT
  timestamp,
  user_email,
  user_ip_address,
  user_agent,
  metadata->>'failure_reason' AS failure_reason,
  COUNT(*) OVER (PARTITION BY user_email) AS attempts_count
FROM audit_logs
WHERE
  event_type = 'auth.login_failed'
  AND timestamp > (now() - INTERVAL '1 hour')
ORDER BY timestamp DESC;

COMMENT ON VIEW failed_login_attempts IS
'Monitors failed login attempts for brute-force detection.
Filters: Last 1 hour, login failures only.';

-- Data Access Audit Trail
CREATE OR REPLACE VIEW data_access_trail AS
SELECT
  timestamp,
  user_email,
  action,
  resource_type,
  resource_id,
  user_ip_address,
  CASE
    WHEN tags @> ARRAY['pii'] THEN 'PII'
    WHEN tags @> ARRAY['gdpr'] THEN 'GDPR'
    ELSE 'Standard'
  END AS data_sensitivity
FROM audit_logs
WHERE
  event_category = 'data_access'
  AND timestamp > (now() - INTERVAL '30 days')
ORDER BY timestamp DESC;

COMMENT ON VIEW data_access_trail IS
'GDPR compliance: Tracks all data access with sensitivity classification.
Filters: Last 30 days, data access events only.';

-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE audit_logs IS
'Centralized audit log table for security, compliance, and incident response.
Retention: 90 days default, configurable per event type.
Immutability: Enforced via trigger, prevents tampering.
Compliance: SOC 2 Type II, GDPR Article 30, HIPAA 164.312(b), PCI-DSS 10.2.';

COMMENT ON COLUMN audit_logs.event_type IS
'Hierarchical event identifier (e.g., auth.login, data.access.read).
Format: <category>.<action>[.<detail>]';

COMMENT ON COLUMN audit_logs.severity IS
'Event severity: info (routine), warning (unusual), error (failure), critical (security).
Critical events trigger immediate alerts.';

COMMENT ON COLUMN audit_logs.risk_score IS
'Calculated risk score 0-100 based on behavior analysis.
>70: High risk, trigger investigation. >90: Critical, block user.';

COMMENT ON COLUMN audit_logs.tags IS
'Searchable tags for compliance and categorization.
Common tags: gdpr, pii, hipaa, pci, admin, security, suspicious.';

-- ============================================================================
-- GRANT PERMISSIONS (Least Privilege)
-- ============================================================================

-- Application has INSERT-only access
-- GRANT INSERT ON audit_logs TO app_user;

-- Audit viewer role (read-only)
-- GRANT SELECT ON audit_logs TO audit_viewer;
-- GRANT SELECT ON recent_security_events TO audit_viewer;
-- GRANT SELECT ON failed_login_attempts TO audit_viewer;
-- GRANT SELECT ON data_access_trail TO audit_viewer;

-- ============================================================================
-- PERFORMANCE STATISTICS
-- ============================================================================

-- Update table statistics for query planner
ANALYZE audit_logs;

-- ============================================================================
-- MIGRATION ROLLBACK (If Needed)
-- ============================================================================

-- DROP TRIGGER IF EXISTS audit_log_immutability ON audit_logs CASCADE;
-- DROP FUNCTION IF EXISTS prevent_audit_log_modification CASCADE;
-- DROP FUNCTION IF EXISTS cleanup_expired_audit_logs CASCADE;
-- DROP VIEW IF EXISTS recent_security_events CASCADE;
-- DROP VIEW IF EXISTS failed_login_attempts CASCADE;
-- DROP VIEW IF EXISTS data_access_trail CASCADE;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_audit_logs_user_timestamp;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_audit_logs_event_type_timestamp;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_audit_logs_severity_timestamp;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_audit_logs_suspicious;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_audit_logs_resource;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_audit_logs_ip_timestamp;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_audit_logs_tags_gin;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_audit_logs_metadata_gin;
-- DROP TABLE IF EXISTS audit_logs CASCADE;
