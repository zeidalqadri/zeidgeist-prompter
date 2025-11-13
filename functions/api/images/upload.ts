/**
 * Image Upload API Endpoint
 * Handles multipart/form-data uploads with virus scanning and validation
 * POST /api/images/upload
 */

import { uploadToR2, validateImageFile, getImageDimensions, CloudflareEnv } from '../../_shared/image-storage'
import { performSecurityCheck } from '../../_shared/virus-scanner'
import { enforceQuota } from '../../_shared/quota-manager'
import { db } from '../../_shared/db'
import { images } from '../../../app/lib/db/schema'
import { validateRequest } from '../../_shared/auth'

interface Env extends CloudflareEnv {
  DB: any
  VIRUSTOTAL_API_KEY?: string
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context

  try {
    // Authenticate request
    const auth = validateRequest(request, env, '/api/images/upload')
    if (!auth.authenticated) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const userId = auth.userId!

    // Enforce quota (10 uploads per day)
    try {
      await enforceQuota(userId, 'upload')
    } catch (error) {
      return new Response(JSON.stringify({
        error: error instanceof Error ? error.message : 'Quota exceeded'
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Parse multipart/form-data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`📤 Upload request from user ${userId}: ${file.name} (${file.size} bytes)`)

    // Validate file type and size
    const validation = validateImageFile(file, 10) // 10MB limit

    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Perform security check (virus scan)
    console.log('🔍 Running security check...')
    const scanResult = await performSecurityCheck(file, env.VIRUSTOTAL_API_KEY)

    if (!scanResult.clean) {
      console.error(`🦠 Security check failed: ${scanResult.details}`)

      return new Response(JSON.stringify({
        error: 'File failed security check',
        details: scanResult.details,
        scanResult
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Security check passed')

    // Get image dimensions
    let dimensions: { width: number; height: number } | undefined

    try {
      dimensions = await getImageDimensions(file)
    } catch (error) {
      console.warn('⚠️ Failed to extract dimensions:', error)
    }

    // Upload to R2
    console.log('☁️ Uploading to R2...')
    const uploadResult = await uploadToR2(file, userId, env)

    // Store metadata in database
    const dbRecord = await db.insert(images).values({
      userId,
      filename: file.name,
      r2Key: uploadResult.key,
      mimeType: file.type,
      size: file.size,
      width: dimensions?.width,
      height: dimensions?.height,
      metadata: JSON.stringify({
        originalName: file.name,
        uploadedFrom: request.headers.get('user-agent')
      }),
      status: 'active',
      virusScanStatus: scanResult.status,
      virusScanResult: JSON.stringify(scanResult),
      hasWatermark: false,
      ipAddress: request.headers.get('cf-connecting-ip')
    }).returning()

    console.log(`✅ Upload complete: ${uploadResult.key}`)

    return new Response(JSON.stringify({
      success: true,
      imageId: dbRecord[0].id,
      r2Key: uploadResult.key,
      publicUrl: uploadResult.publicUrl,
      filename: file.name,
      size: file.size,
      dimensions,
      scanResult: {
        status: scanResult.status,
        clean: scanResult.clean
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Upload error:', error)

    return new Response(JSON.stringify({
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
