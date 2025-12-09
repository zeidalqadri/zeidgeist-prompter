import type { SelectorConfig } from '@/shared/types';
import { BaseAdapter } from './base-adapter';

export class PerplexityAdapter extends BaseAdapter {
  name = 'perplexity';
  hostPatterns = [/perplexity\.ai/];

  protected getSelectorConfig(): SelectorConfig {
    return {
      primary: [
        'textarea[placeholder*="Ask"]',
        'div[data-testid="search-input"] textarea',
        'main textarea',
      ],
      secondary: [
        'form textarea',
        'textarea[rows]',
        'div[contenteditable="true"]',
      ],
      fallback: [
        'textarea:not([readonly])',
        '[contenteditable="true"]',
      ],
    };
  }

  getButtonAnchorPoint(): Element | null {
    const input = this.findInputElement();
    if (!input) return null;

    // Look for the form or search container
    const searchContainer = input.closest('[data-testid="search-input"]');
    if (searchContainer) {
      return searchContainer;
    }

    const form = input.closest('form');
    if (form) {
      return form;
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
        element.value = value;
        this.triggerInputEvent(element);

        // Perplexity uses React
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value'
        )?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(element, value);
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (element.getAttribute('contenteditable') === 'true') {
        element.textContent = value;
        this.triggerInputEvent(element);
      }

      return true;
    } catch (error) {
      console.error('[mstprmpt] Perplexity setInputContent failed:', error);
      return false;
    }
  }
}
