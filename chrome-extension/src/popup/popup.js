document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    promptInput: document.getElementById('promptInput'),
    includeContext: document.getElementById('includeContext'),
    enhanceBtn: document.getElementById('enhanceBtn'),
    resultSection: document.getElementById('resultSection'),
    enhancedPrompt: document.getElementById('enhancedPrompt'),
    clarityBar: document.getElementById('clarityBar'),
    clarityValue: document.getElementById('clarityValue'),
    specificityBar: document.getElementById('specificityBar'),
    specificityValue: document.getElementById('specificityValue'),
    completenessBar: document.getElementById('completenessBar'),
    completenessValue: document.getElementById('completenessValue'),
    improvements: document.getElementById('improvements'),
    copyBtn: document.getElementById('copyBtn'),
    insertBtn: document.getElementById('insertBtn'),
    historyList: document.getElementById('historyList'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    helpBtn: document.getElementById('helpBtn'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    autoEnhance: document.getElementById('autoEnhance'),
    showNotifications: document.getElementById('showNotifications'),
    historyLimit: document.getElementById('historyLimit'),
    theme: document.getElementById('theme')
  };
  
  let currentEnhancement = null;
  let currentTabId = null;
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab.id;
  
  await loadHistory();
  await loadSettings();
  
  elements.enhanceBtn.addEventListener('click', async () => {
    const prompt = elements.promptInput.value.trim();
    if (!prompt) {
      showNotification('Please enter a prompt to enhance');
      return;
    }
    
    await enhancePrompt(prompt);
  });
  
  async function enhancePrompt(prompt) {
    elements.enhanceBtn.disabled = true;
    elements.enhanceBtn.innerHTML = 'enhancing...'
    
    try {
      let context = null;
      if (elements.includeContext.checked && currentTabId) {
        context = await getPageContext();
      }
      
      const response = await chrome.runtime.sendMessage({
        type: 'ENHANCE_PROMPT',
        prompt: prompt,
        context: context
      });
      
      if (response.success) {
        displayEnhancement(response.data);
        await loadHistory();
      } else {
        showNotification('Enhancement failed: ' + response.error);
      }
    } catch (error) {
      console.error('Enhancement error:', error);
      showNotification('Failed to enhance prompt');
    } finally {
      elements.enhanceBtn.disabled = false;
      elements.enhanceBtn.innerHTML = 'refine'
    }
  }
  
  function displayEnhancement(enhancement) {
    currentEnhancement = enhancement;
    
    elements.enhancedPrompt.textContent = enhancement.refined;
    
    elements.clarityBar.style.width = `${enhancement.metrics.clarity}%`;
    elements.clarityValue.textContent = `${enhancement.metrics.clarity}%`;
    
    elements.specificityBar.style.width = `${enhancement.metrics.specificity}%`;
    elements.specificityValue.textContent = `${enhancement.metrics.specificity}%`;
    
    elements.completenessBar.style.width = `${enhancement.metrics.completeness}%`;
    elements.completenessValue.textContent = `${enhancement.metrics.completeness}%`;
    
    if (enhancement.improvements && enhancement.improvements.length > 0) {
      elements.improvements.innerHTML = `
        <h4>Improvements Applied:</h4>
        <ul>
          ${enhancement.improvements.map(imp => `<li>${imp}</li>`).join('')}
        </ul>
      `;
    } else {
      elements.improvements.innerHTML = '';
    }
    
    elements.resultSection.classList.remove('hidden');
  }
  
  elements.copyBtn.addEventListener('click', async () => {
    if (!currentEnhancement) return;
    
    try {
      await navigator.clipboard.writeText(currentEnhancement.refined);
      
      const originalText = elements.copyBtn.innerHTML;
      elements.copyBtn.innerHTML = 'copied!'
      setTimeout(() => {
        elements.copyBtn.innerHTML = originalText;
      }, 2000);
    } catch (error) {
      showNotification('Failed to copy to clipboard');
    }
  });
  
  elements.insertBtn.addEventListener('click', async () => {
    if (!currentEnhancement || !currentTabId) return;
    
    chrome.tabs.sendMessage(currentTabId, {
      type: 'INSERT_PROMPT',
      prompt: currentEnhancement.refined
    });
    
    window.close();
  });
  
  async function loadHistory() {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_HISTORY',
      limit: 5
    });
    
    if (response.success && response.data) {
      displayHistory(response.data);
    }
  }
  
  function displayHistory(history) {
    if (history.length === 0) {
      elements.historyList.innerHTML = '<p style="text-align: center; color: #999; font-size: 13px;">No history yet</p>';
      return;
    }
    
    elements.historyList.innerHTML = history.map(item => `
      <div class="history-item" data-prompt="${encodeURIComponent(item.refined)}">
        <div class="history-item-time">${formatTime(item.timestamp)}</div>
        <div class="history-item-prompt">${item.original}</div>
      </div>
    `).join('');
    
    elements.historyList.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const prompt = decodeURIComponent(item.dataset.prompt);
        elements.promptInput.value = prompt;
        elements.promptInput.focus();
      });
    });
  }
  
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    return date.toLocaleDateString();
  }
  
  elements.clearHistoryBtn.addEventListener('click', async () => {
    if (confirm('Clear all history?')) {
      await chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY' });
      await loadHistory();
      showNotification('History cleared');
    }
  });
  
  elements.settingsBtn.addEventListener('click', () => {
    elements.settingsModal.classList.remove('hidden');
  });
  
  elements.closeSettingsBtn.addEventListener('click', () => {
    elements.settingsModal.classList.add('hidden');
  });
  
  elements.saveSettingsBtn.addEventListener('click', async () => {
    const settings = {
      autoEnhance: elements.autoEnhance.checked,
      showNotifications: elements.showNotifications.checked,
      historyLimit: parseInt(elements.historyLimit.value),
      theme: elements.theme.value
    };
    
    await chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: settings
    });
    
    elements.settingsModal.classList.add('hidden');
    showNotification('Settings saved');
  });
  
  async function loadSettings() {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    
    if (response.success && response.data) {
      elements.autoEnhance.checked = response.data.autoEnhance;
      elements.showNotifications.checked = response.data.showNotifications;
      elements.historyLimit.value = response.data.historyLimit;
      elements.theme.value = response.data.theme;
      
      applyTheme(response.data.theme);
    }
  }
  
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else if (theme === 'auto') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark-theme');
      }
    }
  }
  
  async function getPageContext() {
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: currentTabId },
        func: () => {
          const title = document.title;
          const url = window.location.href;
          const selection = window.getSelection().toString();
          
          let context = `Page: ${title}`;
          if (selection) {
            context += `\nSelected text: ${selection.substring(0, 200)}`;
          }
          
          return context;
        }
      });
      
      return result.result;
    } catch (error) {
      console.error('Failed to get page context:', error);
      return null;
    }
  }
  
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 13px;
      z-index: 2000;
      animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
  
  elements.helpBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://mstprmpt.zeidgeist.com/help' });
  });
  
  elements.promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      elements.enhanceBtn.click();
    }
  });
});