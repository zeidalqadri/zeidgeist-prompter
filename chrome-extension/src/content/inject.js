(() => {
  let enhancementOverlay = null;
  let notificationContainer = null;
  
  function init() {
    createNotificationContainer();
    injectEnhancementButton();
    setupMessageListener();
    setupKeyboardShortcuts();
  }
  
  function createNotificationContainer() {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'mstprmpt-notifications';
    notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      pointer-events: none;
    `;
    document.body.appendChild(notificationContainer);
  }
  
  function injectEnhancementButton() {
    const targetSelectors = [
      'textarea[data-id="root"]', // ChatGPT
      'div[contenteditable="true"]', // Claude
      'textarea[placeholder*="Ask"]', // General AI chat inputs
      'textarea[placeholder*="Type"]',
      'textarea[placeholder*="Enter"]',
      'textarea[placeholder*="Write"]'
    ];
    
    const checkAndInject = () => {
      targetSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (!element.dataset.mstprmptInjected) {
            addEnhanceButton(element);
            element.dataset.mstprmptInjected = 'true';
          }
        });
      });
    };
    
    checkAndInject();
    
    const observer = new MutationObserver(checkAndInject);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  function addEnhanceButton(inputElement) {
    const wrapper = document.createElement('div');
    wrapper.className = 'mstprmpt-wrapper';
    wrapper.style.cssText = 'position: relative; display: inline-block; width: 100%;';
    
    const button = document.createElement('button');
    button.className = 'mstprmpt-enhance-btn';
    button.innerHTML = 'enhance';
    button.title = 'enhance with mstprmpt (ctrl+shift+e)';
    button.style.cssText = `
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      width: 32px;
      height: 32px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      z-index: 10;
      transition: all 0.2s;
    `;
    
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-50%) scale(1.1)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(-50%) scale(1)';
    });
    
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const text = getInputValue(inputElement);
      if (!text) {
        showNotification('Please enter some text to enhance', 'warning');
        return;
      }
      
      await enhanceText(text, inputElement);
    });
    
    if (inputElement.parentNode) {
      inputElement.parentNode.insertBefore(wrapper, inputElement);
      wrapper.appendChild(inputElement);
      wrapper.appendChild(button);
    }
  }
  
  function getInputValue(element) {
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      return element.value;
    } else if (element.contentEditable === 'true') {
      return element.innerText || element.textContent;
    }
    return '';
  }
  
  function setInputValue(element, value) {
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (element.contentEditable === 'true') {
      element.innerText = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
  
  async function enhanceText(text, targetElement) {
    showNotification('Enhancing your prompt...', 'info');
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ENHANCE_PROMPT',
        prompt: text,
        context: getPageContext()
      });
      
      if (response.success) {
        showEnhancementOverlay(response.data, targetElement);
      } else {
        showNotification('Enhancement failed', 'error');
      }
    } catch (error) {
      console.error('Enhancement error:', error);
      showNotification('Failed to enhance prompt', 'error');
    }
  }
  
  function showEnhancementOverlay(enhancement, targetElement) {
    if (enhancementOverlay) {
      enhancementOverlay.remove();
    }
    
    enhancementOverlay = document.createElement('div');
    enhancementOverlay.className = 'mstprmpt-overlay';
    enhancementOverlay.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      padding: 20px;
      max-width: 500px;
      width: 90%;
      max-height: 70vh;
      overflow-y: auto;
      z-index: 999998;
    `;
    
    enhancementOverlay.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; color: #333; font-size: 18px;">Enhanced Prompt</h3>
        <button id="mstprmpt-close" style="
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;
          padding: 0;
          width: 30px;
          height: 30px;
        ">close</button>
      </div>
      
      <div style="
        background: #f9f9f9;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 16px;
        font-family: monospace;
        font-size: 14px;
        line-height: 1.5;
        color: #333;
      ">${enhancement.refined.replace(/\n/g, '<br>')}</div>
      
      <div style="display: flex; gap: 10px;">
        <button id="mstprmpt-use" style="
          flex: 1;
          padding: 10px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        ">Use This Prompt</button>
        
        <button id="mstprmpt-copy" style="
          flex: 1;
          padding: 10px;
          background: #f0f0f0;
          color: #333;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        ">Copy to Clipboard</button>
      </div>
      
      ${enhancement.improvements && enhancement.improvements.length > 0 ? `
        <div style="
          margin-top: 16px;
          padding: 10px;
          background: #e8f4fd;
          border-left: 3px solid #667eea;
          border-radius: 4px;
        ">
          <h4 style="margin: 0 0 8px 0; color: #667eea; font-size: 14px;">Improvements Applied:</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #555;">
            ${enhancement.improvements.map(imp => `<li>${imp}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;
    
    document.body.appendChild(enhancementOverlay);
    
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999997;
    `;
    document.body.appendChild(backdrop);
    
    document.getElementById('mstprmpt-close').addEventListener('click', () => {
      enhancementOverlay.remove();
      backdrop.remove();
    });
    
    document.getElementById('mstprmpt-use').addEventListener('click', () => {
      setInputValue(targetElement, enhancement.refined);
      enhancementOverlay.remove();
      backdrop.remove();
      showNotification('Enhanced prompt inserted!', 'success');
    });
    
    document.getElementById('mstprmpt-copy').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(enhancement.refined);
        showNotification('Copied to clipboard!', 'success');
      } catch (error) {
        showNotification('Failed to copy', 'error');
      }
    });
    
    backdrop.addEventListener('click', () => {
      enhancementOverlay.remove();
      backdrop.remove();
    });
  }
  
  function getPageContext() {
    const url = window.location.href;
    const title = document.title;
    
    let context = `Page: ${title}`;
    
    if (url.includes('chat.openai.com')) {
      context += ' | Platform: ChatGPT';
    } else if (url.includes('claude.ai')) {
      context += ' | Platform: Claude';
    } else if (url.includes('bard.google.com') || url.includes('gemini.google.com')) {
      context += ' | Platform: Google AI';
    }
    
    return context;
  }
  
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'SHOW_ENHANCED') {
        showQuickEnhancement(request.original, request.enhanced);
      } else if (request.type === 'SHOW_ERROR') {
        showNotification(request.message, 'error');
      } else if (request.type === 'SHOW_NOTIFICATION') {
        showNotification(request.message, 'success');
      } else if (request.type === 'TRIGGER_ENHANCE') {
        triggerEnhancement();
      } else if (request.type === 'INSERT_PROMPT') {
        insertPrompt(request.prompt);
      }
    });
  }
  
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        triggerEnhancement();
      }
    });
  }
  
  function triggerEnhancement() {
    const activeElement = document.activeElement;
    
    if (activeElement && (
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'INPUT' ||
      activeElement.contentEditable === 'true'
    )) {
      const text = getInputValue(activeElement);
      if (text) {
        enhanceText(text, activeElement);
      } else {
        showNotification('Please enter some text to enhance', 'warning');
      }
    } else {
      const selection = window.getSelection().toString();
      if (selection) {
        enhanceText(selection, null);
      } else {
        showNotification('No text selected or focused', 'warning');
      }
    }
  }
  
  function insertPrompt(prompt) {
    const activeElement = document.activeElement;
    
    if (activeElement && (
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'INPUT' ||
      activeElement.contentEditable === 'true'
    )) {
      setInputValue(activeElement, prompt);
      showNotification('Prompt inserted!', 'success');
    } else {
      const inputs = document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
      if (inputs.length > 0) {
        setInputValue(inputs[0], prompt);
        inputs[0].focus();
        showNotification('Prompt inserted!', 'success');
      }
    }
  }
  
  function showQuickEnhancement(original, enhanced) {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      padding: 16px;
      max-width: 400px;
      z-index: 999999;
    `;
    
    container.innerHTML = `
      <h4 style="margin: 0 0 12px 0; color: #667eea; font-size: 16px;">Enhanced Prompt</h4>
      <div style="
        background: #f9f9f9;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        padding: 10px;
        margin-bottom: 12px;
        font-size: 14px;
        max-height: 200px;
        overflow-y: auto;
      ">${enhanced.replace(/\n/g, '<br>')}</div>
      <button id="mstprmpt-quick-copy" style="
        width: 100%;
        padding: 8px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      ">Copy Enhanced Prompt</button>
    `;
    
    document.body.appendChild(container);
    
    document.getElementById('mstprmpt-quick-copy').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(enhanced);
        showNotification('Copied to clipboard!', 'success');
        container.remove();
      } catch (error) {
        showNotification('Failed to copy', 'error');
      }
    });
    
    setTimeout(() => {
      container.remove();
    }, 10000);
  }
  
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196f3'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      margin-bottom: 10px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      pointer-events: auto;
      animation: slideIn 0.3s ease;
      max-width: 300px;
    `;
    
    notification.textContent = message;
    notificationContainer.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
    
    .mstprmpt-enhance-btn:hover {
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
    }
  `;
  document.head.appendChild(style);
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();