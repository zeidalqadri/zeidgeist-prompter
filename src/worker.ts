// Cloudflare Worker entrypoint that reuses existing API handlers under functions/
// Routes:
//  - /api/engineer (GET/POST/OPTIONS) - GET returns health check/provider status
//  - /api/tweak/provider-status (GET/OPTIONS)
//  - /api/tweak/provider-preference (GET/POST/OPTIONS)
//  - /api/health/* (GET)
//  - /api/learning/status (GET/OPTIONS)
//  - /api/learning/trigger (POST/OPTIONS)

import * as Engineer from '../functions/api/engineer'
import * as ProviderStatus from '../functions/api/tweak/provider-status'
import * as ProviderPreference from '../functions/api/tweak/provider-preference'
import * as HealthIndex from '../functions/api/health/index'
import * as LearningStatus from '../functions/api/learning/status'
import * as LearningTrigger from '../functions/api/learning/trigger'
import LearningCycle from '../functions/scheduled/learning-cycle'

type Env = Record<string, any>

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url)
      const { pathname } = url

      // OPTIONS preflight handling where implemented
      const handleOptions = async (mod: any) =>
        typeof mod.onRequestOptions === 'function'
          ? await mod.onRequestOptions({ env, request })
          : new Response(null, {
              status: 204,
              headers: {
                'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Test-Provider, x-api-key',
                'Access-Control-Allow-Credentials': 'true',
                Vary: 'Origin',
              },
            })

      // API routing
      if (pathname === '/api/engineer') {
        if (request.method === 'OPTIONS') return handleOptions(Engineer)
        if (request.method === 'GET') return Engineer.onRequestGet({ request, env })
        if (request.method === 'POST') return Engineer.onRequestPost({ request, env })
        return new Response('Method Not Allowed', { status: 405 })
      }

      if (pathname === '/api/tweak/provider-status') {
        if (request.method === 'OPTIONS') return handleOptions(ProviderStatus)
        if (request.method === 'GET') return ProviderStatus.onRequestGet({ env, request })
        return new Response('Method Not Allowed', { status: 405 })
      }

      if (pathname === '/api/tweak/provider-preference') {
        if (request.method === 'OPTIONS') return handleOptions(ProviderPreference)
        if (request.method === 'GET') return ProviderPreference.onRequestGet({ env, request })
        if (request.method === 'POST') return ProviderPreference.onRequestPost({ env, request })
        return new Response('Method Not Allowed', { status: 405 })
      }

      if (pathname.startsWith('/api/health')) {
        // HealthIndex switches on the path internally
        if (request.method === 'GET') return HealthIndex.onRequestGet({ env, request })
        return new Response('Method Not Allowed', { status: 405 })
      }

      // Learning API routes
      if (pathname === '/api/learning/status') {
        if (request.method === 'OPTIONS') return handleOptions(LearningStatus)
        if (request.method === 'GET') return LearningStatus.onRequestGet({ env, request })
        return new Response('Method Not Allowed', { status: 405 })
      }

      if (pathname === '/api/learning/trigger') {
        if (request.method === 'OPTIONS') return handleOptions(LearningTrigger)
        if (request.method === 'POST') return LearningTrigger.onRequestPost({ env, request })
        return new Response('Method Not Allowed', { status: 405 })
      }

      return new Response('Not Found', { status: 404 })
    } catch (err) {
      return new Response(
        JSON.stringify({ error: (err as Error).message || 'Unhandled error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  },

  // Scheduled handler for learning cycle cron job
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    return LearningCycle.scheduled(controller, env as any, ctx)
  },
}

