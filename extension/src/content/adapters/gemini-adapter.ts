import type { SelectorConfig } from '@/shared/types';
import { BaseAdapter } from './base-adapter';

export class GeminiAdapter extends BaseAdapter {
  name = 'gemini';
  hostPatterns = [/gemini\.google\.com/];

  protected getSelectorConfig(): SelectorConfig {
    return {
      primary: [
        'rich-textarea div[contenteditable="true"]',
        'div[contenteditable="true"][aria-label*="prompt"]',
        'div[contenteditable="true"][role="textbox"]',
      ],
      secondary: [
        '.text-input-field-wrapper textarea',
        'div[data-placeholder*="Enter"]',
        'mat-form-field textarea',
      ],
      fallback: [
        'rich-textarea .ql-editor',
        '[role="textbox"]',
        '[contenteditable="true"]',
      ],
    };
  }

  getButtonAnchorPoint(): Element | null {
    const input = this.findInputElement();
    if (!input) return null;

    // Look for the rich-textarea container
    const richTextarea = input.closest('rich-textarea');
    if (richTextarea) {
      return richTextarea;
    }

    // Look for form or input wrapper
    const wrapper = input.closest('.text-input-field-wrapper');
    if (wrapper) {
      return wrapper;
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

      if (element.getAttribute('contenteditable') === 'true') {
        element.innerHTML = '';
        const p = document.createElement('p');
        p.textContent = value;
        element.appendChild(p);
        this.triggerInputEvent(element);
      } else if (element instanceof HTMLTextAreaElement) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value'
        )?.set;
        if (nativeSetter) {
          nativeSetter.call(element, value);
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        this.triggerInputEvent(element, { skipInput: true });
      }

      return true;
    } catch (error) {
      console.error('[mstprmpt] Gemini setInputContent failed:', error);
      return false;
    }
  }
}
