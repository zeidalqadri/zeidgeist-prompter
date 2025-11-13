/**
 * Progress Polling API Endpoint
 * GET /api/images/progress/:taskId
 */

import { getProgress } from '../../../_shared/progress-tracker'

export async function onRequestGet(context: { request: Request; env: any; params: { taskId: string } }) {
  const { params, env } = context

  try {
    const progress = await getProgress(params.taskId, env)

    if (!progress) {
      return new Response(JSON.stringify({ error: 'Progress tracker not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify(progress), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Progress fetch error:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch progress' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
