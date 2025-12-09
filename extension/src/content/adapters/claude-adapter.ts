import type { SelectorConfig } from '@/shared/types';
import { BaseAdapter } from './base-adapter';

export class ClaudeAdapter extends BaseAdapter {
  name = 'claude';
  hostPatterns = [/claude\.ai/];

  protected getSelectorConfig(): SelectorConfig {
    return {
      primary: [
        'div[data-testid="composer-inner"] textarea',
        'div.composer textarea',
        'fieldset textarea[placeholder]',
        'div.ProseMirror[contenteditable="true"]',
      ],
      secondary: [
        'main textarea',
        'div[role="textbox"]',
        'textarea[data-placeholder]',
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

    // Look for the fieldset or form container
    const fieldset = input.closest('fieldset');
    if (fieldset) {
      return fieldset;
    }

    // Try to find the send button area
    const form = input.closest('form');
    if (form) {
      const buttonArea = form.querySelector('button[type="submit"]')?.parentElement;
      if (buttonArea) return buttonArea;
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

        // Claude uses React, so also dispatch a native input event
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value'
        )?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(element, value);
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (element.getAttribute('contenteditable') === 'true') {
        // For ProseMirror
        element.innerHTML = '';
        const p = document.createElement('p');
        p.textContent = value;
        element.appendChild(p);
        this.triggerInputEvent(element);
      }

      return true;
    } catch (error) {
      console.error('[mstprmpt] Claude setInputContent failed:', error);
      return false;
    }
  }
}
