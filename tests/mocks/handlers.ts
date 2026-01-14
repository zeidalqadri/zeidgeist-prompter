import { http, HttpResponse } from 'msw'
import jwt from 'jsonwebtoken'

export const JWT_SECRET = 'test-jwt-secret-for-mock-handlers'

// In-memory user store for tests
const users = new Map<string, { email: string; password: string; username: string; id: string; loginAttempts: number; lockedUntil?: number }>()
const requestCounts = new Map<string, { count: number; resetAt: number }>()
const historyStore = new Map<string, any[]>()
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

// Reset function for tests - only resets rate limits, NOT user registrations
export function resetMockStores() {
  // Only reset rate limiting stores - preserve user registrations
  requestCounts.clear()
  loginAttempts.clear()

  // Reset login attempts for existing users (don't clear users)
  for (const [email, user] of users) {
    user.loginAttempts = 0
    user.lockedUntil = undefined
  }

  // Re-add the test user if it doesn't exist
  if (!users.has('test@example.com')) {
    users.set('test@example.com', {
      email: 'test@example.com',
      password: 'TestPassword123!SecureEnough',
      username: 'testuser',
      id: 'preset-test-user-id',
      loginAttempts: 0
    })
  }
}

// Full reset function for tests that need complete isolation
export function fullResetMockStores() {
  users.clear()
  requestCounts.clear()
  historyStore.clear()
  loginAttempts.clear()

  // Re-add the test user
  users.set('test@example.com', {
    email: 'test@example.com',
    password: 'TestPassword123!SecureEnough',
    username: 'testuser',
    id: 'preset-test-user-id',
    loginAttempts: 0
  })
}

// Pre-populate with a test user for login tests
users.set('test@example.com', {
  email: 'test@example.com',
  password: 'TestPassword123!SecureEnough',
  username: 'testuser',
  id: 'preset-test-user-id',
  loginAttempts: 0
})

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

  // Check for exact weak passwords (not substrings)
  const weakPasswords = ['password123', '123456789012', 'qwertyqwerty', 'weakpassword', 'password1234']
  const lowerPassword = password.toLowerCase()
  if (weakPasswords.includes(lowerPassword)) {
    return { valid: false, error: 'Password is too weak' }
  }

  // Also reject passwords that are JUST the word "weak" repeated to reach length
  if (/^(weak)+$/i.test(password) || /^(password)+$/i.test(password)) {
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

// Token validation helper
function validateToken(token: string): { valid: boolean; payload?: any; error?: string } {
  if (!token) {
    return { valid: false, error: 'No token provided' }
  }

  // Check for obviously invalid tokens
  if (token === 'invalid-token' || token === 'malformed.token' || !token.includes('.')) {
    return { valid: false, error: 'Invalid token format' }
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    return { valid: true, payload }
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return { valid: false, error: 'Token expired' }
    }
    return { valid: false, error: 'Invalid token' }
  }
}

// Login rate limiting (separate from API rate limiting)
// Note: loginAttempts is declared at module level
function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = loginAttempts.get(ip)

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60000 }) // 1 minute window
    return true
  }

  if (record.count >= 5) { // 5 login attempts per minute
    return false
  }

  record.count++
  return true
}

