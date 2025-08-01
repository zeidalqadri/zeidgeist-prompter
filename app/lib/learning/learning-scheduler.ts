import { LearningService } from './learning-service';
import { AdaptiveEnhancer } from './adaptive-enhancer';

export class LearningScheduler {
  private learningService: LearningService;
  private adaptiveEnhancer: AdaptiveEnhancer;
  private isRunning: boolean = false;
  private lastRunTime: Date | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.learningService = new LearningService();
    this.adaptiveEnhancer = new AdaptiveEnhancer();
  }

  /**
   * Start the learning scheduler
   */
  start(intervalHours: number = 24): void {
    if (this.isRunning) {
      console.log('Learning scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting learning scheduler with ${intervalHours} hour interval`);

    // Run immediately on start
    this.runLearningCycle();

    // Schedule periodic runs
    this.intervalId = setInterval(
      () => this.runLearningCycle(),
      intervalHours * 60 * 60 * 1000
    );
  }

  /**
   * Stop the learning scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('Learning scheduler is not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('Learning scheduler stopped');
  }

  /**
   * Run a learning cycle
   */
  private async runLearningCycle(): Promise<void> {
    try {
      console.log('Starting scheduled learning cycle...');
      this.lastRunTime = new Date();

      // Run the learning cycle
      const metrics = await this.learningService.runLearningCycle();

      // Log metrics
      console.log('Learning cycle completed with metrics:', metrics);

      // Check if we're becoming more independent
      if (metrics.llmDependencyScore < 0.3 && metrics.accuracyScore > 0.85) {
        console.log('🎉 System is achieving high independence from LLMs!');
        console.log(`LLM dependency: ${(metrics.llmDependencyScore * 100).toFixed(1)}%`);
        console.log(`Local accuracy: ${(metrics.accuracyScore * 100).toFixed(1)}%`);
      }

      // Adjust learning frequency based on performance
      if (metrics.newPatternsLearned > 10) {
        console.log('High learning rate detected, consider increasing frequency');
      } else if (metrics.newPatternsLearned === 0 && metrics.llmDependencyScore > 0.8) {
        console.log('Low learning rate, system still highly dependent on LLMs');
      }
    } catch (error) {
      console.error('Error in learning cycle:', error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    lastRunTime: Date | null;
    nextRunTime: Date | null;
  } {
    let nextRunTime = null;
    if (this.isRunning && this.lastRunTime && this.intervalId) {
      // Calculate next run time based on interval
      const intervalMs = 24 * 60 * 60 * 1000; // Default 24 hours
      nextRunTime = new Date(this.lastRunTime.getTime() + intervalMs);
    }

    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      nextRunTime,
    };
  }

  /**
   * Force a learning cycle (manual trigger)
   */
  async forceLearningCycle(): Promise<any> {
    console.log('Manually triggering learning cycle...');
    return await this.learningService.runLearningCycle();
  }

  /**
   * Get learning statistics
   */
  async getLearningStats(): Promise<any> {
    const enhancerStats = await this.adaptiveEnhancer.getStats();
    const metrics = await this.learningService.calculateMetrics(0);
    
    return {
      scheduler: this.getStatus(),
      enhancer: enhancerStats,
      metrics,
    };
  }
}

// Singleton instance
let schedulerInstance: LearningScheduler | null = null;

export function getLearningScheduler(): LearningScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new LearningScheduler();
  }
  return schedulerInstance;
}