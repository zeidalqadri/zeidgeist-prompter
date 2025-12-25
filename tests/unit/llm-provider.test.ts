/**
 * LLM Provider Unit Tests
 *
 * Comprehensive tests for LLM provider functionality including:
 * - Individual provider API calls (Claude, OpenAI, Mistral, Moonshot, Gemini, DeepSeek)
 * - Authentication header formats
 * - Error handling (401, 429, 500, timeout)
 * - Retry behavior
 * - Fallback chain
 * - Circuit breaker integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ClaudeProvider,
  OpenAIProvider,
  MistralProvider,
  MoonshotProvider,
  GeminiProvider,
  DeepSeekProvider,
  LocalProvider,
  LLMProviderFactory,
  BaseLLMProvider
} from '../../app/lib/llm/llm-provider.service';
import { setEnvironmentSource } from '../../app/lib/llm/llm-config';
import { CircuitBreakerFactory } from '../../app/lib/resilience/circuit-breaker';
import type { EnhancementRequest, EnhancementResponse } from '../../app/lib/llm/types';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock AbortSignal.timeout
vi.stubGlobal('AbortSignal', {
  timeout: (ms: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  }
});

/**
 * Create a proper mock Response object with all required methods
 */
function createMockResponse(data: any, ok: boolean, status: number = 200): Response {
  const body = JSON.stringify(data);
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(body),
    blob: () => Promise.resolve(new Blob([body])),
    arrayBuffer: () => Promise.resolve(new TextEncoder().encode(body).buffer),
    formData: () => Promise.resolve(new FormData()),
    clone: function() { return createMockResponse(data, ok, status); },
    body: null,
    bodyUsed: false,
    redirected: false,
    type: 'basic' as ResponseType,
    url: ''
  } as Response;
}

