# 🚀 Learning Engine Quick Start Guide

## 5-Minute Setup & Verification

### 1. Verify Integration (30 seconds)

Check that all components are in place:

```bash
# Check core files exist
ls -la app/lib/learning/*.ts
ls -la functions/api/learning/*.ts

# Should see:
# - learning-service.ts
# - adaptive-enhancer.ts
# - pattern-extractor.ts
# - learning-scheduler.ts
# - learning-metrics.ts
# - quality-validator.ts
# - metrics.ts
# - ab-test-results.ts
```

### 2. View Current Status (1 minute)

```bash
# Get learning metrics dashboard (text format)
curl "https://your-app.com/api/learning/metrics?format=text"

# Expected output:
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#   🧠 LEARNING ENGINE METRICS (Last 7 days)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 📊 USAGE STATISTICS
#   Total Requests:        0
#   ├─ Local:             0 (0.0%)
#   ├─ Hybrid:            0 (0.0%)
#   └─ LLM:               0 (100.0%)
# ...
```

### 3. Test Enhancement with Learning (2 minutes)

```bash
# Make a test request
curl -X POST "https://your-app.com/api/engineer" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "website for a doctor",
    "context": "",
    "isRefinement": false
  }'

# Check logs for learning indicators:
# 🧠 Checking learned patterns first...
# 📊 Local pattern confidence: 0.00 (source: fallback)
# 🔧 Using full LLM enhancement...
# 📚 Queuing enhancement for learning...
# ✅ Enhancement queued for learning
```

### 4. Verify Learning Storage (1 minute)

```bash
# Check that pattern was stored
curl "https://your-app.com/api/learning/metrics"

# Look for:
# "newPatternsLastWeek": 1 (or more)
# "totalPatterns": 1 (or more)
```

### 5. Monitor Progress (1 minute)

```bash
# Check metrics over time
curl "https://your-app.com/api/learning/metrics?trends=true" | jq '.trends'

# Check A/B test results
curl "https://your-app.com/api/learning/ab-test-results"

# Get threshold recommendations
curl "https://your-app.com/api/learning/ab-test-results?recommendations=true"
```

## 🎯 First Week Goals

### Day 1: Verify It's Working
- [ ] Learning engine logs appear in console
- [ ] First patterns stored in database
- [ ] Metrics API returns data

### Day 2-3: Accumulate Patterns
- [ ] 50+ patterns in database
- [ ] First local enhancement attempt (even if fallback)
- [ ] A/B tests starting to accumulate

### Day 4-7: First Wins
- [ ] 5-10% local usage rate
- [ ] First successful local enhancement
- [ ] A/B test results showing quality comparison

## 📊 Key Commands

### Monitor Learning Progress
```bash
# Real-time dashboard (refresh every 10s)
watch -n 10 'curl -s "https://your-app.com/api/learning/metrics?format=text"'

# JSON metrics with trends
curl "https://your-app.com/api/learning/metrics?days=7&trends=true" | jq

# Just the usage percentages
curl -s "https://your-app.com/api/learning/metrics" | jq '{
  local: .localUsagePercentage,
  hybrid: .hybridUsagePercentage,
  llm: .llmUsagePercentage
}'
```

### Check A/B Test Quality
```bash
# Get test results
curl "https://your-app.com/api/learning/ab-test-results" | jq

# Get recommendations for threshold tuning
curl "https://your-app.com/api/learning/ab-test-results?recommendations=true" | jq '.tuning'
```

### Manual Learning Trigger
```bash
# Force a learning cycle (batch pattern extraction)
curl -X POST "https://your-app.com/api/learning/trigger"
```

## 🔍 Debugging

### Problem: No patterns being learned

**Check logs:**
```bash
# Look for these indicators
# ✅ "Queuing enhancement for learning"
# 📚 "Processing enhancement for learning"
# 🔍 "Extracted X transformation patterns"
# ✅ "Real-time learning complete"
```

**If missing:**
1. Verify `context.waitUntil()` is supported (Cloudflare Workers)
2. Check database connection
3. Ensure `DATABASE_URL` env var is set

**Query database directly:**
```sql
SELECT COUNT(*) FROM training_examples;
SELECT * FROM training_examples ORDER BY created_at DESC LIMIT 5;
```

### Problem: Local usage still 0%

**Check:**
```bash
# Get pattern count
curl -s "https://your-app.com/api/learning/metrics" | jq '.totalPatterns'

# Check pattern confidence distribution
curl -s "https://your-app.com/api/learning/metrics" | jq '.confidenceDistribution'
```

**If patterns exist but not used:**
1. **Not enough patterns yet:** Need 10-20+ for good matching
2. **Confidence too low:** Patterns need quality scores >50
3. **Thresholds too high:** Lower in `engineer.ts` lines 150, 164

