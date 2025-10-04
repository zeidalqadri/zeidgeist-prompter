// Initialize OpenNext Cloudflare for local development only
if (process.env.NODE_ENV !== 'production') {
  try {
    const { initOpenNextCloudflareForDev } = require('@opennextjs/cloudflare');
    initOpenNextCloudflareForDev();
  } catch (e) {
    // @opennextjs/cloudflare not available (e.g., in CI with --production flag)
  }
}

/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production'

const buildCsp = () => {
  if (isDev) {
    return "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdn.jsdelivr.net https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' http://localhost:8788 https://cloudflareinsights.com https://mstprmpt.zeidgeist.com https://zeidgeist-prompter-api.zeidalqadri.workers.dev https://zeidgeist-prompter-api-preview.zeidalqadri.workers.dev ws: wss: https://aipromptise.pages.dev https://api.claude.ai https://api.openai.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';";
  }
  return "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://cloudflareinsights.com https://mstprmpt.zeidgeist.com https://zeidgeist-prompter-api.zeidalqadri.workers.dev https://zeidgeist-prompter-api-preview.zeidalqadri.workers.dev https://aipromptise.pages.dev https://api.claude.ai https://api.openai.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';"
}

const nextConfig = {
  // OpenNext requires standalone output
  output: 'standalone',
  trailingSlash: true,
  
  // Performance optimizations
  compress: true,
  
  // Additional performance optimizations
  poweredByHeader: false,
  generateEtags: false,
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Images must be unoptimized for Cloudflare Pages static export
  images: {
    unoptimized: true, // Required for static export
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Let OpenNext handle chunk splitting - custom splitChunks breaks bundler
    // Only apply tree-shaking optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        moduleIds: 'deterministic',
      }

      // Bundle analyzer in development
      if (process.env.ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
          })
        )
      }
    }

    return config
  },
  
  // Experimental features for better performance
  experimental: {
    optimizeCss: false,
    webVitalsAttribution: ['CLS', 'LCP'],
    scrollRestoration: true,
    optimizePackageImports: ['lucide-react'],
  },
  
  // Headers for better caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options', 
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: buildCsp(),
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          }
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ],
      }
    ]
  },
  
  // Disable ESLint during build for production
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig
