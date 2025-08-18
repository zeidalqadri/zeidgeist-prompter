/** @type {import('next').NextConfig} */

// Cloudflare Pages optimized Next.js configuration
const nextConfig = {
  // Output configuration for Cloudflare Pages
  output: 'export',
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
    loader: 'custom',
    loaderFile: './lib/cloudflare-image-loader.js'
  },
  
  // Trailing slash for consistent routing
  trailingSlash: true,
  
  // Asset prefix for CDN optimization
  assetPrefix: process.env.NODE_ENV === 'production' 
    ? 'https://preview.zeidgeist-prompter.pages.dev'
    : undefined,
  
  // Base path configuration
  basePath: process.env.BASE_PATH || '',
  
  // Disable server-side features not supported in static export
  experimental: {
    // Enable Edge Runtime where possible
    runtime: 'nodejs',
    
    // Optimize for Cloudflare Pages
    optimizeCss: true,
    optimizeServerReact: false,
    
    // Enable modern JavaScript features
    esmExternals: true,
    
    // Turbopack for faster builds (in development)
    turbo: {
      resolveAlias: {
        'react-dom/server': 'react-dom/server.edge'
      }
    }
  },
  
  // Webpack configuration for Cloudflare optimization
  webpack: (config, { dev, isServer, webpack }) => {
    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
          },
          common: {
            name: 'common',
            priority: 5,
            minChunks: 2,
            reuseExistingChunk: true,
          }
        }
      };
    }
    
    // Add module resolution for CL4R1T4S DI system
    config.resolve.alias = {
      ...config.resolve.alias,
      '@cl4r1tas': './app/lib/enhanced-architecture/di',
      '@components': './components',
      '@lib': './lib'
    };
    
    // Optimize for Edge Runtime compatibility
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    
    return config;
  },
  
  // Environment variables available to the client
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT,
    NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    NEXT_PUBLIC_ENABLE_DEBUG: process.env.NEXT_PUBLIC_ENABLE_DEBUG,
  },
  
  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security headers
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          // Performance headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          }
        ]
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'development' 
              ? '*' 
              : 'https://preview.zeidgeist-prompter.pages.dev'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-API-Key'
          }
        ]
      },
      {
        // Cache static assets
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  },
  
  // Redirects for SEO and UX
  async redirects() {
    return [
      {
        source: '/prompter',
        destination: '/',
        permanent: true
      },
      {
        source: '/enhance',
        destination: '/',
        permanent: true  
      }
    ];
  },
  
  // Rewrites for API routing (in development)
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:8787/api/:path*' // Local Wrangler dev server
        }
      ];
    }
    return [];
  },
  
  // Compiler options for optimization
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
    
    // Enable React compiler optimizations
    reactRemoveProperties: process.env.NODE_ENV === 'production',
    
    // Minify CSS
    styledComponents: true
  },
  
  // TypeScript configuration
  typescript: {
    // Type checking during build
    ignoreBuildErrors: false
  },
  
  // ESLint configuration
  eslint: {
    // Lint during build
    ignoreDuringBuilds: false,
    dirs: ['components', 'lib', 'app']
  },
  
  // PoweredByHeader
  poweredByHeader: false,
  
  // Generate build ID for cache busting
  generateBuildId: async () => {
    // Use git commit hash if available, otherwise use timestamp
    try {
      const { execSync } = require('child_process');
      const gitHash = execSync('git rev-parse --short HEAD').toString().trim();
      return `build-${gitHash}`;
    } catch {
      return `build-${Date.now()}`;
    }
  },
  
  // Optimize fonts
  optimizeFonts: true,
  
  // Enable SWC minification
  swcMinify: true,
  
  // Compress responses
  compress: true,
  
  // HTTP keep-alive
  httpAgentOptions: {
    keepAlive: true
  }
};

module.exports = nextConfig;