/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static exports for Cloudflare Pages
  output: 'export',
  trailingSlash: true,
  
  // Optimize images for Cloudflare
  images: {
    unoptimized: true,
  },
  
  // Disable ESLint during build for production
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig