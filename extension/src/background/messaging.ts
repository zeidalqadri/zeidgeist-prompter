import type { Message, MessageResponse } from '@/shared/types';
import { apiClient } from '@/shared/api-client';
import { storage } from '@/shared/storage';

export async function handleMessage(
  message: Message,
  _sender: chrome.runtime.MessageSender
): Promise<MessageResponse> {
  console.log('[mstprmpt] Message received:', message.type);

  try {
    switch (message.type) {
      case 'REFACTOR_PROMPT': {
        const { prompt, context, provider } = message.payload as {
          prompt: string;
          context?: string;
          provider?: string;
        };

        const settings = await storage.getSettings();
        const response = await apiClient.refactorPrompt(
          {
            prompt,
            context,
            provider: provider || (settings.providerMode === 'manual' ? settings.preferredProvider : undefined),
          },
          settings.apiBaseUrl
        );

        // Save to history
        await storage.addToHistory({
          original: prompt,
          refactored: response.result,
          context,
          timestamp: Date.now(),
          metadata: response.metadata,
        });

        return {
          success: true,
          data: response,
          requestId: message.requestId,
        };
      }

      case 'GET_HISTORY': {
        const history = await storage.getHistory();
        return {
          success: true,
          data: history,
          requestId: message.requestId,
        };
      }

      case 'ADD_TO_HISTORY': {
        const item = message.payload as {
          original: string;
          refactored: string;
          context?: string;
          metadata?: { source?: string; processingTime?: number };
        };

        const newItem = await storage.addToHistory({
          ...item,
          timestamp: Date.now(),
        });

        return {
          success: true,
          data: newItem,
          requestId: message.requestId,
        };
      }

      case 'GET_SETTINGS': {
        const settings = await storage.getSettings();
        return {
          success: true,
          data: settings,
          requestId: message.requestId,
        };
      }

      case 'UPDATE_SETTINGS': {
        const updates = message.payload as Partial<typeof storage.getSettings>;
        const settings = await storage.updateSettings(updates as Parameters<typeof storage.updateSettings>[0]);
        return {
          success: true,
          data: settings,
          requestId: message.requestId,
        };
      }

      default:
        return {
          success: false,
          error: `Unknown message type: ${message.type}`,
          requestId: message.requestId,
        };
    }
  } catch (error) {
    console.error('[mstprmpt] Message handling error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId: message.requestId,
    };
  }
}
