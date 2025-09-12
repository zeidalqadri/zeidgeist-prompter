#!/usr/bin/env node
/**
 * Environment Variable Type Validation Script
 * 
 * Scans TypeScript files for environment variable usage and validates
 * that all accessed environment variables are properly typed.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Known environment variable patterns
const ENV_PATTERNS = [
  /env\.([A-Z_]+)/g,
  /process\.env\.([A-Z_]+)/g,
  /process\.env\[['"]([A-Z_]+)['"]\]/g
];

// Environment interface files to check
const ENV_INTERFACES = [
  'functions/api/debug/api-keys.ts',
  'functions/_shared/llm-enhancer.ts'
];

/**
 * Find all TypeScript files
 */
function findTypeScriptFiles() {
  try {
    const result = execSync('find . -name "*.ts" -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./dist/*" -not -name "*.d.ts"', { encoding: 'utf8' });
    return result.trim().split('\n').filter(f => f);
  } catch (e) {
    console.warn('Using fallback file discovery');
    return ['functions/_shared/llm-enhancer.ts', 'functions/api/debug/api-keys.ts'];
  }
}

/**
 * Extract environment variables from TypeScript files
 */
function extractEnvVars(filePath) {
  if (!fs.existsSync(filePath)) return [];
  
  const content = fs.readFileSync(filePath, 'utf8');
  const envVars = new Set();
  
  ENV_PATTERNS.forEach(pattern => {
    let match;
    const globalPattern = new RegExp(pattern.source, 'g');
    while ((match = globalPattern.exec(content)) !== null) {
      envVars.add(match[1]);
    }
  });
  
  return Array.from(envVars);
}

/**
 * Extract defined environment variables from interface files
 */
function extractDefinedEnvVars(interfaceFile) {
  if (!fs.existsSync(interfaceFile)) {
    return [];
  }
  
  const content = fs.readFileSync(interfaceFile, 'utf8');
  const envVars = [];
  
  // Match interface Env { VAR_NAME?: string; }
  const interfaceMatch = content.match(/interface\s+Env\s*\{([^}]+)\}/s);
  if (interfaceMatch) {
    const interfaceContent = interfaceMatch[1];
    const varMatches = interfaceContent.matchAll(/([A-Z_]+)\??:\s*string/g);
    
    for (const match of varMatches) {
      envVars.push(match[1]);
    }
  }
  
  return envVars;
}

/**
 * Main validation function
 */
function validateEnvironmentVariables() {
  console.log('🔍 Validating environment variable types...\n');
  
  // Find all TypeScript files
  const tsFiles = findTypeScriptFiles();
  
  // Extract all used environment variables
  const usedEnvVars = new Set();
  const fileUsage = {};
  
  tsFiles.forEach(file => {
    const vars = extractEnvVars(file);
    if (vars.length > 0) {
      fileUsage[file] = vars;
      vars.forEach(v => usedEnvVars.add(v));
    }
  });
  
  // Extract all defined environment variables
  const definedEnvVars = new Set();
  ENV_INTERFACES.forEach(interfaceFile => {
    const vars = extractDefinedEnvVars(interfaceFile);
    vars.forEach(v => definedEnvVars.add(v));
  });
  
  // Find missing type definitions
  const missingTypes = Array.from(usedEnvVars).filter(v => !definedEnvVars.has(v));
  
  // Report results
  console.log(`📊 Environment Variable Analysis:`);
  console.log(`   Used variables: ${usedEnvVars.size}`);
  console.log(`   Defined types: ${definedEnvVars.size}`);
  console.log(`   Missing types: ${missingTypes.length}\n`);
  
  if (missingTypes.length > 0) {
    console.log('❌ Missing type definitions:');
    missingTypes.forEach(varName => {
      console.log(`   ${varName}`);
      
      // Show where it's used
      Object.entries(fileUsage).forEach(([file, vars]) => {
        if (vars.includes(varName)) {
          console.log(`     → used in ${file}`);
        }
      });
    });
    
    console.log('\n💡 To fix, add these to your Env interface:');
    missingTypes.forEach(varName => {
      console.log(`   ${varName}?: string;`);
    });
    
    console.log('\n🔧 Suggested interface addition:');
    console.log('interface Env {');
    Array.from(definedEnvVars).concat(missingTypes).sort().forEach(varName => {
      console.log(`  ${varName}?: string;`);
    });
    console.log('}');
    
    process.exit(1);
  } else {
    console.log('✅ All environment variables have proper type definitions!');
    console.log('\n📋 Current environment variables:');
    Array.from(definedEnvVars).sort().forEach(varName => {
      console.log(`   ✓ ${varName}`);
    });
  }
}

// Run validation
validateEnvironmentVariables();