describe('LLM Providers', () => {
  const testRequest: EnhancementRequest = {
    prompt: 'Write a function to calculate fibonacci numbers',
    context: 'JavaScript/TypeScript project',
    isRefinement: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    LLMProviderFactory.clearProviders();
    CircuitBreakerFactory.shutdownAll();

    // Set up test environment with API keys
    setEnvironmentSource({
      CLAUDE_API_KEY: 'test-claude-key',
      OPENAI_API_KEY: 'test-openai-key',
      MISTRAL_API_KEY: 'test-mistral-key',
      MOONSHOT_API_KEY: 'test-moonshot-key',
      GEMINI_API_KEY: 'test-gemini-key',
      DEEPSEEK_API_KEY: 'test-deepseek-key'
    });
  });

  afterEach(() => {
    CircuitBreakerFactory.shutdownAll();
    vi.resetAllMocks();
  });

  // ============================================================================
  // CLAUDE PROVIDER TESTS
  // ============================================================================

  describe('ClaudeProvider', () => {
    it('should use x-api-key header (NOT Authorization: Bearer)', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        content: [{ text: 'Enhanced: Write an efficient recursive function...' }],
        usage: { input_tokens: 100, output_tokens: 50 }
      }, true));

      const provider = new ClaudeProvider();
      await provider.enhance(testRequest);

      // Get the first call - fetch may be called with a Request object or (url, options)
      const call = mockFetch.mock.calls[0];
      const request = call[0] as Request;

      // Check URL
      expect(request.url).toBe('https://api.anthropic.com/v1/messages');

      // Check headers - Request object has headers as a Headers object
      expect(request.headers.get('x-api-key')).toBe('test-claude-key');
      expect(request.headers.get('anthropic-version')).toBe('2023-06-01');
      expect(request.headers.get('Content-Type')).toBe('application/json');

      // Ensure NOT using Bearer token
      expect(request.headers.get('Authorization')).toBeNull();
    });

    it('should call Anthropic API endpoint', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        content: [{ text: 'Enhanced prompt text' }],
        usage: { input_tokens: 100, output_tokens: 50 }
      }, true));

      const provider = new ClaudeProvider();
      await provider.enhance(testRequest);

      const call = mockFetch.mock.calls[0];
      const request = call[0] as Request;
      expect(request.url).toBe('https://api.anthropic.com/v1/messages');
    });

    it('should return enhanced prompt on success', async () => {
      const enhancedText = 'Enhanced: Write a highly efficient, memoized recursive function...';
      mockFetch.mockResolvedValueOnce(createMockResponse({
        content: [{ text: enhancedText }],
        usage: { input_tokens: 100, output_tokens: 50 }
      }, true));

      const provider = new ClaudeProvider();
      const response = await provider.enhance(testRequest);

      expect(response.enhancedPrompt).toBe(enhancedText);
      expect(response.source).toBe('claude');
      expect(response.metadata?.model).toBeDefined();
      expect(response.metadata?.usage).toBeDefined();
      expect(response.metadata?.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle 401 authentication error', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { error: { message: 'Invalid API key' } },
        false,
        401
      ));

      const provider = new ClaudeProvider();

      await expect(provider.enhance(testRequest)).rejects.toThrow('Claude API error (401)');
    });

    it('should handle 429 rate limit error', async () => {
      // Mock multiple responses for retry policy (3 retries configured)
      const errorResponse = createMockResponse(
        { error: { message: 'Rate limit exceeded' } },
        false,
        429
      );
      mockFetch.mockResolvedValue(errorResponse);

      const provider = new ClaudeProvider();

      await expect(provider.enhance(testRequest)).rejects.toThrow('Claude API error (429)');
    });

    it('should handle 500 server error', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { error: { message: 'Internal server error' } },
        false,
        500
      ));

      const provider = new ClaudeProvider();

      await expect(provider.enhance(testRequest)).rejects.toThrow('Claude API error (500)');
    });

    it('should reject empty response', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        content: [{ text: '' }],
        usage: { input_tokens: 100, output_tokens: 0 }
      }, true));

      const provider = new ClaudeProvider();

      await expect(provider.enhance(testRequest)).rejects.toThrow('Empty response received');
    });

    it('should reject identical prompt (no enhancement)', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        content: [{ text: testRequest.prompt }],
        usage: { input_tokens: 100, output_tokens: 50 }
      }, true));

      const provider = new ClaudeProvider();

      await expect(provider.enhance(testRequest)).rejects.toThrow('Returned identical prompt');
    });
  });

  // ============================================================================
  // OPENAI PROVIDER TESTS
  // ============================================================================

  describe('OpenAIProvider', () => {
    it('should use Authorization: Bearer header', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        choices: [{ message: { content: 'Enhanced prompt text' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 }
      }, true));

      const provider = new OpenAIProvider();
      await provider.enhance(testRequest);

      const call = mockFetch.mock.calls[0];
      const request = call[0] as Request;

      expect(request.headers.get('Authorization')).toBe('Bearer test-openai-key');
      expect(request.headers.get('Content-Type')).toBe('application/json');
    });

    it('should call OpenAI API endpoint', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        choices: [{ message: { content: 'Enhanced prompt' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 }
      }, true));

      const provider = new OpenAIProvider();
      await provider.enhance(testRequest);

      const call = mockFetch.mock.calls[0];
      const request = call[0] as Request;
      expect(request.url).toBe('https://api.openai.com/v1/chat/completions');
    });

    it('should return enhanced prompt on success', async () => {
      const enhancedText = 'Enhanced OpenAI response';
      mockFetch.mockResolvedValueOnce(createMockResponse({
        choices: [{ message: { content: enhancedText } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 }
      }, true));

      const provider = new OpenAIProvider();
      const response = await provider.enhance(testRequest);

      expect(response.enhancedPrompt).toBe(enhancedText);
      expect(response.source).toBe('openai');
    });

    it('should handle API errors correctly', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { error: { message: 'Invalid API key' } },
        false,
        401
      ));

      const provider = new OpenAIProvider();

      await expect(provider.enhance(testRequest)).rejects.toThrow('OpenAI API error (401)');
    });
  });

  // ============================================================================
  // MISTRAL PROVIDER TESTS
  // ============================================================================

  describe('MistralProvider', () => {
    it('should use Authorization: Bearer header', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        choices: [{ message: { content: 'Enhanced prompt text' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 }
      }, true));

      const provider = new MistralProvider();
      await provider.enhance(testRequest);

      const call = mockFetch.mock.calls[0];
      const request = call[0] as Request;

      expect(request.url).toBe('https://api.mistral.ai/v1/chat/completions');
      expect(request.headers.get('Authorization')).toBe('Bearer test-mistral-key');
    });

    it('should return enhanced prompt on success', async () => {
      const enhancedText = 'Enhanced Mistral response';
      mockFetch.mockResolvedValueOnce(createMockResponse({
        choices: [{ message: { content: enhancedText } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 }
      }, true));

      const provider = new MistralProvider();
      const response = await provider.enhance(testRequest);

      expect(response.enhancedPrompt).toBe(enhancedText);
      expect(response.source).toBe('mistral');
    });
  });

  // ============================================================================
  // MOONSHOT PROVIDER TESTS
  // ============================================================================

  describe('MoonshotProvider', () => {
    it('should use Authorization: Bearer header', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        choices: [{ message: { content: 'Enhanced prompt text' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 }
      }, true));

      const provider = new MoonshotProvider();
      await provider.enhance(testRequest);

      const call = mockFetch.mock.calls[0];
      const request = call[0] as Request;

      expect(request.url).toBe('https://api.moonshot.cn/v1/chat/completions');
      expect(request.headers.get('Authorization')).toBe('Bearer test-moonshot-key');
    });

    it('should return enhanced prompt on success', async () => {
      const enhancedText = 'Enhanced Moonshot response';
      mockFetch.mockResolvedValueOnce(createMockResponse({
        choices: [{ message: { content: enhancedText } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 }
      }, true));

      const provider = new MoonshotProvider();
      const response = await provider.enhance(testRequest);

      expect(response.enhancedPrompt).toBe(enhancedText);
      expect(response.source).toBe('moonshot');
    });
  });

  // ============================================================================
  // GEMINI PROVIDER TESTS
  // ============================================================================

  describe('GeminiProvider', () => {
    it('should use API key as query parameter (Gemini style)', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        candidates: [{ content: { parts: [{ text: 'Enhanced prompt text' }] } }]
      }, true));

      const provider = new GeminiProvider();
      await provider.enhance(testRequest);

      const call = mockFetch.mock.calls[0];
      const request = call[0] as Request;

      // Gemini uses API key in URL, not header
      expect(request.url).toContain('key=test-gemini-key');
    });

    it('should call Gemini API endpoint', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        candidates: [{ content: { parts: [{ text: 'Enhanced prompt' }] } }]
      }, true));

      const provider = new GeminiProvider();
      await provider.enhance(testRequest);

      const call = mockFetch.mock.calls[0];
      const request = call[0] as Request;
      expect(request.url).toContain('generativelanguage.googleapis.com');
    });

    it('should return enhanced prompt on success', async () => {
      const enhancedText = 'Enhanced Gemini response';
      mockFetch.mockResolvedValueOnce(createMockResponse({
        candidates: [{ content: { parts: [{ text: enhancedText }] } }]
      }, true));

      const provider = new GeminiProvider();
      const response = await provider.enhance(testRequest);

      expect(response.enhancedPrompt).toBe(enhancedText);
      expect(response.source).toBe('gemini');
    });
  });

  // ============================================================================
  // DEEPSEEK PROVIDER TESTS
  // ============================================================================

  describe('DeepSeekProvider', () => {
    it('should use Authorization: Bearer header', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        choices: [{ message: { content: 'Enhanced prompt text' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 }
      }, true));

      const provider = new DeepSeekProvider();
      await provider.enhance(testRequest);

      const call = mockFetch.mock.calls[0];
      const request = call[0] as Request;

      expect(request.url).toBe('https://api.deepseek.com/v1/chat/completions');
      expect(request.headers.get('Authorization')).toBe('Bearer test-deepseek-key');
    });

    it('should return enhanced prompt on success', async () => {
      const enhancedText = 'Enhanced DeepSeek response';
      mockFetch.mockResolvedValueOnce(createMockResponse({
        choices: [{ message: { content: enhancedText } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 }
      }, true));

      const provider = new DeepSeekProvider();
      const response = await provider.enhance(testRequest);

      expect(response.enhancedPrompt).toBe(enhancedText);
      expect(response.source).toBe('deepseek');
    });
  });

  // ============================================================================
  // LOCAL PROVIDER TESTS
  // ============================================================================

  describe('LocalProvider', () => {
    it('should always be enabled', () => {
      const provider = new LocalProvider();
      expect(provider.enabled).toBe(true);
    });

    it('should always be healthy', async () => {
      const provider = new LocalProvider();
      const healthy = await provider.isHealthy();
      expect(healthy).toBe(true);
    });
  });

  // ============================================================================
  // LLM PROVIDER FACTORY TESTS
  // ============================================================================

  describe('LLMProviderFactory', () => {
    it('should return singleton provider instances', () => {
      const provider1 = LLMProviderFactory.getProvider('claude');
      const provider2 = LLMProviderFactory.getProvider('claude');
      expect(provider1).toBe(provider2);
    });

    it('should build provider chain with enabled providers', () => {
      const chain = LLMProviderFactory.getProviderChain();

      // Should include all providers since we set API keys
      expect(chain.length).toBeGreaterThan(0);
      expect(chain.some(p => p.name === 'claude')).toBe(true);
      expect(chain.some(p => p.name === 'openai')).toBe(true);
    });

    it('should fallback to next provider on failure', async () => {
      // First provider fails
      mockFetch
        .mockResolvedValueOnce(createMockResponse({ error: 'Claude down' }, false, 500))
        // Second provider succeeds
        .mockResolvedValueOnce(createMockResponse({
          choices: [{ message: { content: 'OpenAI enhanced' } }],
          usage: { prompt_tokens: 100, completion_tokens: 50 }
        }, true));

      const response = await LLMProviderFactory.enhanceWithFallback(testRequest);

      expect(response.enhancedPrompt).toBe('OpenAI enhanced');
      expect(response.source).toBe('openai');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should fall back to local provider when all external providers fail', async () => {
      // All external providers fail - local provider is always enabled as fallback
      mockFetch.mockResolvedValue(createMockResponse({ error: 'Service unavailable' }, false, 500));

      const response = await LLMProviderFactory.enhanceWithFallback(testRequest);

      // Should fall back to local provider
      expect(response.source).toBe('local');
      expect(response.enhancedPrompt).toBeDefined();
    });

    it('should skip providers with open circuit breakers and fallback', async () => {
      // Create a provider and trip its circuit
      const provider = LLMProviderFactory.getProvider('claude') as BaseLLMProvider;

      // Fail 10 times to trip circuit
      for (let i = 0; i < 10; i++) {
        mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'fail' }, false, 500));
        try {
          await provider.enhance(testRequest);
        } catch (e) {
          // Expected
        }
      }

      // Reset mock for next calls
      mockFetch.mockClear();

      // OpenAI should work
      mockFetch.mockResolvedValueOnce(createMockResponse({
        choices: [{ message: { content: 'OpenAI fallback' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 }
      }, true));

      const response = await LLMProviderFactory.enhanceWithFallback(testRequest);

      // Should skip Claude (circuit open) and use next available provider
      // Could be OpenAI or could fall back to local depending on circuit state
      expect(['openai', 'local', 'deepseek', 'mistral', 'moonshot', 'gemini']).toContain(response.source);
    });

    it('should return health status for all providers', async () => {
      // Mock successful health checks
      mockFetch.mockResolvedValue(createMockResponse({
        content: [{ text: 'test response' }],
        choices: [{ message: { content: 'test response' } }],
        candidates: [{ content: { parts: [{ text: 'test response' }] } }],
        usage: {}
      }, true));

      const status = await LLMProviderFactory.getHealthStatus();

      expect(status).toHaveProperty('claude');
      expect(status).toHaveProperty('openai');
      expect(status.claude).toHaveProperty('enabled', true);
      expect(status.openai).toHaveProperty('enabled', true);
    });

    it('should clear providers cache', () => {
      const provider1 = LLMProviderFactory.getProvider('claude');
      LLMProviderFactory.clearProviders();
      const provider2 = LLMProviderFactory.getProvider('claude');

      // Should be different instances after clear
      expect(provider1).not.toBe(provider2);
    });
  });

  // ============================================================================
  // DISABLED PROVIDER TESTS
  // ============================================================================

  describe('Disabled Providers', () => {
    beforeEach(() => {
      // Clear all API keys
      setEnvironmentSource({});
      LLMProviderFactory.clearProviders();
    });

    it('should not be enabled without API key', () => {
      const provider = new ClaudeProvider();
      expect(provider.enabled).toBe(false);
    });

    it('should throw when trying to enhance without config', async () => {
      const provider = new ClaudeProvider();

      await expect(provider.enhance(testRequest)).rejects.toThrow('not configured');
    });

    it('should report unhealthy when disabled', async () => {
      const provider = new ClaudeProvider();
      const healthy = await provider.isHealthy();
      expect(healthy).toBe(false);
    });
  });

  // ============================================================================
  // CIRCUIT BREAKER INTEGRATION TESTS
  // ============================================================================

  describe('Circuit Breaker Integration', () => {
    it('should track metrics on success', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        content: [{ text: 'Enhanced prompt' }],
        usage: { input_tokens: 100, output_tokens: 50 }
      }, true));

      const provider = new ClaudeProvider();
      await provider.enhance(testRequest);

      const metrics = provider.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics?.successCount).toBe(1);
    });

    it('should track metrics on failure', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'fail' }, false, 500));

      const provider = new ClaudeProvider();

      try {
        await provider.enhance(testRequest);
      } catch (e) {
        // Expected
      }

      const metrics = provider.getMetrics();
      expect(metrics?.failureCount).toBe(1);
    });

    it('should reject immediately when circuit is open', async () => {
      const provider = new ClaudeProvider();

      // Trip the circuit with failures
      for (let i = 0; i < 10; i++) {
        mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'fail' }, false, 500));
        try {
          await provider.enhance(testRequest);
        } catch (e) {
          // Expected
        }
      }

      // Now circuit should be open
      mockFetch.mockClear();

      await expect(provider.enhance(testRequest)).rejects.toThrow('Circuit breaker is OPEN');

      // fetch should NOT have been called - circuit rejects immediately
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // MESSAGE BUILDING TESTS
  // ============================================================================

  describe('Message Building', () => {
    it('should build messages with system prompt', () => {
      const provider = new ClaudeProvider();
      const messages = provider.buildMessages(testRequest);

      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('prompt engineer');
    });

    it('should include context in user message when provided', () => {
      const provider = new ClaudeProvider();
      const messages = provider.buildMessages(testRequest);

      const userMessages = messages.filter(m => m.role === 'user');
      const lastUserMessage = userMessages[userMessages.length - 1];

      expect(lastUserMessage.content).toContain(testRequest.prompt);
      expect(lastUserMessage.content).toContain(testRequest.context);
    });

    it('should add refinement instructions when isRefinement is true', () => {
      const provider = new ClaudeProvider();
      const refinementRequest = { ...testRequest, isRefinement: true };
      const messages = provider.buildMessages(refinementRequest);

      expect(messages[0].content).toContain('iterative refinement');
    });

    it('should include training examples', () => {
      const provider = new ClaudeProvider();
      const messages = provider.buildMessages(testRequest);

      // Should have alternating user/assistant examples
      const assistantMessages = messages.filter(m => m.role === 'assistant');
      expect(assistantMessages.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // REQUEST FORMAT TESTS
  // ============================================================================

  describe('Request Format', () => {
    it('should format Claude request with system instruction separately', async () => {
      // Capture the body before fetch is called
      let capturedBody: any;
      mockFetch.mockImplementationOnce(async (input: Request) => {
        capturedBody = JSON.parse(await input.text());
        return createMockResponse({
          content: [{ text: 'Enhanced' }],
          usage: {}
        }, true);
      });

      const provider = new ClaudeProvider();
      await provider.enhance(testRequest);

      // Claude uses 'system' field at top level
      expect(capturedBody.system).toBeDefined();
      expect(capturedBody.messages).toBeDefined();
      expect(capturedBody.model).toBeDefined();
    });

    it('should format OpenAI request with messages array', async () => {
      let capturedBody: any;
      mockFetch.mockImplementationOnce(async (input: Request) => {
        capturedBody = JSON.parse(await input.text());
        return createMockResponse({
          choices: [{ message: { content: 'Enhanced' } }],
          usage: {}
        }, true);
      });

      const provider = new OpenAIProvider();
      await provider.enhance(testRequest);

      // OpenAI includes system in messages array
      expect(capturedBody.messages).toBeDefined();
      expect(capturedBody.messages[0].role).toBe('system');
    });

    it('should format Gemini request with contents and systemInstruction', async () => {
      let capturedBody: any;
      mockFetch.mockImplementationOnce(async (input: Request) => {
        capturedBody = JSON.parse(await input.text());
        return createMockResponse({
          candidates: [{ content: { parts: [{ text: 'Enhanced' }] } }]
        }, true);
      });

      const provider = new GeminiProvider();
      await provider.enhance(testRequest);

      // Gemini uses contents and systemInstruction
      expect(capturedBody.contents).toBeDefined();
      expect(capturedBody.systemInstruction).toBeDefined();
    });
  });
});
