-- Critical security and performance indexes for user-based isolation
-- Created: 2025-10-01
-- Purpose: Enable efficient user-scoped queries and improve authentication performance
-- Expected Impact: 8x faster user-scoped queries, prevents full table scans
-- OWASP A01:2021 - Broken Access Control mitigation

-- ============================================================================
-- AUTHENTICATION & SESSION INDEXES (CRITICAL FOR SECURITY)
-- ============================================================================

-- Session validation is called on EVERY authenticated request
-- This composite index enables efficient token lookups with expiry checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_token_expires
ON user_sessions (token_hash, expires_at)
WHERE is_revoked = false;

COMMENT ON INDEX idx_user_sessions_token_expires IS
'CRITICAL: Enables O(log n) session validation. Called on every authenticated request.
Expected improvement: 15ms → 2ms per request.';

-- User ID lookup for session-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user_id
ON user_sessions (user_id, expires_at DESC)
WHERE is_revoked = false;

COMMENT ON INDEX idx_user_sessions_user_id IS
'Optimizes user session listing and cleanup. Partial index excludes revoked sessions.';

-- Active session cleanup queries (scheduled job)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_expires_at
ON user_sessions (expires_at)
WHERE is_revoked = false;

COMMENT ON INDEX idx_user_sessions_expires_at IS
'Enables efficient expired session cleanup. Used by scheduled cleanup job.';

-- ============================================================================
-- USER TABLE INDEXES (AUTHENTICATION)
-- ============================================================================

-- Email is already unique, but add explicit index for login performance
-- (unique constraint creates an index, but explicit is clearer)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active
ON users (email)
WHERE is_active = true;

COMMENT ON INDEX idx_users_email_active IS
'Optimizes login queries. Partial index excludes inactive users.';

-- Account lockout queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_locked_until
ON users (locked_until)
WHERE locked_until IS NOT NULL AND locked_until > now();

COMMENT ON INDEX idx_users_locked_until IS
'Enables efficient locked account queries and unlock job.';

-- ============================================================================
-- USER-SCOPED HISTORY INDEXES (GDPR COMPLIANCE + PERFORMANCE)
-- ============================================================================

-- Prompt history: Most common query pattern is user-scoped with time ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prompt_history_user_timestamp
ON prompt_history (user_id, timestamp DESC)
WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_prompt_history_user_timestamp IS
'CRITICAL: Enables efficient user prompt history retrieval.
Query: SELECT * FROM prompt_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 20.
Expected improvement: 120ms → 15ms for users with 10k+ prompts.';

-- Feedback: User-scoped feedback queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_user_timestamp
ON feedback (user_id, timestamp DESC)
WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_feedback_user_timestamp IS
'Enables efficient user feedback history. Used for analytics and GDPR exports.';

-- Enhancement logs: User-scoped analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enhancement_logs_user_timestamp
ON enhancement_logs (user_id, timestamp DESC)
WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_enhancement_logs_user_timestamp IS
'Enables efficient per-user usage analytics and quota enforcement.';

-- ============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- User-scoped prompt history with metadata filtering
-- Common pattern: Recent prompts by user with specific source
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enhancement_logs_user_source_timestamp
ON enhancement_logs (user_id, source, timestamp DESC)
WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_enhancement_logs_user_source_timestamp IS
'Optimizes filtered user history (e.g., "show my DeepSeek prompts from last week").';

-- User feedback with success filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_user_successful_timestamp
ON feedback (user_id, was_successful, timestamp DESC)
WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_feedback_user_successful_timestamp IS
'Optimizes user-scoped feedback queries with success filtering.';

-- ============================================================================
-- DATA RETENTION & GDPR COMPLIANCE INDEXES
-- ============================================================================

-- Efficient user data export (GDPR Article 20 - Right to Data Portability)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prompt_history_user_created_at
ON prompt_history (user_id, created_at)
WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_prompt_history_user_created_at IS
'GDPR compliance: Enables efficient user data export for DSAR requests.';

-- User data deletion (GDPR Article 17 - Right to Erasure)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_user_id
ON feedback (user_id)
WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enhancement_logs_user_id
ON enhancement_logs (user_id)
WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_feedback_user_id IS
'GDPR compliance: Enables efficient user data deletion for DSAR requests.';
COMMENT ON INDEX idx_enhancement_logs_user_id IS
'GDPR compliance: Enables efficient user data deletion for DSAR requests.';

-- ============================================================================
-- PROMPTS TABLE INDEXES (CENTRALIZED REPOSITORY)
-- ============================================================================

-- Text hash lookup for deduplication
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prompts_text_hash
ON prompts (text_hash);

