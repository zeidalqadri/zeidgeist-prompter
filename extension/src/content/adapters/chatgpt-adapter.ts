import type { SelectorConfig } from '@/shared/types';
import { BaseAdapter } from './base-adapter';

export class ChatGPTAdapter extends BaseAdapter {
  name = 'chatgpt';
  hostPatterns = [/chat\.openai\.com/, /chatgpt\.com/];

  protected getSelectorConfig(): SelectorConfig {
    return {
      primary: [
        'div[contenteditable="true"].ProseMirror',
        '#prompt-textarea',
        'div[contenteditable="true"][data-placeholder]',
      ],
      secondary: [
        'form textarea',
        'form div[contenteditable="true"]',
        'main div[contenteditable="true"]',
      ],
      fallback: [
        'textarea[data-id="root"]',
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

      if (element instanceof HTMLTextAreaElement) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value'
        )?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(element, value);
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        this.triggerInputEvent(element, { skipInput: true });
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
