import { API_CONFIG } from '../utils/config.js';
import { StorageManager } from '../utils/storage.js';
import { PromptEnhancer } from '../utils/enhancer.js';

const storage = new StorageManager();
const enhancer = new PromptEnhancer();

chrome.runtime.onInstalled.addListener(() => {
  console.log('MstPrmpt Extension installed');
  
  chrome.contextMenus.create({
    id: 'enhance-selection',
    title: 'Enhance with MstPrmpt',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'copy-enhanced',
    title: 'Copy Enhanced Prompt',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'enhance-selection' && info.selectionText) {
    try {
      const enhanced = await enhancer.enhance(info.selectionText);
      
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_ENHANCED',
        original: info.selectionText,
        enhanced: enhanced.refined
      });
      
      await storage.addToHistory({
        original: info.selectionText,
        refined: enhanced.refined,
        timestamp: new Date().toISOString(),
        url: tab.url,
        title: tab.title
      });
    } catch (error) {
      console.error('Enhancement failed:', error);
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_ERROR',
        message: 'Failed to enhance prompt'
      });
    }
  } else if (info.menuItemId === 'copy-enhanced' && info.selectionText) {
    try {
      const enhanced = await enhancer.enhance(info.selectionText);
      
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['CLIPBOARD'],
        justification: 'Copy enhanced prompt to clipboard'
      });
      
      chrome.runtime.sendMessage({
        type: 'COPY_TO_CLIPBOARD',
        text: enhanced.refined
      });
      
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_NOTIFICATION',
        message: 'Enhanced prompt copied!'
      });
    } catch (error) {
      console.error('Copy failed:', error);
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ENHANCE_PROMPT') {
    enhancer.enhance(request.prompt, request.context)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.type === 'GET_HISTORY') {
    storage.getHistory(request.limit || 10)
      .then(history => sendResponse({ success: true, data: history }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.type === 'CLEAR_HISTORY') {
    storage.clearHistory()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.type === 'GET_SETTINGS') {
    storage.getSettings()
      .then(settings => sendResponse({ success: true, data: settings }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.type === 'UPDATE_SETTINGS') {
    storage.updateSettings(request.settings)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'enhance-prompt') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_ENHANCE' });
  }
});