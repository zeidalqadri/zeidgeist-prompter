import type { PlatformAdapter, SelectorConfig } from '@/shared/types';

export abstract class BaseAdapter implements PlatformAdapter {
  abstract name: string;
  abstract hostPatterns: RegExp[];

  protected abstract getSelectorConfig(): SelectorConfig;

  findInputElement(): Element | null {
    const config = this.getSelectorConfig();

    // Try primary selectors first
    for (const selector of config.primary) {
      const element = this.safeQuerySelector(selector);
      if (element && this.isEditableElement(element)) {
        return element;
      }
    }

    // Try secondary selectors
    for (const selector of config.secondary) {
      const element = this.safeQuerySelector(selector);
      if (element && this.isEditableElement(element)) {
        return element;
      }
    }

    // Try fallback selectors
    for (const selector of config.fallback) {
      const element = this.safeQuerySelector(selector);
      if (element && this.isEditableElement(element)) {
        return element;
      }
    }

    return null;
  }

  getInputContent(): string {
    const element = this.findInputElement();
    if (!element) return '';

    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      return element.value;
    }

    if (element.getAttribute('contenteditable') === 'true') {
      // Handle ProseMirror and other rich text editors
      const paragraphs = element.querySelectorAll('p');
      if (paragraphs.length > 0) {
        return Array.from(paragraphs)
          .map(p => p.textContent || '')
          .join('\n');
      }
      return element.textContent || (element as HTMLElement).innerText || '';
    }

    return '';
  }

  async setInputContent(value: string): Promise<boolean> {
    const element = this.findInputElement();
    if (!element) return false;

    try {
      // Focus the element first
      (element as HTMLElement).focus();
      await this.delay(50);

      if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
        const proto = element instanceof HTMLTextAreaElement
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (nativeSetter) {
          nativeSetter.call(element, value);
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        this.triggerInputEvent(element, { skipInput: true });
      } else if (element.getAttribute('contenteditable') === 'true') {
        // Clear and set content
        element.innerHTML = '';

        // For ProseMirror editors, create paragraph elements
        const lines = value.split('\n');
        lines.forEach(line => {
          const p = document.createElement('p');
          p.textContent = line || '\u200B'; // Zero-width space for empty lines
          element.appendChild(p);
        });

        this.triggerInputEvent(element);
      }

      return true;
    } catch (error) {
      console.error('[mstprmpt] Failed to set input content:', error);
      return false;
    }
  }

  abstract getButtonAnchorPoint(): Element | null;

  getButtonPosition(): 'before' | 'after' | 'inside' {
    return 'after';
  }

  protected safeQuerySelector(selector: string): Element | null {
    try {
      return document.querySelector(selector);
    } catch (e) {
      console.warn(`[mstprmpt] Invalid selector: ${selector}`);
      return null;
    }
  }

  protected isEditableElement(element: Element): boolean {
    if (element instanceof HTMLTextAreaElement) return !element.readOnly && !element.disabled;
    if (element instanceof HTMLInputElement) return !element.readOnly && !element.disabled;
    if (element.getAttribute('contenteditable') === 'true') return true;
    return false;
  }

  protected triggerInputEvent(element: Element, { skipInput = false } = {}): void {
    if (!skipInput) {
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
      });
      element.dispatchEvent(inputEvent);
    }

    const changeEvent = new Event('change', { bubbles: true });
    element.dispatchEvent(changeEvent);

    const keyupEvent = new KeyboardEvent('keyup', {
      bubbles: true,
      key: 'a',
    });
    element.dispatchEvent(keyupEvent);
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
