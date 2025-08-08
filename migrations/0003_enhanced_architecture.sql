-- Enhanced Architecture Migration
-- This migration adds the new tables and indexes for the enhanced prompt management system
-- Run after backing up existing data

-- ================================
-- CORE PROMPT MANAGEMENT TABLES
-- ================================

-- Create prompt categories table
CREATE TABLE "prompt_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL UNIQUE,
  "description" text,
  "parent_id" uuid REFERENCES "prompt_categories"("id"),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "idx_prompt_categories_name" ON "prompt_categories" ("name");
CREATE INDEX "idx_prompt_categories_parent" ON "prompt_categories" ("parent_id");

-- Create enhanced prompts table
CREATE TABLE "prompts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "original_text" text NOT NULL,
  "text_hash" text NOT NULL UNIQUE,
  "category_id" uuid REFERENCES "prompt_categories"("id"),
  "domain" text,
  "language" text DEFAULT 'en',
  "complexity_level" text,
  
  -- Version tracking
  "latest_version" integer NOT NULL DEFAULT 1,
  "total_versions" integer NOT NULL DEFAULT 1,
  
  -- Usage statistics
  "total_uses" integer NOT NULL DEFAULT 0,
  "success_rate" decimal(5,4) DEFAULT 0.0000,
  "avg_quality_score" decimal(5,2) DEFAULT 0.00,
  
  -- Search optimization
  "search_vector" text,
  "keywords" jsonb,
  
  -- Metadata
  "metadata" jsonb,
  "tags" jsonb,
  
  -- Status
  "is_active" boolean NOT NULL DEFAULT true,
  "is_template" boolean NOT NULL DEFAULT false,
  "is_public" boolean NOT NULL DEFAULT false,
  
  -- Timestamps
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "idx_prompts_text_hash" ON "prompts" ("text_hash");
CREATE INDEX "idx_prompts_category" ON "prompts" ("category_id");
CREATE INDEX "idx_prompts_domain" ON "prompts" ("domain");
CREATE INDEX "idx_prompts_complexity" ON "prompts" ("complexity_level");
CREATE INDEX "idx_prompts_usage" ON "prompts" ("total_uses");
CREATE INDEX "idx_prompts_quality" ON "prompts" ("avg_quality_score");
CREATE INDEX "idx_prompts_created" ON "prompts" ("created_at");

-- Create prompt versions table
CREATE TABLE "prompt_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "prompt_id" uuid NOT NULL REFERENCES "prompts"("id") ON DELETE CASCADE,
  "version_number" integer NOT NULL,
  
  -- Version content
  "enhanced_text" text NOT NULL,
  "context" text,
  
  -- Enhancement details
  "enhancement_method" text,
  "source" text,
  "enhancement_model" text,
  
  -- Quality metrics
  "quality_score" decimal(5,2) DEFAULT 0.00,
  "clarity_score" decimal(5,2) DEFAULT 0.00,
  "specificity_score" decimal(5,2) DEFAULT 0.00,
  "completeness_score" decimal(5,2) DEFAULT 0.00,
  "structure_score" decimal(5,2) DEFAULT 0.00,
  "actionability_score" decimal(5,2) DEFAULT 0.00,
  
  -- Performance metrics
  "token_count" integer,
  "processing_time_ms" integer,
  "success_count" integer NOT NULL DEFAULT 0,
  "failure_count" integer NOT NULL DEFAULT 0,
  
  -- Metadata
  "metadata" jsonb,
  "change_summary" text,
  
  -- Status
  "is_active" boolean NOT NULL DEFAULT true,
  "is_baseline" boolean NOT NULL DEFAULT false,
  
  -- Timestamps
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "idx_prompt_versions_prompt_version" ON "prompt_versions" ("prompt_id", "version_number");
CREATE INDEX "idx_prompt_versions_quality" ON "prompt_versions" ("quality_score");
CREATE INDEX "idx_prompt_versions_source" ON "prompt_versions" ("source");
CREATE INDEX "idx_prompt_versions_created" ON "prompt_versions" ("created_at");

-- ================================
-- TESTING & VALIDATION TABLES
-- ================================

-- Create test suites table
CREATE TABLE "prompt_test_suites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "description" text,
  "category_id" uuid REFERENCES "prompt_categories"("id"),
  
  -- Test configuration
  "test_config" jsonb,
  "pass_threshold" decimal(5,2) DEFAULT 70.00,
  
  -- Status
  "is_active" boolean NOT NULL DEFAULT true,
  
  -- Timestamps
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "idx_prompt_test_suites_name" ON "prompt_test_suites" ("name");
CREATE INDEX "idx_prompt_test_suites_category" ON "prompt_test_suites" ("category_id");

-- Create test cases table
CREATE TABLE "prompt_test_cases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "suite_id" uuid NOT NULL REFERENCES "prompt_test_suites"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  
  -- Test input
  "input_prompt" text NOT NULL,
  "input_context" text,
  
  -- Expected outcomes
  "expected_patterns" jsonb,
  "forbidden_patterns" jsonb,
  "min_length" integer,
  "max_length" integer,
  "min_quality_score" decimal(5,2),
  "required_sections" jsonb,
  
  -- Test metadata
  "priority" integer NOT NULL DEFAULT 1,
  "tags" jsonb,
  
  -- Status
  "is_active" boolean NOT NULL DEFAULT true,
  
  -- Timestamps
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "idx_prompt_test_cases_suite" ON "prompt_test_cases" ("suite_id");
CREATE INDEX "idx_prompt_test_cases_priority" ON "prompt_test_cases" ("priority");

-- Create test results table
CREATE TABLE "prompt_test_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "test_case_id" uuid NOT NULL REFERENCES "prompt_test_cases"("id") ON DELETE CASCADE,
  "prompt_version_id" uuid REFERENCES "prompt_versions"("id"),
  
  -- Test execution details
  "enhanced_output" text NOT NULL,
  "passed" boolean NOT NULL,
  "score" decimal(5,2),
  
  -- Detailed results
  "test_details" jsonb,
  "failure_reasons" jsonb,
  
  -- Performance
  "execution_time_ms" integer,
  
  -- Timestamps
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "idx_prompt_test_results_case" ON "prompt_test_results" ("test_case_id");
CREATE INDEX "idx_prompt_test_results_version" ON "prompt_test_results" ("prompt_version_id");
CREATE INDEX "idx_prompt_test_results_passed" ON "prompt_test_results" ("passed");
CREATE INDEX "idx_prompt_test_results_created" ON "prompt_test_results" ("created_at");

-- ================================
-- ANALYTICS & METRICS TABLES
-- ================================

-- Create analytics table
CREATE TABLE "prompt_analytics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "date" timestamp with time zone NOT NULL,
  "prompt_id" uuid REFERENCES "prompts"("id"),
  "category_id" uuid REFERENCES "prompt_categories"("id"),
  
  -- Usage metrics
  "total_uses" integer NOT NULL DEFAULT 0,
  "unique_users" integer NOT NULL DEFAULT 0,
  "success_count" integer NOT NULL DEFAULT 0,
  "failure_count" integer NOT NULL DEFAULT 0,
  
  -- Performance metrics
  "avg_processing_time_ms" decimal(8,2),
  "avg_quality_score" decimal(5,2),
  "avg_enhancement_ratio" decimal(5,2),
  
  -- Source breakdown
  "llm_usage" jsonb,
  "enhancement_methods" jsonb,
  
  -- Timestamps
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "idx_prompt_analytics_date_prompt" ON "prompt_analytics" ("date", "prompt_id");
CREATE INDEX "idx_prompt_analytics_date" ON "prompt_analytics" ("date");
CREATE INDEX "idx_prompt_analytics_prompt" ON "prompt_analytics" ("prompt_id");
CREATE INDEX "idx_prompt_analytics_category" ON "prompt_analytics" ("category_id");

-- Create A/B test experiments table
CREATE TABLE "ab_test_experiments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "description" text,
  
  -- Experiment configuration
  "test_type" text NOT NULL,
  "control_config" jsonb,
  "variant_configs" jsonb,
  
  -- Traffic allocation
  "traffic_percentage" decimal(5,2) NOT NULL DEFAULT 10.00,
  "allocation_strategy" text DEFAULT 'random',
  
  -- Success metrics
  "primary_metric" text NOT NULL,
  "secondary_metrics" jsonb,
  "statistical_significance" decimal(5,4),
  
  -- Status and timing
  "status" text NOT NULL DEFAULT 'draft',
  "start_date" timestamp with time zone,
  "end_date" timestamp with time zone,
  
  -- Results
  "results" jsonb,
  "conclusion" text,
  
  -- Timestamps
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "idx_ab_test_experiments_name" ON "ab_test_experiments" ("name");
CREATE INDEX "idx_ab_test_experiments_status" ON "ab_test_experiments" ("status");
CREATE INDEX "idx_ab_test_experiments_dates" ON "ab_test_experiments" ("start_date", "end_date");

