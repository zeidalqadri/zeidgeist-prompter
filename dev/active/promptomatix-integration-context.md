# Promptomatix Integration - Session Context

**Last Updated:** 2025-12-14
**Branch:** `zeidalqadri/houston`
**Status:** Phase 1 & Phase 2 Complete

## Overview

Integrated Promptomatix-style prompt optimization features from Salesforce AI Research into the zeidgeist-prompter codebase. Two main features implemented:

1. **Cost-Aware Optimization (λ parameter)** - COMPLETE
2. **Automatic Module Selection (CoT/PoT/ReAct)** - COMPLETE

---

## Phase 1: Cost-Aware Optimization - COMPLETE

### What Was Implemented

The Promptomatix lambda (λ) parameter for balancing quality vs. token cost:
- **Formula:** `Optimization Score = Quality - (λ × TokenCount / 1000)`
- **Lambda Range:** 0.0 (max quality) to 0.02 (max compression)
- **Default:** 0.007 (balanced)

### Files Created (Phase 1)

| File | Purpose |
|------|---------|
| `/app/lib/enhanced-architecture/cost-config.ts` | Configuration types, presets (maxQuality, balanced, costEfficient, aggressive), validation functions |
| `/app/lib/enhanced-architecture/token-counter.ts` | Token estimation with LRU cache, GPT-4 style heuristics |
| `/app/lib/enhanced-architecture/cost-optimizer.ts` | Post-processing compression with 4 techniques |

### Files Modified (Phase 1)

| File | Changes |
|------|---------|
| `/app/lib/enhanced-architecture/metrics-calculator.ts` | Added `CostAwareMetrics` interface, `calculateCostAwareMetrics()`, `compareCostAware()`, `shouldUseOptimized()` methods |
| `/app/lib/llm/types.ts` | Added `CostMetrics` interface, `costConfig` to `EnhancementRequest`, `costMetrics` to response metadata |
| `/app/lib/llm/llm-enhancer.service.ts` | Integrated `CostAwareOptimizer`, changed `enhance()` return type to include `costMetrics` |
| `/functions/api/engineer.ts` | Accept `lambda` parameter, return cost metrics in response |
| `/app/tweak/page.tsx` | Added Cost Optimization section with presets + slider UI |
| `/components/prompt-engineer.tsx` | Added `costMetrics` to state, display tokens saved/quality score |

### Key Architectural Decisions (Phase 1)

1. **Post-processing optimization** - Compression happens AFTER LLM enhancement, not during
2. **Quality threshold enforcement** - Optimization only applied if quality stays above threshold (default 0.7)
3. **Tiered compression techniques** - Different lambda values trigger different compression levels:
   - λ ≥ 0.005: Verbose phrase compression
   - λ ≥ 0.010: Structure consolidation
   - λ ≥ 0.015: Aggressive compression
4. **LRU caching** - Token counts and compressed outputs are cached for performance
5. **Cookie + localStorage persistence** - Lambda preference saved for API and UI

### Compression Techniques Implemented

1. **Redundancy removal** - Multiple spaces, excess punctuation, extra newlines
2. **Verbose phrase compression** - "in order to" → "to", "due to the fact that" → "because", etc.
3. **Structure consolidation** - Limit long lists to first 4 items + "...and more"
4. **Aggressive compression** - Remove parenthetical clarifications, filler words, politeness markers

---

## Phase 2: Automatic Module Selection - COMPLETE

### What Was Implemented

Dynamic selection of reasoning strategies based on task complexity:
- **Predict:** Simple direct tasks (default)
- **CoT (Chain-of-Thought):** Multi-step reasoning
- **PoT (Program-of-Thought):** Mathematical/algorithmic tasks
- **ReAct:** Interactive/agentic tasks

### Files Created (Phase 2)

| File | Purpose |
|------|---------|
| `/app/lib/llm/reasoning-strategy.ts` | Type definitions for strategies, detection patterns, default configs, strategy descriptions |
| `/app/lib/llm/strategy-detector.ts` | Pattern-based detection logic, confidence scoring, batch detection support |
| `/prompts/strategy-system-prompts.ts` | Strategy-specific enhancement prompts (Predict, CoT, PoT, ReAct), response parsing |

### Files Modified (Phase 2)

| File | Changes |
|------|---------|
| `/app/lib/llm/prompt-analyzer.ts` | Added `PromptAnalysisWithStrategy` interface, `analyzePromptWithStrategy()`, `getRecommendedStrategy()`, `selectModelTierWithStrategy()`, `quickDetectStrategy()` |
| `/app/lib/llm/llm-provider.service.ts` | Added imports for strategy modules, `buildMessagesWithStrategy()` method, `parseStrategyResponse()` method |
| `/prompts/enhanced-system-prompts.ts` | Added `selectPromptWithStrategy()`, `selectPromptAuto()`, `getEnhancedStrategyPrompt()` |
| `/app/lib/llm-enhancer-refactored.ts` | Fixed return type to extract `.enhancedPrompt` from service result |
| `/components/prompt-engineer.tsx` | Added `costMetrics` to `EngineerResponse` interface |

### Strategy Detection Patterns

**Predict (simple direct tasks):**
- Keywords: what is, define, translate, convert, list
- Short prompts (<50 chars)

**CoT (multi-step reasoning):**
- Keywords: step-by-step, explain, analyze, evaluate, compare
- Multiple questions, sequence markers (first/then/finally)

**PoT (mathematical/algorithmic):**
- Keywords: calculate, compute, solve, equation, formula, algorithm
- Patterns: numbers, math operators, percentages

**ReAct (interactive/agentic):**
- Keywords: search, find, look up, retrieve, verify, current, latest
- Patterns: URLs, multi-source requests

### Key Architectural Decisions (Phase 2)

1. **Confidence-based selection** - Strategy only used if confidence >= 0.3
2. **Fallback to predict** - Low confidence defaults to simple predict strategy
3. **Pattern weighting** - Keywords (40%), regex (35%), structural (25%)
4. **Negative patterns** - Reduce confidence when conflicting patterns found
5. **Strategy-specific prompts** - Each strategy has tailored system prompts with output parsing

---

## Integration Points

### Cost Optimization
- Cost config is read from cookies/localStorage in `/tweak` page
- API endpoint accepts `lambda` parameter in request body
- Cost metrics are returned in response `metadata.costMetrics`

### Strategy Detection
- `analyzePromptWithStrategy()` in prompt-analyzer.ts for full analysis
- `quickDetectStrategy()` for simple strategy selection
- `buildMessagesWithStrategy()` in provider service for strategy-aware messages
- `selectPromptAuto()` for automatic prompt selection based on analysis

---

## Important Notes

### Breaking Changes

The `LLMEnhancerService.enhance()` method now returns `{ enhancedPrompt: string; costMetrics?: CostMetrics }` instead of just `string`. Callers need to extract `.enhancedPrompt` from the result.

### Test Commands

```bash
# Run the development server
cd /Users/zeidalqadri/conductor/zeidgeist-prompter/.conductor/houston
npm run dev

# Build check
npm run build
```

---

## Reference

- **Task Tracking:** `/dev/active/promptomatix-integration-tasks.md`
- **Promptomatix GitHub:** https://github.com/SalesforceAIResearch/promptomatix
- **Research Paper:** arXiv:2507.14241
