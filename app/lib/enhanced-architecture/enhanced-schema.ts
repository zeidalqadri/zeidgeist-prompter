/**
 * Enhanced Database Schema
 * Extended schema for advanced prompt management, versioning, and analytics
 */

import { pgTable, text, timestamp, boolean, integer, uuid, decimal, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ================================
// CORE PROMPT MANAGEMENT TABLES
// ================================

// Prompt categories for organization
export const promptCategories = pgTable('prompt_categories', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull().unique(),
  description: text('description'),
  parent_id: uuid('parent_id'), // For hierarchical categories
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`)
}, (table) => ({
  nameIdx: index('idx_prompt_categories_name').on(table.name),
  parentIdx: index('idx_prompt_categories_parent').on(table.parent_id)
}));

// Main prompts table with improved structure
export const prompts = pgTable('prompts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  original_text: text('original_text').notNull(),
  text_hash: text('text_hash').notNull().unique(), // For deduplication
  category_id: uuid('category_id').references(() => promptCategories.id),
  domain: text('domain'), // 'technical', 'business', 'creative', 'academic'
  language: text('language').default('en'),
  complexity_level: text('complexity_level'), // 'basic', 'intermediate', 'advanced'
  
  // Version tracking
  latest_version: integer('latest_version').notNull().default(1),
  total_versions: integer('total_versions').notNull().default(1),
  
  // Usage statistics
  total_uses: integer('total_uses').notNull().default(0),
  success_rate: decimal('success_rate', { precision: 5, scale: 4 }).default('0.0000'),
  avg_quality_score: decimal('avg_quality_score', { precision: 5, scale: 2 }).default('0.00'),
  
  // Search optimization
  search_vector: text('search_vector'), // Full-text search
  keywords: jsonb('keywords'), // Extracted keywords for search
  
  // Metadata
  metadata: jsonb('metadata'), // Flexible metadata storage
  tags: jsonb('tags'), // User-defined tags
  
  // Status
  is_active: boolean('is_active').notNull().default(true),
  is_template: boolean('is_template').notNull().default(false),
  is_public: boolean('is_public').notNull().default(false),
  
  // Timestamps
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`)
}, (table) => ({
  hashIdx: uniqueIndex('idx_prompts_text_hash').on(table.text_hash),
  categoryIdx: index('idx_prompts_category').on(table.category_id),
  domainIdx: index('idx_prompts_domain').on(table.domain),
  complexityIdx: index('idx_prompts_complexity').on(table.complexity_level),
  usageIdx: index('idx_prompts_usage').on(table.total_uses),
  qualityIdx: index('idx_prompts_quality').on(table.avg_quality_score),
  createdIdx: index('idx_prompts_created').on(table.created_at)
}));

// Prompt versions for tracking enhancements
export const promptVersions = pgTable('prompt_versions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  prompt_id: uuid('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  version_number: integer('version_number').notNull(),
  
  // Version content
  enhanced_text: text('enhanced_text').notNull(),
  context: text('context'),
  
  // Enhancement details
  enhancement_method: text('enhancement_method'), // 'llm', 'template', 'manual', 'hybrid'
  source: text('source'), // 'deepseek', 'mistral', 'gemini', 'local', 'user'
  enhancement_model: text('enhancement_model'), // Specific model version
  
  // Quality metrics
  quality_score: decimal('quality_score', { precision: 5, scale: 2 }).default('0.00'),
  clarity_score: decimal('clarity_score', { precision: 5, scale: 2 }).default('0.00'),
  specificity_score: decimal('specificity_score', { precision: 5, scale: 2 }).default('0.00'),
  completeness_score: decimal('completeness_score', { precision: 5, scale: 2 }).default('0.00'),
  structure_score: decimal('structure_score', { precision: 5, scale: 2 }).default('0.00'),
  actionability_score: decimal('actionability_score', { precision: 5, scale: 2 }).default('0.00'),
  
  // Performance metrics
  token_count: integer('token_count'),
  processing_time_ms: integer('processing_time_ms'),
  success_count: integer('success_count').notNull().default(0),
  failure_count: integer('failure_count').notNull().default(0),
  
  // Metadata
  metadata: jsonb('metadata'),
  change_summary: text('change_summary'), // Summary of what changed
  
  // Status
  is_active: boolean('is_active').notNull().default(true),
  is_baseline: boolean('is_baseline').notNull().default(false),
  
  // Timestamps
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`)
}, (table) => ({
  promptVersionIdx: index('idx_prompt_versions_prompt_version').on(table.prompt_id, table.version_number),
  qualityIdx: index('idx_prompt_versions_quality').on(table.quality_score),
  sourceIdx: index('idx_prompt_versions_source').on(table.source),
  createdIdx: index('idx_prompt_versions_created').on(table.created_at)
}));

// ================================
// TESTING & VALIDATION TABLES
// ================================

// Test suites for prompt validation
export const promptTestSuites = pgTable('prompt_test_suites', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  description: text('description'),
  category_id: uuid('category_id').references(() => promptCategories.id),
  
  // Test configuration
  test_config: jsonb('test_config'), // Test parameters and expectations
  pass_threshold: decimal('pass_threshold', { precision: 5, scale: 2 }).default('70.00'),
  
  // Status
  is_active: boolean('is_active').notNull().default(true),
  
  // Timestamps
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`)
}, (table) => ({
  nameIdx: index('idx_prompt_test_suites_name').on(table.name),
  categoryIdx: index('idx_prompt_test_suites_category').on(table.category_id)
}));

