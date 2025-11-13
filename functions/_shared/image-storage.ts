/**
 * Cloudflare R2 Storage Integration for Image Management
 * Handles upload, retrieval, and deletion of images with security validation
 */

export interface CloudflareEnv {
  IMAGE_STORAGE: R2Bucket
  VIRUSTOTAL_API_KEY?: string
  R2_PUBLIC_URL?: string
}

export interface ImageMetadata {
  userId: string
  originalName: string
  uploadedAt: string
  mimeType: string
  size: number
  width?: number
  height?: number
}

export interface UploadResult {
  key: string
  publicUrl: string
  metadata: ImageMetadata
}

/**
 * Upload an image to R2 storage
 * @param file - File or Blob to upload
 * @param userId - User ID for isolation
 * @param env - Cloudflare environment bindings
 * @returns Upload result with R2 key and public URL
 */
export async function uploadToR2(
  file: File | Blob,
  userId: string,
  env: CloudflareEnv
): Promise<UploadResult> {
  // Generate unique key with user isolation
  const timestamp = Date.now()
  const randomId = crypto.randomUUID().split('-')[0]
  const fileName = file instanceof File ? file.name : `image-${randomId}`
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  const key = `${userId}/${timestamp}-${randomId}-${sanitizedFileName}`

  // Prepare metadata
  const metadata: ImageMetadata = {
    userId,
    originalName: fileName,
    uploadedAt: new Date().toISOString(),
    mimeType: file.type,
    size: file.size
  }

  // Upload to R2
  await env.IMAGE_STORAGE.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000, immutable'
    },
    customMetadata: {
      userId,
      originalName: fileName,
      uploadedAt: metadata.uploadedAt
    }
  })

  // Generate public URL
  const publicUrl = env.R2_PUBLIC_URL
    ? `${env.R2_PUBLIC_URL}/${key}`
    : `https://images.mstprmpt.zeidgeist.com/${key}`

  console.log(`✅ Uploaded image to R2: ${key}`)

  return {
    key,
    publicUrl,
    metadata
  }
}

/**
 * Retrieve an image from R2 storage
 * @param key - R2 object key
 * @param env - Cloudflare environment bindings
 * @returns R2 object or null if not found
 */
export async function getFromR2(
  key: string,
  env: CloudflareEnv
): Promise<R2ObjectBody | null> {
  const object = await env.IMAGE_STORAGE.get(key)

  if (!object) {
    console.warn(`⚠️ Image not found in R2: ${key}`)
    return null
  }

  console.log(`✅ Retrieved image from R2: ${key}`)
  return object
}

/**
 * Delete an image from R2 storage (GDPR-compliant)
 * @param key - R2 object key
 * @param env - Cloudflare environment bindings
 */
export async function deleteFromR2(
  key: string,
  env: CloudflareEnv
): Promise<void> {
  await env.IMAGE_STORAGE.delete(key)
  console.log(`🗑️ Deleted image from R2: ${key}`)
}

/**
 * Delete all images for a user (GDPR data deletion)
 * @param userId - User ID
 * @param env - Cloudflare environment bindings
 */
export async function deleteUserImagesFromR2(
  userId: string,
  env: CloudflareEnv
): Promise<number> {
  let deletedCount = 0
  const prefix = `${userId}/`

  // List all objects with user prefix
  const listed = await env.IMAGE_STORAGE.list({ prefix })

  // Delete each object
  for (const object of listed.objects) {
    await env.IMAGE_STORAGE.delete(object.key)
    deletedCount++
  }

  console.log(`🗑️ Deleted ${deletedCount} images for user ${userId}`)
  return deletedCount
}

/**
 * Generate a public URL for an R2 object
 * @param key - R2 object key
 * @param env - Cloudflare environment bindings
 * @returns Public URL
 */
export function getPublicUrl(
  key: string,
  env: CloudflareEnv
): string {
  return env.R2_PUBLIC_URL
    ? `${env.R2_PUBLIC_URL}/${key}`
    : `https://images.mstprmpt.zeidgeist.com/${key}`
}

/**
 * Validate image file type and size
 * @param file - File to validate
 * @param maxSizeMB - Maximum file size in MB (default 10MB)
 * @returns Validation result
 */
export function validateImageFile(
  file: File | Blob,
  maxSizeMB: number = 10
): { valid: boolean; error?: string } {
  const maxBytes = maxSizeMB * 1024 * 1024
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

  // Check file size
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`
    }
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: JPEG, PNG, WebP`
    }
  }

  return { valid: true }
}

/**
 * Extract image dimensions from file
 * @param file - Image file
 * @returns Width and height
 */
export async function getImageDimensions(
  file: File | Blob
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.width, height: img.height })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}
