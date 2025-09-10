import { http, HttpResponse } from 'msw'

// Mock API handlers
export const handlers = [
  // Authentication endpoints
  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json() as any
    const { email, password, username } = body

    if (!email || !password || !username) {
      return HttpResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    if (email === 'existing@example.com') {
      return HttpResponse.json({ 
        success: false, 
        error: 'User already exists' 
      }, { status: 400 })
    }

    return HttpResponse.json({
      success: true,
      user: {
        id: 'test-user-id',
        email,
        username,
        emailVerified: false
      },
      message: 'User registered successfully. Please check your email for verification.'
    }, { status: 201 })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as any
    const { email, password } = body

    if (email === 'test@example.com' && password === 'TestPassword123!') {
      return HttpResponse.json({
        success: true,
        user: {
          id: 'test-user-id',
          email,
          emailVerified: true
        },
        tokens: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          idToken: 'mock-id-token'
        }
      }, { 
        status: 200,
        headers: {
          'Set-Cookie': 'refresh_token=mock-refresh-token; HttpOnly; Secure; SameSite=Strict',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      })
    }

    return HttpResponse.json({
      success: false,
      error: 'Invalid credentials'
    }, { status: 401 })
  }),

  http.get('/api/auth/mfa/setup', ({ request }) => {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({
        success: false,
        error: 'Authorization required'
      }, { status: 401 })
    }

    return HttpResponse.json({
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
    })
  }),

  // Engineer endpoints
  http.get('/api/engineer/history-dual-mode', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '0')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const ip = request.headers.get('cf-connecting-ip') || 'unknown'

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

    return HttpResponse.json(mockData, {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Access-Control-Allow-Origin': 'https://mstprmpt.zeidgeist.com'
      }
    })
  }),

  http.post('/api/engineer/history-dual-mode', async ({ request }) => {
    const body = await request.json() as any
    const ip = request.headers.get('cf-connecting-ip') || 'unknown'

    if (!body.original || !body.refined) {
      return HttpResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    return HttpResponse.json({
      success: true,
      item: {
        id: `${ip}-${Date.now()}`,
        original: body.original,
        refined: body.refined,
        timestamp: body.timestamp || new Date().toISOString(),
        userContext: ip
      }
    })
  }),

  // CORS preflight
  http.options('*', () => {
    return new HttpResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://mstprmpt.zeidgeist.com',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, cf-connecting-ip'
      }
    })
  }),

  // Rate limiting simulation
  http.get('/api/rate-limit-test', ({ request }) => {
    const ip = request.headers.get('cf-connecting-ip')
    // Simulate rate limiting for IPs ending in .6 or .7
    if (ip && (ip.endsWith('.6') || ip.endsWith('.7'))) {
      return HttpResponse.json({
        error: 'Rate limit exceeded'
      }, { status: 429 })
    }

    return HttpResponse.json({ success: true })
  })
]