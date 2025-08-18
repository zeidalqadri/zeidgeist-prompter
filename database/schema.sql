-- ZeidGeist Prompter D1 Database Schema
-- Cloudflare D1 SQLite database for preview environment

-- Prompt Enhancement Requests
CREATE TABLE IF NOT EXISTS prompt_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_prompt TEXT NOT NULL,
    enhanced_prompt TEXT,
    processing_method TEXT DEFAULT 'workers_ai',
    processing_time INTEGER, -- milliseconds
    user_id TEXT,
    session_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    options JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Feedback
CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_request_id INTEGER,
    feedback_type TEXT CHECK(feedback_type IN ('thumbs_up', 'thumbs_down', 'comment')),
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    user_id TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prompt_request_id) REFERENCES prompt_requests(id)
);

-- Learned Patterns (AI Learning System)
CREATE TABLE IF NOT EXISTS learned_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_type TEXT NOT NULL, -- 'enhancement_rule', 'user_preference', 'context_pattern'
    pattern_data JSON NOT NULL,
    confidence_score REAL DEFAULT 0.5,
    usage_count INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0.0,
    last_used DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AB Testing Experiments
CREATE TABLE IF NOT EXISTS ab_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id TEXT UNIQUE NOT NULL,
    test_name TEXT NOT NULL,
    description TEXT,
    variants JSON NOT NULL, -- Array of variant configurations
    traffic_allocation REAL DEFAULT 1.0,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed')),
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AB Test Assignments
CREATE TABLE IF NOT EXISTS ab_test_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id TEXT NOT NULL,
    user_id TEXT,
    session_id TEXT,
    variant_id TEXT NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    context JSON,
    FOREIGN KEY (test_id) REFERENCES ab_tests(test_id)
);

-- AB Test Results
CREATE TABLE IF NOT EXISTS ab_test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id TEXT NOT NULL,
    user_id TEXT,
    variant_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    context JSON,
    FOREIGN KEY (test_id) REFERENCES ab_tests(test_id)
);

-- System Configuration
CREATE TABLE IF NOT EXISTS system_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key TEXT UNIQUE NOT NULL,
    config_value JSON NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Feature Flags
CREATE TABLE IF NOT EXISTS feature_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flag_name TEXT UNIQUE NOT NULL,
    enabled BOOLEAN DEFAULT 0,
    rollout_percentage INTEGER DEFAULT 0 CHECK(rollout_percentage >= 0 AND rollout_percentage <= 100),
    conditions JSON,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- API Usage Metrics
CREATE TABLE IF NOT EXISTS api_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER, -- milliseconds
    user_id TEXT,
    ip_address TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata JSON
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prompt_requests_created_at ON prompt_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_prompt_requests_user_id ON prompt_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_requests_session_id ON prompt_requests(session_id);

CREATE INDEX IF NOT EXISTS idx_feedback_prompt_request_id ON feedback(prompt_request_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);

CREATE INDEX IF NOT EXISTS idx_learned_patterns_type ON learned_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_confidence ON learned_patterns(confidence_score);

CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_test_id ON ab_test_assignments(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_user_id ON ab_test_assignments(user_id);

CREATE INDEX IF NOT EXISTS idx_ab_test_results_test_id ON ab_test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_timestamp ON ab_test_results(timestamp);

CREATE INDEX IF NOT EXISTS idx_api_metrics_endpoint ON api_metrics(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_metrics_timestamp ON api_metrics(timestamp);

-- Insert default configuration
INSERT OR REPLACE INTO system_config (config_key, config_value, description) VALUES
('ai_models', '{"primary": "workers_ai", "fallback": "external_apis", "models": ["@cf/meta/llama-3.1-8b-instruct", "@cf/mistral/mistral-7b-instruct-v0.1"]}', 'AI model configuration'),
('rate_limits', '{"requests_per_minute": 60, "requests_per_hour": 1000}', 'API rate limiting configuration'),
('cache_settings', '{"prompt_cache_ttl": 3600, "response_cache_ttl": 1800}', 'Caching configuration'),
('analytics', '{"enabled": true, "retention_days": 30, "sampling_rate": 0.1}', 'Analytics configuration');

-- Insert default feature flags for CL4R1T4S system
INSERT OR REPLACE INTO feature_flags (flag_name, enabled, rollout_percentage, description) VALUES
('use_workers_ai', 1, 50, 'Use Workers AI instead of external APIs'),
('enable_vectorize', 1, 25, 'Enable Vectorize for prompt embeddings'),
('cl4r1tas_di_system', 1, 100, 'Enable CL4R1T4S dependency injection system'),
('advanced_analytics', 0, 0, 'Enable advanced analytics and monitoring'),
('ab_testing_framework', 1, 75, 'Enable unified AB testing framework'),
('circuit_breakers', 1, 100, 'Enable circuit breaker pattern for resilience'),
('performance_monitoring', 1, 100, 'Enable performance monitoring and metrics');

-- Triggers for updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_prompt_requests_timestamp 
    AFTER UPDATE ON prompt_requests
    BEGIN
        UPDATE prompt_requests SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_learned_patterns_timestamp 
    AFTER UPDATE ON learned_patterns
    BEGIN
        UPDATE learned_patterns SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_system_config_timestamp 
    AFTER UPDATE ON system_config
    BEGIN
        UPDATE system_config SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_feature_flags_timestamp 
    AFTER UPDATE ON feature_flags
    BEGIN
        UPDATE feature_flags SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;