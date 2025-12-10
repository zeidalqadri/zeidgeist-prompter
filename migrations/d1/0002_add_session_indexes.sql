-- D1 Migration: Add Session Performance Indexes
-- Run with: wrangler d1 execute zeidgeist-auth --file=./migrations/d1/0002_add_session_indexes.sql

-- Composite index for active session lookups (most common query)
-- Used when validating tokens - checks token_hash with non-revoked sessions
CREATE INDEX IF NOT EXISTS idx_sessions_active_lookup
ON user_sessions(token_hash, is_revoked, expires_at);

-- Index for user session listing (for session management UI)
-- Orders by last_accessed for "most recent first" display
CREATE INDEX IF NOT EXISTS idx_sessions_user_active
ON user_sessions(user_id, is_revoked, last_accessed);

-- Index for session cleanup (expired session deletion)
-- Used by scheduled cleanup function
CREATE INDEX IF NOT EXISTS idx_sessions_cleanup
ON user_sessions(expires_at, is_revoked);

-- Index for batch session revocation
-- Used when revoking all sessions except current
CREATE INDEX IF NOT EXISTS idx_sessions_user_revoke
ON user_sessions(user_id, id);
