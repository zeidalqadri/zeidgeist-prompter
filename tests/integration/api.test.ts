import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { testDbUtils, createMockUser, createMockAuthTokens } from '../utils/test-utils'

// Mock Cloudflare Workers environment
const mockCloudflareEnv = {
  DATABASE_URL: 'postgres://test:test@localhost:5432/test_db',
  JWT_SECRET: 'test-jwt-secret',
  ANTHROPIC_API_KEY: 'test-anthropic-key'
}

describe('API Integration Tests', () => {
  beforeEach(async () => {
    await testDbUtils.cleanupTables()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await testDbUtils.cleanupTables()
  })

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/register', () => {
      it('should register new user successfully', async () => {
        const userData = {
          email: 'newuser@example.com',
          password: 'TestPassword123!SecureEnough',
          username: 'newuser'
        }

        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        })

        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.success).toBe(true)
        expect(data.user.email).toBe(userData.email)
        expect(data.user.emailVerified).toBe(false)
        expect(data.message).toContain('verification')
      })

      it('should reject duplicate email registration', async () => {
        const userData = {
          email: 'existing@example.com',
          password: 'TestPassword123!',
          username: 'existing'
        }

        // First registration should succeed
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        })

        // Second registration should fail
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        })

        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('already exists')
      })

      it('should validate required fields', async () => {
        const incompleteData = {
          email: 'test@example.com'
          // Missing password and username
        }

        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(incompleteData)
        })

        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBeDefined()
      })

      it('should include security headers', async () => {
        const userData = {
          email: 'test@example.com',
          password: 'TestPassword123!',
          username: 'testuser'
        }

        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        })

        expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
        expect(response.headers.get('X-Frame-Options')).toBe('DENY')
        expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
        expect(response.headers.get('Strict-Transport-Security')).toBeDefined()
        expect(response.headers.get('Cache-Control')).toContain('no-store')
      })
    })

    describe('POST /api/auth/login', () => {
      let testUser: any

      beforeEach(async () => {
        // Create a test user for login tests
        testUser = await testDbUtils.createTestUser({
          email: 'logintest@example.com',
          password: 'TestPassword123!',
          username: 'logintest',
          emailVerified: true
        })
      })

      it('should login with valid credentials', async () => {
        const loginData = {
          email: testUser.email,
          password: 'TestPassword123!'
        }

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData)
        })

        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.user.email).toBe(testUser.email)
        expect(data.tokens.accessToken).toBeDefined()
        expect(data.tokens.refreshToken).toBeDefined()
        expect(data.tokens.idToken).toBeDefined()
      })

      it('should reject invalid credentials', async () => {
        const loginData = {
          email: testUser.email,
          password: 'WrongPassword123!'
        }

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData)
        })

        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Invalid credentials')
      })

      it('should set secure refresh token cookie', async () => {
        const loginData = {
          email: testUser.email,
          password: 'TestPassword123!'
        }

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData)
        })

        const setCookie = response.headers.get('Set-Cookie')
        expect(setCookie).toContain('refresh_token=')
        expect(setCookie).toContain('HttpOnly')
        expect(setCookie).toContain('Secure')
        expect(setCookie).toContain('SameSite=Strict')
      })

      it('should enforce account lockout after failed attempts', async () => {
        const loginData = {
          email: testUser.email,
          password: 'WrongPassword'
        }

        // Make multiple failed attempts
        for (let i = 0; i < 3; i++) {
          await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData)
          })
        }

        // Next attempt should be locked
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testUser.email,
            password: 'TestPassword123!' // Even correct password should be locked
          })
        })

        const data = await response.json()
        expect(data.success).toBe(false)
        expect(data.error).toContain('locked')
      })
    })

    describe('GET /api/auth/mfa/setup', () => {
      let accessToken: string

      beforeEach(async () => {
        const testUser = await testDbUtils.createTestUser({
          email: 'mfatest@example.com',
          emailVerified: true
        })

        const tokens = createMockAuthTokens()
        accessToken = tokens.accessToken
      })

      it('should setup MFA for authenticated user', async () => {
        const response = await fetch('/api/auth/mfa/setup', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })

        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.mfa.secret).toBeDefined()
        expect(data.mfa.qrCode).toBeDefined()
        expect(data.mfa.backupCodes).toHaveLength(8)
        expect(data.instructions).toBeDefined()
      })

      it('should reject unauthenticated requests', async () => {
        const response = await fetch('/api/auth/mfa/setup', {
          method: 'GET'
          // No Authorization header
        })

        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Authorization required')
      })

      it('should reject invalid tokens', async () => {
        const response = await fetch('/api/auth/mfa/setup', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer invalid-token'
          }
        })

        expect(response.status).toBe(401)
      })
    })
  })

  describe('Engineer Endpoints', () => {
    let accessToken: string

    beforeEach(async () => {
      const testUser = await testDbUtils.createTestUser({
        email: 'engineertest@example.com',
        emailVerified: true
      })

      const tokens = createMockAuthTokens()
      accessToken = tokens.accessToken
    })

    describe('GET /api/engineer/history-dual-mode', () => {
      it('should return user history with proper isolation', async () => {
        const response = await fetch('/api/engineer/history-dual-mode', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'cf-connecting-ip': '192.168.1.100'
          }
        })

        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.items).toBeDefined()
        expect(Array.isArray(data.items)).toBe(true)
        expect(data.total).toBeDefined()
        expect(data.page).toBeDefined()
        expect(data.limit).toBeDefined()
      })

      it('should support pagination', async () => {
        const response = await fetch('/api/engineer/history-dual-mode?page=1&limit=5', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'cf-connecting-ip': '192.168.1.100'
          }
        })

        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.page).toBe(1)
        expect(data.limit).toBe(5)
        expect(data.items.length).toBeLessThanOrEqual(5)
      })

      it('should isolate data by IP address', async () => {
        const ip1 = '192.168.1.100'
        const ip2 = '192.168.1.101'

        // Create history for IP1
        await fetch('/api/engineer/history-dual-mode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'cf-connecting-ip': ip1
          },
          body: JSON.stringify({
            original: 'IP1 original prompt',
            refined: 'IP1 refined prompt',
            timestamp: new Date().toISOString()
          })
        })

        // Get history for IP1
        const response1 = await fetch('/api/engineer/history-dual-mode', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'cf-connecting-ip': ip1
          }
        })

        // Get history for IP2
        const response2 = await fetch('/api/engineer/history-dual-mode', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'cf-connecting-ip': ip2
          }
        })

        const data1 = await response1.json()
        const data2 = await response2.json()

        expect(response1.status).toBe(200)
        expect(response2.status).toBe(200)

        // IP1 should have the created history item
        const ip1Prompts = data1.items.map((item: any) => item.original)
        expect(ip1Prompts).toContain('IP1 original prompt')

        // IP2 should not have IP1's history
        const ip2Prompts = data2.items.map((item: any) => item.original)
        expect(ip2Prompts).not.toContain('IP1 original prompt')
      })

      it('should include security headers', async () => {
        const response = await fetch('/api/engineer/history-dual-mode', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'cf-connecting-ip': '192.168.1.100'
          }
        })

        expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
        expect(response.headers.get('X-Frame-Options')).toBe('DENY')
        expect(response.headers.get('Cache-Control')).toContain('no-store')
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://mstprmpt.zeidgeist.com')
      })
    })

    describe('POST /api/engineer/history-dual-mode', () => {
      it('should save prompt history', async () => {
        const historyData = {
          original: 'Test original prompt',
          refined: 'Test refined prompt',
          timestamp: new Date().toISOString()
        }

        const response = await fetch('/api/engineer/history-dual-mode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'cf-connecting-ip': '192.168.1.100'
          },
          body: JSON.stringify(historyData)
        })

        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.item.original).toBe(historyData.original)
        expect(data.item.refined).toBe(historyData.refined)
      })

      it('should validate required fields', async () => {
        const incompleteData = {
          original: 'Test prompt'
          // Missing refined field
        }

        const response = await fetch('/api/engineer/history-dual-mode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'cf-connecting-ip': '192.168.1.100'
          },
          body: JSON.stringify(incompleteData)
        })

        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Missing required fields')
      })

      it('should sanitize input data', async () => {
        const maliciousData = {
          original: '<script>alert("xss")</script>Original prompt',
          refined: '<img src=x onerror=alert("xss")>Refined prompt',
          timestamp: new Date().toISOString()
        }

        const response = await fetch('/api/engineer/history-dual-mode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'cf-connecting-ip': '192.168.1.100'
          },
          body: JSON.stringify(maliciousData)
        })

        expect(response.status).toBeLessThan(500) // Should handle gracefully
      })
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits per IP', async () => {
      const testIP = '10.0.0.1'
      const requests = []

      // Make multiple rapid requests
      for (let i = 0; i < 25; i++) {
        requests.push(
          fetch('/api/engineer/history-dual-mode', {
            headers: {
              'cf-connecting-ip': testIP
            }
          })
        )
      }

      const responses = await Promise.all(requests)
      const statuses = responses.map(r => r.status)

      // Some requests should be rate limited (429)
      expect(statuses.filter(s => s === 429).length).toBeGreaterThan(0)
    })

    it('should isolate rate limits by IP', async () => {
      const ip1 = '10.0.0.1'
      const ip2 = '10.0.0.2'

      // Exhaust rate limit for IP1
      const ip1Requests = Array.from({ length: 25 }, () =>
        fetch('/api/engineer/history-dual-mode', {
          headers: { 'cf-connecting-ip': ip1 }
        })
      )
      await Promise.all(ip1Requests)

      // IP2 should still work
      const ip2Response = await fetch('/api/engineer/history-dual-mode', {
        headers: { 'cf-connecting-ip': ip2 }
      })

      expect(ip2Response.status).toBe(200)
    })
  })

  describe('CORS Handling', () => {
    it('should handle preflight requests', async () => {
      const response = await fetch('/api/auth/login', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://mstprmpt.zeidgeist.com',
          'Access-Control-Request-Method': 'POST'
        }
      })

      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://mstprmpt.zeidgeist.com')
    })

    it('should reject unauthorized origins', async () => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Origin': 'https://evil-site.com',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password'
        })
      })

      const allowedOrigin = response.headers.get('Access-Control-Allow-Origin')
      expect(allowedOrigin).toBe('https://mstprmpt.zeidgeist.com')
      expect(allowedOrigin).not.toBe('https://evil-site.com')
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"email": "test@example.com", "password": "incomplete'
      })

      expect(response.status).toBe(400)
    })

    it('should not expose sensitive error information', async () => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
      })

      const data = await response.json()

      expect(data.error).not.toContain('DATABASE_URL')
      expect(data.error).not.toContain('password')
      expect(data.error).not.toContain('stack')
      expect(data.error).not.toContain('node_modules')
    })
  })
})