-- Create A/B test participants table
CREATE TABLE "ab_test_participants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "experiment_id" uuid NOT NULL REFERENCES "ab_test_experiments"("id") ON DELETE CASCADE,
  "user_id" text,
  "session_id" text,
  
  -- Assignment
  "variant" text NOT NULL,
  "assignment_timestamp" timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Participation data
  "interactions" jsonb,
  "conversion_events" jsonb,
  
  -- Timestamps
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "idx_ab_test_participants_experiment" ON "ab_test_participants" ("experiment_id");
CREATE INDEX "idx_ab_test_participants_user" ON "ab_test_participants" ("user_id");
CREATE INDEX "idx_ab_test_participants_variant" ON "ab_test_participants" ("variant");
CREATE INDEX "idx_ab_test_participants_assignment" ON "ab_test_participants" ("assignment_timestamp");

-- ================================
-- TEMPLATE & PATTERN TABLES
-- ================================

-- Create templates table
CREATE TABLE "prompt_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "description" text,
  "category_id" uuid REFERENCES "prompt_categories"("id"),
  
  -- Template content
  "template_text" text NOT NULL,
  "placeholders" jsonb,
  "example_values" jsonb,
  
  -- Usage guidelines
  "use_cases" jsonb,
  "best_practices" text,
  
  -- Validation rules
  "validation_rules" jsonb,
  
  -- Statistics
  "usage_count" integer NOT NULL DEFAULT 0,
  "success_rate" decimal(5,4) DEFAULT 0.0000,
  "avg_quality_improvement" decimal(5,2),
  
  -- Status
  "is_active" boolean NOT NULL DEFAULT true,
  "is_premium" boolean NOT NULL DEFAULT false,
  
  -- Ownership
  "created_by" text,
  
  -- Timestamps
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "idx_prompt_templates_name" ON "prompt_templates" ("name");
CREATE INDEX "idx_prompt_templates_category" ON "prompt_templates" ("category_id");
CREATE INDEX "idx_prompt_templates_usage" ON "prompt_templates" ("usage_count");
CREATE INDEX "idx_prompt_templates_created_by" ON "prompt_templates" ("created_by");

-- Create enhancement patterns table
CREATE TABLE "enhancement_patterns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "description" text,
  
  -- Pattern definition
  "pattern_type" text NOT NULL,
  "trigger_conditions" jsonb,
  "transformation_rules" jsonb,
  
  -- Pattern matching
  "input_patterns" jsonb,
  "output_patterns" jsonb,
  
  -- Quality metrics
  "confidence_score" decimal(5,4) NOT NULL,
  "success_rate" decimal(5,4) NOT NULL,
  "quality_improvement" decimal(5,2),
  
  -- Usage statistics
  "usage_count" integer NOT NULL DEFAULT 0,
  "success_count" integer NOT NULL DEFAULT 0,
  
  -- Learning metadata
  "learned_from_count" integer NOT NULL DEFAULT 0,
  "last_validation" timestamp with time zone,
  "validation_score" decimal(5,2),
  
  -- Status
  "is_active" boolean NOT NULL DEFAULT true,
  "is_validated" boolean NOT NULL DEFAULT false,
  
  -- Timestamps
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "idx_enhancement_patterns_type" ON "enhancement_patterns" ("pattern_type");
CREATE INDEX "idx_enhancement_patterns_confidence" ON "enhancement_patterns" ("confidence_score");
CREATE INDEX "idx_enhancement_patterns_success_rate" ON "enhancement_patterns" ("success_rate");
CREATE INDEX "idx_enhancement_patterns_usage" ON "enhancement_patterns" ("usage_count");

-- ================================
-- CACHING & PERFORMANCE TABLES
-- ================================

-- Create cache table
CREATE TABLE "prompt_cache" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "cache_key" text NOT NULL UNIQUE,
  
  -- Cache content
  "original_prompt" text NOT NULL,
  "context" text,
  "enhanced_result" text NOT NULL,
  
  -- Enhancement metadata
  "enhancement_method" text,
  "source" text,
  "quality_score" decimal(5,2),
  "processing_time_ms" integer,
  
  -- Cache statistics
  "hit_count" integer NOT NULL DEFAULT 0,
  "last_hit" timestamp with time zone DEFAULT now(),
  
  -- Cache management
  "expires_at" timestamp with time zone,
  
  -- Timestamps
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "idx_prompt_cache_key" ON "prompt_cache" ("cache_key");
CREATE INDEX "idx_prompt_cache_expires" ON "prompt_cache" ("expires_at");
CREATE INDEX "idx_prompt_cache_hit_count" ON "prompt_cache" ("hit_count");
CREATE INDEX "idx_prompt_cache_last_hit" ON "prompt_cache" ("last_hit");

-- ================================
-- DATA MIGRATION FROM EXISTING TABLES
-- ================================

-- Insert default categories
INSERT INTO "prompt_categories" ("name", "description") VALUES
  ('General', 'General purpose prompts'),
  ('Technical', 'Technical and programming related prompts'),
  ('Business', 'Business and professional prompts'),
  ('Creative', 'Creative writing and artistic prompts'),
  ('Academic', 'Educational and research prompts'),
  ('Website', 'Website and web development prompts');

