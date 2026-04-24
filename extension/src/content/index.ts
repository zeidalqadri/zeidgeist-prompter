import { detectPlatform, getAdapter } from './platform-detector';
import { createFloatingButton } from './floating-button';
import type { Message } from '@/shared/types';
import { storage } from '@/shared/storage';
import { UI_CONSTANTS } from '@/shared/constants';

let currentAdapter: ReturnType<typeof getAdapter> | null = null;
let floatingButtonEnabled = true;

async function initialize(): Promise<void> {
  console.log('[mstprmpt] Content script initializing...');

  // Detect platform
  const platform = detectPlatform();
  if (!platform) {
    console.log('[mstprmpt] Not a supported AI chat platform');
    return;
  }

  console.log(`[mstprmpt] Detected platform: ${platform}`);

  // Get adapter
  currentAdapter = getAdapter(platform);
  if (!currentAdapter) {
    console.log('[mstprmpt] No adapter available for platform');
    return;
  }

  // Load settings to check floating button preference
  const settings = await storage.getSettings();
  floatingButtonEnabled = settings.floatingButton !== 'disabled';

  if (floatingButtonEnabled) {
    // Wait for input element to be available
    await waitForInputElement();

    // Set up floating button
    setupFloatingButton(settings.floatingButton);

    // Watch for DOM changes (SPA navigation)
    setupMutationObserver();
  }

  // Listen for messages from background script
  setupMessageListener();

  console.log('[mstprmpt] Content script initialized');
}

async function waitForInputElement(timeout = 10000): Promise<Element | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const element = currentAdapter?.findInputElement();
    if (element) {
      return element;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('[mstprmpt] Timeout waiting for input element');
  return null;
}

function setupFloatingButton(visibility: 'always' | 'on-focus' | 'disabled'): void {
  if (!currentAdapter || visibility === 'disabled') return;

  const anchorPoint = currentAdapter.getButtonAnchorPoint();
  if (!anchorPoint) {
    console.log('[mstprmpt] No anchor point for floating button');
    return;
  }

  createFloatingButton(
    anchorPoint,
    currentAdapter.getButtonPosition(),
    visibility === 'always',
    handleRefactorClick
  );
}

async function handleRefactorClick(): Promise<void> {
  if (!currentAdapter) return;

  const content = currentAdapter.getInputContent();
  if (!content.trim()) {
    showToast('Please enter some text first');
    return;
  }

  try {
    // Show loading state
    setFloatingButtonLoading(true);

    // Send message to background script to refactor
    const response = await chrome.runtime.sendMessage({
      type: 'REFACTOR_PROMPT',
      payload: { prompt: content },
    });

    if (response.success && response.data?.result) {
      // Inject the refactored text
      const success = await currentAdapter.setInputContent(response.data.result);
      if (success) {
        showToast('Prompt refactored!');
      } else {
        showToast('Could not update input field');
      }
    } else {
      showToast(response.error || 'Refactoring failed');
    }
  } catch (error) {
    console.error('[mstprmpt] Refactor error:', error);
    showToast('An error occurred');
  } finally {
    setFloatingButtonLoading(false);
  }
}

function setFloatingButtonLoading(loading: boolean): void {
  const button = document.querySelector('.mstprmpt-floating-btn');
  if (button) {
    button.classList.toggle('mstprmpt-loading', loading);
  }
}

function showToast(message: string): void {
  // Remove existing toast
  const existing = document.querySelector('.mstprmpt-toast');
  if (existing) {
    existing.remove();
  }

  // Create new toast
  const toast = document.createElement('div');
  toast.className = 'mstprmpt-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add('mstprmpt-toast-visible');
  });

  // Remove after delay
  setTimeout(() => {
    toast.classList.remove('mstprmpt-toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function setupMutationObserver(): void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!document.querySelector('.mstprmpt-floating-btn') && floatingButtonEnabled) {
        const anchorPoint = currentAdapter?.getButtonAnchorPoint();
        if (anchorPoint) {
          storage.getSettings().then(settings => {
            if (settings.floatingButton !== 'disabled') {
              createFloatingButton(
                anchorPoint,
                currentAdapter!.getButtonPosition(),
                settings.floatingButton === 'always',
                handleRefactorClick
              );
            }
          });
        }
      }
    }, UI_CONSTANTS.DEBOUNCE_DELAY);
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
    if (message.type === 'INJECT_TEXT' && currentAdapter) {
      const { text } = message.payload as { text: string };
      currentAdapter.setInputContent(text)
        .then(success => {
          sendResponse({ success });
        })
        .catch(error => {
          console.error('[mstprmpt] Inject text error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }

    if (message.type === 'GET_INPUT_TEXT' && currentAdapter) {
      const text = currentAdapter.getInputContent();
      sendResponse({ success: true, data: text });
      return false;
    }

    return false;
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
