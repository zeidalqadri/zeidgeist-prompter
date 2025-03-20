/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: process.env.BASE_PATH || '/prompter',
  assetPrefix: process.env.BASE_PATH || '/prompter',
}

module.exports = nextConfig
