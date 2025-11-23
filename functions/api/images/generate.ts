/**
 * Text-to-Image Generation API Endpoint
 * POST /api/images/generate
 */

import { generateImage } from '../../_shared/vision-providers'
import { applyBrandWatermark } from '../../_shared/watermark'
import { uploadToR2, CloudflareEnv } from '../../_shared/image-storage'
import { enforceQuota } from '../../_shared/quota-manager'
import { initializeProgress, updateProgress, completeProgress, failProgress, createProgressCallback } from '../../_shared/progress-tracker'
import { createDb } from '../../_shared/db'
import { images, imageGenerations } from '../../../app/lib/db/schema'
import { validateRequest } from '../../_shared/auth'

// Cloudflare KV Namespace type definition
interface KVPutOptions {
  expirationTtl?: number
  expiration?: number
  metadata?: any
}

interface KVNamespace {
  get<T = unknown>(key: string, options?: { type: 'json' }): Promise<T | null>
  get(key: string): Promise<string | null>
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: KVPutOptions): Promise<void>
  delete(key: string): Promise<void>
  list(options?: { prefix?: string; limit?: number }): Promise<{ keys: { name: string }[] }>
}

interface Env extends CloudflareEnv {
  DATABASE_URL?: string
  OPENAI_API_KEY: string
  CLAUDE_API_KEY: string
  STABILITY_AI_KEY: string
  GOOGLE_API_KEY: string
  PROGRESS_TRACKER?: KVNamespace
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context

  try {
    const auth = validateRequest(request, env, '/api/images/generate')
    if (!auth.success) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const userId = auth.userId!
    const body = await request.json() as { prompt: string; style?: string; resolution?: string; aspectRatio?: string }
    const { prompt, style, resolution, aspectRatio } = body

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Enforce quota (3 generations per day)
    try {
      await enforceQuota(userId, 'generation', env)
    } catch (error) {
      return new Response(JSON.stringify({
        error: error instanceof Error ? error.message : 'Quota exceeded'
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const taskId = crypto.randomUUID()
    await initializeProgress(taskId, env as any)

    const progressCallback = createProgressCallback(taskId, env as any)

    try {
      console.log(`🎨 Generating image for user ${userId}: "${prompt}"`)

      // Generate image
      const result = await generateImage(
        { prompt, style, resolution, aspectRatio, progressCallback },
        env as any
      )

      await updateProgress(taskId, 85, 'Applying watermark...', env as any)

      // Fetch generated image
      const imageResponse = await fetch(result.imageUrl)
      const imageBlob = await imageResponse.blob()

      // Apply watermark
      const watermarkedBlob = await applyBrandWatermark(imageBlob)

      await updateProgress(taskId, 90, 'Uploading to storage...', env as any)

      // Upload to R2
      const uploadResult = await uploadToR2(watermarkedBlob, userId, env)

      // Store image metadata
      const db = createDb(env as any)
      const imageRecord = await db.insert(images).values({
        userId,
        filename: `generated-${taskId}.png`,
        r2Key: uploadResult.key,
        mimeType: 'image/png',
        size: watermarkedBlob.size,
        metadata: JSON.stringify({ prompt, style, model: result.model }),
        status: 'active',
        virusScanStatus: 'clean',
        hasWatermark: true
      }).returning()

      // Store generation record
      const generationRecord = await db.insert(imageGenerations).values({
        userId,
        prompt,
        style,
        resolution,
        aspectRatio,
        model: result.model,
        provider: result.provider,
        resultImageId: imageRecord[0].id,
        status: 'completed',
        processingTime: result.processingTime,
        progressPercent: 100
      }).returning()

      await completeProgress(taskId, {
        imageUrl: uploadResult.publicUrl,
        imageId: imageRecord[0].id
      }, env as any)

      console.log(`✅ Generation complete: ${uploadResult.key}`)

      return new Response(JSON.stringify({
        success: true,
        taskId,
        imageId: imageRecord[0].id,
        generationId: generationRecord[0].id,
        imageUrl: uploadResult.publicUrl,
        model: result.model,
        provider: result.provider,
        processingTime: result.processingTime
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })

    } catch (error) {
      await failProgress(taskId, error instanceof Error ? error.message : 'Unknown error', env as any)
      throw error
    }

  } catch (error) {
    console.error('❌ Generation error:', error)

    return new Response(JSON.stringify({
      error: 'Generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
