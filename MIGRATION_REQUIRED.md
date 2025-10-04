# DATABASE MIGRATION REQUIRED

## Problem
The `/api/engineer/historyDualMode` endpoint is failing with 500 errors because the `prompt_history` table is missing required columns:
- `ip_address` - for IP-based history isolation
- `user_id` - for user-based history isolation

## Solution
Run the migration script to add the missing columns.

## Steps to Apply Migration

### 1. Go to Neon Dashboard
1. Visit: https://console.neon.tech
2. Navigate to your database
3. Open the SQL Editor

### 2. Run the Migration Script
Copy and paste this SQL into the SQL editor:

```sql
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

-- Update existing records to have a default ip_address
UPDATE prompt_history
SET ip_address = 'legacy-data'
WHERE ip_address IS NULL;
```

### 3. Verify the Migration
After running the migration, verify it worked:

```sql
-- Check the table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'prompt_history'
ORDER BY ordinal_position;

-- You should see these columns:
-- id, original, refined, context, timestamp, metadata,
-- ip_address, user_id, created_at, updated_at
```

### 4. Test the API
After the migration is complete, test the API:

```bash
# Should now work without errors
curl https://mstprmpt.zeidgeist.com/api/engineer/historyDualMode

# For debugging
curl "https://mstprmpt.zeidgeist.com/api/engineer/historyDualMode?debug=true"
```

## Important Notes

1. **Backup First**: Always backup your database before running migrations

2. **Existing Data**: The migration sets `ip_address = 'legacy-data'` for existing records. You may want to update this based on your needs.

3. **User Authentication**: The `user_id` column will be NULL for all existing records. This is fine - the API handles both authenticated and anonymous users.

4. **Performance**: The migration adds indexes on `ip_address`, `user_id`, and `timestamp` for better query performance.

## After Migration

Once the migration is complete:
1. The history API will start working immediately
2. New records will properly store IP addresses
3. When user authentication is enabled, user IDs will be stored
4. The dual-mode system will handle both IP-based and user-based isolation

## Troubleshooting

If you still see errors after migration:
1. Check that all columns were added successfully
2. Verify indexes were created
3. Use `?debug=true` to see detailed error messages
4. Check Cloudflare logs for any connection issues