// Individual test cases
export const promptTestCases = pgTable('prompt_test_cases', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  suite_id: uuid('suite_id').notNull().references(() => promptTestSuites.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  
  // Test input
  input_prompt: text('input_prompt').notNull(),
  input_context: text('input_context'),
  
  // Expected outcomes
  expected_patterns: jsonb('expected_patterns'), // Regex patterns that should match
  forbidden_patterns: jsonb('forbidden_patterns'), // Patterns that shouldn't match
  min_length: integer('min_length'),
  max_length: integer('max_length'),
  min_quality_score: decimal('min_quality_score', { precision: 5, scale: 2 }),
  required_sections: jsonb('required_sections'), // Required content sections
  
  // Test metadata
  priority: integer('priority').notNull().default(1),
  tags: jsonb('tags'),
  
  // Status
  is_active: boolean('is_active').notNull().default(true),
  
  // Timestamps
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`)
}, (table) => ({
  suiteIdx: index('idx_prompt_test_cases_suite').on(table.suite_id),
  priorityIdx: index('idx_prompt_test_cases_priority').on(table.priority)
}));

// Test results and history
export const promptTestResults = pgTable('prompt_test_results', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  test_case_id: uuid('test_case_id').notNull().references(() => promptTestCases.id, { onDelete: 'cascade' }),
  prompt_version_id: uuid('prompt_version_id').references(() => promptVersions.id),
  
  // Test execution details
  enhanced_output: text('enhanced_output').notNull(),
  passed: boolean('passed').notNull(),
  score: decimal('score', { precision: 5, scale: 2 }),
  
  // Detailed results
  test_details: jsonb('test_details'), // Detailed test results
  failure_reasons: jsonb('failure_reasons'), // Why tests failed
  
  // Performance
  execution_time_ms: integer('execution_time_ms'),
  
  // Timestamps
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`)
}, (table) => ({
  testCaseIdx: index('idx_prompt_test_results_case').on(table.test_case_id),
  versionIdx: index('idx_prompt_test_results_version').on(table.prompt_version_id),
  passedIdx: index('idx_prompt_test_results_passed').on(table.passed),
  createdIdx: index('idx_prompt_test_results_created').on(table.created_at)
}));

// ================================
// ANALYTICS & METRICS TABLES
// ================================

