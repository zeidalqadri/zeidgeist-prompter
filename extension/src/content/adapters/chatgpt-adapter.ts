import type { SelectorConfig } from '@/shared/types';
import { BaseAdapter } from './base-adapter';

export class ChatGPTAdapter extends BaseAdapter {
  name = 'chatgpt';
  hostPatterns = [/chat\.openai\.com/, /chatgpt\.com/];

  protected getSelectorConfig(): SelectorConfig {
    return {
      primary: [
        '#prompt-textarea',
        'textarea[data-id="root"]',
        'div[data-placeholder="Message ChatGPT"]',
      ],
      secondary: [
        'form textarea',
        'form div[contenteditable="true"]',
        'main div[contenteditable="true"]',
      ],
      fallback: [
        'div[contenteditable="true"].ProseMirror',
        'div[contenteditable="true"][data-gramm]',
        '[contenteditable="true"]',
      ],
    };
  }

  getButtonAnchorPoint(): Element | null {
    // Try to find the form or input container
    const input = this.findInputElement();
    if (!input) return null;

    // Look for the send button container or form
    const form = input.closest('form');
    if (form) {
      const buttonContainer = form.querySelector('button[data-testid="send-button"]')?.parentElement;
      if (buttonContainer) return buttonContainer;
    }

    return input.parentElement;
  }

  getButtonPosition(): 'before' | 'after' | 'inside' {
    return 'before';
  }

  async setInputContent(value: string): Promise<boolean> {
    const element = this.findInputElement();
    if (!element) return false;

    try {
      (element as HTMLElement).focus();
      await this.delay(50);

      // ChatGPT uses a contenteditable div or textarea
      if (element instanceof HTMLTextAreaElement) {
        element.value = value;
        this.triggerInputEvent(element);
      } else if (element.getAttribute('contenteditable') === 'true') {
        // For contenteditable, we need to properly set the content
        element.innerHTML = '';

        // Create a single paragraph with the text
        const p = document.createElement('p');
        p.textContent = value;
        element.appendChild(p);

        // Trigger events
        this.triggerInputEvent(element);

        // Also try dispatching a beforeinput event
        const beforeInputEvent = new InputEvent('beforeinput', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: value,
        });
        element.dispatchEvent(beforeInputEvent);
      }

      return true;
    } catch (error) {
      console.error('[mstprmpt] ChatGPT setInputContent failed:', error);
      return false;
    }
  }
}
