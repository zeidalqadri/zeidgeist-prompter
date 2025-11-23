## **Cloudflare Edge Optimization - Deployment Guide**

### **mstprmpt.zeidgeist.com**

This guide covers the comprehensive deployment of edge caching, ML-based performance optimization, and image optimization features for your ZeidGeist Prompter application.

---

## **🎯 Overview**

The deployment optimization implements:

1. **Edge Caching Infrastructure** - Cloudflare Cache API + KV storage
2. **ML-Based Performance** - Intelligent caching, request batching, provider optimization
3. **Image Optimization** - WebP/AVIF conversion, responsive images, lazy loading
4. **Testing & Monitoring** - K6 load tests, analytics, performance regression
5. **Phased Rollout** - Beta → 25% → 50% → 100% traffic

---

## **📋 Prerequisites**

### **Required Tools:**
- Node.js 18+ and npm
- Wrangler CLI: `npm install -g wrangler`
- K6 (for load testing): `brew install k6` or download from https://k6.io
- jq (for metrics parsing): `brew install jq`

### **Cloudflare Account Setup:**
1. Cloudflare Workers Paid plan ($5/month minimum)
2. KV namespace creation permissions
3. Pages deployment permissions
4. API token with appropriate scopes

---

## **🚀 Phase 1: Initial Setup**

### **Step 1: Create KV Namespaces**

```bash
# Create production namespaces
wrangler kv:namespace create "CACHE_STORAGE"
wrangler kv:namespace create "SESSION_STORAGE"

# Create preview namespaces
wrangler kv:namespace create "CACHE_STORAGE" --preview
wrangler kv:namespace create "SESSION_STORAGE" --preview
```

Copy the generated namespace IDs and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CACHE_STORAGE"
id = "<YOUR_PRODUCTION_ID>"
preview_id = "<YOUR_PREVIEW_ID>"

[[kv_namespaces]]
binding = "SESSION_STORAGE"
id = "<YOUR_PRODUCTION_ID>"
preview_id = "<YOUR_PREVIEW_ID>"
```

### **Step 2: Configure Environment Variables**

Add to your `.env.local` (never commit this file):

```env
# Database
DATABASE_URL=your_neon_connection_string

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_IMAGES_HASH=your_images_hash (optional, for image optimization)

# AI Providers (existing)
ANTHROPIC_API_KEY=your_key
OPENAI_API_KEY=your_key
# ... other providers
```

Add to Cloudflare Pages environment variables:
1. Go to Pages > Settings > Environment Variables
2. Add the same variables for **Production** and **Preview**

### **Step 3: Install Dependencies**

```bash
npm install
```

### **Step 4: Build and Test Locally**

```bash
# Build
npm run build

# Run tests
npm run test:unit
npm run test:integration

# Test Pages Functions locally
npx wrangler pages dev out
```

---

## **🧪 Phase 2: Testing**

### **Local Testing**

1. **Test caching functionality:**
```bash
# Start dev server
npm run dev

# Test cache endpoint
curl http://localhost:8788/api/health/cache

# Test enhancement with caching
curl -X POST http://localhost:8788/api/engineer \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test prompt"}'

# Repeat - should hit cache on 2nd call
```

2. **Test analytics:**
```bash
curl http://localhost:8788/api/analytics/metrics | jq
```

### **Load Testing**

Run K6 load tests:

```bash
# Small load test
k6 run --vus 10 --duration 1m tests/load/k6-load-test.js

# Full load test (100-500 concurrent users)
k6 run tests/load/k6-load-test.js

# Custom configuration
k6 run --vus 100 --duration 5m tests/load/k6-load-test.js

# Generate HTML report
k6 run --out json=test-results.json tests/load/k6-load-test.js
```

Expected results:
- **p95 response time**: < 2000ms
- **Error rate**: < 5%
- **Cache hit rate**: > 30% (after warm-up)

### **Performance Regression Tests**

```bash
npm run test:performance
```

This validates:
- Bundle size hasn't increased significantly
- Build time is acceptable
- No performance regressions

---

## **🚢 Phase 3: Deployment**

### **Option A: Beta Deployment (Recommended)**

Deploy to beta environment with 10% traffic:

```bash
chmod +x scripts/deploy-beta.sh
./scripts/deploy-beta.sh
```

The script will:
1. ✅ Run all tests
2. 🏗️ Build the application
3. 💾 Verify KV namespaces
4. 🚢 Deploy to Cloudflare Pages (beta branch)
5. 🔥 Run smoke tests
6. 📊 Setup monitoring

**Manual step:** Configure traffic splitting in Cloudflare dashboard:
1. Pages > zeidgeist-prompter > Settings > Traffic
2. Set 10% to beta branch
3. Monitor for 2 weeks

### **Option B: Staged Rollout**

After successful beta testing, gradually roll out:

```bash
chmod +x scripts/deploy-staged.sh

# Stage 1: 25% traffic
./scripts/deploy-staged.sh 25
# Monitor for 1 week

# Stage 2: 50% traffic
./scripts/deploy-staged.sh 50
# Monitor for 1 week

# Stage 3: 100% traffic
./scripts/deploy-staged.sh 100
```

Each stage includes:
- ✅ Pre-deployment validation
- 🧪 Automated testing
- 📊 Metrics checking
- 🚨 Automatic rollback on errors

### **Option C: Direct Production Deploy**

⚠️ **Not recommended without beta testing**

```bash
npm run build
wrangler pages deploy out --project-name=zeidgeist-prompter
```

---

## **📊 Phase 4: Monitoring**

### **Key Metrics to Monitor**

1. **Cache Performance**
   - URL: `https://mstprmpt.zeidgeist.com/api/health/cache`
   - Metrics: Hit rate, total hits/misses

2. **System Metrics**
   - URL: `https://mstprmpt.zeidgeist.com/api/analytics/metrics`
   - Metrics:
     - Response times (avg, p50, p95, p99)
     - Error rates
     - Provider performance
     - LLM vs cache usage

3. **Cloudflare Dashboard**
   - Analytics > Performance
   - Workers > Metrics
   - Pages > Analytics

### **Monitoring Schedule**

**Week 1-2 (Beta):**
- Check metrics **daily**
- Review error logs
- Collect user feedback

**Week 3-4 (25% rollout):**
- Check metrics **3x per week**
- Compare vs baseline

**Week 5-6 (50% rollout):**
- Check metrics **2x per week**
- Validate cost savings

**Week 7+ (100% rollout):**
- Check metrics **weekly**
- Conduct retrospective

### **Alert Thresholds**

Set up alerts for:
- **Error rate > 5%** → Investigate immediately
- **p95 response time > 3s** → Performance degradation
- **Cache hit rate < 20%** → Caching not working
- **LLM dependency > 60%** → Learning system not effective

---

## **🔄 Phase 5: Rollback Procedures**

### **If Issues Arise:**

1. **Immediate rollback:**
```bash
# Revert to previous deployment
wrangler pages deployment list --project-name=zeidgeist-prompter
wrangler pages deployment rollback <DEPLOYMENT_ID> --project-name=zeidgeist-prompter
```

2. **Adjust traffic:**
   - Cloudflare Dashboard > Pages > Traffic
   - Reduce percentage to affected deployment

3. **Disable caching temporarily:**
   - Set `CACHE_STORAGE` binding to null in environment
   - Redeploy

---

## **✅ Phase 6: Post-Deployment Checklist**

### **Immediate (Day 1)**
- [ ] Verify deployment successful
- [ ] Check all API endpoints responding
- [ ] Validate cache is working (hit rate > 0%)
- [ ] Review error logs
- [ ] Test from multiple regions

### **Week 1**
- [ ] Monitor cache hit rate trend
- [ ] Check cost impact (Cloudflare dashboard)
- [ ] Review user feedback
- [ ] Validate analytics data collection

### **Week 2**
- [ ] Compare performance metrics vs baseline
- [ ] Calculate ROI (cost savings, latency improvement)
- [ ] Document any issues encountered
- [ ] Prepare for next rollout stage

### **Month 1**
- [ ] Conduct retrospective
- [ ] Update runbook with lessons learned
- [ ] Optimize cache TTLs based on usage patterns
- [ ] Review and adjust alert thresholds

---

## **💡 Optimization Tips**

### **Improving Cache Hit Rate:**

1. **Increase cache warming frequency**
   - Edit `wrangler.toml`: `crons = ["0 */3 * * *"]` (every 3 hours)

2. **Adjust TTLs based on usage**
   - High-frequency prompts: Increase to 30-60 min
   - Low-frequency: Decrease to 10-15 min

3. **Enable predictive prefetching**
   - Automatically enabled after 1 week of data

### **Reducing LLM Costs:**

1. **Monitor provider performance**
   - Check `/api/analytics/metrics`
   - Switch to cost-effective providers for simple prompts

2. **Increase learning confidence threshold**
   - Edit `learning-service.ts`: Adjust confidence thresholds

3. **Enable request batching**
   - Automatically batches similar prompts within 100ms window

---

## **🐛 Troubleshooting**

### **Cache Not Working**
```bash
# Check KV namespace binding
wrangler pages deployment list
wrangler pages deployment get <DEPLOYMENT_ID>

# Verify environment variables
# Cloudflare Dashboard > Pages > Settings > Environment Variables

# Test cache manually
curl https://mstprmpt.zeidgeist.com/api/health/cache
```

### **High Error Rates**
```bash
# Check logs
wrangler pages deployment tail --project-name=zeidgeist-prompter

# Review metrics
curl https://mstprmpt.zeidgeist.com/api/analytics/metrics | jq '.errors'

# Test specific provider
curl -X POST https://mstprmpt.zeidgeist.com/api/engineer \
  -H "X-Test-Provider: claude" \
  -d '{"prompt": "test"}'
```

### **Slow Response Times**
```bash
# Check provider performance
curl https://mstprmpt.zeidgeist.com/api/analytics/metrics | jq '.providers'

# Run load test to identify bottleneck
k6 run --vus 10 tests/load/k6-load-test.js

# Check database connections
# Review logs for "connection pool" warnings
```

---

## **📚 Additional Resources**

- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/
- **K6 Load Testing**: https://k6.io/docs/
- **Cache API Reference**: https://developers.cloudflare.com/workers/runtime-apis/cache/
- **KV Storage Limits**: https://developers.cloudflare.com/workers/platform/limits/

---

## **🎯 Success Metrics**

After full deployment (Month 1), you should see:

- **Cache hit rate**: 40-60%
- **p95 response time**: < 1500ms (down from ~2500ms)
- **LLM API cost**: Reduced by 30-40%
- **Error rate**: < 2%
- **User satisfaction**: Improved load times feedback

---

## **📞 Support**

For issues or questions:
1. Check troubleshooting section above
2. Review Cloudflare Workers logs
3. Check GitHub Issues
4. Contact: [your support channel]

---

**Last Updated:** 2025-11-23
**Version:** 1.0.0
**Author:** AI-Assisted Deployment Optimization Team
