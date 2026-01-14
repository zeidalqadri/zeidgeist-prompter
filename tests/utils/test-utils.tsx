import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { vi } from 'vitest'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../mocks/handlers'

// Mock Next.js router
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  pathname: '/',
  route: '/',
  asPath: '/',
  query: {},
  isReady: true,
}

vi.mock('next/router', () => ({
  useRouter: () => mockRouter,
}))

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-testid="test-wrapper">
      {children}
    </div>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Helper functions for testing
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser',
  emailVerified: true,
  mfaEnabled: false,
  ...overrides
})

export const createMockPromptHistory = (count = 5, ipContext = '1.1.1.1') =>
  Array.from({ length: count }, (_, i) => ({
    id: `history-${i}`,
    original: `Original prompt ${i}`,
    refined: `Refined prompt ${i}`,
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    userContext: ipContext,
    feedback: Math.random() > 0.5 ? {
      rating: Math.floor(Math.random() * 5) + 1,
      comment: `Feedback for prompt ${i}`
    } : undefined
  }))

export const createMockAuthTokens = (userId = 'test-user-id', email = 'test@example.com') => {
  const now = Math.floor(Date.now() / 1000)

  const accessToken = jwt.sign(
    {
      userId,
      email,
      iat: now,
      exp: now + 3600 // 1 hour
    },
    JWT_SECRET
  )

  const refreshToken = jwt.sign(
    {
      userId,
      type: 'refresh',
      iat: now,
      exp: now + 86400 * 7 // 7 days
    },
    JWT_SECRET
  )

  const idToken = jwt.sign(
    {
      userId,
      email,
      type: 'id',
      iat: now,
      exp: now + 3600
    },
    JWT_SECRET
  )

  return { accessToken, refreshToken, idToken }
}

// Mock fetch helper
export const mockFetch = (mockResponse: any, status = 200) => {
  return vi.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve(mockResponse),
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
      status,
      ok: status < 400,
      headers: new Headers({
        'content-type': 'application/json'
      })
    })
  ) as any
}

// Wait for async operations in components
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Test database utilities (for integration tests)
export const testDbUtils = {
  async cleanupTables() {
    // Mock cleanup - in real tests, this would clean test database
    return Promise.resolve()
  },
  
  async seedTestData() {
    // Mock seeding - in real tests, this would seed test database
    return Promise.resolve()
  },
  
  async createTestUser(userData: any = {}) {
    return createMockUser(userData)
  }
}

// Mock environment helper
export const withMockEnv = (envVars: Record<string, string>, fn: () => void | Promise<void>) => {
  const originalEnv = { ...process.env }
  
  Object.assign(process.env, envVars)
  
  const cleanup = () => {
    process.env = originalEnv
  }
  
  try {
    const result = fn()
    if (result instanceof Promise) {
      return result.finally(cleanup)
    }
    cleanup()
    return result
  } catch (error) {
    cleanup()
    throw error
  }
}

// Security test helpers
export const securityTestHelpers = {
  createXSSPayload: () => '<script>alert("xss")</script>',
  createSQLInjectionPayload: () => "'; DROP TABLE users; --",
  createCSRFToken: () => 'mock-csrf-token',
  createMaliciousEmail: () => '<img src=x onerror=alert("xss")>@example.com',
  createWeakPasswords: () => [
    'password',
    '123456',
    'short',
    'aaaaaaa',
    'qwerty'
  ]
}