-- Migration: Add performance indexes for learning system optimization
-- This migration adds critical indexes to prevent full table scans
-- and improve query performance at scale

-- ============================================
-- TRAINING EXAMPLES INDEXES
-- ============================================

-- Composite index for pattern lookup by source and quality
-- Used in: findSimilarPattern(), findRelatedPatterns()
CREATE INDEX IF NOT EXISTS idx_training_examples_source_quality
  ON training_examples(source, quality DESC);

-- Composite index for active patterns with quality threshold
-- Used in: findMatchingPatterns() in adaptive-enhancer
CREATE INDEX IF NOT EXISTS idx_training_examples_active_quality
  ON training_examples(is_active, quality DESC);

-- Index for keyword-based pattern matching (partial text search)
-- Used in: pattern similarity checks
CREATE INDEX IF NOT EXISTS idx_training_examples_keywords_active
  ON training_examples(keywords, is_active)
  WHERE is_active = 1;

-- Index for recently updated patterns (for cache invalidation)
CREATE INDEX IF NOT EXISTS idx_training_examples_updated
  ON training_examples(updated_at DESC);

-- ============================================
-- FEEDBACK INDEXES
-- ============================================

-- Index for joining feedback with enhancement logs
-- Critical for: updatePatternQuality() N+1 fix
CREATE INDEX IF NOT EXISTS idx_feedback_enhancement_id
  ON feedback(enhancement_id);

-- Composite index for recent successful feedback queries
-- Used in: pattern extraction from successful enhancements
CREATE INDEX IF NOT EXISTS idx_feedback_created_success_score
  ON feedback(created_at DESC, was_successful, score);

-- ============================================
-- ENHANCEMENT LOGS INDEXES
-- ============================================

-- Index for time-range queries (critical for unbounded queries)
-- Used in: calculateLLMDependency(), calculateAccuracy()
CREATE INDEX IF NOT EXISTS idx_enhancement_logs_created_at
  ON enhancement_logs(created_at DESC);

-- Composite index for source-based filtering with time range
-- Used in: metrics calculation, learning cycle
CREATE INDEX IF NOT EXISTS idx_enhancement_logs_source_created
  ON enhancement_logs(source, created_at DESC);

-- Index for joining with feedback
CREATE INDEX IF NOT EXISTS idx_enhancement_logs_id_source
  ON enhancement_logs(id, source);

-- ============================================
-- PROMPT HISTORY INDEXES (if missing)
-- ============================================

-- Index for time-range queries
CREATE INDEX IF NOT EXISTS idx_prompt_history_created_at
  ON prompt_history(created_at DESC);

-- ============================================
-- AUDIT LOGS INDEXES (for compliance queries)
-- ============================================

-- Composite index for user activity audits
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON audit_logs(user_id, created_at DESC);

-- Index for retention-based cleanup
CREATE INDEX IF NOT EXISTS idx_audit_logs_retention
  ON audit_logs(retention_period_days, created_at);
