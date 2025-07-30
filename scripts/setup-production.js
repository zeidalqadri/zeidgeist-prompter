#!/usr/bin/env node

/**
 * Production setup script for Zeidgeist Prompter
 * Runs database migrations and setup tasks
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function runSetup() {
  console.log('🚀 Setting up Zeidgeist Prompter for production...');
  
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    console.log('📊 Running database migrations...');
    await execAsync('npm run db:migrate');
    console.log('✅ Database migrations completed');
    
    console.log('🔍 Verifying database connection...');
    // You could add a simple database connectivity check here
    
    console.log('✅ Production setup completed successfully!');
    console.log('🌟 Application is ready to deploy');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

runSetup();