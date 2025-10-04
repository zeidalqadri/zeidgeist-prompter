-- Migration to add ip_address and user_id columns to prompt_history table
-- Run this in your Neon database console

-- Add ip_address column for IP-based isolation (legacy support)
ALTER TABLE prompt_history
ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Add user_id column for user-based isolation (new feature)
ALTER TABLE prompt_history
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Add created_at and updated_at timestamps if they don't exist
ALTER TABLE prompt_history
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE prompt_history
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index on ip_address for faster queries
CREATE INDEX IF NOT EXISTS idx_prompt_history_ip_address
ON prompt_history(ip_address);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_prompt_history_user_id
ON prompt_history(user_id);

-- Create index on timestamp for ordering
CREATE INDEX IF NOT EXISTS idx_prompt_history_timestamp
ON prompt_history(timestamp DESC);

-- Update existing records to have ip_address from any available source
-- This is a placeholder - you may need to adjust based on your data
UPDATE prompt_history
SET ip_address = 'legacy-data'
WHERE ip_address IS NULL;