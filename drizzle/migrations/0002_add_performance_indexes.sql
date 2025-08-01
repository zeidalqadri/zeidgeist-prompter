-- Performance optimization indexes for zeidgeist-prompter
-- Created: $(date -u +"%Y-%m-%d %H:%M:%S")
-- Purpose: Improve query performance for prompt history, feedback, and enhancement logs

-- Indexes for prompt_history table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prompt_history_timestamp 
ON prompt_history (timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prompt_history_created_at 
ON prompt_history (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prompt_history_metadata_gin 
ON prompt_history USING GIN ((metadata::jsonb)) 
WHERE metadata IS NOT NULL;

-- Indexes for feedback table  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_timestamp 
ON feedback (timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_was_successful 
ON feedback (was_successful);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_created_at 
ON feedback (created_at DESC);

-- Indexes for enhancement_logs table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enhancement_logs_timestamp 
ON enhancement_logs (timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enhancement_logs_source 
ON enhancement_logs (source);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enhancement_logs_processing_time 
ON enhancement_logs (processing_time) 
WHERE processing_time IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enhancement_logs_had_error 
ON enhancement_logs (had_error);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enhancement_logs_source_timestamp 
ON enhancement_logs (source, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_successful_timestamp 
ON feedback (was_successful, timestamp DESC);

-- Partial indexes for optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enhancement_logs_errors_only 
ON enhancement_logs (timestamp DESC) 
WHERE had_error = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enhancement_logs_successful_only 
ON enhancement_logs (timestamp DESC, processing_time) 
WHERE had_error = false;

-- Indexes for training_examples table if it exists
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_examples_quality 
ON training_examples (quality DESC) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_examples_usage_count 
ON training_examples (usage_count DESC) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_examples_source 
ON training_examples (source, created_at DESC);

-- Text search indexes for better search performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prompt_history_original_gin 
ON prompt_history USING GIN (to_tsvector('english', original));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prompt_history_refined_gin 
ON prompt_history USING GIN (to_tsvector('english', refined));

-- Update table statistics for better query planning
ANALYZE prompt_history;
ANALYZE feedback;  
ANALYZE enhancement_logs;
ANALYZE training_examples;

-- Add helpful comments
COMMENT ON INDEX idx_prompt_history_timestamp IS 'Optimizes ORDER BY timestamp DESC queries for prompt history';
COMMENT ON INDEX idx_enhancement_logs_source_timestamp IS 'Optimizes filtering by source with timestamp ordering';
COMMENT ON INDEX idx_prompt_history_original_gin IS 'Enables full-text search on original prompts';