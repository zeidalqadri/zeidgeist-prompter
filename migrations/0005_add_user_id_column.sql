-- Add user_id column for user-based isolation (new feature)
ALTER TABLE prompt_history ADD COLUMN IF NOT EXISTS user_id UUID;

-- Add created_at and updated_at timestamps if they don't exist
ALTER TABLE prompt_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE prompt_history ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_prompt_history_user_id ON prompt_history(user_id);

-- Create composite index for user_id and timestamp for optimized queries
CREATE INDEX IF NOT EXISTS idx_prompt_history_user_timestamp ON prompt_history(user_id, timestamp DESC);

-- Update existing records to set ip_address if null (for records created before the column was added)
UPDATE prompt_history
SET ip_address = 'legacy-data'
WHERE ip_address IS NULL;