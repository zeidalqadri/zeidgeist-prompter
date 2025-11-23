# Infrastructure Setup Guide

This guide will walk you through setting up all required Cloudflare infrastructure for the image generation feature.

## Prerequisites

- Cloudflare account with access to the Pages project
- Wrangler CLI installed: `npm install -g wrangler`
- Wrangler authenticated: `wrangler login`
- Database access (PostgreSQL connection string)

## Quick Setup (Automated)

Run the automated setup script:

```bash
./scripts/setup-infrastructure.sh
```

This will:
1. Create R2 buckets
2. Create KV namespaces
3. Update wrangler.toml with IDs
4. Run database migration
5. Output environment variables template

## Manual Setup (Step-by-Step)

### 1. Create R2 Buckets

#### Production Bucket
```bash
wrangler r2 bucket create zeidgeist-images-prod
```

#### Preview Bucket
```bash
wrangler r2 bucket create zeidgeist-images-dev
```

#### Configure Public Access (Optional)
If you want images publicly accessible via custom domain:

1. Go to Cloudflare Dashboard → R2
2. Select `zeidgeist-images-prod`
3. Settings → Public Access → Add Custom Domain
4. Enter: `images.mstprmpt.zeidgeist.com`
5. Repeat for `zeidgeist-images-dev` with `images-dev.mstprmpt.zeidgeist.com`

### 2. Create KV Namespaces

#### Progress Tracker (Production)
```bash
wrangler kv:namespace create "PROGRESS_TRACKER"
```

**Output example:**
```
🌀 Creating namespace with title "image-gen-vision-api-PROGRESS_TRACKER"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "PROGRESS_TRACKER", id = "abc123..." }
```

Save the `id` value (e.g., `abc123...`)

#### Progress Tracker (Preview)
```bash
wrangler kv:namespace create "PROGRESS_TRACKER" --preview
```

**Output example:**
```
{ binding = "PROGRESS_TRACKER", preview_id = "xyz789..." }
```

Save the `preview_id` value

### 3. Update wrangler.toml

Edit `wrangler.toml` and update the KV namespace IDs:

```toml
# Find this section:
[[kv_namespaces]]
binding = "PROGRESS_TRACKER"
id = "progress_tracker_prod"  # Replace with actual production ID from step 2
preview_id = "progress_tracker_dev"  # Replace with actual preview ID from step 2
```

**Example with real IDs:**
```toml
[[kv_namespaces]]
binding = "PROGRESS_TRACKER"
id = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
preview_id = "z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4"
```

### 4. Bind R2 and KV to Pages Project

#### Via Cloudflare Dashboard:

1. **Navigate to Pages:**
   - Go to https://dash.cloudflare.com
   - Workers & Pages → aipromptise (or your project name)
   - Settings → Functions

2. **Add R2 Bucket Bindings:**
   - Scroll to "R2 bucket bindings"
   - Click "Add binding"
   - Variable name: `IMAGE_STORAGE`
   - Production bucket: `zeidgeist-images-prod`
   - Preview bucket: `zeidgeist-images-dev`
   - Click "Save"

3. **Add KV Namespace Bindings:**
   - Scroll to "KV namespace bindings"
   - Click "Add binding"
   - Variable name: `PROGRESS_TRACKER`
   - Production namespace: Select the namespace ID from step 2
   - Preview namespace: Select the preview namespace ID from step 2
   - Click "Save"

4. **Verify Bindings:**
   - You should see both bindings listed
   - Both production and preview environments should be configured

### 5. Configure Environment Variables

#### Via Cloudflare Dashboard:

1. **Navigate to Environment Variables:**
   - Workers & Pages → aipromptise
   - Settings → Environment variables

2. **Add Production Variables:**

   Click "Add variables" and add each of these:

   ```bash
   # AI Provider API Keys (REQUIRED)
   OPENAI_API_KEY=sk-...your-openai-key...
   CLAUDE_API_KEY=sk-ant-...your-claude-key...
   STABILITY_AI_KEY=sk-...your-stability-key...
   GOOGLE_API_KEY=...your-google-key...

   # Storage Configuration (REQUIRED)
   R2_PUBLIC_URL=https://images.mstprmpt.zeidgeist.com

   # Security (OPTIONAL - falls back to header validation)
   VIRUSTOTAL_API_KEY=...your-virustotal-key...

   # Database (REQUIRED - should already be set)
   DATABASE_URL=postgresql://...your-database-url...

   # Auth (REQUIRED - should already be set)
   JWT_SECRET=...your-jwt-secret...
   NEXTAUTH_SECRET=...your-nextauth-secret...
   VALID_API_KEYS=...your-api-keys...
   ```

3. **Add Preview Variables:**
   - Click "Preview" tab
   - Add the same variables (can use the same API keys or separate test keys)
   - For `R2_PUBLIC_URL`, use: `https://images-dev.mstprmpt.zeidgeist.com`

4. **Apply Changes:**
   - Click "Save and deploy"
   - This will trigger a new deployment with the environment variables

#### Via Wrangler CLI (Alternative):

```bash
# Set production environment variables
wrangler pages secret put OPENAI_API_KEY --project-name=aipromptise
wrangler pages secret put CLAUDE_API_KEY --project-name=aipromptise
wrangler pages secret put STABILITY_AI_KEY --project-name=aipromptise
wrangler pages secret put GOOGLE_API_KEY --project-name=aipromptise
wrangler pages secret put R2_PUBLIC_URL --project-name=aipromptise
wrangler pages secret put VIRUSTOTAL_API_KEY --project-name=aipromptise
```

