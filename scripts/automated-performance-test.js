#!/usr/bin/env node

/**
 * Automated Performance Testing Suite
 * Comprehensive performance validation with CI/CD integration
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

class AutomatedPerformanceTester {
  constructor(options = {}) {
    this.options = {
      buildTimeout: options.buildTimeout || 60000, // 1 minute
      performanceThresholds: {
        buildTime: 30000, // 30 seconds
        bundleSize: 10 * 1024 * 1024, // 10MB
        largestChunk: 500 * 1024, // 500KB
        ...options.performanceThresholds
      },
      ciMode: process.env.CI === 'true' || options.ci,
      ...options
    };
    
    this.results = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        ci: this.options.ciMode
      },
      tests: [],
      summary: {
        passed: 0,
        failed: 0,
        totalTime: 0
      }
    };
    
    this.startTime = performance.now();
  }

  async runAllTests() {
    colorLog(colors.cyan + colors.bright, '🤖 Starting Automated Performance Testing Suite');
    colorLog(colors.blue, '=' * 70);

    try {
      // Run performance tests
      await this.runBuildPerformanceTest();
      await this.runBundleAnalysisTest();
      await this.runRegressionTest();
      
      // Generate results
      this.generateSummary();
      this.saveResults();
      
      // Exit with appropriate code for CI/CD
      const exitCode = this.results.summary.failed > 0 ? 1 : 0;
      process.exit(exitCode);
      
    } catch (error) {
      colorLog(colors.red, '❌ Automated performance testing failed:', error.message);
      process.exit(1);
    }
  }

  async runBuildPerformanceTest() {
    colorLog(colors.yellow, '\\n🔨 Running Build Performance Test...');
    
    const testStart = performance.now();
    const buildStart = performance.now();
    
    try {
      // Run build with timeout
      const buildResult = await this.runWithTimeout(
        'npm run build',
        this.options.buildTimeout
      );
      
      const buildTime = performance.now() - buildStart;
      const buildPassed = buildTime < this.options.performanceThresholds.buildTime;
      
      // Check output directory
      const outputPath = 'dist';
      const outputExists = fs.existsSync(outputPath);
      const outputSize = outputExists ? this.getDirSize(outputPath) : 0;
      const sizePassed = outputSize < this.options.performanceThresholds.bundleSize;
      
      const testResult = {
        name: 'Build Performance',
        status: buildPassed && outputExists && sizePassed ? 'PASSED' : 'FAILED',
        duration: Math.round(performance.now() - testStart),
        metrics: {
          buildTime: Math.round(buildTime),
          outputSize: outputSize,
          buildTimeLimit: this.options.performanceThresholds.buildTime,
          outputSizeLimit: this.options.performanceThresholds.bundleSize
        },
        thresholds: {
          buildTime: buildPassed,
          outputExists: outputExists,
          sizeLimit: sizePassed
        }
      };
      
      this.results.tests.push(testResult);
      
      if (testResult.status === 'PASSED') {
        this.results.summary.passed++;
        colorLog(colors.green, `✅ Build Performance: ${Math.round(buildTime/1000)}s, ${(outputSize/1024/1024).toFixed(2)}MB`);
      } else {
        this.results.summary.failed++;
        colorLog(colors.red, `❌ Build Performance: Failed (${Math.round(buildTime/1000)}s, ${(outputSize/1024/1024).toFixed(2)}MB)`);
      }
      
    } catch (error) {
      this.results.tests.push({
        name: 'Build Performance',
        status: 'FAILED',
        duration: Math.round(performance.now() - testStart),
        error: error.message
      });
      this.results.summary.failed++;
      colorLog(colors.red, '❌ Build Performance: Failed -', error.message);
    }
  }

  async runBundleAnalysisTest() {
    colorLog(colors.yellow, '\\n📊 Running Bundle Analysis Test...');
    
    const testStart = performance.now();
    
    try {
      const staticDir = path.join('dist', '_next', 'static');
      
      if (!fs.existsSync(staticDir)) {
        throw new Error('Build output not found');
      }
      
      const bundleAnalysis = this.analyzeBundleSize();
      const largestChunkPassed = !bundleAnalysis.largestChunk || 
        bundleAnalysis.largestChunk.size < this.options.performanceThresholds.largestChunk;
      
      const testResult = {
        name: 'Bundle Analysis',
        status: largestChunkPassed ? 'PASSED' : 'FAILED',
        duration: Math.round(performance.now() - testStart),
        metrics: {
          totalChunks: bundleAnalysis.totalChunks || 0,
          totalJSSize: bundleAnalysis.totalJSSize || 0,
          largestChunkSize: bundleAnalysis.largestChunk?.size || 0,
          largestChunkLimit: this.options.performanceThresholds.largestChunk
        },
        bundleAnalysis
      };
      
      this.results.tests.push(testResult);
      
      if (testResult.status === 'PASSED') {
        this.results.summary.passed++;
        colorLog(colors.green, `✅ Bundle Analysis: ${bundleAnalysis.totalChunks} chunks, largest ${(bundleAnalysis.largestChunk?.size/1024).toFixed(0)}KB`);
      } else {
        this.results.summary.failed++;
        colorLog(colors.red, `❌ Bundle Analysis: Largest chunk ${(bundleAnalysis.largestChunk?.size/1024).toFixed(0)}KB exceeds limit`);
      }
      
    } catch (error) {
      this.results.tests.push({
        name: 'Bundle Analysis',
        status: 'FAILED',
        duration: Math.round(performance.now() - testStart),
        error: error.message
      });
      this.results.summary.failed++;
      colorLog(colors.red, '❌ Bundle Analysis: Failed -', error.message);
    }
  }

  async runRegressionTest() {
    colorLog(colors.yellow, '\\n📈 Running Performance Regression Test...');
    
    const testStart = performance.now();
    
    try {
      // Load previous results if available
      const previousResultsPath = 'performance-baseline.json';
      let previousResults = null;
      
      if (fs.existsSync(previousResultsPath)) {
        previousResults = JSON.parse(fs.readFileSync(previousResultsPath, 'utf8'));
      }
      
      // Get current build metrics
      const currentBuildTest = this.results.tests.find(t => t.name === 'Build Performance');
      
      if (!currentBuildTest || !currentBuildTest.metrics) {
        throw new Error('Current build metrics not available');
      }
      
      let regressionsPassed = true;
      const regressions = [];
      
      if (previousResults) {
        const previousBuildTest = previousResults.tests?.find(t => t.name === 'Build Performance');
        
        if (previousBuildTest?.metrics) {
          // Check for build time regression (>20% slower)
          const buildTimeRegression = (currentBuildTest.metrics.buildTime - previousBuildTest.metrics.buildTime) / previousBuildTest.metrics.buildTime;
          if (buildTimeRegression > 0.2) {
            regressions.push(`Build time regression: ${(buildTimeRegression * 100).toFixed(1)}% slower`);
            regressionsPassed = false;
          }
          
          // Check for bundle size regression (>10% larger)
          const bundleSizeRegression = (currentBuildTest.metrics.outputSize - previousBuildTest.metrics.outputSize) / previousBuildTest.metrics.outputSize;
          if (bundleSizeRegression > 0.1) {
            regressions.push(`Bundle size regression: ${(bundleSizeRegression * 100).toFixed(1)}% larger`);
            regressionsPassed = false;
          }
        }
      } else {
        // No baseline available - save current as baseline
        fs.writeFileSync(previousResultsPath, JSON.stringify(this.results, null, 2));
        colorLog(colors.blue, '📝 Saved performance baseline for future comparisons');
      }
      
      const testResult = {
        name: 'Performance Regression',
        status: regressionsPassed ? 'PASSED' : 'FAILED',
        duration: Math.round(performance.now() - testStart),
        metrics: {
          hasBaseline: !!previousResults,
          regressionsFound: regressions.length
        },
        regressions
      };
      
      this.results.tests.push(testResult);
      
      if (testResult.status === 'PASSED') {
        this.results.summary.passed++;
        colorLog(colors.green, '✅ Performance Regression: No significant regressions detected');
      } else {
        this.results.summary.failed++;
        colorLog(colors.red, `❌ Performance Regression: ${regressions.length} regression(s) detected`);
        regressions.forEach(regression => {
          colorLog(colors.red, `   • ${regression}`);
        });
      }
      
    } catch (error) {
      this.results.tests.push({
        name: 'Performance Regression',
        status: 'FAILED',
        duration: Math.round(performance.now() - testStart),
        error: error.message
      });
      this.results.summary.failed++;
      colorLog(colors.red, '❌ Performance Regression: Failed -', error.message);
    }
  }

  generateSummary() {
    this.results.summary.totalTime = Math.round(performance.now() - this.startTime);
    
    colorLog(colors.cyan + colors.bright, '\\n📋 Automated Performance Test Summary');
    colorLog(colors.blue, '=' * 50);
    
    colorLog(colors.bright, `\\n🎯 Results:`);
    colorLog(colors.green, `✅ Passed: ${this.results.summary.passed}`);
    colorLog(colors.red, `❌ Failed: ${this.results.summary.failed}`);
    colorLog(colors.blue, `⏱️  Total Time: ${(this.results.summary.totalTime/1000).toFixed(1)}s`);
    
    const overallStatus = this.results.summary.failed === 0 ? 'PASSED' : 'FAILED';
    const statusColor = overallStatus === 'PASSED' ? colors.green : colors.red;
    
    colorLog(statusColor + colors.bright, `\\n🏆 Overall Status: ${overallStatus}`);
    
    if (this.options.ciMode) {
      // GitHub Actions output format
      console.log(`::set-output name=status::${overallStatus}`);
      console.log(`::set-output name=passed::${this.results.summary.passed}`);
      console.log(`::set-output name=failed::${this.results.summary.failed}`);
    }
  }

  saveResults() {
    const reportPath = `performance-test-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    colorLog(colors.blue, `\\n📄 Detailed results saved to: ${reportPath}`);
  }

  async runWithTimeout(command, timeout) {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const process = spawn(cmd, args, { stdio: 'pipe' });
      
      let output = '';
      let errorOutput = '';
      
      const timeoutId = setTimeout(() => {
        process.kill('SIGKILL');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      process.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
        }
      });
    });
  }

  getDirSize(dir) {
    let size = 0;
    try {
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
    } catch (error) {
      console.warn(`Warning: Could not read directory ${dir}:`, error.message);
    }
    
    return size;
  }

  analyzeBundleSize() {
    const staticDir = path.join('dist', '_next', 'static');
    if (!fs.existsSync(staticDir)) return null;
    
    const chunks = [];
    const findChunks = (dir) => {
      try {
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
      } catch (error) {
        console.warn(`Warning: Could not analyze ${dir}:`, error.message);
      }
    };
    
    findChunks(staticDir);
    
    return {
      totalChunks: chunks.length,
      largestChunk: chunks.sort((a, b) => b.size - a.size)[0],
      totalJSSize: chunks.reduce((sum, chunk) => sum + chunk.size, 0)
    };
  }
}

// Run the automated performance tester
if (require.main === module) {
  const options = {
    ci: process.env.CI === 'true',
    buildTimeout: parseInt(process.env.BUILD_TIMEOUT) || 60000,
    performanceThresholds: {
      buildTime: parseInt(process.env.BUILD_TIME_LIMIT) || 30000,
      bundleSize: parseInt(process.env.BUNDLE_SIZE_LIMIT) || 10 * 1024 * 1024,
      largestChunk: parseInt(process.env.CHUNK_SIZE_LIMIT) || 500 * 1024
    }
  };
  
  const tester = new AutomatedPerformanceTester(options);
  tester.runAllTests().catch(error => {
    colorLog(colors.red, '💥 Automated performance testing crashed:', error.message);
    process.exit(1);
  });
}

module.exports = AutomatedPerformanceTester;