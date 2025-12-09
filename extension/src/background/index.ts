import { setupContextMenu, handleContextMenuClick } from './context-menu';
import { handleMessage } from './messaging';

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('[mstprmpt] Extension installed');
  setupContextMenu();
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      console.error('[mstprmpt] Message handling error:', error);
      sendResponse({ success: false, error: error.message });
    });
  return true; // Keep message channel open for async response
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  console.log('[mstprmpt] Command received:', command);

  if (command === '_execute_action') {
    // Default action opens popup, handled automatically
  }
});

console.log('[mstprmpt] Background service worker initialized');
