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
      const proto = activeElement instanceof HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(activeElement, text);
      }

      activeElement.dispatchEvent(new Event('input', { bubbles: true }));

      const changeEvent = new Event('change', { bubbles: true });
      activeElement.dispatchEvent(changeEvent);

      return true;
    }

    if (activeElement.getAttribute('contenteditable') === 'true') {
      activeElement.innerHTML = '';
      const lines = text.split('\n');
      for (const line of lines) {
        const p = document.createElement('p');
        p.textContent = line || '​';
        activeElement.appendChild(p);
      }

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
