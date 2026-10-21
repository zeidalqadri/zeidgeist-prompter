import { describe, it, expect } from 'vitest'
import { onRequestGet } from '../../functions/api/debug/api-keys'

const TOKEN = 'debug-token-for-tests'
const SECRET_VALUE = 'sk-this-value-must-never-appear-in-a-response'

type Env = Parameters<typeof onRequestGet>[0]['env']

const call = (env: Env, authorization?: string) =>
  onRequestGet({
    env,
    request: new Request('https://example.test/api/debug/api-keys', {
      headers: authorization ? { Authorization: authorization } : {},
    }),
  })

describe('GET /api/debug/api-keys', () => {
  describe('when the environment is production (the default)', () => {
    it('answers 404 so the route does not confirm it exists', async () => {
      const response = await call({ DEBUG_ACCESS_TOKEN: TOKEN }, `Bearer ${TOKEN}`)
      expect(response.status).toBe(404)
    })

    it('does not echo the environment name', async () => {
      const response = await call({ APP_ENV: 'production', DEBUG_ACCESS_TOKEN: TOKEN })
      expect(await response.text()).not.toContain('production')
    })
  })

  describe('when the environment is staging', () => {
    const staging: Env = { APP_ENV: 'staging', DEBUG_ACCESS_TOKEN: TOKEN, OPENAI_API_KEY: SECRET_VALUE }

    it('answers 503 when no debug token is configured', async () => {
      const response = await call({ APP_ENV: 'staging' }, `Bearer ${TOKEN}`)
      expect(response.status).toBe(503)
    })

    it('answers 401 without an Authorization header', async () => {
      expect((await call(staging)).status).toBe(401)
    })

    it('answers 401 for a token that shares a prefix with the real one', async () => {
      expect((await call(staging, `Bearer ${TOKEN}x`)).status).toBe(401)
    })

    it('answers 200 for the right token and reports which keys are configured', async () => {
      const response = await call(staging, `Bearer ${TOKEN}`)
      const body = await response.json()
      const openai = body.providers.find((p: { provider: string }) => p.provider === 'OpenAI')
      expect([response.status, openai.configured]).toEqual([200, true])
    })

    it('never includes a key value or a key preview in the response', async () => {
      const response = await call(staging, `Bearer ${TOKEN}`)
      expect(await response.text()).not.toContain(SECRET_VALUE.slice(0, 8))
    })

    it('does not claim to expose partial key information', async () => {
      const response = await call(staging, `Bearer ${TOKEN}`)
      expect(await response.text()).not.toMatch(/exposes partial API key/i)
    })
  })
})