**Quick fix:**
```typescript
// In functions/api/engineer.ts
// Temporarily lower thresholds to test
if (localAttempt.confidence >= 0.5) { // Was 0.7
  console.log('✅ Using learned patterns (high confidence)');
  // Use local
}
```

### Problem: Quality concerns

**Check A/B tests:**
```bash
curl "https://your-app.com/api/learning/ab-test-results" | jq '{
  localWinRate: .localWinRate,
  avgLocalQuality: .avgLocalQuality,
  avgLlmQuality: .avgLlmQuality,
  recommendation: .recommendation
}'
```

**If local quality < 70%:**
1. **Raise thresholds:** Be more conservative
2. **Check pattern sources:** Low-quality enhancements being stored?
3. **Add feedback:** User feedback improves pattern quality over time

## 🎓 Advanced Usage

### Custom Confidence Thresholds

Edit `functions/api/engineer.ts`:
```typescript
// High confidence threshold (local only)
if (localAttempt.confidence >= 0.75) { // Adjust this
  // Use local patterns
}

// Medium confidence threshold (hybrid)
else if (localAttempt.confidence >= 0.5) { // Adjust this
  // Use hybrid approach
}
```

### Adjust A/B Test Rate

Edit `app/lib/learning/quality-validator.ts`:
```typescript
export class QualityValidator {
  private readonly AB_TEST_PERCENTAGE = 15; // Change from 10 to 15
  // Now 15% of requests will be A/B tested
}
```

### Seed Initial Patterns

For faster cold-start, manually insert high-quality patterns:
```sql
INSERT INTO training_examples (
  raw_prompt,
  enhanced_prompt,
  category,
  keywords,
  source,
  quality,
  usage_count,
  is_active
) VALUES (
  'website for a doctor',
  'Design a professional medical practice website featuring...',
  'website',
  'website, doctor, medical, professional',
  'manual',
  85,
  0,
  true
);
```

### Export/Import Patterns

**Export patterns:**
```bash
curl "https://your-app.com/api/learning/metrics?patterns=true" > patterns.json
```

**Import patterns:**
```sql
-- Use your favorite DB tool or script
COPY training_examples FROM 'patterns.csv' CSV HEADER;
```

## 📈 Success Indicators

### Week 1 ✅
- [ ] Logs show "🧠 Checking learned patterns first"
- [ ] `totalPatterns` > 50
- [ ] `localUsagePercentage` > 0

### Week 2 ✅
- [ ] `localUsagePercentage` > 10
- [ ] First A/B test results available
- [ ] Cost savings > $0.10

### Month 1 ✅
- [ ] `localUsagePercentage` > 30
- [ ] `costReductionPercentage` > 30
- [ ] A/B test win rate 40-60%

### Month 3 🎯
- [ ] `localUsagePercentage` > 50
- [ ] `costReductionPercentage` > 50
- [ ] Quality parity with LLM

## 🚨 When to Get Help

**Contact support if:**
1. No patterns after 100+ requests
2. Local usage stuck at 0% for >2 weeks
3. A/B test win rate <20% consistently
4. Cost savings not materializing after Month 1
5. Quality regressions reported by users

**Include in support request:**
```bash
# Run these and include output:
curl "https://your-app.com/api/learning/metrics?format=text"
curl "https://your-app.com/api/learning/ab-test-results?recommendations=true"

# Check database:
# SELECT COUNT(*), source, AVG(quality) FROM training_examples GROUP BY source;
# SELECT COUNT(*), source FROM enhancement_logs WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY source;
```

## 💡 Pro Tips

1. **Be patient:** Learning takes time. Expect 2-4 weeks before major improvements.

2. **Monitor trends, not snapshots:** Daily fluctuations are normal. Look at weekly trends.

3. **Trust the A/B tests:** They're your ground truth for quality comparisons.

4. **Lower thresholds gradually:** Don't jump from 0.7 to 0.5 overnight. Try 0.65 first.

5. **Collect feedback:** User feedback dramatically improves pattern quality over time.

6. **Cold start is hardest:** First 100 patterns are slowest. Then it accelerates.

7. **Domain matters:** Some domains learn faster (e.g., "website" prompts) than others.

8. **Watch the confidence distribution:** If most patterns are <50 quality, investigate why.

## 🎉 Celebrate Wins

**First local enhancement:**
```bash
# When you see this in logs:
# ✅ Using learned patterns (high confidence)
# 🎉 First win!
```

**First cost savings milestone:**
```bash
# When cost reduction hits 10%:
curl "https://your-app.com/api/learning/metrics" | jq '.costReductionPercentage'
# > 10.0
```

**Quality parity achieved:**
```bash
# When A/B tests show 40%+ win rate:
curl "https://your-app.com/api/learning/ab-test-results" | jq '.localWinRate'
# > 40.0
```

---

**Ready to get started?** Run the verification steps above and watch your system learn! 🚀