// Daily analytics aggregation
export const promptAnalytics = pgTable('prompt_analytics', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp('date', { withTimezone: true }).notNull(),
  prompt_id: uuid('prompt_id').references(() => prompts.id),
  category_id: uuid('category_id').references(() => promptCategories.id),
  
  // Usage metrics
  total_uses: integer('total_uses').notNull().default(0),
  unique_users: integer('unique_users').notNull().default(0),
  success_count: integer('success_count').notNull().default(0),
  failure_count: integer('failure_count').notNull().default(0),
  
  // Performance metrics
  avg_processing_time_ms: decimal('avg_processing_time_ms', { precision: 8, scale: 2 }),
  avg_quality_score: decimal('avg_quality_score', { precision: 5, scale: 2 }),
  avg_enhancement_ratio: decimal('avg_enhancement_ratio', { precision: 5, scale: 2 }),
  
  // Source breakdown
  llm_usage: jsonb('llm_usage'), // Usage by LLM provider
  enhancement_methods: jsonb('enhancement_methods'), // Usage by method
  
  // Timestamps
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`)
}, (table) => ({
  datePromptIdx: uniqueIndex('idx_prompt_analytics_date_prompt').on(table.date, table.prompt_id),
  dateIdx: index('idx_prompt_analytics_date').on(table.date),
  promptIdx: index('idx_prompt_analytics_prompt').on(table.prompt_id),
  categoryIdx: index('idx_prompt_analytics_category').on(table.category_id)
}));

// A/B testing experiments
export const abTestExperiments = pgTable('ab_test_experiments', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  description: text('description'),
  
  // Experiment configuration
  test_type: text('test_type').notNull(), // 'enhancement_method', 'model_comparison', 'template_test'
  control_config: jsonb('control_config'), // Control group configuration
  variant_configs: jsonb('variant_configs'), // Test variant configurations
  
  // Traffic allocation
  traffic_percentage: decimal('traffic_percentage', { precision: 5, scale: 2 }).notNull().default('10.00'),
  allocation_strategy: text('allocation_strategy').default('random'), // 'random', 'sticky', 'geographic'
  
  // Success metrics
  primary_metric: text('primary_metric').notNull(), // 'quality_score', 'success_rate', 'user_satisfaction'
  secondary_metrics: jsonb('secondary_metrics'),
  statistical_significance: decimal('statistical_significance', { precision: 5, scale: 4 }),
  
  // Status and timing
  status: text('status').notNull().default('draft'), // 'draft', 'running', 'paused', 'completed'
  start_date: timestamp('start_date', { withTimezone: true }),
  end_date: timestamp('end_date', { withTimezone: true }),
  
  // Results
  results: jsonb('results'), // Statistical results
  conclusion: text('conclusion'),
  
  // Timestamps
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`)
}, (table) => ({
  nameIdx: index('idx_ab_test_experiments_name').on(table.name),
  statusIdx: index('idx_ab_test_experiments_status').on(table.status),
  dateRangeIdx: index('idx_ab_test_experiments_dates').on(table.start_date, table.end_date)
}));

// A/B test participation tracking
export const abTestParticipants = pgTable('ab_test_participants', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  experiment_id: uuid('experiment_id').notNull().references(() => abTestExperiments.id, { onDelete: 'cascade' }),
  user_id: text('user_id'), // Anonymous user identifier
  session_id: text('session_id'),
  
  // Assignment
  variant: text('variant').notNull(), // 'control' or variant name
  assignment_timestamp: timestamp('assignment_timestamp', { withTimezone: true }).notNull().default(sql`now()`),
  
  // Participation data
  interactions: jsonb('interactions'), // User interactions during test
  conversion_events: jsonb('conversion_events'), // Conversion tracking
  
  // Timestamps
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`)
}, (table) => ({
  experimentIdx: index('idx_ab_test_participants_experiment').on(table.experiment_id),
  userIdx: index('idx_ab_test_participants_user').on(table.user_id),
  variantIdx: index('idx_ab_test_participants_variant').on(table.variant),
  assignmentIdx: index('idx_ab_test_participants_assignment').on(table.assignment_timestamp)
}));

// ================================
// TEMPLATE & PATTERN TABLES
// ================================

// Prompt templates for common use cases
export const promptTemplates = pgTable('prompt_templates', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  description: text('description'),
  category_id: uuid('category_id').references(() => promptCategories.id),
  
  // Template content
  template_text: text('template_text').notNull(),
  placeholders: jsonb('placeholders'), // Template variable definitions
  example_values: jsonb('example_values'), // Example placeholder values
  
  // Usage guidelines
  use_cases: jsonb('use_cases'), // When to use this template
  best_practices: text('best_practices'), // Usage recommendations
  
  // Validation rules
  validation_rules: jsonb('validation_rules'), // Rules for template usage
  
  // Statistics
  usage_count: integer('usage_count').notNull().default(0),
  success_rate: decimal('success_rate', { precision: 5, scale: 4 }).default('0.0000'),
  avg_quality_improvement: decimal('avg_quality_improvement', { precision: 5, scale: 2 }),
  
  // Status
  is_active: boolean('is_active').notNull().default(true),
  is_premium: boolean('is_premium').notNull().default(false),
  
  // Ownership
  created_by: text('created_by'), // User who created the template
  
  // Timestamps
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`)
}, (table) => ({
  nameIdx: index('idx_prompt_templates_name').on(table.name),
  categoryIdx: index('idx_prompt_templates_category').on(table.category_id),
  usageIdx: index('idx_prompt_templates_usage').on(table.usage_count),
  createdByIdx: index('idx_prompt_templates_created_by').on(table.created_by)
}));

