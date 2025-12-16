/**
 * Utility Adapters for Cloudflare Workers
 * Provides common utility functions used across the application
 */

/**
 * Date utility functions for common date operations
 */
export class DateUtils {
  /**
   * Returns a Date object representing the time X hours ago
   * @param hours - Number of hours ago
   * @returns Date object
   */
  static hoursAgo(hours: number): Date {
    return new Date(Date.now() - hours * 60 * 60 * 1000);
  }

  /**
   * Returns a Date object representing the time X minutes ago
   * @param minutes - Number of minutes ago
   * @returns Date object
   */
  static minutesAgo(minutes: number): Date {
    return new Date(Date.now() - minutes * 60 * 1000);
  }

  /**
   * Returns a Date object representing the time X days ago
   * @param days - Number of days ago
   * @returns Date object
   */
  static daysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }
}
