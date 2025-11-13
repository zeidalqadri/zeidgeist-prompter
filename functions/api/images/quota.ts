/**
 * Quota Status API Endpoint
 * GET /api/images/quota
 */

import { getQuotaStatus } from '../../_shared/quota-manager'
import { validateRequest } from '../../_shared/auth'

export async function onRequestGet(context: { request: Request; env: any }) {
  const { request, env } = context

  const auth = validateRequest(request, env, '/api/images/quota')
  if (!auth.success) {
    return new Response(JSON.stringify({ error: auth.error }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const quotaStatus = await getQuotaStatus(auth.userId!, env)

    return new Response(JSON.stringify(quotaStatus), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Quota fetch error:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch quota' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
