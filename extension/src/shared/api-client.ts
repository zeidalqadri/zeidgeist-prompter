import type { RefactorRequest, RefactorResponse, HistoryItem } from './types';
import { API_BASE_URL, API_ENDPOINTS, PROMPT_LIMITS, FETCH_TIMEOUT } from './constants';
import { safeJsonParse } from './safe-json-parse';

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const signal = options.signal
    ? AbortSignal.any([controller.signal, options.signal])
    : controller.signal;
  try {
    return await fetch(url, { ...options, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Request timed out. Please try again.', 408, 'TIMEOUT');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * API client for mstprmpt backend
 */
export const apiClient = {
  /**
   * Refactor a prompt using the API
   */
  async refactorPrompt(
    request: RefactorRequest,
    baseUrl: string = API_BASE_URL
  ): Promise<RefactorResponse> {
    // Validate input
    if (!request.prompt?.trim()) {
      throw new ApiError('Prompt is required', 400, 'EMPTY_PROMPT');
    }

    if (request.prompt.length > PROMPT_LIMITS.MAX_LENGTH) {
      throw new ApiError(
        `Prompt exceeds maximum length of ${PROMPT_LIMITS.MAX_LENGTH} characters`,
        400,
        'PROMPT_TOO_LONG'
      );
    }

    if (request.context && request.context.length > PROMPT_LIMITS.MAX_CONTEXT_LENGTH) {
      throw new ApiError(
        `Context exceeds maximum length of ${PROMPT_LIMITS.MAX_CONTEXT_LENGTH} characters`,
        400,
        'CONTEXT_TOO_LONG'
      );
    }

    const response = await fetchWithTimeout(`${baseUrl}${API_ENDPOINTS.ENGINEER}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error || `Request failed with status ${response.status}`,
        response.status,
        errorData.code
      );
    }

    const data = await safeJsonParse<{ result: string; metadata: RefactorResponse['metadata'] }>(response);
    return {
      result: data.result,
      metadata: data.metadata,
    };
  },

  /**
   * Get history from the API (for sync)
   */
  async getHistory(baseUrl: string = API_BASE_URL): Promise<HistoryItem[]> {
    const response = await fetchWithTimeout(`${baseUrl}${API_ENDPOINTS.HISTORY}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error || `Failed to fetch history`,
        response.status,
        errorData.code
      );
    }

    const data = await safeJsonParse<{ items?: Array<{
      original: string;
      refined: string;
      context?: string;
      timestamp: string | number;
      metadata?: { source?: string; model?: string; processingTime?: number };
    }> }>(response);
    return (data.items || []).map((item: {
      original: string;
      refined: string;
      context?: string;
      timestamp: string | number;
      metadata?: {
        source?: string;
        model?: string;
        processingTime?: number;
      };
    }) => ({
      id: crypto.randomUUID(),
      original: item.original,
      refactored: item.refined,
      context: item.context,
      timestamp: typeof item.timestamp === 'string'
        ? new Date(item.timestamp).getTime()
        : item.timestamp,
      metadata: item.metadata,
    }));
  },

  /**
   * Save history item to the API (for sync)
   */
  async saveHistoryItem(
    item: Omit<HistoryItem, 'id'>,
    baseUrl: string = API_BASE_URL
  ): Promise<void> {
    const response = await fetchWithTimeout(`${baseUrl}${API_ENDPOINTS.HISTORY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        original: item.original,
        refined: item.refactored,
        context: item.context,
        timestamp: item.timestamp,
        metadata: item.metadata,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error || `Failed to save history`,
        response.status,
        errorData.code
      );
    }
  },
};
