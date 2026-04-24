import { apiClient } from '@/shared/api-client';
import { storage } from '@/shared/storage';

export function setupContextMenu(): void {
  // Remove existing menus first
  chrome.contextMenus.removeAll(() => {
    // Create context menu items
    chrome.contextMenus.create({
      id: 'refactor-selection',
      title: 'Refactor with mstprmpt',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: 'refactor-replicate',
      title: 'Refactor and Replicate',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: 'refactor-replace',
      title: 'Refactor and Replace',
      contexts: ['editable'],
      documentUrlPatterns: [
        'https://chat.openai.com/*',
        'https://chatgpt.com/*',
        'https://claude.ai/*',
        'https://gemini.google.com/*',
        'https://www.perplexity.ai/*',
      ],
    });

    console.log('[mstprmpt] Context menu created');
  });
}

export async function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
): Promise<void> {
  const selectedText = info.selectionText?.trim();

  if (!selectedText) {
    console.log('[mstprmpt] No text selected');
    return;
  }

  console.log('[mstprmpt] Context menu clicked:', info.menuItemId);

  try {
    // Show processing badge
    await chrome.action.setBadgeText({ text: '...' });
    await chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });

    // Get settings
    const settings = await storage.getSettings();

    // Refactor the selected text
    const response = await apiClient.refactorPrompt(
      {
        prompt: selectedText,
        provider: settings.providerMode === 'manual' ? settings.preferredProvider : undefined,
      },
      settings.apiBaseUrl
    );

    if (settings.syncHistory !== false) {
      await storage.addToHistory({
        original: selectedText,
        refactored: response.result,
        timestamp: Date.now(),
        metadata: response.metadata,
      });
    }

    // Store result for popup access
    await chrome.storage.local.set({
      lastContextMenuResult: {
        original: selectedText,
        refactored: response.result,
        timestamp: Date.now(),
        menuItemId: info.menuItemId,
      },
    });

    // Handle different menu actions
    switch (info.menuItemId) {
      case 'refactor-selection':
        // Just store result, user opens popup to see it
        await chrome.action.setBadgeText({ text: '!' });
        await chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
        break;

      case 'refactor-replicate':
        // Copy to clipboard
        await copyToClipboard(response.result);
        await chrome.action.setBadgeText({ text: '✓' });
        await chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
        break;

      case 'refactor-replace':
        if (tab?.id) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'INJECT_TEXT',
              payload: { text: response.result },
            });
          } catch {
            await copyToClipboard(response.result);
          }
        }
        await chrome.action.setBadgeText({ text: '✓' });
        await chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
        break;
    }

    // Clear badge after 3 seconds
    setTimeout(async () => {
      await chrome.action.setBadgeText({ text: '' });
    }, 3000);

  } catch (error) {
    console.error('[mstprmpt] Context menu action failed:', error);
    await chrome.action.setBadgeText({ text: 'X' });
    await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });

    setTimeout(async () => {
      await chrome.action.setBadgeText({ text: '' });
    }, 3000);
  }
}

async function copyToClipboard(text: string): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab');

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: async (textToCopy: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(textToCopy);
        return true;
      } catch {
        if (!document.hasFocus()) return false;
        const ta = document.createElement('textarea');
        ta.value = textToCopy;
        ta.style.cssText = 'position:fixed;left:-9999px;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      }
    },
    args: [text],
  });

  const success = results?.[0]?.result;
  if (!success) {
    throw new Error('Clipboard write failed — page may not have focus');
  }
}
