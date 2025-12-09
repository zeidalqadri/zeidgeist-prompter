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

    // Save to history
    await storage.addToHistory({
      original: selectedText,
      refactored: response.result,
      timestamp: Date.now(),
      metadata: response.metadata,
    });

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
        // Replace selected text in editable field
        if (tab?.id) {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'INJECT_TEXT',
            payload: { text: response.result },
          });
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
  // In MV3, we need to use offscreen document or inject into active tab
  // For now, we'll try the simplest approach
  try {
    // Try to use the Clipboard API via injected script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (textToCopy: string) => {
          navigator.clipboard.writeText(textToCopy);
        },
        args: [text],
      });
    }
  } catch (error) {
    console.error('[mstprmpt] Failed to copy to clipboard:', error);
    throw error;
  }
}