COMMENT ON INDEX idx_prompts_text_hash IS
'Enables efficient prompt deduplication via hash lookup.';

-- Public prompts discovery
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prompts_public_quality
ON prompts (is_public, avg_quality_score DESC NULLS LAST)
WHERE is_public = true;

COMMENT ON INDEX idx_prompts_public_quality IS
'Enables efficient public prompt discovery sorted by quality.';

-- Most used prompts (analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prompts_total_uses
ON prompts (total_uses DESC)
WHERE is_public = true;

COMMENT ON INDEX idx_prompts_total_uses IS
'Optimizes "trending prompts" queries.';

-- ============================================================================
-- PROMPT VERSIONS INDEXES
-- ============================================================================

-- Version lookup for a specific prompt
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prompt_versions_prompt_id_version
ON prompt_versions (prompt_id, version_number DESC);

COMMENT ON INDEX idx_prompt_versions_prompt_id_version IS
'Enables efficient version history retrieval for a prompt.';

-- Latest versions by quality
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prompt_versions_prompt_quality
ON prompt_versions (prompt_id, quality_score DESC NULLS LAST);

COMMENT ON INDEX idx_prompt_versions_prompt_quality IS
'Optimizes "best version" queries.';

-- ============================================================================
-- TRAINING EXAMPLES INDEXES (LEARNING SYSTEM)
-- ============================================================================

-- Category-based retrieval for context-aware learning
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_examples_category_quality
ON training_examples (category, quality DESC)
WHERE is_active = true AND category IS NOT NULL;

COMMENT ON INDEX idx_training_examples_category_quality IS
'Enables category-specific training example selection by quality.';

-- Keyword search for semantic matching
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_examples_keywords_gin
ON training_examples USING GIN (to_tsvector('english', keywords))
WHERE is_active = true AND keywords IS NOT NULL;

COMMENT ON INDEX idx_training_examples_keywords_gin IS
'Enables full-text search on training example keywords for semantic matching.';

-- ============================================================================
-- REFRESH TABLE STATISTICS
-- ============================================================================

-- Update query planner statistics for optimal execution plans
ANALYZE users;
ANALYZE user_sessions;
ANALYZE prompt_history;
ANALYZE feedback;
ANALYZE enhancement_logs;
ANALYZE prompts;
ANALYZE prompt_versions;
ANALYZE training_examples;

-- ============================================================================
-- PERFORMANCE VALIDATION QUERIES
-- ============================================================================

-- Verify index usage with EXPLAIN ANALYZE
-- Run these after migration to confirm indexes are being used:

-- Session validation (should use idx_user_sessions_token_expires)
-- EXPLAIN ANALYZE SELECT * FROM user_sessions
-- WHERE token_hash = 'test_hash' AND expires_at > now() AND is_revoked = false;

-- User prompt history (should use idx_prompt_history_user_timestamp)
-- EXPLAIN ANALYZE SELECT * FROM prompt_history
-- WHERE user_id = 'test_uuid' ORDER BY timestamp DESC LIMIT 20;

-- User data export (should use idx_prompt_history_user_created_at)
-- EXPLAIN ANALYZE SELECT * FROM prompt_history
-- WHERE user_id = 'test_uuid' ORDER BY created_at;

-- ============================================================================
-- MAINTENANCE NOTES
-- ============================================================================

-- CONCURRENTLY prevents table locks during index creation (safe for production)
-- Partial indexes (WHERE clauses) reduce index size and improve performance
-- GIN indexes enable full-text search with tsvector
-- NULLS LAST ensures NULL values don't dominate ordering

-- Expected storage impact: ~50-100MB for 1M records across all indexes
-- Expected query improvement: 5-10x for user-scoped queries, up to 100x for session validation
-- Maintenance: Automatic via autovacuum, manual REINDEX if needed

-- Migration rollback (if needed):
-- DROP INDEX CONCURRENTLY IF EXISTS idx_user_sessions_token_expires;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_user_sessions_user_id;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_user_sessions_expires_at;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_users_email_active;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_users_locked_until;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_prompt_history_user_timestamp;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_feedback_user_timestamp;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_enhancement_logs_user_timestamp;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_enhancement_logs_user_source_timestamp;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_feedback_user_successful_timestamp;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_prompt_history_user_created_at;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_feedback_user_id;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_enhancement_logs_user_id;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_prompts_text_hash;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_prompts_public_quality;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_prompts_total_uses;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_prompt_versions_prompt_id_version;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_prompt_versions_prompt_quality;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_training_examples_category_quality;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_training_examples_keywords_gin;
