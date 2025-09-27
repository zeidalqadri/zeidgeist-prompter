#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { performance } = require('perf_hooks');

const startTime = performance.now();
console.log('🚀 Starting optimized Cloudflare Pages build process...');

// Clean up any existing build directories
console.log('🧹 Cleaning up old build directories...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
if (fs.existsSync('out')) {
  fs.rmSync('out', { recursive: true, force: true });
}

// Set environment variables for optimal build
process.env.NODE_ENV = 'production';
process.env.NEXT_TELEMETRY_DISABLED = '1';

// Run Next.js build with optimizations
console.log('🏗️  Building Next.js application with optimizations...');
try {
  const buildCommand = 'next build';
  console.log(`Executing: ${buildCommand}`);
  execSync(buildCommand, { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=4096'
    }
  });
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

// Sanitize build output: remove unintended hidden artifacts
try {
  const hiddenDirsToRemove = ['.claude', '.claude-backup'];
  for (const dir of hiddenDirsToRemove) {
    const p = path.join('dist', dir);
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true, force: true });
      console.log(`🧹 Removed hidden build artifact: ${dir}`);
    }
  }
} catch (err) {
  console.warn('⚠️  Failed to sanitize hidden artifacts:', err.message);
}

// Optimize static assets
console.log('⚡ Optimizing static assets...');
try {
  // Compress CSS and JS files if available
  const staticDir = path.join('dist', '_next', 'static');
  if (fs.existsSync(staticDir)) {
    console.log('📦 Found static assets directory');
    // Note: Cloudflare will handle compression, just verify structure
  }
  
  // Check for and optimize any large files
  const checkFileSize = (dir, files = []) => {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        checkFileSize(fullPath, files);
      } else if (stat.size > 1024 * 1024) { // Files > 1MB
        files.push({ path: fullPath.replace('dist/', ''), size: stat.size });
      }
    }
    return files;
  };
  
  const largeFiles = checkFileSize('dist');
  if (largeFiles.length > 0) {
    console.log('⚠️  Large files detected (>1MB):');
    largeFiles.forEach(file => {
      console.log(`  📄 ${file.path}: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    });
  }
} catch (error) {
  console.warn('⚠️  Asset optimization step failed:', error.message);
}

const endTime = performance.now();
const buildTime = ((endTime - startTime) / 1000).toFixed(2);

console.log(`✅ Build completed successfully in ${buildTime}s!`);
console.log('📁 Build output is in the "dist" directory');

// List the contents of dist for verification with sizes
console.log('\n📋 Build output contents:');
const listDirectory = (dir, prefix = '') => {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    const size = stat.isFile() ? ` (${(stat.size / 1024).toFixed(1)}KB)` : '';
    console.log(`  ${prefix}${stat.isDirectory() ? '📁' : '📄'} ${file}${size}`);
    
    // Show first level of subdirectories
    if (stat.isDirectory() && prefix === '' && ['_next', 'api'].includes(file)) {
      listDirectory(fullPath, '  ');
    }
  });
};

listDirectory('dist');

console.log(`\n🎯 Performance Summary:`);
console.log(`  Build Time: ${buildTime}s`);
console.log(`  Output Size: ${getDirSize('dist')}`);

function getDirSize(dir) {
  let size = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      size += getDirSizeRecursive(fullPath);
    } else {
      size += stat.size;
    }
  }
  return (size / 1024 / 1024).toFixed(2) + 'MB';
}

function getDirSizeRecursive(dir) {
  let size = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      size += getDirSizeRecursive(fullPath);
    } else {
      size += stat.size;
    }
  }
  return size;
}