-- Migrate existing training examples to new structure
WITH migrated_prompts AS (
  INSERT INTO "prompts" (
    "original_text",
    "text_hash",
    "category_id",
    "domain",
    "created_at"
  )
  SELECT DISTINCT
    t.raw_prompt,
    encode(sha256(t.raw_prompt::bytea), 'hex'),
    c.id,
    CASE 
      WHEN t.category ILIKE '%website%' THEN 'technical'
      WHEN t.category ILIKE '%business%' THEN 'business'
      WHEN t.category ILIKE '%creative%' THEN 'creative'
      ELSE 'general'
    END,
    t.created_at
  FROM training_examples t
  LEFT JOIN prompt_categories c ON c.name = COALESCE(t.category, 'General')
  WHERE t.is_active = true
  ON CONFLICT (text_hash) DO NOTHING
  RETURNING id, original_text
)
INSERT INTO "prompt_versions" (
  "prompt_id",
  "version_number",
  "enhanced_text",
  "context",
  "enhancement_method",
  "source",
  "quality_score",
  "created_at"
)
SELECT 
  p.id,
  1,
  t.enhanced_prompt,
  t.context,
  'llm',
  t.source,
  COALESCE(t.quality, 0),
  t.created_at
FROM migrated_prompts p
JOIN training_examples t ON t.raw_prompt = p.original_text
WHERE t.is_active = true;

-- Update usage statistics from enhancement logs
UPDATE "prompts" 
SET 
  "total_uses" = subq.usage_count,
  "avg_quality_score" = subq.avg_quality
FROM (
  SELECT 
    encode(sha256(el.original_prompt::bytea), 'hex') as text_hash,
    COUNT(*) as usage_count,
    AVG(COALESCE(f.score, 3)) as avg_quality
  FROM enhancement_logs el
  LEFT JOIN feedback f ON f.enhancement_id = el.id
  WHERE el.original_prompt IS NOT NULL
  GROUP BY encode(sha256(el.original_prompt::bytea), 'hex')
) subq
WHERE "prompts"."text_hash" = subq.text_hash;

-- ================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ================================

-- Function to update prompt statistics
CREATE OR REPLACE FUNCTION update_prompt_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update prompt usage and quality stats
  UPDATE prompts 
  SET 
    total_uses = total_uses + 1,
    updated_at = now()
  WHERE id = NEW.prompt_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats when new version is used
CREATE TRIGGER update_prompt_stats_trigger
  AFTER INSERT ON prompt_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_stats();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
CREATE TRIGGER update_prompt_categories_updated_at
  BEFORE UPDATE ON prompt_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_versions_updated_at
  BEFORE UPDATE ON prompt_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_test_suites_updated_at
  BEFORE UPDATE ON prompt_test_suites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_test_cases_updated_at
  BEFORE UPDATE ON prompt_test_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_test_experiments_updated_at
  BEFORE UPDATE ON ab_test_experiments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_templates_updated_at
  BEFORE UPDATE ON prompt_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enhancement_patterns_updated_at
  BEFORE UPDATE ON enhancement_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_cache_updated_at
  BEFORE UPDATE ON prompt_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- PERFORMANCE OPTIMIZATIONS
-- ================================

-- Full-text search configuration
-- Update search vectors for existing prompts (run this after migration)
-- UPDATE prompts SET search_vector = to_tsvector('english', original_text || ' ' || COALESCE(array_to_string(tags, ' '), ''));

-- Partitioning for large tables (implement if needed)
-- CREATE TABLE prompt_analytics_2024 PARTITION OF prompt_analytics
-- FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

COMMENT ON TABLE prompt_categories IS 'Hierarchical categories for organizing prompts';
COMMENT ON TABLE prompts IS 'Main prompts table with versioning and analytics';
COMMENT ON TABLE prompt_versions IS 'Individual versions of enhanced prompts';
COMMENT ON TABLE prompt_test_suites IS 'Test suites for validating prompt enhancements';
COMMENT ON TABLE prompt_test_cases IS 'Individual test cases within test suites';
COMMENT ON TABLE prompt_test_results IS 'Results from running test cases';
COMMENT ON TABLE prompt_analytics IS 'Daily aggregated analytics data';
COMMENT ON TABLE ab_test_experiments IS 'A/B testing experiments configuration';
COMMENT ON TABLE ab_test_participants IS 'User participation in A/B tests';
COMMENT ON TABLE prompt_templates IS 'Reusable prompt templates';
COMMENT ON TABLE enhancement_patterns IS 'Learned enhancement patterns from ML';
COMMENT ON TABLE prompt_cache IS 'Cache for prompt enhancement results';