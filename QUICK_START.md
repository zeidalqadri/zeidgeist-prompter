# Quick Start Guide - Image Generation Infrastructure

## TL;DR - 3 Commands to Deploy

```bash
# 1. Run automated setup (creates R2, KV, updates config, migrates DB)
./scripts/setup-infrastructure.sh

# 2. Configure Cloudflare Dashboard (manual - see below)
#    - Bind R2 and KV to Pages project
#    - Set environment variables

# 3. Test and deploy
npm run dev  # Test locally
git push     # Deploy to preview
```

---

## Step 1: Automated Infrastructure Setup

Run the automated setup script:

```bash
./scripts/setup-infrastructure.sh
```

**This script will:**
- ✅ Create R2 buckets: `zeidgeist-images-prod` and `zeidgeist-images-dev`
- ✅ Create KV namespaces for progress tracking
- ✅ Update `wrangler.toml` with actual namespace IDs
- ✅ Run database migration (creates 4 image tables)
- ✅ Generate `.env.cloudflare.template` with all required variables

**Save the output!** It contains the KV namespace IDs you'll need for step 2.

---

## Step 2: Configure Cloudflare Dashboard (Manual)

### 2a. Bind R2 and KV to Pages Project

1. Go to: https://dash.cloudflare.com
2. Navigate to: **Workers & Pages → aipromptise → Settings → Functions**

3. **Add R2 Bucket Binding:**
   - Click "Add binding" under "R2 bucket bindings"
   - Variable name: `IMAGE_STORAGE`
   - Production bucket: `zeidgeist-images-prod`
   - Preview bucket: `zeidgeist-images-dev`
   - Click "Save"

4. **Add KV Namespace Binding:**
   - Click "Add binding" under "KV namespace bindings"
   - Variable name: `PROGRESS_TRACKER`
   - Production namespace: [Use ID from script output]
   - Preview namespace: [Use ID from script output]
   - Click "Save"

### 2b. Set Environment Variables

1. Navigate to: **Workers & Pages → aipromptise → Settings → Environment Variables**

2. **Add these variables for Production:**

```bash
# AI Provider Keys (REQUIRED)
OPENAI_API_KEY=sk-proj-...
CLAUDE_API_KEY=sk-ant-...
STABILITY_AI_KEY=sk-...
GOOGLE_API_KEY=AI...

# Storage (REQUIRED)
R2_PUBLIC_URL=https://images.mstprmpt.zeidgeist.com

# Optional
VIRUSTOTAL_API_KEY=...
```

3. **Add same variables for Preview** (click "Preview" tab)
   - Can use same API keys or separate test keys
   - Use preview URL: `https://images-dev.mstprmpt.zeidgeist.com`

4. Click "Save and deploy"

---

## Step 3: Verify Setup

### Verify Database
```bash
./scripts/verify-database.sh
```

Expected output:
```
✓ Table 'images' exists
✓ Table 'imageGenerations' exists
✓ Table 'imageAnalyses' exists
✓ Table 'imageQuotas' exists
✓ All required tables exist
✓ Database is ready for image generation features
```

### Verify R2 Buckets
```bash
wrangler r2 bucket list
```

Expected output:
```
zeidgeist-images-prod
zeidgeist-images-dev
```

### Verify KV Namespaces
```bash
wrangler kv:namespace list
```

Should show namespaces with "PROGRESS_TRACKER" in the title.

---

## Step 4: Test Locally

```bash
# Start dev server
npm run dev

# In another terminal, test quota endpoint
curl http://localhost:3000/api/images/quota \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Expected response:
```json
{
  "userId": "...",
  "generationsUsed": 0,
  "generationsRemaining": 3,
  "uploadsUsed": 0,
  "uploadsRemaining": 10,
  "analysesUsed": 0,
  "analysesRemaining": 20
}
```

---

## Step 5: Test Preview Deployment

Once Cloudflare Pages deploys your PR:

```bash
# Get preview URL from PR or dashboard
PREVIEW_URL="https://abc123.aipromptise.pages.dev"

# Test quota
curl $PREVIEW_URL/api/images/quota \
  -H "Authorization: Bearer YOUR_API_KEY"

# Test image upload (create test image first)
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > test.png

curl -X POST $PREVIEW_URL/api/images/upload \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@test.png"
```

---

## Troubleshooting

### Issue: "R2 bucket not found"
**Solution:**
- Run: `wrangler r2 bucket list` to verify buckets exist
- Check bindings in Cloudflare Dashboard → Pages → Settings → Functions
- Ensure binding name is exactly `IMAGE_STORAGE`

### Issue: "KV namespace not found"
**Solution:**
- Run: `wrangler kv:namespace list` to verify namespaces exist
- Check `wrangler.toml` has correct namespace IDs
- Verify bindings in dashboard match the IDs in wrangler.toml

### Issue: "OPENAI_API_KEY is required"
**Solution:**
- Go to Cloudflare Dashboard → Pages → Settings → Environment Variables
- Ensure all required variables are set for both Production and Preview
- Click "Save and deploy" after adding variables

### Issue: "Table 'images' does not exist"
**Solution:**
- Run: `./scripts/verify-database.sh`
- If migration failed, run manually: `psql $DATABASE_URL < migrations/001_add_image_tables.sql`

---

## Cost Monitoring

After deployment, monitor costs at:

1. **OpenAI**: https://platform.openai.com/usage
2. **Anthropic**: https://console.anthropic.com/settings/usage
3. **Stability AI**: https://platform.stability.ai/account/billing
4. **Google AI**: https://console.cloud.google.com/billing
5. **Cloudflare R2**: Dashboard → R2 → Usage
6. **Cloudflare KV**: Dashboard → Workers → KV → Usage

Set up billing alerts in each provider's dashboard!

---

## Getting Help

1. **Setup Issues**: See INFRASTRUCTURE_SETUP.md (detailed troubleshooting)
2. **Deployment Issues**: See CLOUDFLARE_DEPLOYMENT_GUIDE.md
3. **Feature Documentation**: See IMAGE_GENERATION_README.md
4. **PR Status**: Check PR #44 comments for latest updates

---

## Quick Reference

| Resource | Command |
|----------|---------|
| Setup infrastructure | `./scripts/setup-infrastructure.sh` |
| Verify database | `./scripts/verify-database.sh` |
| List R2 buckets | `wrangler r2 bucket list` |
| List KV namespaces | `wrangler kv:namespace list` |
| Local dev | `npm run dev` |
| Deploy | `git push` (triggers automatic deployment) |
| View logs | `wrangler pages deployment tail` |

---

**Setup Time: ~10-15 minutes**

**Ready to deploy!** 🚀
