import type { SelectorConfig } from '@/shared/types';
import { BaseAdapter } from './base-adapter';

export class GeminiAdapter extends BaseAdapter {
  name = 'gemini';
  hostPatterns = [/gemini\.google\.com/];

  protected getSelectorConfig(): SelectorConfig {
    return {
      primary: [
        'rich-textarea .ql-editor',
        'div[aria-label*="prompt"]',
        '.text-input-field-wrapper textarea',
      ],
      secondary: [
        'div[contenteditable="true"][role="textbox"]',
        'div[data-placeholder*="Enter"]',
        'mat-form-field textarea',
      ],
      fallback: [
        '[role="textbox"]',
        '.ql-editor',
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

      if (element.classList.contains('ql-editor')) {
        // Quill editor
        element.innerHTML = '';
        const p = document.createElement('p');
        p.textContent = value;
        element.appendChild(p);
        this.triggerInputEvent(element);
      } else if (element instanceof HTMLTextAreaElement) {
        element.value = value;
        this.triggerInputEvent(element);
      } else if (element.getAttribute('contenteditable') === 'true') {
        element.textContent = value;
        this.triggerInputEvent(element);
      }

      return true;
    } catch (error) {
      console.error('[mstprmpt] Gemini setInputContent failed:', error);
      return false;
    }
  }
}
