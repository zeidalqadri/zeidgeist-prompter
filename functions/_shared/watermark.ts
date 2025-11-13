/**
 * Image Watermarking System
 * Applies mstprmpt.zeidgeist.com logo watermark to images
 *
 * Note: This implementation uses Canvas API for Cloudflare Workers compatibility
 * For production with large images, consider using a dedicated image processing service
 */

export interface WatermarkOptions {
  opacity?: number // 0-1, default 0.2
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  padding?: number // pixels, default 10
  scale?: number // logo scale factor, default 0.15 (15% of image width)
}

/**
 * Apply watermark to an image
 * @param imageBlob - Input image as Blob
 * @param logoUrl - URL or path to watermark logo
 * @param options - Watermark positioning and styling options
 * @returns Watermarked image as Blob
 */
export async function applyWatermark(
  imageBlob: Blob,
  logoUrl: string,
  options: WatermarkOptions = {}
): Promise<Blob> {
  const {
    opacity = 0.2,
    position = 'top-left',
    padding = 10,
    scale = 0.15
  } = options

  try {
    // Load the original image
    const imageBitmap = await createImageBitmap(imageBlob)
    const imageWidth = imageBitmap.width
    const imageHeight = imageBitmap.height

    // Create canvas
    const canvas = new OffscreenCanvas(imageWidth, imageHeight)
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    // Draw original image
    ctx.drawImage(imageBitmap, 0, 0)

    // Load watermark logo
    const logoResponse = await fetch(logoUrl)
    const logoBlob = await logoResponse.blob()
    const logoBitmap = await createImageBitmap(logoBlob)

    // Calculate logo dimensions (scale based on image width)
    const logoMaxWidth = imageWidth * scale
    const logoAspectRatio = logoBitmap.width / logoBitmap.height
    const logoWidth = logoMaxWidth
    const logoHeight = logoMaxWidth / logoAspectRatio

    // Calculate position
    let x: number, y: number

    switch (position) {
      case 'top-left':
        x = padding
        y = padding
        break
      case 'top-right':
        x = imageWidth - logoWidth - padding
        y = padding
        break
      case 'bottom-left':
        x = padding
        y = imageHeight - logoHeight - padding
        break
      case 'bottom-right':
        x = imageWidth - logoWidth - padding
        y = imageHeight - logoHeight - padding
        break
      default:
        x = padding
        y = padding
    }

    // Apply opacity
    ctx.globalAlpha = opacity

    // Draw watermark
    ctx.drawImage(logoBitmap, x, y, logoWidth, logoHeight)

    // Reset opacity
    ctx.globalAlpha = 1.0

    // Convert canvas to Blob
    const watermarkedBlob = await canvas.convertToBlob({
      type: imageBlob.type || 'image/png',
      quality: 0.95
    })

    console.log(`✅ Applied watermark: ${position}, opacity: ${opacity}`)

    return watermarkedBlob

  } catch (error) {
    console.error('❌ Watermark application failed:', error)
    // Return original image if watermarking fails
    return imageBlob
  }
}

/**
 * Apply mstprmpt.zeidgeist.com watermark to an image
 * Uses default branding settings
 * @param imageBlob - Input image as Blob
 * @returns Watermarked image as Blob
 */
export async function applyBrandWatermark(
  imageBlob: Blob
): Promise<Blob> {
  // In Cloudflare Workers, we need to use a public URL for the logo
  const logoUrl = 'https://mstprmpt.zeidgeist.com/icon-192.png'

  return await applyWatermark(imageBlob, logoUrl, {
    opacity: 0.2,
    position: 'top-left',
    padding: 10,
    scale: 0.12
  })
}

/**
 * Apply watermark from base64 data URL
 * Useful when logo is embedded
 * @param imageBlob - Input image as Blob
 * @param logoDataUrl - Logo as base64 data URL
 * @param options - Watermark options
 * @returns Watermarked image as Blob
 */
export async function applyWatermarkFromDataUrl(
  imageBlob: Blob,
  logoDataUrl: string,
  options: WatermarkOptions = {}
): Promise<Blob> {
  // Convert data URL to blob
  const logoResponse = await fetch(logoDataUrl)
  const logoBlob = await logoResponse.blob()

  // Create temporary object URL
  const logoUrl = URL.createObjectURL(logoBlob)

  try {
    const result = await applyWatermark(imageBlob, logoUrl, options)
    URL.revokeObjectURL(logoUrl)
    return result
  } catch (error) {
    URL.revokeObjectURL(logoUrl)
    throw error
  }
}

/**
 * Batch watermark multiple images
 * @param images - Array of image blobs
 * @param options - Watermark options
 * @returns Array of watermarked blobs
 */
export async function batchWatermark(
  images: Blob[],
  options: WatermarkOptions = {}
): Promise<Blob[]> {
  const watermarked: Blob[] = []

  for (const image of images) {
    const result = await applyBrandWatermark(image)
    watermarked.push(result)
  }

  console.log(`✅ Watermarked ${watermarked.length} images`)

  return watermarked
}

/**
 * Alternative: Text watermark for lightweight implementation
 * @param imageBlob - Input image as Blob
 * @param text - Watermark text (default: "mstprmpt.zeidgeist.com")
 * @returns Watermarked image as Blob
 */
export async function applyTextWatermark(
  imageBlob: Blob,
  text: string = 'mstprmpt.zeidgeist.com'
): Promise<Blob> {
  try {
    const imageBitmap = await createImageBitmap(imageBlob)
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height)
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    // Draw original image
    ctx.drawImage(imageBitmap, 0, 0)

    // Configure text watermark
    const fontSize = Math.max(12, imageBitmap.width * 0.02)
    ctx.font = `${fontSize}px sans-serif`
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.lineWidth = 2

    // Position at top-left
    const x = 10
    const y = fontSize + 10

    // Draw text with outline
    ctx.strokeText(text, x, y)
    ctx.fillText(text, x, y)

    // Convert to blob
    const watermarkedBlob = await canvas.convertToBlob({
      type: imageBlob.type || 'image/png',
      quality: 0.95
    })

    console.log(`✅ Applied text watermark: "${text}"`)

    return watermarkedBlob

  } catch (error) {
    console.error('❌ Text watermark application failed:', error)
    return imageBlob
  }
}
