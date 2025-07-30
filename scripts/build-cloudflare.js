#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting Cloudflare Pages build process...');

// Clean up any existing build directories
console.log('🧹 Cleaning up old build directories...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
if (fs.existsSync('out')) {
  fs.rmSync('out', { recursive: true, force: true });
}

// Run Next.js build
console.log('🏗️  Building Next.js application...');
try {
  execSync('next build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Next.js build failed:', error.message);
  process.exit(1);
}

// Check if out directory was created
if (!fs.existsSync('out')) {
  console.error('❌ Next.js build did not create "out" directory');
  process.exit(1);
}

// Copy _routes.json to out directory
console.log('📋 Copying _routes.json...');
if (fs.existsSync('_routes.json')) {
  fs.copyFileSync('_routes.json', 'out/_routes.json');
} else {
  console.warn('⚠️  _routes.json not found, API routes may not work correctly');
}

// Copy _headers to out directory
console.log('📋 Copying _headers...');
if (fs.existsSync('_headers')) {
  fs.copyFileSync('_headers', 'out/_headers');
} else {
  console.warn('⚠️  _headers not found, security headers may not be applied');
}

// Rename out to dist
console.log('📁 Moving build output to dist directory...');
fs.renameSync('out', 'dist');

// Verify the build
console.log('✅ Verifying build output...');
const requiredFiles = ['dist/index.html', 'dist/_routes.json'];
const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.error('❌ Build verification failed. Missing files:', missingFiles);
  process.exit(1);
}

// Check for 404.html
if (!fs.existsSync('dist/404.html')) {
  console.log('📄 Creating 404.html from not-found page...');
  // Next.js might generate it as not-found.html
  if (fs.existsSync('dist/not-found.html')) {
    fs.copyFileSync('dist/not-found.html', 'dist/404.html');
  } else {
    console.warn('⚠️  No 404.html found, using index.html as fallback');
    fs.copyFileSync('dist/index.html', 'dist/404.html');
  }
}

console.log('✅ Build completed successfully!');
console.log('📁 Build output is in the "dist" directory');

// List the contents of dist for verification
console.log('\n📋 Build output contents:');
const files = fs.readdirSync('dist');
files.forEach(file => {
  const stat = fs.statSync(path.join('dist', file));
  console.log(`  ${stat.isDirectory() ? '📁' : '📄'} ${file}`);
});