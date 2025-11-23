/**
 * Image Analysis API Endpoint
 * POST /api/images/analyze
 */

import { analyzeImage } from '../../_shared/vision-providers'
import { getFromR2, getPublicUrl } from '../../_shared/image-storage'
import { enforceQuota } from '../../_shared/quota-manager'
import { createDb } from '../../_shared/db'
import { imageAnalyses } from '../../../app/lib/db/schema'
import { validateRequest } from '../../_shared/auth'
import { eq, and } from 'drizzle-orm'

export async function onRequestPost(context: { request: Request; env: any }) {
  const { request, env } = context

  try {
    const auth = validateRequest(request, env, '/api/images/analyze')
    if (!auth.success) {
      return new Response(JSON.stringify({ error: auth.error }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

    const userId = auth.userId!
    const body = await request.json() as { imageId: string; analysisType: string; prompt?: string }
    const { imageId, analysisType, prompt } = body

    if (!imageId || !analysisType) {
      return new Response(JSON.stringify({ error: 'imageId and analysisType required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    await enforceQuota(userId, 'analysis', env)

    // Get image from database
    const db = createDb(env)
    const images = (await import('../../../app/lib/db/schema')).images
    const imageResults = await db.select().from(images).where(and(eq(images.id, imageId), eq(images.userId, userId))).limit(1)
    const imageRecord = imageResults[0]

    if (!imageRecord) {
      return new Response(JSON.stringify({ error: 'Image not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
    }

    const imageUrl = getPublicUrl(imageRecord.r2Key, env)

    console.log(`🔍 Analyzing image ${imageId} for user ${userId}: ${analysisType}`)

    const result = await analyzeImage(imageUrl, { type: analysisType, prompt }, env)

    const analysisRecord = await db.insert(imageAnalyses).values({
      imageId,
      userId,
      analysisType,
      prompt,
      result: typeof result.result === 'string' ? result.result : JSON.stringify(result.result),
      confidence: result.confidence,
      model: result.model,
      provider: result.provider,
      processingTime: result.processingTime
    }).returning()

    console.log(`✅ Analysis complete: ${analysisType}`)

    return new Response(JSON.stringify({
      success: true,
      analysisId: analysisRecord[0].id,
      result: result.result,
      confidence: result.confidence,
      model: result.model,
      provider: result.provider,
      processingTime: result.processingTime
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('❌ Analysis error:', error)
    return new Response(JSON.stringify({ error: 'Analysis failed', message: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
