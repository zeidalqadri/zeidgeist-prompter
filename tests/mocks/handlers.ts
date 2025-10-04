import { http, HttpResponse } from 'msw'

// In-memory user store for tests
const users = new Map<string, { email: string; password: string; username: string; id: string; loginAttempts: number; lockedUntil?: number }>()
const requestCounts = new Map<string, { count: number; resetAt: number }>()

// Helper to get security headers
function getSecurityHeaders(origin?: string): Record<string, string> {
  const allowOrigin = resolveAllowedOrigin(origin)
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'",
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  }
}

function resolveAllowedOrigin(origin?: string): string {
  if (!origin) return 'https://mstprmpt.zeidgeist.com'

  const allowedOrigins = [
    'https://mstprmpt.zeidgeist.com',
    'https://preview.mstprmpt.zeidgeist.com',
    'http://localhost:3333',
    'http://localhost:8788',
  ]

  if (allowedOrigins.includes(origin)) return origin
  if (origin.endsWith('.pages.dev')) return origin

  return 'https://mstprmpt.zeidgeist.com'
}

// Rate limiting helper
function checkRateLimit(ip: string, limit: number = 100): boolean {
  const now = Date.now()
  const key = ip
  const record = requestCounts.get(key)

  if (!record || now > record.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + 60000 }) // 1 minute window
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}

// Password validation
function validatePassword(password: string, email: string): { valid: boolean; error?: string } {
  if (password.length < 12) {
    return { valid: false, error: 'Password must be at least 12 characters long' }
  }

  const weakPasswords = ['password', '123456', 'qwerty']
  if (weakPasswords.includes(password.toLowerCase())) {
    return { valid: false, error: 'Password is too weak' }
  }

  if (password.toLowerCase().includes(email.split('@')[0].toLowerCase())) {
    return { valid: false, error: 'Password cannot contain email address' }
  }

  // Check for repetitive characters
  if (/(.)\1{5,}/.test(password)) {
    return { valid: false, error: 'Password contains too many repetitive characters' }
  }

  return { valid: true }
}

// Email validation
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return false
  if (email.includes('..')) return false
  if (email.startsWith('@') || email.endsWith('@')) return false
  return true
}

