/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: process.env.BASE_PATH || '',
  assetPrefix: process.env.BASE_PATH || '',
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Ensure TypeScript path mapping works in production builds
    typedRoutes: true,
  },
  webpack: (config, { isServer }) => {
    // Explicitly handle TypeScript path aliases in webpack
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, '.'),
    };
    return config;
  },
}

module.exports = nextConfig
