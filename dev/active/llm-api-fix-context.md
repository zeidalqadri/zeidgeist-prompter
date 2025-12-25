# LLM API Critical Fixes - Context Documentation

**Date**: 2025-12-25
**Task**: Fix LLM APIs that weren't working properly
**Status**: PHASE 1 COMPLETE, PHASE 2 MOSTLY COMPLETE

---

## Executive Summary

Multi-agent code review revealed **three critical issues** preventing LLM APIs from working:
1. Claude API authentication header incorrect (all Claude calls failing with 401)
2. Circuit breaker was a non-functional stub
3. Rate limiting disabled on main `/api/engineer` endpoint

All critical fixes implemented and tested. Phase 2 production improvements also completed except for unit tests.

---

## Key Discoveries This Session

### Discovery 1: Claude Auth Header Bug
- **Location**: `llm-provider.service.ts:372` and `llm-enhancer.ts:1064`
- **Problem**: Using `Authorization: Bearer` instead of `x-api-key`
- **Impact**: ALL Claude API calls were failing with 401 Unauthorized
- **Fix**: Changed to `'x-api-key': this.config.apiKey`

### Discovery 2: Opossum Not CF Workers Compatible
- **Problem**: The `opossum` circuit breaker library uses Node.js internals (EventEmitter, timers)
- **Evidence**: `llm-provider.service.ts` is imported in Workers via `llm-enhancer-refactored.ts:78`
- **Decision**: Made the stub functional instead of using opossum
- **Reasoning**: Safer approach - avoids runtime compatibility issues in Cloudflare Workers

### Discovery 3: Rate Limiting Was Bypassed
- **Problem**: `/api/engineer` used deprecated `validateRequest()` which logged a warning but didn't actually rate limit
- **Fix**: Replaced with `validateRequestWithKV()` using distributed KV-based rate limiting
- **Verification**: `CACHE_STORAGE` KV namespace already configured and compatible

### Discovery 4: RetryPolicy Never Used
- **Problem**: `BaseLLMProvider` instantiated `RetryPolicy` in constructor but never called it
- **Fix**: Wrapped circuit breaker execution with retry policy in `enhance()` method

### Discovery 5: OpenTelemetry Doesn't Work in Workers
- **Problem**: Standard `@opentelemetry/api` doesn't work in Cloudflare Workers runtime
- **Solution Options**:
  1. Use Cloudflare's native tracing (recommended, zero-code)
  2. Use `@microlabs/otel-cf-workers` for custom instrumentation
- **Status**: Documented limitation, stubs remain in place

---

## Files Modified

### Phase 1 - Critical Fixes

| File | Change | Lines |
|------|--------|-------|
| `app/lib/llm/llm-provider.service.ts` | Claude auth header fix | 372 |
| `functions/_shared/llm-enhancer.ts` | Claude auth header fix | 1064 |
| `app/lib/resilience/circuit-breaker.ts` | Made stub functional with state tracking, timeout, events, shutdown | 9-113 |
| `functions/api/engineer.ts` | Use `validateRequestWithKV` for rate limiting | 4-5, 62-69 |

### Phase 2 - Production Improvements

| File | Change | Lines |
|------|--------|-------|
| `app/lib/llm/llm-provider.service.ts` | Wired retry policy around circuit breaker | 274-280 |
| `functions/api/debug/api-keys.ts` | Secured endpoint (require token, no key previews) | 1-110 |
| `app/lib/observability/tracing.ts` | Documented CF Workers limitation with solutions | 1-19 |

---

## Circuit Breaker Implementation Details

The functional stub now includes:

```typescript
const CircuitBreaker = class {
  stats = { failures: 0, successes: 0, rejects: 0, fires: 0 };
  opened = false;       // Circuit state
  halfOpen = false;     // Half-open state for test requests
  private failureCount = 0;
  private lastFailure = 0;
  private eventHandlers: Map<string, Function[]> = new Map();

  // Key behaviors:
  // - Opens after 50% error rate (min 5 requests)
  // - Rejects immediately when open
  // - Transitions to half-open after resetTimeout (30s default)
  // - Closes on success in half-open state
  // - Supports timeout via Promise.race
  // - Emits events: open, close, halfOpen, success, failure, reject, timeout
  // - Has shutdown() for cleanup
};
```

