-- Initialize PostgreSQL database for zeidgeist-prompter
-- This script runs automatically when the Docker container starts

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';

-- Create initial database tables will be handled by Drizzle migrations
-- This file is for any initial setup that needs to happen before migrations

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE zeidgeist_prompter_dev TO zeidgeist;

-- Create schema for application (if not using default public schema)
-- CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION zeidgeist;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Database zeidgeist_prompter_dev initialized successfully';
    RAISE NOTICE 'User: zeidgeist with full privileges';
    RAISE NOTICE 'Extensions: uuid-ossp, pgcrypto';
    RAISE NOTICE 'Ready for Drizzle migrations';
END $$;