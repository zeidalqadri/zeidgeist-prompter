/**
 * GDPR Compliance Extension for Image Data
 * Extends existing privacy/DSAR functionality to include image-related data
 */

import { createDb } from './db'
import { images, imageGenerations, imageAnalyses, imageQuotas } from '../../app/lib/db/schema'
import { deleteUserImagesFromR2 } from './image-storage'
import { eq } from 'drizzle-orm'

export interface ImageDataExport {
  images: any[]
  generations: any[]
  analyses: any[]
  quotas: any[]
  totalImages: number
  totalStorageBytes: number
}

/**
 * Export all image-related data for a user (GDPR Article 15 - Right to Access)
 * @param userId - User ID
 * @param env - Cloudflare environment
 * @returns Image data export
 */
export async function exportUserImageData(userId: string, env: any): Promise<ImageDataExport> {
  console.log(`📦 Exporting image data for user ${userId}`)

  const db = createDb(env)

  // Fetch all image records
  const userImages = await db
    .select()
    .from(images)
    .where(eq(images.userId, userId))

  // Fetch all generation records
  const userGenerations = await db
    .select()
    .from(imageGenerations)
    .where(eq(imageGenerations.userId, userId))

  // Fetch all analysis records
  const userAnalyses = await db
    .select()
    .from(imageAnalyses)
    .where(eq(imageAnalyses.userId, userId))

  // Fetch quota records
  const userQuotas = await db
    .select()
    .from(imageQuotas)
    .where(eq(imageQuotas.userId, userId))

  // Calculate total storage
  const totalStorageBytes = userImages.reduce((sum: number, img: any) => sum + (img.size || 0), 0)

  return {
    images: userImages,
    generations: userGenerations,
    analyses: userAnalyses,
    quotas: userQuotas,
    totalImages: userImages.length,
    totalStorageBytes
  }
}

/**
 * Delete all image-related data for a user (GDPR Article 17 - Right to Erasure)
 * @param userId - User ID
 * @param env - Cloudflare environment (for R2 access)
 * @returns Deletion summary
 */
export async function deleteUserImageData(
  userId: string,
  env: any
): Promise<{
  imagesDeleted: number
  generationsDeleted: number
  analysesDeleted: number
  quotasDeleted: number
  r2ObjectsDeleted: number
}> {
  console.log(`🗑️ Deleting all image data for user ${userId}`)

  const db = createDb(env)

  // Delete from R2 storage first
  const r2ObjectsDeleted = await deleteUserImagesFromR2(userId, env)

  // Delete analyses (child records first)
  const deletedAnalyses = await db
    .delete(imageAnalyses)
    .where(eq(imageAnalyses.userId, userId))
    .returning()

  // Delete generations
  const deletedGenerations = await db
    .delete(imageGenerations)
    .where(eq(imageGenerations.userId, userId))
    .returning()

  // Delete images
  const deletedImages = await db
    .delete(images)
    .where(eq(images.userId, userId))
    .returning()

  // Delete quotas
  const deletedQuotas = await db
    .delete(imageQuotas)
    .where(eq(imageQuotas.userId, userId))
    .returning()

  console.log(`✅ Deleted image data for user ${userId}:`, {
    images: deletedImages.length,
    generations: deletedGenerations.length,
    analyses: deletedAnalyses.length,
    quotas: deletedQuotas.length,
    r2Objects: r2ObjectsDeleted
  })

  return {
    imagesDeleted: deletedImages.length,
    generationsDeleted: deletedGenerations.length,
    analysesDeleted: deletedAnalyses.length,
    quotasDeleted: deletedQuotas.length,
    r2ObjectsDeleted
  }
}

/**
 * Anonymize image data for a user (GDPR Article 17 alternative - Right to Restriction)
 * Keeps images but removes personal identifiers
 * @param userId - User ID
 * @param env - Cloudflare environment
 * @returns Anonymization summary
 */
export async function anonymizeUserImageData(userId: string, env: any): Promise<{
  imagesAnonymized: number
  generationsAnonymized: number
  analysesAnonymized: number
}> {
  console.log(`🔒 Anonymizing image data for user ${userId}`)

  const db = createDb(env)
  const anonymousId = `anon-${crypto.randomUUID()}`

  // Anonymize images
  const anonymizedImages = await db
    .update(images)
    .set({
      userId: anonymousId,
      metadata: JSON.stringify({ anonymized: true }),
      ipAddress: null
    })
    .where(eq(images.userId, userId))
    .returning()

  // Anonymize generations
  const anonymizedGenerations = await db
    .update(imageGenerations)
    .set({
      userId: anonymousId,
      ipAddress: null
    })
    .where(eq(imageGenerations.userId, userId))
    .returning()

  // Anonymize analyses
  const anonymizedAnalyses = await db
    .update(imageAnalyses)
    .set({
      userId: anonymousId
    })
    .where(eq(imageAnalyses.userId, userId))
    .returning()

  console.log(`✅ Anonymized image data for user ${userId}`)

  return {
    imagesAnonymized: anonymizedImages.length,
    generationsAnonymized: anonymizedGenerations.length,
    analysesAnonymized: anonymizedAnalyses.length
  }
}

/**
 * Generate GDPR-compliant data portability export (JSON format)
 * @param userId - User ID
 * @param env - Cloudflare environment
 * @returns Formatted JSON export
 */
export async function generateImageDataPortabilityExport(userId: string, env: any): Promise<string> {
  const data = await exportUserImageData(userId, env)

  const portabilityExport = {
    dataSubject: {
      userId,
      exportDate: new Date().toISOString()
    },
    imageData: {
      images: data.images.map(img => ({
        imageId: img.id,
        filename: img.filename,
        publicUrl: `https://images.mstprmpt.zeidgeist.com/${img.r2Key}`,
        mimeType: img.mimeType,
        size: img.size,
        dimensions: { width: img.width, height: img.height },
        uploadedAt: img.createdAt,
        metadata: img.metadata
      })),
      generations: data.generations.map(gen => ({
        generationId: gen.id,
        prompt: gen.prompt,
        style: gen.style,
        resolution: gen.resolution,
        model: gen.model,
        provider: gen.provider,
        processingTime: gen.processingTime,
        createdAt: gen.createdAt
      })),
      analyses: data.analyses.map(analysis => ({
        analysisId: analysis.id,
        analysisType: analysis.analysisType,
        result: analysis.result,
        confidence: analysis.confidence,
        model: analysis.model,
        createdAt: analysis.createdAt
      }))
    },
    statistics: {
      totalImages: data.totalImages,
      totalStorageBytes: data.totalStorageBytes,
      totalStorageMB: (data.totalStorageBytes / 1024 / 1024).toFixed(2)
    },
    rights: {
      rectification: 'Contact support to update your data',
      erasure: 'Request full deletion via DSAR portal',
      restriction: 'Request anonymization via DSAR portal',
      objection: 'Contact privacy@mstprmpt.zeidgeist.com'
    }
  }

  return JSON.stringify(portabilityExport, null, 2)
}
