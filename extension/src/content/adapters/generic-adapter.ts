import type { SelectorConfig } from '@/shared/types';
import { BaseAdapter } from './base-adapter';

export class GenericAdapter extends BaseAdapter {
  name = 'generic';
  hostPatterns: RegExp[] = [];

  protected getSelectorConfig(): SelectorConfig {
    return {
      primary: [
        'textarea[placeholder*="message"]',
        'textarea[placeholder*="prompt"]',
        'textarea[placeholder*="ask"]',
      ],
      secondary: [
        'div[contenteditable="true"][role="textbox"]',
        'textarea:not([readonly])',
        '[contenteditable="true"]',
      ],
      fallback: [
        'textarea',
        'input[type="text"]',
      ],
    };
  }

  findInputElement(): Element | null {
    // First try standard selectors
    const element = super.findInputElement();
    if (element) return element;

    // Use heuristics to find likely input elements
    return this.heuristicDetection();
  }

  private heuristicDetection(): Element | null {
    const candidates: Array<{ element: Element; score: number }> = [];

    // Find all editable elements
    const editables = document.querySelectorAll(
      'textarea, input[type="text"], [contenteditable="true"]'
    );

    for (const element of editables) {
      if (!this.isEditableElement(element)) continue;

      let score = 0;

      // Score based on visibility
      if (this.isVisible(element)) score += 20;

      // Score based on size
      const rect = element.getBoundingClientRect();
      score += Math.min(rect.width / 10, 50);
      score += Math.min(rect.height / 5, 30);

      // Score based on position (bottom of viewport often has chat input)
      if (rect.top > window.innerHeight * 0.5) score += 15;

      // Score based on placeholder text
      const placeholder = element.getAttribute('placeholder') || '';
      if (/message|prompt|ask|chat|send/i.test(placeholder)) score += 30;

      // Score based on aria labels
      const ariaLabel = element.getAttribute('aria-label') || '';
      if (/message|prompt|input|chat/i.test(ariaLabel)) score += 25;

      // Score based on parent context
      const form = element.closest('form');
      if (form) score += 10;

      candidates.push({ element, score });
    }

    // Return the highest-scoring element
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.score > 50 ? candidates[0].element : null;
  }

  private isVisible(element: Element): boolean {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  getButtonAnchorPoint(): Element | null {
    const input = this.findInputElement();
    if (!input) return null;

    // Try to find a nearby form or container
    const form = input.closest('form');
    if (form) return form;

    return input.parentElement;
  }

  getButtonPosition(): 'before' | 'after' | 'inside' {
    return 'after';
  }
}
