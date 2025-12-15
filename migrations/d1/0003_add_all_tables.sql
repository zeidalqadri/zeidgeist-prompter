-- Migration: Add all application tables to D1
-- This consolidates all data from Neon PostgreSQL into Cloudflare D1

-- ============================================
-- PROMPT HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS prompt_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  original TEXT NOT NULL,
  refined TEXT NOT NULL,
  context TEXT,
  metadata TEXT,
  ip_address TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_prompt_history_user_id ON prompt_history(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_history_timestamp ON prompt_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_history_ip_address ON prompt_history(ip_address);

-- ============================================
-- FEEDBACK
-- ============================================
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  enhancement_id TEXT,
  original_prompt TEXT NOT NULL,
  enhanced_prompt TEXT NOT NULL,
  was_successful INTEGER NOT NULL DEFAULT 0,
  score INTEGER DEFAULT 0,
  feedback_text TEXT,
  user_agent TEXT,
  ip_address TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_timestamp ON feedback(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_was_successful ON feedback(was_successful);

-- ============================================
-- ENHANCEMENT LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS enhancement_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  original_prompt TEXT,
  enhanced_prompt TEXT,
  prompt_length INTEGER NOT NULL,
  has_context INTEGER NOT NULL DEFAULT 0,
  is_refinement INTEGER NOT NULL DEFAULT 0,
  is_expansion INTEGER NOT NULL DEFAULT 0,
  repeat_count INTEGER DEFAULT 0,
  source TEXT NOT NULL,
  enhancement_model TEXT,
  response_time INTEGER,
  processing_time INTEGER,
  was_identical INTEGER DEFAULT 0,
  had_error INTEGER DEFAULT 0,
  context TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_enhancement_logs_user_id ON enhancement_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_enhancement_logs_timestamp ON enhancement_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_enhancement_logs_source ON enhancement_logs(source);
CREATE INDEX IF NOT EXISTS idx_enhancement_logs_had_error ON enhancement_logs(had_error);

-- ============================================
-- PROMPTS (Centralized Repository)
-- ============================================
CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  original_text TEXT NOT NULL,
  text_hash TEXT NOT NULL,
  category_id TEXT,
  latest_version INTEGER NOT NULL DEFAULT 1,
  total_uses INTEGER NOT NULL DEFAULT 0,
  avg_quality_score INTEGER,
  is_public INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_prompts_text_hash ON prompts(text_hash);
CREATE INDEX IF NOT EXISTS idx_prompts_is_public ON prompts(is_public);

-- ============================================
-- PROMPT VERSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS prompt_versions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  enhanced_text TEXT NOT NULL,
  enhancement_source TEXT NOT NULL,
  quality_score INTEGER,
  metrics_data TEXT,
  is_baseline INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_id ON prompt_versions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_version ON prompt_versions(prompt_id, version_number);

-- ============================================
-- TRAINING EXAMPLES
-- ============================================
CREATE TABLE IF NOT EXISTS training_examples (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  raw_prompt TEXT NOT NULL,
  enhanced_prompt TEXT NOT NULL,
  context TEXT,
  category TEXT,
  keywords TEXT,
  source TEXT NOT NULL,
  quality INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  metadata TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_training_examples_category ON training_examples(category);
CREATE INDEX IF NOT EXISTS idx_training_examples_source ON training_examples(source);
CREATE INDEX IF NOT EXISTS idx_training_examples_is_active ON training_examples(is_active);
CREATE INDEX IF NOT EXISTS idx_training_examples_quality ON training_examples(quality DESC);

-- ============================================
-- EXTENSION DOWNLOADS
-- ============================================
CREATE TABLE IF NOT EXISTS extension_downloads (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  extension_version TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_extension_downloads_user_id ON extension_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_extension_downloads_version ON extension_downloads(extension_version);

-- ============================================
-- AUDIT LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  severity TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  resource_type TEXT,
  resource_id TEXT,
  resource_name TEXT,
  request_method TEXT,
  request_path TEXT,
  request_query_params TEXT,
  request_headers TEXT,
  response_status_code INTEGER,
  response_time_ms INTEGER,
  old_values TEXT,
  new_values TEXT,
  metadata TEXT,
  tags TEXT,
  is_suspicious INTEGER DEFAULT 0,
  risk_score INTEGER DEFAULT 0,
  threat_indicators TEXT,
  retention_period_days INTEGER DEFAULT 90,
  is_immutable INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_category ON audit_logs(event_category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_is_suspicious ON audit_logs(is_suspicious);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);

-- ============================================
-- DSAR REQUESTS (GDPR/CCPA Compliance)
-- ============================================
CREATE TABLE IF NOT EXISTS dsar_requests (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  request_data TEXT,
  response_data TEXT,
  admin_notes TEXT,
  expires_at TEXT,
  processed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dsar_requests_user_id ON dsar_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_dsar_requests_status ON dsar_requests(status);
CREATE INDEX IF NOT EXISTS idx_dsar_requests_created_at ON dsar_requests(created_at DESC);

-- ============================================
-- TRIGGERS for updated_at
-- ============================================
CREATE TRIGGER IF NOT EXISTS prompt_history_updated_at
  AFTER UPDATE ON prompt_history
  FOR EACH ROW
  BEGIN
    UPDATE prompt_history SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS prompts_updated_at
  AFTER UPDATE ON prompts
  FOR EACH ROW
  BEGIN
    UPDATE prompts SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS training_examples_updated_at
  AFTER UPDATE ON training_examples
  FOR EACH ROW
  BEGIN
    UPDATE training_examples SET updated_at = datetime('now') WHERE id = NEW.id;
  END;
