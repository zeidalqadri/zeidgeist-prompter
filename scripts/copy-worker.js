#!/usr/bin/env node
/**
 * Copy OpenNext worker.js to _worker.js for Cloudflare Pages
 * This ensures the worker is deployed alongside static assets
 */

const fs = require('fs');
const path = require('path');

const workerSource = path.join(__dirname, '../.open-next/worker.js');
const workerDest = path.join(__dirname, '../.open-next/assets/_worker.js');

try {
  // Check if source exists
  if (!fs.existsSync(workerSource)) {
    console.error('❌ worker.js not found at:', workerSource);
    console.error('Make sure to run: npx opennextjs-cloudflare build');
    process.exit(1);
  }

  // Copy worker file
  fs.copyFileSync(workerSource, workerDest);
  console.log('✅ Copied worker.js to _worker.js');
  console.log(`   Source: ${workerSource}`);
  console.log(`   Dest:   ${workerDest}`);

} catch (error) {
  console.error('❌ Error copying worker:', error.message);
  process.exit(1);
}
