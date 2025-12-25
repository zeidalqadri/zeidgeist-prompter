# LLM API Critical Fixes - Task Tracker

**Last Updated**: 2025-12-25 18:16 UTC

---

## Phase 1: Critical Fixes (COMPLETE)

### ✅ Fix 1: Claude API Authentication Header
- [x] Fix in `app/lib/llm/llm-provider.service.ts:372`
- [x] Fix in `functions/_shared/llm-enhancer.ts:1064`
- [x] Change `Authorization: Bearer` to `x-api-key`

### ✅ Fix 2: Make Circuit Breaker Functional
- [x] Add `opened` and `halfOpen` properties
- [x] Implement state tracking (failureCount, lastFailure)
- [x] Add timeout support via Promise.race
- [x] Add event handlers (on, emit)
- [x] Add shutdown() method
- [x] Match error message format expected by tests ("Breaker is open")
- [x] Run tests - 14/14 passing

### ✅ Fix 3: Enable Rate Limiting on /api/engineer
- [x] Change import from `validateRequest` to `validateRequestWithKV`
- [x] Add import for `createRateLimitResponse`
- [x] Update function call to use KV namespace
- [x] Handle rate limit response separately from auth error

---

## Phase 2: Production Readiness

### ✅ 2.1: Wire Up Retry Policy
- [x] Wrap circuit breaker execution with retry policy in `enhance()` method
- [x] Verify retryable errors configured correctly

### ✅ 2.2: Add LLM Provider Unit Tests (COMPLETE)
- [x] Create `tests/unit/llm-provider.test.ts` (43 tests)
- [x] Mock each provider's API responses (Claude, OpenAI, Mistral, Moonshot, Gemini, DeepSeek)
- [x] Test successful enhancement
- [x] Test authentication failure (401, 429, 500)
- [x] Test timeout handling
- [x] Test retry behavior (via retry policy integration)
- [x] Test fallback chain (including local provider fallback)
- [x] Test circuit breaker integration (metrics, open state rejection)
- [x] Test request format (Claude system field, OpenAI messages, Gemini contents)

### ✅ 2.3: Update Vulnerable Dependencies
- [x] Run `npm audit fix`
- [x] Reduced from 12 vulnerabilities to 10 moderate (dev-only esbuild)

### ✅ 2.4: Secure Debug Endpoint
- [x] Require DEBUG_ACCESS_TOKEN (no bypass)
- [x] Remove key preview exposure (no partial keys)
- [x] Return 503 if token not configured

### ✅ 2.5: Document OpenTelemetry Limitation
- [x] Document that @opentelemetry/api doesn't work in CF Workers
- [x] Add solution options (native tracing, otel-cf-workers)
- [x] Keep stubs in place

---

## Priority Queue (For Future Sessions)

### ALL PHASE 2 ITEMS COMPLETE ✅

### Medium Priority (Optional)
1. **Enable Cloudflare native tracing** (optional)
   - Add to wrangler.toml: `[observability.traces] enabled = true`
   - Zero code changes required

2. **Consolidate LLM implementations** (future)
   - Currently two parallel implementations
   - Consider deprecating legacy `llm-enhancer.ts`

### Low Priority
3. **Add circuit breaker state to health endpoint**
4. **Create API documentation for new rate limiting behavior**

---

## Blocked/Deferred Items

| Item | Reason | Resolution |
|------|--------|------------|
| Opossum library | CF Workers incompatible | Functional stub implemented |
| OpenTelemetry | CF Workers incompatible | Use native tracing or otel-cf-workers |
| Pre-existing type errors | Drizzle Date vs string | Unrelated to LLM fixes |

---

## Commands for Verification

```bash
# Verify circuit breaker tests pass
npx vitest run tests/integration/circuit-breaker.test.ts

# Type check (note: pre-existing errors in learning/*.ts)
npm run type-check

# Check remaining vulnerabilities
npm audit

# Test Claude API (requires API key)
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: $CLAUDE_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-haiku-20240307","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

---

## Session Notes

- Multi-agent review (code-reviewer, security-auditor, architect-review) revealed the issues
- User confirmed decisions: functional stub over opossum, fix both implementations
- All 14 circuit breaker tests pass after fixes
- npm audit reduced from 12 to 10 vulnerabilities (remaining are dev-only moderate)
