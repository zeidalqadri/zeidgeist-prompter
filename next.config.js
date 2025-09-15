/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production'

const buildCsp = () => {
  if (isDev) {
    return "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdn.jsdelivr.net https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' http://localhost:8788 https://mstprmpt.zeidgeist.com https://zeidgeist-prompter-api.zeidalqadri.workers.dev https://zeidgeist-prompter-api-preview.zeidalqadri.workers.dev ws: wss: https://aipromptise.pages.dev https://api.claude.ai https://api.openai.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';";
  }
  return "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://mstprmpt.zeidgeist.com https://zeidgeist-prompter-api.zeidalqadri.workers.dev https://zeidgeist-prompter-api-preview.zeidalqadri.workers.dev https://aipromptise.pages.dev https://api.claude.ai https://api.openai.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';"
}

const nextConfig = {
  // Enable static exports for Cloudflare Pages only in production
  output: isDev ? undefined : 'export',
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
    // Production optimizations - consolidated configuration
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            // Default cache group with proper priority
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            // Common chunks for shared code
            common: {
              name: 'common',
              minChunks: 2,
              priority: -15,
              chunks: 'all',
              enforce: true,
            },
            // Vendor chunks for node_modules
            vendor: {
              test: /[\/]node_modules[\/]/,
              name: 'vendors',
              priority: -10,
              chunks: 'all',
            },
            // Separate React runtime for better caching
            react: {
              test: /[\/]node_modules[\/](react|react-dom)[\/]/,
              name: 'react',
              priority: 20,
              chunks: 'all',
            },
          },
        },
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
