# URGENT: Database Migration Required

The history API is failing because the database is missing required columns.

## Quick Fix - Run These SQL Commands

Go to your Neon Console SQL Editor and run:

```sql
-- Add missing columns
ALTER TABLE prompt_history ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE prompt_history ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE prompt_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE prompt_history ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_prompt_history_ip_address ON prompt_history(ip_address);
CREATE INDEX IF NOT EXISTS idx_prompt_history_user_id ON prompt_history(user_id);

-- Fix any null ip_address values
UPDATE prompt_history SET ip_address = 'legacy-data' WHERE ip_address IS NULL;
```

## That's it!

After running the above SQL, the history API should work immediately.

Test it:
```bash
curl https://mstprmpt.zeidgeist.com/api/engineer/historyDualMode
```