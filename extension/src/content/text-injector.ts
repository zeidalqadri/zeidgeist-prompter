/**
 * Inject text into the active input element
 * This is a fallback used by the context menu when platform adapters aren't available
 */
export function injectText(text: string): boolean {
  const activeElement = document.activeElement;

  if (!activeElement) {
    return false;
  }

  try {
    if (activeElement instanceof HTMLTextAreaElement || activeElement instanceof HTMLInputElement) {
      // For standard inputs, set the value directly
      activeElement.value = text;

      // Trigger events for React/Vue reactivity
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
      });
      activeElement.dispatchEvent(inputEvent);

      const changeEvent = new Event('change', { bubbles: true });
      activeElement.dispatchEvent(changeEvent);

      return true;
    }

    if (activeElement.getAttribute('contenteditable') === 'true') {
      // For contenteditable elements
      activeElement.textContent = text;

      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
      });
      activeElement.dispatchEvent(inputEvent);

      return true;
    }

    // Try using execCommand as fallback
    document.execCommand('selectAll', false);
    return document.execCommand('insertText', false, text);
  } catch (error) {
    console.error('[mstprmpt] Text injection failed:', error);
    return false;
  }
}

/**
 * Get text from the active input element
 */
export function getInputText(): string {
  const activeElement = document.activeElement;

  if (!activeElement) {
    return '';
  }

  if (activeElement instanceof HTMLTextAreaElement || activeElement instanceof HTMLInputElement) {
    return activeElement.value;
  }

  if (activeElement.getAttribute('contenteditable') === 'true') {
    return activeElement.textContent || (activeElement as HTMLElement).innerText || '';
  }

  return '';
}
