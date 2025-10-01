import { expect, afterEach, beforeAll, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import { server } from './mocks/server'

// Mock environment variables for tests
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://test:test@localhost:5432/test_db',
  JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
  NEXTAUTH_SECRET: 'test-nextauth-secret',
  API_URL: 'http://localhost:8788',
  NEXT_PUBLIC_API_URL: 'http://localhost:8788'
})

// Extend Vitest's expect with jest-dom matchers
expect.extend({})

// Mock fetch globally for tests
global.fetch = global.fetch || (() => Promise.resolve({
  json: () => Promise.resolve({}),
  text: () => Promise.resolve(''),
  status: 200,
  ok: true,
  headers: new Headers(),
} as Response))

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: ''
  },
  writable: true
})

// Mock crypto for testing
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => `test-${Math.random().toString(36).substr(2, 9)}`,
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    }
  }
})

// MSW server setup
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()

  // Clear test data stores
  if (typeof global !== 'undefined') {
    const g = global as any
    if (g.__registeredEmails) g.__registeredEmails.length = 0
    if (g.__loginAttempts) g.__loginAttempts = {}
    if (g.__historyStore) g.__historyStore = {}
    if (g.__rateLimits) g.__rateLimits = {}
  }
})

afterAll(() => {
  server.close()
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root = null
  rootMargin = '0px'
  thresholds = [0]
  
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
} as any