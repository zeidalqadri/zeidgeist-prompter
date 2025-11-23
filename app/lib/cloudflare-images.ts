/**
 * Cloudflare Images Integration
 *
 * Provides automatic image optimization with:
 * - Format conversion (WebP/AVIF)
 * - Responsive sizing
 * - Lazy loading
 * - Edge caching
 */

export interface ImageTransformOptions {
  width?: number
  height?: number
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad'
  format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png'
  quality?: number // 1-100
  blur?: number
  sharpen?: number
  metadata?: 'keep' | 'copyright' | 'none'
}

export interface CloudflareImageConfig {
  accountId: string
  accountHash: string
  variant?: string
}

export class CloudflareImages {
  constructor(private config: CloudflareImageConfig) {}

  /**
   * Generate Cloudflare Images URL with transformations
   */
  getImageUrl(
    imageId: string,
    options: ImageTransformOptions = {}
  ): string {
    const { accountHash, variant } = this.config

    // Base URL format: https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/<VARIANT>
    const baseUrl = `https://imagedelivery.net/${accountHash}/${imageId}`

    // Use variant or construct URL parameters
    if (variant) {
      return `${baseUrl}/${variant}`
    }

    // Construct parameters
    const params: string[] = []

    if (options.width) params.push(`w=${options.width}`)
    if (options.height) params.push(`h=${options.height}`)
    if (options.fit) params.push(`fit=${options.fit}`)
    if (options.format) params.push(`format=${options.format}`)
    if (options.quality) params.push(`quality=${options.quality}`)
    if (options.blur) params.push(`blur=${options.blur}`)
    if (options.sharpen) params.push(`sharpen=${options.sharpen}`)
    if (options.metadata) params.push(`metadata=${options.metadata}`)

    const queryString = params.length > 0 ? `?${params.join('&')}` : ''
    return `${baseUrl}/public${queryString}`
  }

  /**
   * Generate responsive image srcset
   */
  getResponsiveSrcSet(
    imageId: string,
    widths: number[] = [320, 640, 960, 1280, 1920],
    options: Omit<ImageTransformOptions, 'width'> = {}
  ): string {
    return widths
      .map(width => {
        const url = this.getImageUrl(imageId, { ...options, width })
        return `${url} ${width}w`
      })
      .join(', ')
  }

  /**
   * Upload image to Cloudflare Images
   */
  async uploadImage(
    file: File | Blob,
    metadata: Record<string, string> = {}
  ): Promise<{ id: string; variants: string[] }> {
    const { accountId } = this.config

    const formData = new FormData()
    formData.append('file', file)
    formData.append('metadata', JSON.stringify(metadata))

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`
        },
        body: formData
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      id: data.result.id,
      variants: data.result.variants
    }
  }

  /**
   * Delete image from Cloudflare Images
   */
  async deleteImage(imageId: string): Promise<void> {
    const { accountId } = this.config

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to delete image: ${response.statusText}`)
    }
  }

  /**
   * Create variants (presets) for common use cases
   */
  static createVariants() {
    return {
      thumbnail: {
        width: 200,
        height: 200,
        fit: 'cover' as const,
        format: 'auto' as const
      },
      small: {
        width: 640,
        fit: 'scale-down' as const,
        format: 'auto' as const
      },
      medium: {
        width: 1280,
        fit: 'scale-down' as const,
        format: 'auto' as const
      },
      large: {
        width: 1920,
        fit: 'scale-down' as const,
        format: 'auto' as const,
        quality: 85
      },
      hero: {
        width: 2560,
        height: 1440,
        fit: 'cover' as const,
        format: 'auto' as const,
        quality: 90
      }
    }
  }
}

/**
 * Initialize Cloudflare Images from environment
 */
export function initCloudflareImages(env?: any): CloudflareImages | null {
  const accountId = env?.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID
  const accountHash = env?.CLOUDFLARE_IMAGES_HASH || process.env.CLOUDFLARE_IMAGES_HASH

  if (!accountId || !accountHash) {
    console.warn('[CloudflareImages] Missing configuration, image optimization disabled')
    return null
  }

  return new CloudflareImages({ accountId, accountHash })
}
