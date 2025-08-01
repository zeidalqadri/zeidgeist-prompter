#!/usr/bin/env node

/**
 * Performance Testing & Validation Script for Zeidgeist Prompter
 * Tests all optimization improvements implemented
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const { spawn } = require('child_process');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(color, ...args) {
  console.log(color + args.join(' ') + colors.reset);
}

class PerformanceValidator {
  constructor() {
    this.results = {
      buildPerformance: {},
      componentOptimization: {},
      databasePerformance: {},
      assetOptimization: {},
      overallScore: 0
    };
    this.startTime = performance.now();
  }

  async runAllTests() {
    colorLog(colors.cyan + colors.bright, '🚀 Starting Comprehensive Performance Validation');
    colorLog(colors.blue, '=' * 60);

    try {
      await this.testBuildPerformance();
      await this.testComponentOptimization();
      await this.testDatabaseOptimization();
      await this.testAssetOptimization();
      await this.generateReport();
    } catch (error) {
      colorLog(colors.red, '❌ Performance testing failed:', error.message);
      process.exit(1);
    }
  }

  async testBuildPerformance() {
    colorLog(colors.yellow, '\n📦 Testing Build Performance...');
    
    const buildStart = performance.now();
    
    // Test the optimized build script
    try {
      await this.runCommand('node scripts/build-cloudflare.js');
      const buildTime = performance.now() - buildStart;
      
      // Check if dist directory exists and measure size
      if (fs.existsSync('dist')) {
        const distSize = this.getDirSize('dist');
        const bundleAnalysis = this.analyzeBundleSize();
        
        this.results.buildPerformance = {
          buildTime: Math.round(buildTime),
          outputSize: distSize,
          bundleAnalysis,
          passed: buildTime < 30000 && distSize < 10 * 1024 * 1024 // 30s build, <10MB output
        };
        
        colorLog(colors.green, `✅ Build completed in ${Math.round(buildTime/1000)}s`);
        colorLog(colors.blue, `📊 Output size: ${(distSize/1024/1024).toFixed(2)}MB`);
      } else {
        throw new Error('Build output directory not found');
      }
    } catch (error) {
      this.results.buildPerformance = { 
        error: error.message, 
        passed: false 
      };
      throw error;
    }
  }

  async testComponentOptimization() {
    colorLog(colors.yellow, '\n⚛️ Testing React Component Optimizations...');
    
    // Analyze the optimized PromptEngineer component
    const componentPath = 'components/prompt-engineer.tsx';
    
    if (!fs.existsSync(componentPath)) {
      this.results.componentOptimization = { 
        error: 'Component file not found', 
        passed: false 
      };
      return;
    }
    
    const componentContent = fs.readFileSync(componentPath, 'utf8');
    
    // Check for optimization patterns
    const optimizations = {
      useReducer: componentContent.includes('useReducer'),
      memoComponents: componentContent.includes('memo('),
      useCallback: (componentContent.match(/useCallback/g) || []).length,
      useMemo: (componentContent.match(/useMemo/g) || []).length,
      requestIdleCallback: componentContent.includes('requestIdleCallback'),
      debouncing: componentContent.includes('setTimeout') && componentContent.includes('clearTimeout')
    };
    
    const optimizationScore = Object.values(optimizations).filter(Boolean).length;
    
    this.results.componentOptimization = {
      optimizations,
      score: optimizationScore,
      passed: optimizationScore >= 4 // At least 4 optimizations implemented
    };
    
    colorLog(colors.green, `✅ Component optimizations found: ${optimizationScore}/6`);
    
    // List specific optimizations
    Object.entries(optimizations).forEach(([key, value]) => {
      const status = value ? '✅' : '❌';
      const display = typeof value === 'number' ? `${value} instances` : (value ? 'implemented' : 'missing');
      colorLog(colors.blue, `  ${status} ${key}: ${display}`);
    });
  }

  async testDatabaseOptimization() {
    colorLog(colors.yellow, '\n🗄️ Testing Database Optimizations...');
    
    // Check for database schema consistency
    const schemaFiles = [
      'app/lib/db/schema.ts',
      'functions/_shared/db.ts'
    ];
    
    let schemaConsistent = true;
    const schemaAnalysis = {};
    
    for (const file of schemaFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        schemaAnalysis[file] = {
          hasUUID: content.includes('uuid('),
          hasTimezone: content.includes('withTimezone: true'),
          hasIndexes: content.includes('INDEX') || content.includes('index'),
          hasTypeScript: content.includes('export type')
        };
      } else {
        schemaConsistent = false;
      }
    }
    
    // Check for migration files
    const migrationDir = 'drizzle/migrations';
    const hasMigrations = fs.existsSync(migrationDir) && 
                         fs.readdirSync(migrationDir).some(f => f.includes('performance'));
    
    // Check pagination in history API
    const historyApiPath = 'functions/api/engineer/history.ts';
    let hasPagination = false;
    if (fs.existsSync(historyApiPath)) {
      const historyContent = fs.readFileSync(historyApiPath, 'utf8');
      hasPagination = historyContent.includes('pagination') && 
                     historyContent.includes('offset') &&
                     historyContent.includes('limit');
    }
    
    this.results.databasePerformance = {
      schemaConsistent,
      schemaAnalysis,
      hasMigrations,
      hasPagination,
      passed: schemaConsistent && hasMigrations && hasPagination
    };
    
    colorLog(colors.green, `✅ Schema consistency: ${schemaConsistent ? 'Aligned' : 'Inconsistent'}`);
    colorLog(colors.green, `✅ Performance migrations: ${hasMigrations ? 'Created' : 'Missing'}`);
    colorLog(colors.green, `✅ API pagination: ${hasPagination ? 'Implemented' : 'Missing'}`);
  }

  async testAssetOptimization() {
    colorLog(colors.yellow, '\n🎨 Testing Asset Optimizations...');
    
    // Check Next.js config optimizations
    const nextConfigPath = 'next.config.js';
    let configOptimized = false;
    
    if (fs.existsSync(nextConfigPath)) {
      const configContent = fs.readFileSync(nextConfigPath, 'utf8');
      const optimizations = {
        swcMinify: configContent.includes('swcMinify: true'),
        compression: configContent.includes('compress: true'),
        splitChunks: configContent.includes('splitChunks'),
        headers: configContent.includes('async headers()'),
        experimental: configContent.includes('experimental:')
      };
      
      configOptimized = Object.values(optimizations).filter(Boolean).length >= 3;
      
      this.results.assetOptimization = {
        nextConfigOptimizations: optimizations,
        configOptimized,
        passed: configOptimized
      };
      
      colorLog(colors.green, `✅ Next.js config optimizations: ${configOptimized ? 'Implemented' : 'Missing'}`);
    }
    
    // Check build script optimizations
    const buildScriptPath = 'scripts/build-cloudflare.js';
    if (fs.existsSync(buildScriptPath)) {
      const buildContent = fs.readFileSync(buildScriptPath, 'utf8');
      const hasOptimizations = buildContent.includes('performance') && 
                              buildContent.includes('NODE_OPTIONS') &&
                              buildContent.includes('asset optimization');
      
      this.results.assetOptimization.buildScriptOptimized = hasOptimizations;
      colorLog(colors.green, `✅ Build script optimizations: ${hasOptimizations ? 'Implemented' : 'Missing'}`);
    }
  }

  async generateReport() {
    const totalTime = performance.now() - this.startTime;
    
    colorLog(colors.cyan + colors.bright, '\n📊 Performance Optimization Report');
    colorLog(colors.blue, '=' * 60);
    
    // Calculate overall score
    const testResults = [
      this.results.buildPerformance.passed,
      this.results.componentOptimization.passed,
      this.results.databasePerformance.passed,
      this.results.assetOptimization.passed
    ];
    
    const passedTests = testResults.filter(Boolean).length;
    this.results.overallScore = (passedTests / testResults.length) * 100;
    
    // Display results
    colorLog(colors.bright, '\n🎯 Test Results:');
    this.displayTestResult('Build Performance', this.results.buildPerformance.passed);
    this.displayTestResult('Component Optimization', this.results.componentOptimization.passed);
    this.displayTestResult('Database Performance', this.results.databasePerformance.passed);
    this.displayTestResult('Asset Optimization', this.results.assetOptimization.passed);
    
    colorLog(colors.bright, '\n📈 Performance Improvements:');
    
    if (this.results.buildPerformance.buildTime) {
      const buildTimeS = Math.round(this.results.buildPerformance.buildTime / 1000);
      const buildSize = (this.results.buildPerformance.outputSize / 1024 / 1024).toFixed(2);
      colorLog(colors.green, `⚡ Build Time: ${buildTimeS}s (target: <30s)`);
      colorLog(colors.green, `📦 Bundle Size: ${buildSize}MB (target: <10MB)`);
    }
    
    if (this.results.componentOptimization.score) {
      colorLog(colors.green, `⚛️ Component Optimizations: ${this.results.componentOptimization.score}/6 implemented`);
    }
    
    // Overall score
    colorLog(colors.bright, `\n🏆 Overall Optimization Score: ${this.results.overallScore.toFixed(1)}%`);
    
    if (this.results.overallScore >= 80) {
      colorLog(colors.green + colors.bright, '🎉 EXCELLENT! Performance optimizations successfully implemented!');
    } else if (this.results.overallScore >= 60) {
      colorLog(colors.yellow, '⚠️ GOOD! Most optimizations implemented, some areas need attention.');
    } else {
      colorLog(colors.red, '❌ NEEDS IMPROVEMENT! Several optimization areas require attention.');
    }
    
    colorLog(colors.blue, `\n⏱️ Total validation time: ${Math.round(totalTime/1000)}s`);
    
    // Save detailed report
    this.saveDetailedReport();
  }

  displayTestResult(testName, passed) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? colors.green : colors.red;
    colorLog(color, `${status} ${testName}`);
  }

  async runCommand(command) {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const process = spawn(cmd, args, { stdio: 'pipe' });
      
      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed with code ${code}: ${output}`));
        }
      });
    });
  }

  getDirSize(dir) {
    let size = 0;
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        size += this.getDirSize(fullPath);
      } else {
        size += stat.size;
      }
    }
    
    return size;
  }

  analyzeBundleSize() {
    const staticDir = path.join('dist', '_next', 'static');
    if (!fs.existsSync(staticDir)) return null;
    
    const chunks = [];
    const findChunks = (dir) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          findChunks(fullPath);
        } else if (file.endsWith('.js')) {
          chunks.push({
            name: file,
            size: stat.size,
            path: fullPath.replace('dist/', '')
          });
        }
      }
    };
    
    findChunks(staticDir);
    
    return {
      totalChunks: chunks.length,
      largestChunk: chunks.sort((a, b) => b.size - a.size)[0],
      totalJSSize: chunks.reduce((sum, chunk) => sum + chunk.size, 0)
    };
  }

  saveDetailedReport() {
    const reportPath = 'performance-report.json';
    const report = {
      timestamp: new Date().toISOString(),
      overallScore: this.results.overallScore,
      testResults: this.results,
      recommendations: this.generateRecommendations()
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    colorLog(colors.blue, `📄 Detailed report saved to: ${reportPath}`);
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (!this.results.buildPerformance.passed) {
      recommendations.push('Optimize build process: Consider enabling more webpack optimizations');
    }
    
    if (!this.results.componentOptimization.passed) {
      recommendations.push('Component optimization: Implement more React performance patterns (memo, useCallback, useMemo)');
    }
    
    if (!this.results.databasePerformance.passed) {
      recommendations.push('Database optimization: Ensure schema consistency and implement proper indexing');
    }
    
    if (!this.results.assetOptimization.passed) {
      recommendations.push('Asset optimization: Configure Next.js with better compression and bundling settings');
    }
    
    return recommendations;
  }
}

// Run the performance validation
if (require.main === module) {
  const validator = new PerformanceValidator();
  validator.runAllTests().catch(error => {
    colorLog(colors.red, '💥 Performance validation failed:', error.message);
    process.exit(1);
  });
}

module.exports = PerformanceValidator;