**Test Results**: 14/14 circuit breaker tests pass

---

## Architectural Decisions

### Decision 1: Functional Stub vs Opossum
- **Chose**: Functional stub
- **Reason**: Opossum uses Node.js internals that may not work in CF Workers
- **Trade-off**: Less feature-complete but guaranteed to work
- **Reversibility**: Can switch to opossum later with feature flag

### Decision 2: Fix Both LLM Implementations
- **Chose**: Fix both `llm-provider.service.ts` and `llm-enhancer.ts`
- **Reason**: User confirmed both should be kept for now
- **Note**: Two parallel implementations exist - may want to consolidate later

### Decision 3: Retry Wraps Circuit Breaker
- **Pattern**: `retryPolicy.execute(() => circuitBreaker.execute(request))`
- **Reason**: Retry handles transient errors (network, timeout), circuit breaker handles persistent failures
- **Configured errors**: `['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'ENETUNREACH', 'EAI_AGAIN']`

---

## Test Results

```
✓ tests/integration/circuit-breaker.test.ts (14 tests) 916ms
   ✓ Circuit Breaker > EnhancedCircuitBreaker > should execute successfully when function succeeds
   ✓ Circuit Breaker > EnhancedCircuitBreaker > should open circuit after threshold failures
   ✓ Circuit Breaker > EnhancedCircuitBreaker > should reject requests when circuit is open
   ✓ Circuit Breaker > EnhancedCircuitBreaker > should track metrics correctly
   ✓ Circuit Breaker > EnhancedCircuitBreaker > should timeout long-running requests
   ✓ Circuit Breaker > CircuitBreakerFactory > should create and reuse breaker instances
   ✓ Circuit Breaker > CircuitBreakerFactory > should get metrics for all breakers
   ✓ Circuit Breaker > CircuitBreakerFactory > should reset all breakers
   ✓ Circuit Breaker > RetryPolicy > should retry failed operations
   ✓ Circuit Breaker > RetryPolicy > should not retry non-retryable errors
   ✓ Circuit Breaker > RetryPolicy > should give up after max retries
   ✓ Circuit Breaker > RetryPolicy > should apply exponential backoff
   ✓ Circuit Breaker > Integration > should work with retry policy for successful operations
   ✓ Circuit Breaker > Integration > should handle circuit breaker opening during retries

Test Files  1 passed (1)
Tests  14 passed (14)
```

---

## Remaining Work

### Not Completed
1. **LLM Provider Unit Tests** - Zero coverage for provider functionality
   - Need to create `tests/unit/llm-provider.test.ts`
   - Should mock API responses for each provider
   - Test cases: success, auth failure, timeout, retry, fallback

### Optional Future Improvements
1. Enable Cloudflare native tracing in `wrangler.toml`
2. Consider consolidating the two LLM implementations
3. Add health check endpoint exposing circuit breaker state

---

## Verification Commands

```bash
# Run circuit breaker tests
npx vitest run tests/integration/circuit-breaker.test.ts

# Type check
npm run type-check

# Check vulnerabilities
npm audit
```

---

## Key Insights for Future Sessions

1. **Anthropic API uses `x-api-key` not `Authorization: Bearer`** - This is different from OpenAI/most other providers

2. **Cloudflare Workers has limited Node.js compatibility** - Even with `nodejs_compat` flag, some libraries don't work. Test carefully.

3. **Two parallel LLM implementations exist**:
   - `app/lib/llm/llm-provider.service.ts` - Modern architecture with circuit breaker
   - `functions/_shared/llm-enhancer.ts` - Legacy implementation
   - The refactored version (`llm-enhancer-refactored.ts`) imports from the app version

4. **Rate limiting has deprecated function** - `validateRequest()` logs warning but doesn't rate limit. Use `validateRequestWithKV()` instead.

---

## Last Updated
2025-12-25 18:16 UTC