// Email validation
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return false
  if (email.includes('..')) return false
  if (email.startsWith('@') || email.endsWith('@')) return false
  // Reject HTML/script tags in email
  if (/<[^>]*>/.test(email)) return false
  // Reject SQL injection patterns (semicolon, quotes, double-dash comment)
  const localPart = email.split('@')[0]
  if (/[;'"]/.test(localPart)) return false
  if (/--/.test(localPart)) return false
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

    // Check email validation FIRST (before password)
    if (!validateEmail(email)) {
      return HttpResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400, headers }
      )
    }

    // Check for duplicate user before password validation
    if (users.has(email)) {
      return HttpResponse.json(
        { success: false, error: 'User with this email already exists' },
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

    // Already checked above, but keep for clarity
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
    const ip = request.headers.get('cf-connecting-ip') || 'unknown'
    const headers = getSecurityHeaders(origin)

    // Check login rate limit
    if (!checkLoginRateLimit(ip)) {
      return HttpResponse.json(
        { success: false, error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers }
      )
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      return HttpResponse.json(
        { success: false, error: 'Invalid JSON' },
        { status: 400, headers }
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
        // Lock after 3 failed attempts (for testing)
        if (user.loginAttempts >= 3) {
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

    // Generate proper JWTs
    const now = Math.floor(Date.now() / 1000)
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        iss: 'auth.mstprmpt.zeidgeist.com',
        aud: 'api.mstprmpt.zeidgeist.com',
        iat: now,
        exp: now + 3600 // 1 hour
      },
      JWT_SECRET
    )

    const idToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        email_verified: true,
        iss: 'auth.mstprmpt.zeidgeist.com',
        aud: 'mstprmpt-client',
        iat: now,
        exp: now + 3600
      },
      JWT_SECRET
    )

    const refreshToken = jwt.sign(
      {
        sub: user.id,
        type: 'refresh',
        iat: now,
        exp: now + 604800 // 7 days
      },
      JWT_SECRET
    )

    const headersWithCookie = {
      ...headers,
      'Set-Cookie': `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Strict`
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
          accessToken,
          refreshToken,
          idToken
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
    const authHeader = request.headers.get('authorization')
    const headers = getSecurityHeaders(origin)

    // If Authorization header is present, validate it
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const validation = validateToken(token)
      if (!validation.valid) {
        return HttpResponse.json(
          { success: false, error: validation.error },
          { status: 401, headers }
        )
      }
    }

    // Check rate limit - lowered for testing
    if (!checkRateLimit(ip, 20)) {
      return HttpResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers }
      )
    }

    // Return stored data for this IP, or generate mock data if none exists
    const storedItems = historyStore.get(ip) || []

    if (storedItems.length > 0) {
      // Return stored data with pagination
      const start = page * limit
      const paginatedItems = storedItems.slice(start, start + limit)

      return HttpResponse.json({
        items: paginatedItems,
        total: storedItems.length,
        page,
        limit,
        hasMore: start + limit < storedItems.length
      }, { headers })
    }

    // Generate mock data for this specific IP (fallback)
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

    const item = {
      id: `${ip}-${Date.now()}`,
      original: sanitized.original,
      refined: sanitized.refined,
      timestamp: body.timestamp || new Date().toISOString(),
      userContext: ip
    }

    // Store the item for this IP
    const items = historyStore.get(ip) || []
    items.push(item)
    historyStore.set(ip, items)

    return HttpResponse.json(
      {
        success: true,
        item
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
  }),

  // MFA enable endpoint
  http.post('*/api/auth/mfa/enable', async ({ request }) => {
    const authHeader = request.headers.get('authorization')
    const origin = request.headers.get('origin') || undefined
    const headers = getSecurityHeaders(origin)

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401, headers }
      )
    }

    const token = authHeader.substring(7)
    const validation = validateToken(token)
    if (!validation.valid) {
      return HttpResponse.json(
        { success: false, error: validation.error },
        { status: 401, headers }
      )
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      return HttpResponse.json(
        { success: false, error: 'Invalid JSON' },
        { status: 400, headers }
      )
    }

    const { code } = body

    // Validate TOTP code (simplified for testing)
    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      return HttpResponse.json(
        { success: false, error: 'Invalid TOTP code format' },
        { status: 400, headers }
      )
    }

    return HttpResponse.json(
      {
        success: true,
        message: 'MFA has been enabled for your account'
      },
      { status: 200, headers }
    )
  }),

  // Protected resource endpoint (for token validation tests)
  http.get('*/api/protected/resource', ({ request }) => {
    const authHeader = request.headers.get('authorization')
    const origin = request.headers.get('origin') || undefined
    const headers = getSecurityHeaders(origin)

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401, headers }
      )
    }

    const token = authHeader.substring(7)
    const validation = validateToken(token)
    if (!validation.valid) {
      return HttpResponse.json(
        { success: false, error: validation.error },
        { status: 401, headers }
      )
    }

    return HttpResponse.json(
      {
        success: true,
        data: { message: 'Protected resource accessed successfully' }
      },
      { status: 200, headers }
    )
  }),

  // Generic API protected endpoint
  http.get('*/api/user/profile', ({ request }) => {
    const authHeader = request.headers.get('authorization')
    const origin = request.headers.get('origin') || undefined
    const headers = getSecurityHeaders(origin)

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401, headers }
      )
    }

    const token = authHeader.substring(7)
    const validation = validateToken(token)
    if (!validation.valid) {
      return HttpResponse.json(
        { success: false, error: validation.error },
        { status: 401, headers }
      )
    }

    return HttpResponse.json(
      {
        success: true,
        user: validation.payload
      },
      { status: 200, headers }
    )
  })
]
