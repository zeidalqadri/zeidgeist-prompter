// This file sets up global mocks BEFORE any other imports
// It must be listed first in vitest.config.ts setupFiles

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString() },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] || null
  }
})()

// Set on globalThis for MSW CookieStore compatibility
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true
})

Object.defineProperty(globalThis, 'sessionStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true
})

// Also set on window if it exists (jsdom)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true
  })
  Object.defineProperty(window, 'sessionStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true
  })
}

// Ensure AbortController and AbortSignal work correctly
// Polyfill AbortSignal.timeout if not available (Node <16.14)
if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout !== 'function') {
  (AbortSignal as any).timeout = function(ms: number): AbortSignal {
    const controller = new AbortController()
    setTimeout(() => controller.abort(new DOMException('TimeoutError', 'TimeoutError')), ms)
    return controller.signal
  }
}

export {}
