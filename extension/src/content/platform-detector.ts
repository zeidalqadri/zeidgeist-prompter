import type { PlatformAdapter } from '@/shared/types';
import { ChatGPTAdapter } from './adapters/chatgpt-adapter';
import { ClaudeAdapter } from './adapters/claude-adapter';
import { GeminiAdapter } from './adapters/gemini-adapter';
import { PerplexityAdapter } from './adapters/perplexity-adapter';
import { GenericAdapter } from './adapters/generic-adapter';

export type Platform = 'chatgpt' | 'claude' | 'gemini' | 'perplexity' | 'generic';

const PLATFORM_PATTERNS: Record<Platform, RegExp[]> = {
  chatgpt: [
    /chat\.openai\.com/,
    /chatgpt\.com/,
  ],
  claude: [
    /claude\.ai/,
  ],
  gemini: [
    /gemini\.google\.com/,
  ],
  perplexity: [
    /perplexity\.ai/,
  ],
  generic: [],
};

export function detectPlatform(): Platform | null {
  const hostname = window.location.hostname;

  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    if (platform === 'generic') continue;

    for (const pattern of patterns) {
      if (pattern.test(hostname)) {
        return platform as Platform;
      }
    }
  }

  return null;
}

export function getAdapter(platform: Platform): PlatformAdapter | null {
  switch (platform) {
    case 'chatgpt':
      return new ChatGPTAdapter();
    case 'claude':
      return new ClaudeAdapter();
    case 'gemini':
      return new GeminiAdapter();
    case 'perplexity':
      return new PerplexityAdapter();
    case 'generic':
      return new GenericAdapter();
    default:
      return null;
  }
}