// Enhancement patterns learned from successful enhancements
export const enhancementPatterns = pgTable('enhancement_patterns', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  description: text('description'),
  
  // Pattern definition
  pattern_type: text('pattern_type').notNull(), // 'structural', 'semantic', 'stylistic', 'domain_specific'
  trigger_conditions: jsonb('trigger_conditions'), // When to apply this pattern
  transformation_rules: jsonb('transformation_rules'), // How to apply the pattern
  
  // Pattern matching
  input_patterns: jsonb('input_patterns'), // Patterns in original prompts
  output_patterns: jsonb('output_patterns'), // Expected patterns in enhanced prompts
  
  // Quality metrics
  confidence_score: decimal('confidence_score', { precision: 5, scale: 4 }).notNull(),
  success_rate: decimal('success_rate', { precision: 5, scale: 4 }).notNull(),
  quality_improvement: decimal('quality_improvement', { precision: 5, scale: 2 }),
  
  // Usage statistics
  usage_count: integer('usage_count').notNull().default(0),
  success_count: integer('success_count').notNull().default(0),
  
  // Learning metadata
  learned_from_count: integer('learned_from_count').notNull().default(0), // How many examples this was learned from
  last_validation: timestamp('last_validation', { withTimezone: true }),
  validation_score: decimal('validation_score', { precision: 5, scale: 2 }),
  
  // Status
  is_active: boolean('is_active').notNull().default(true),
  is_validated: boolean('is_validated').notNull().default(false),
  
  // Timestamps
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`)
}, (table) => ({
  typeIdx: index('idx_enhancement_patterns_type').on(table.pattern_type),
  confidenceIdx: index('idx_enhancement_patterns_confidence').on(table.confidence_score),
  successRateIdx: index('idx_enhancement_patterns_success_rate').on(table.success_rate),
  usageIdx: index('idx_enhancement_patterns_usage').on(table.usage_count)
}));

// ================================
// CACHING & PERFORMANCE TABLES
// ================================

// Cache table for prompt results
export const promptCache = pgTable('prompt_cache', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  cache_key: text('cache_key').notNull().unique(), // Hash of prompt + context + settings
  
  // Cache content
  original_prompt: text('original_prompt').notNull(),
  context: text('context'),
  enhanced_result: text('enhanced_result').notNull(),
  
  // Enhancement metadata
  enhancement_method: text('enhancement_method'),
  source: text('source'),
  quality_score: decimal('quality_score', { precision: 5, scale: 2 }),
  processing_time_ms: integer('processing_time_ms'),
  
  // Cache statistics
  hit_count: integer('hit_count').notNull().default(0),
  last_hit: timestamp('last_hit', { withTimezone: true }).default(sql`now()`),
  
  // Cache management
  expires_at: timestamp('expires_at', { withTimezone: true }),
  
  // Timestamps
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`)
}, (table) => ({
  cacheKeyIdx: uniqueIndex('idx_prompt_cache_key').on(table.cache_key),
  expiresIdx: index('idx_prompt_cache_expires').on(table.expires_at),
  hitCountIdx: index('idx_prompt_cache_hit_count').on(table.hit_count),
  lastHitIdx: index('idx_prompt_cache_last_hit').on(table.last_hit)
}));

// ================================
// TYPE EXPORTS
// ================================

// Export types for TypeScript
export type PromptCategory = typeof promptCategories.$inferSelect;
export type NewPromptCategory = typeof promptCategories.$inferInsert;

export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;

export type PromptVersion = typeof promptVersions.$inferSelect;
export type NewPromptVersion = typeof promptVersions.$inferInsert;

export type PromptTestSuite = typeof promptTestSuites.$inferSelect;
export type NewPromptTestSuite = typeof promptTestSuites.$inferInsert;

export type PromptTestCase = typeof promptTestCases.$inferSelect;
export type NewPromptTestCase = typeof promptTestCases.$inferInsert;

export type PromptTestResult = typeof promptTestResults.$inferSelect;
export type NewPromptTestResult = typeof promptTestResults.$inferInsert;

export type PromptAnalytics = typeof promptAnalytics.$inferSelect;
export type NewPromptAnalytics = typeof promptAnalytics.$inferInsert;

export type AbTestExperiment = typeof abTestExperiments.$inferSelect;
export type NewAbTestExperiment = typeof abTestExperiments.$inferInsert;

export type AbTestParticipant = typeof abTestParticipants.$inferSelect;
export type NewAbTestParticipant = typeof abTestParticipants.$inferInsert;

export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type NewPromptTemplate = typeof promptTemplates.$inferInsert;

export type EnhancementPattern = typeof enhancementPatterns.$inferSelect;
export type NewEnhancementPattern = typeof enhancementPatterns.$inferInsert;

export type PromptCache = typeof promptCache.$inferSelect;
export type NewPromptCache = typeof promptCache.$inferInsert;