// Mock API handlers
export const handlers = [
  // Authentication endpoints - match both relative and absolute URLs
  http.post('*/api/auth/register', async ({ request }) => {
    const origin = request.headers.get('origin') || undefined
    const headers = getSecurityHeaders(origin)

    let body: any
    try {
      body = await request.json()
    } catch {
      return HttpResponse.json(
        { success: false, error: 'Invalid JSON' },
        { status: 400, headers }
      )
    }

    const { email, password, username } = body

    if (!email || !password) {
      return HttpResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400, headers }
      )
    }

    if (!validateEmail(email)) {
      return HttpResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400, headers }
      )
    }

    const passwordValidation = validatePassword(password, email)
    if (!passwordValidation.valid) {
      return HttpResponse.json(
        { success: false, error: passwordValidation.error },
        { status: 400, headers }
      )
    }

    if (users.has(email)) {
      return HttpResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400, headers }
      )
    }

    // Register user
    const userId = `test-user-${Date.now()}`
    users.set(email, { email, password, username: username || email.split('@')[0], id: userId, loginAttempts: 0 })

    return HttpResponse.json(
      {
        success: true,
        user: {
          id: userId,
          email,
          username: username || email.split('@')[0],
          emailVerified: false
        },
        message: 'Registration successful. Please check your email for verification.'
      },
      { status: 201, headers }
    )
  }),

  http.post('*/api/auth/login', async ({ request }) => {
    const origin = request.headers.get('origin') || undefined
    const headers = getSecurityHeaders(origin)

    let body: any
    try {
      body = await request.json()
    } catch {
      return HttpResponse.json(
        { success: false, error: 'Invalid JSON' },
        { status: 500, headers }
      )
    }

    const { email, password } = body

    if (!email || !password) {
      return HttpResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 401, headers }
      )
    }

    const user = users.get(email)

    // Check if account is locked
    if (user?.lockedUntil && Date.now() < user.lockedUntil) {
      return HttpResponse.json(
        { success: false, error: 'Account is temporarily locked due to too many failed login attempts' },
        { status: 401, headers }
      )
    }

    if (!user || user.password !== password) {
      // Increment login attempts
      if (user) {
        user.loginAttempts++
        if (user.loginAttempts >= 5) {
          user.lockedUntil = Date.now() + 15 * 60 * 1000 // Lock for 15 minutes
        }
      }

      return HttpResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401, headers }
      )
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0
    user.lockedUntil = undefined

    const headersWithCookie = {
      ...headers,
      'Set-Cookie': 'refresh_token=mock-refresh-token; HttpOnly; Secure; SameSite=Strict'
    }

    return HttpResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          emailVerified: true
        },
        tokens: {
          accessToken: `mock-access-token-${user.id}`,
          refreshToken: 'mock-refresh-token',
          idToken: `mock-id-token-${user.id}`
        }
      },
      { status: 200, headers: headersWithCookie }
    )
  }),

  http.get('*/api/auth/mfa/setup', ({ request }) => {
    const authHeader = request.headers.get('authorization')
    const origin = request.headers.get('origin') || undefined
    const headers = getSecurityHeaders(origin)

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401, headers }
      )
    }

    // Validate token (simplified)
    const token = authHeader.substring(7)
    if (!token || token === 'invalid-token') {
      return HttpResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401, headers }
      )
    }

    return HttpResponse.json(
      {
        success: true,
        mfa: {
          secret: 'JBSWY3DPEHPK3PXP',
          qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
          backupCodes: [
            'ABC123', 'DEF456', 'GHI789', 'JKL012',
            'MNO345', 'PQR678', 'STU901', 'VWX234'
          ]
        },
        instructions: 'Scan the QR code with your authenticator app'
      },
      { status: 200, headers }
    )
  }),

  // Engineer endpoints
  http.get('*/api/engineer/history-dual-mode', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '0')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const ip = request.headers.get('cf-connecting-ip') || 'unknown'
    const origin = request.headers.get('origin') || undefined
    const headers = getSecurityHeaders(origin)

    // Check rate limit
    if (!checkRateLimit(ip, 100)) {
      return HttpResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers }
      )
    }

    // Mock different data for different IPs
    const mockData = {
      items: Array.from({ length: limit }, (_, i) => ({
        id: `${ip}-${page}-${i}`,
        original: `${ip} original prompt ${page * limit + i}`,
        refined: `${ip} refined prompt ${page * limit + i}`,
        timestamp: new Date().toISOString(),
        userContext: ip
      })),
      total: 50,
      page,
      limit,
      hasMore: page < 4
    }

    return HttpResponse.json(mockData, { headers })
  }),

  http.post('*/api/engineer/history-dual-mode', async ({ request }) => {
    const ip = request.headers.get('cf-connecting-ip') || 'unknown'
    const origin = request.headers.get('origin') || undefined
    const headers = getSecurityHeaders(origin)

    let body: any
    try {
      body = await request.json()
    } catch {
      return HttpResponse.json(
        { success: false, error: 'Invalid JSON' },
        { status: 400, headers }
      )
    }

    if (!body.original || !body.refined) {
      return HttpResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400, headers }
      )
    }

    // Sanitize input (basic XSS protection)
    const sanitized = {
      original: body.original.replace(/<script>/gi, '').substring(0, 10000),
      refined: body.refined.replace(/<script>/gi, '').substring(0, 10000)
    }

    return HttpResponse.json(
      {
        success: true,
        item: {
          id: `${ip}-${Date.now()}`,
          original: sanitized.original,
          refined: sanitized.refined,
          timestamp: body.timestamp || new Date().toISOString(),
          userContext: ip
        }
      },
      { status: 200, headers }
    )
  }),

  // CORS preflight
  http.options('*', ({ request }) => {
    const origin = request.headers.get('origin') || undefined
    const allowOrigin = resolveAllowedOrigin(origin)

    return new HttpResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, cf-connecting-ip'
      }
    })
  }),

  // Rate limiting test endpoint
  http.get('*/api/rate-limit-test', ({ request }) => {
    const ip = request.headers.get('cf-connecting-ip') || 'unknown'

    if (!checkRateLimit(ip, 5)) {
      return HttpResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    return HttpResponse.json({ success: true })
  })
]
