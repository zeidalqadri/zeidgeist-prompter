import { describe, it, expect } from 'vitest'
import { resolveAllowedOrigin } from '../../functions/_shared/privacy-guard'
import { onRequest as middlewareOnRequest } from '../../functions/api/_middleware'
import { onRequestOptions as abTestOptions } from '../../functions/api/learning/ab-test-results'
import { onRequestOptions as metricsOptions } from '../../functions/api/learning/metrics'

const EVIL_ORIGIN = 'https://evil.example.test'
const REAL_ORIGIN = 'https://mstprmpt.zeidgeist.com'

describe('resolveAllowedOrigin', () => {
  it('reflects the primary domain', () => {
    expect(resolveAllowedOrigin(REAL_ORIGIN)).toBe(REAL_ORIGIN)
  })

  it('reflects a Cloudflare Pages preview subdomain', () => {
    const preview = 'https://abc123.zeidgeist-prompter.pages.dev'
    expect(resolveAllowedOrigin(preview)).toBe(preview)
  })

  it('does not reflect an arbitrary origin', () => {
    expect(resolveAllowedOrigin(EVIL_ORIGIN)).toBe(REAL_ORIGIN)
  })

  it('falls back to the primary domain when no origin is given', () => {
    expect(resolveAllowedOrigin(undefined)).toBe(REAL_ORIGIN)
  })
})

describe('CORS preflight across the public routes', () => {
  const cases: Array<[string, (req: Request) => Promise<Response>]> = [
    ['_middleware onRequest (OPTIONS)', (request) =>
      middlewareOnRequest({ request, env: {}, next: async () => new Response('{}') })],
    ['learning/ab-test-results onRequestOptions', (request) => abTestOptions({ request })],
    ['learning/metrics onRequestOptions', (request) => metricsOptions({ request })],
  ]

  it.each(cases)('%s never reflects an arbitrary Origin with credentials allowed', async (_name, handler) => {
    const request = new Request('https://example.test/api/x', {
      method: 'OPTIONS',
      headers: { Origin: EVIL_ORIGIN },
    })
    const response = await handler(request)
    const allowOrigin = response.headers.get('Access-Control-Allow-Origin')
    const allowCredentials = response.headers.get('Access-Control-Allow-Credentials')

    if (allowCredentials === 'true') {
      expect(allowOrigin).not.toBe(EVIL_ORIGIN)
    }
  })

  it.each(cases)('%s still answers the real origin\'s preflight', async (_name, handler) => {
    const request = new Request('https://example.test/api/x', {
      method: 'OPTIONS',
      headers: { Origin: REAL_ORIGIN },
    })
    const response = await handler(request)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(REAL_ORIGIN)
  })
})
