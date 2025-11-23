/**
 * Optimized Image Component
 *
 * React component with:
 * - Automatic format selection (WebP/AVIF)
 * - Lazy loading with Intersection Observer
 * - Responsive images with srcset
 * - Loading placeholder
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { CloudflareImages, ImageTransformOptions } from '../lib/cloudflare-images'

interface OptimizedImageProps {
  imageId: string
  alt: string
  className?: string
  width?: number
  height?: number
  priority?: boolean // Disable lazy loading for above-fold images
  sizes?: string
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  onLoad?: () => void
  placeholder?: 'blur' | 'empty'
}

export function OptimizedImage({
  imageId,
  alt,
  className = '',
  width,
  height,
  priority = false,
  sizes = '100vw',
  objectFit = 'cover',
  onLoad,
  placeholder = 'blur'
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(priority) // Load immediately if priority
  const imgRef = useRef<HTMLImageElement>(null)

  // Lazy loading with Intersection Observer
  useEffect(() => {
    if (priority || !imgRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '50px' // Start loading 50px before entering viewport
      }
    )

    observer.observe(imgRef.current)

    return () => observer.disconnect()
  }, [priority])

  // Initialize Cloudflare Images
  const cfImages = new CloudflareImages({
    accountId: process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID || '',
    accountHash: process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_HASH || ''
  })

  // Generate image URLs
  const transformOptions: ImageTransformOptions = {
    format: 'auto', // Auto-select WebP/AVIF based on browser support
    quality: 85,
    fit: objectFit,
    width,
    height
  }

  const srcSet = cfImages.getResponsiveSrcSet(imageId, undefined, transformOptions)
  const src = cfImages.getImageUrl(imageId, transformOptions)

  // Blur placeholder URL (low quality, small size)
  const placeholderUrl = placeholder === 'blur'
    ? cfImages.getImageUrl(imageId, {
        width: 40,
        quality: 10,
        blur: 10,
        format: 'auto'
      })
    : undefined

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto'
      }}
    >
      {/* Blur placeholder */}
      {placeholderUrl && !isLoaded && (
        <img
          src={placeholderUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-xl scale-110"
          aria-hidden="true"
        />
      )}

      {/* Main image */}
      <img
        ref={imgRef}
        src={isInView ? src : undefined}
        srcSet={isInView ? srcSet : undefined}
        sizes={sizes}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={handleLoad}
        className={`
          w-full h-full transition-opacity duration-300
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
          ${objectFit === 'cover' ? 'object-cover' : ''}
          ${objectFit === 'contain' ? 'object-contain' : ''}
          ${objectFit === 'fill' ? 'object-fill' : ''}
          ${objectFit === 'scale-down' ? 'object-scale-down' : ''}
        `}
        style={{
          objectFit: objectFit
        }}
      />

      {/* Loading skeleton */}
      {!isLoaded && placeholder === 'empty' && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse"
          aria-hidden="true"
        />
      )}
    </div>
  )
}

/**
 * Example usage:
 *
 * <OptimizedImage
 *   imageId="your-image-id"
 *   alt="Description"
 *   width={800}
 *   height={600}
 *   priority={true} // For above-the-fold images
 *   sizes="(max-width: 768px) 100vw, 50vw"
 * />
 */
