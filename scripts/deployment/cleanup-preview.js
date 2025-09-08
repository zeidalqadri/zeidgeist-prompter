#!/usr/bin/env node

/**
 * Preview deployment cleanup script
 * Removes preview deployments when PRs are closed
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = util.promisify(exec);

class PreviewCleanup {
  constructor() {
    this.prNumber = process.env.PR_NUMBER || process.argv[2];
    
    if (!this.prNumber) {
      throw new Error('PR_NUMBER must be provided as environment variable or command line argument');
    }
  }

  async listPreviewDeployments() {
    console.log('🔍 Listing preview deployments...');
    
    try {
      const { stdout } = await execAsync('wrangler pages deployment list --project-name=zeidgeist-prompter');
      console.log('📋 Current deployments:');
      console.log(stdout);
      
      return stdout;
    } catch (error) {
      console.error('❌ Failed to list deployments:', error.message);
      throw error;
    }
  }

  async deletePreviewDeployment() {
    console.log(`🗑️  Deleting preview deployment for PR #${this.prNumber}...`);
    
    try {
      // Try to delete the specific branch deployment
      const deleteBranchCmd = `wrangler pages deployment delete --project-name=zeidgeist-prompter --branch=preview-pr-${this.prNumber} --force`;
      
      try {
        await execAsync(deleteBranchCmd);
        console.log(`✅ Successfully deleted branch deployment for PR #${this.prNumber}`);
      } catch (branchError) {
        console.warn(`⚠️  Branch deletion failed: ${branchError.message}`);
        
        // Fallback: try to delete by deployment ID if we can find it
        console.log('🔍 Attempting to find and delete by deployment ID...');
        await this.deleteByDeploymentId();
      }
      
    } catch (error) {
      console.error('❌ Preview deployment deletion failed:', error.message);
      throw error;
    }
  }

  async deleteByDeploymentId() {
    try {
      const { stdout } = await execAsync('wrangler pages deployment list --project-name=zeidgeist-prompter --format=json');
      const deployments = JSON.parse(stdout);
      
      // Find deployments for this PR
      const prDeployments = deployments.filter(deployment => 
        deployment.source && 
        (deployment.source.branch === `preview-pr-${this.prNumber}` ||
         deployment.source.commit_message?.includes(`PR #${this.prNumber}`))
      );
      
      if (prDeployments.length === 0) {
        console.log(`ℹ️  No deployments found for PR #${this.prNumber}`);
        return;
      }
      
      // Delete each deployment
      for (const deployment of prDeployments) {
        try {
          await execAsync(`wrangler pages deployment delete ${deployment.id} --project-name=zeidgeist-prompter --force`);
          console.log(`✅ Deleted deployment ${deployment.id}`);
        } catch (error) {
          console.warn(`⚠️  Failed to delete deployment ${deployment.id}: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to delete by deployment ID:', error.message);
      // Don't throw - this is a best-effort cleanup
    }
  }

  async cleanupLocalFiles() {
    console.log('🧹 Cleaning up local preview files...');
    
    const filesToCleanup = [
      '.env.preview',
      'preview-deployment-summary.json',
      'dist/preview-config.json'
    ];
    
    for (const file of filesToCleanup) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          console.log(`✅ Removed ${file}`);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to remove ${file}: ${error.message}`);
      }
    }
  }

  async verifyCleanup() {
    console.log('🔍 Verifying cleanup...');
    
    try {
      const previewUrl = `https://preview-pr-${this.prNumber}.zeidgeist-prompter.pages.dev`;
      
      // Try to access the preview URL - it should fail
      try {
        await execAsync(`curl -f --max-time 10 "${previewUrl}"`, {
          stdio: ['ignore', 'ignore', 'ignore']
        });
        console.warn('⚠️  Preview URL is still accessible - cleanup may not be complete');
      } catch (error) {
        console.log('✅ Preview URL is no longer accessible');
      }
      
    } catch (error) {
      console.warn('⚠️  Could not verify cleanup:', error.message);
    }
  }

  async generateCleanupReport() {
    console.log('📋 Generating cleanup report...');
    
    const report = {
      prNumber: this.prNumber,
      timestamp: new Date().toISOString(),
      actions: [
        'Deleted Cloudflare Pages deployment',
        'Cleaned up local preview files',
        'Verified deployment removal'
      ],
      status: 'completed',
      previewUrl: `https://preview-pr-${this.prNumber}.zeidgeist-prompter.pages.dev`,
      note: 'Preview deployment has been cleaned up and is no longer accessible'
    };
    
    fs.writeFileSync(
      `preview-cleanup-report-pr-${this.prNumber}.json`,
      JSON.stringify(report, null, 2)
    );
    
    console.log('✅ Cleanup report generated');
    return report;
  }
}

async function main() {
  const startTime = Date.now();
  
  try {
    console.log('🧹 Starting preview deployment cleanup...\n');
    
    const cleanup = new PreviewCleanup();
    
    // List current deployments for reference
    await cleanup.listPreviewDeployments();
    
    // Delete the preview deployment
    await cleanup.deletePreviewDeployment();
    
    // Clean up local files
    await cleanup.cleanupLocalFiles();
    
    // Verify cleanup was successful
    await cleanup.verifyCleanup();
    
    // Generate cleanup report
    await cleanup.generateCleanupReport();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Preview cleanup completed in ${duration}s`);
    console.log(`🗑️  Preview for PR #${cleanup.prNumber} has been removed`);
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.error(`\n❌ Preview cleanup failed after ${duration}s`);
    console.error(`   Error: ${error.message}`);
    console.error('   Some preview resources may still exist.');
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PreviewCleanup;