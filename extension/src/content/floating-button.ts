type ButtonPosition = 'before' | 'after' | 'inside';

export function createFloatingButton(
  anchor: Element,
  position: ButtonPosition,
  alwaysVisible: boolean,
  onClick: () => void
): HTMLElement {
  // Remove existing button if any
  removeFloatingButton();

  // Create container
  const container = document.createElement('div');
  container.className = 'mstprmpt-btn-container';
  container.style.cssText = `
    position: relative;
    display: inline-flex;
    align-items: center;
    z-index: 10000;
  `;

  // Create button
  const button = document.createElement('button');
  button.className = 'mstprmpt-floating-btn';
  button.setAttribute('aria-label', 'Refactor prompt with mstprmpt');
  button.setAttribute('title', 'Refactor with mstprmpt');

  // Add icon and label
  button.innerHTML = `
    <svg class="mstprmpt-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>
    <span class="mstprmpt-label">Refactor</span>
  `;

  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });

  container.appendChild(button);

  // Position the button
  const parent = anchor.parentElement;
  if (!parent) return container;

  // Ensure parent has relative positioning
  if (window.getComputedStyle(parent).position === 'static') {
    parent.style.position = 'relative';
  }

  switch (position) {
    case 'before':
      anchor.insertAdjacentElement('beforebegin', container);
      break;
    case 'after':
      anchor.insertAdjacentElement('afterend', container);
      break;
    case 'inside':
      anchor.appendChild(container);
      break;
  }

  // Handle visibility based on focus
  if (!alwaysVisible) {
    container.classList.add('mstprmpt-hidden');

    // Show on input focus
    const inputElement = anchor.querySelector('textarea, input, [contenteditable="true"]') || anchor;

    inputElement.addEventListener('focus', () => {
      container.classList.remove('mstprmpt-hidden');
    });

    inputElement.addEventListener('blur', () => {
      // Delay to allow button click to register
      setTimeout(() => {
        if (!container.matches(':hover')) {
          container.classList.add('mstprmpt-hidden');
        }
      }, 200);
    });

    // Keep visible while hovering
    container.addEventListener('mouseenter', () => {
      container.classList.remove('mstprmpt-hidden');
    });

    container.addEventListener('mouseleave', () => {
      if (document.activeElement !== inputElement) {
        container.classList.add('mstprmpt-hidden');
      }
    });
  }

  return container;
}

export function removeFloatingButton(): void {
  const existing = document.querySelector('.mstprmpt-btn-container');
  if (existing) {
    existing.remove();
  }
}

export function injectText(_text: string): boolean {
  // This is handled by the platform adapters
  return false;
}
