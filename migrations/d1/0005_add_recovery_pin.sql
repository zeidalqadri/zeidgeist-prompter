-- D1 Migration: Add recovery PIN support for password reset
-- Run with: wrangler d1 execute zeidgeist-auth --file=./migrations/d1/0005_add_recovery_pin.sql

-- Add recovery_pin_hash column to users table
ALTER TABLE users ADD COLUMN recovery_pin_hash TEXT;

-- Add recovery_pin_attempts column for rate limiting
ALTER TABLE users ADD COLUMN recovery_pin_attempts INTEGER DEFAULT 0;

-- Add recovery_pin_locked_until for lockout after failed attempts
ALTER TABLE users ADD COLUMN recovery_pin_locked_until TEXT;

-- Index for faster lookups during PIN verification (optional, PIN-based queries go through email first)
CREATE INDEX IF NOT EXISTS idx_users_recovery_pin_locked ON users(recovery_pin_locked_until);
