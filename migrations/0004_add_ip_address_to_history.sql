-- Add IP address column to prompt_history table for user-specific history isolation
ALTER TABLE prompt_history ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Create index on ip_address for faster filtering
CREATE INDEX IF NOT EXISTS idx_prompt_history_ip_address ON prompt_history(ip_address);

-- Create composite index for ip_address and timestamp for optimized queries
CREATE INDEX IF NOT EXISTS idx_prompt_history_ip_timestamp ON prompt_history(ip_address, timestamp DESC);