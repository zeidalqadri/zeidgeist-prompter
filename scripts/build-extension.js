#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const EXTENSION_DIR = path.join(ROOT_DIR, 'extension');
const PUBLIC_EXTENSION_DIR = path.join(ROOT_DIR, 'public', 'extension');
const ZIP_FILENAME = 'mstprmpt-extension.zip';

console.log('Building Chrome extension for webapp download...\n');

// Step 1: Build and zip the extension
console.log('1. Building extension...');
try {
  execSync('npm run zip', { cwd: EXTENSION_DIR, stdio: 'inherit' });
} catch (error) {
  console.error('Failed to build extension:', error.message);
  process.exit(1);
}

// Step 2: Create public/extension directory if needed
console.log('\n2. Creating public/extension directory...');
if (!fs.existsSync(PUBLIC_EXTENSION_DIR)) {
  fs.mkdirSync(PUBLIC_EXTENSION_DIR, { recursive: true });
  console.log('   Created:', PUBLIC_EXTENSION_DIR);
} else {
  console.log('   Already exists:', PUBLIC_EXTENSION_DIR);
}

// Step 3: Copy the ZIP to public folder
console.log('\n3. Copying extension ZIP to public folder...');
const sourceZip = path.join(EXTENSION_DIR, ZIP_FILENAME);
const destZip = path.join(PUBLIC_EXTENSION_DIR, ZIP_FILENAME);

if (!fs.existsSync(sourceZip)) {
  console.error('Source ZIP not found:', sourceZip);
  process.exit(1);
}

fs.copyFileSync(sourceZip, destZip);
console.log('   Copied:', sourceZip);
console.log('   To:', destZip);

// Step 4: Verify
const stats = fs.statSync(destZip);
console.log('\nExtension prepared for download:');
console.log('   Path: /extension/' + ZIP_FILENAME);
console.log('   Size:', (stats.size / 1024).toFixed(1), 'KB');