### 6. Run Database Migration

#### Option 1: Using psql (Recommended)

```bash
# Set your database URL
export DATABASE_URL="postgresql://user:password@host:5432/database"

# Run migration
psql $DATABASE_URL < migrations/001_add_image_tables.sql

# Verify tables were created
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'image%';"
```

**Expected output:**
```
     table_name
---------------------
 images
 imageGenerations
 imageAnalyses
 imageQuotas
(4 rows)
```

#### Option 2: Using Drizzle (Alternative)

```bash
# Generate migration
npm run db:generate

# Push to database
npm run db:push
```

#### Option 3: Using npm script

```bash
npm run db:migrate
```

### 7. Verify Setup

#### Check R2 Buckets:
```bash
wrangler r2 bucket list
```

Should show:
```
zeidgeist-images-prod
zeidgeist-images-dev
```

#### Check KV Namespaces:
```bash
wrangler kv:namespace list
```

Should include namespaces with "PROGRESS_TRACKER" in the title.

#### Check Pages Bindings:
```bash
wrangler pages deployment list --project-name=aipromptise
```

#### Test Database Connection:
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM images;"
```

Should return `0` (no images yet).

## Testing the Setup

### 1. Local Development Test

```bash
# Start local development server
npm run dev

# In another terminal, test the quota endpoint
curl http://localhost:3000/api/images/quota \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Expected response:**
```json
{
  "userId": "...",
  "date": "2025-11-23",
  "generationsUsed": 0,
  "generationsRemaining": 3,
  "uploadsUsed": 0,
  "uploadsRemaining": 10,
  "analysesUsed": 0,
  "analysesRemaining": 20,
  "resetAt": "2025-11-24T00:00:00.000Z"
}
```

### 2. Preview Deployment Test

Once PR is deployed to preview:

```bash
# Get preview URL from GitHub PR or Cloudflare dashboard
PREVIEW_URL="https://abc123.aipromptise.pages.dev"

# Test quota endpoint
curl $PREVIEW_URL/api/images/quota \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 3. Image Upload Test

```bash
# Create a test image
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > test.png

# Upload to preview
curl -X POST $PREVIEW_URL/api/images/upload \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@test.png"
```

## Troubleshooting

### R2 Bucket Not Found
```
Error: R2 bucket 'IMAGE_STORAGE' not found
```

**Solution:**
- Verify buckets are created: `wrangler r2 bucket list`
- Check bindings in Cloudflare Dashboard → Pages → Settings → Functions
- Ensure binding name matches exactly: `IMAGE_STORAGE`

### KV Namespace Not Found
```
Error: KV namespace 'PROGRESS_TRACKER' not found
```

**Solution:**
- Verify namespaces exist: `wrangler kv:namespace list`
- Check wrangler.toml has correct IDs
- Verify bindings in Cloudflare Dashboard → Pages → Settings → Functions

### Environment Variables Not Set
```
Error: OPENAI_API_KEY is required
```

**Solution:**
- Check environment variables in Dashboard → Pages → Settings → Environment variables
- Ensure variables are set for both Production and Preview
- Click "Save and deploy" after adding variables

### Database Migration Failed
```
Error: relation "images" already exists
```

**Solution:**
- Tables already exist, migration was successful
- If you need to re-run migration, first drop tables:
  ```bash
  psql $DATABASE_URL -c "DROP TABLE IF EXISTS imageQuotas, imageAnalyses, imageGenerations, images CASCADE;"
  ```

### API Key Issues
```
Error: Unauthorized
```

**Solution:**
- Ensure `VALID_API_KEYS` environment variable is set
- Use one of the valid API keys in Authorization header
- Check API key format: `Authorization: Bearer YOUR_KEY`

## Cost Monitoring

After setup, monitor costs:

1. **R2 Storage:**
   - Free tier: 10 GB storage, 1M Class A operations, 10M Class B operations
   - Monitor usage: Cloudflare Dashboard → R2 → Usage

2. **KV Operations:**
   - Free tier: 100K reads/day, 1K writes/day
   - Monitor usage: Cloudflare Dashboard → Workers → KV → Usage

3. **AI Provider Costs:**
   - OpenAI: ~$0.04 per DALL-E 3 image, ~$0.01-0.03 per GPT-4V analysis
   - Stability AI: ~$0.03 per Stable Diffusion XL image
   - Set up billing alerts in provider dashboards

## Security Best Practices

1. **API Keys:**
   - Never commit API keys to git
   - Use separate keys for production and preview
   - Rotate keys periodically

2. **R2 Bucket Security:**
   - Keep buckets private by default
   - Only enable public access if needed
   - Use signed URLs for sensitive images

3. **Database:**
   - Use connection pooling (Neon pooled connection)
   - Enable SSL/TLS for database connections
   - Regular backups

## Next Steps

After infrastructure is set up:

1. ✅ Verify all bindings in Cloudflare Dashboard
2. ✅ Test endpoints locally
3. ✅ Deploy to preview and test
4. ✅ Run full integration tests
5. ✅ Monitor for errors in first 24 hours
6. ✅ Set up monitoring alerts

## Support

If you encounter issues:

1. Check Cloudflare Pages logs: `wrangler pages deployment tail`
2. Review CLOUDFLARE_DEPLOYMENT_GUIDE.md for troubleshooting
3. Check database logs
4. Verify all environment variables are set correctly
