/**
 * DateUtils - Handles Date<->ISO string conversions for D1/SQLite
 *
 * SQLite/D1 stores dates as TEXT in ISO-8601 format.
 * Business logic can use Date objects internally.
 * This module handles the conversion at database boundaries.
 */

export type ISODateString = string;

export const DateUtils = {
  /**
   * Convert Date to ISO string for database storage
   */
  toDb(date: Date | null | undefined): string | null {
    if (!date) return null;
    return date.toISOString();
  },

  /**
   * Convert ISO string from database to Date for business logic
   */
  fromDb(isoString: string | null | undefined): Date | null {
    if (!isoString) return null;
    return new Date(isoString);
  },

  /**
   * Get current timestamp in database format (ISO string)
   */
  now(): string {
    return new Date().toISOString();
  },

  /**
   * Calculate date N days ago in database format
   */
  daysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  },

  /**
   * Calculate date N hours ago in database format
   */
  hoursAgo(hours: number): string {
    const date = new Date();
    date.setHours(date.getHours() - hours);
    return date.toISOString();
  },

  /**
   * Calculate start of day in database format
   */
  startOfDay(date: Date = new Date()): string {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  },

  /**
   * Calculate end of day in database format
   */
  endOfDay(date: Date = new Date()): string {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end.toISOString();
  },

  /**
   * Check if an ISO date string is within the last N days
   */
  isWithinDays(isoString: string | null, days: number): boolean {
    if (!isoString) return false;
    const date = new Date(isoString);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return date >= cutoff;
  }
};

/**
 * QualityScale - Normalizes quality values between business and database layers
 *
 * Business logic uses 0.0-1.0 (floating point confidence)
 * Database stores 0-100 (integer percentage)
 */
export const QualityScale = {
  /**
   * Convert 0-1 confidence to 0-100 database quality
   */
  toDb(confidence: number): number {
    return Math.round(Math.max(0, Math.min(1, confidence)) * 100);
  },

  /**
   * Convert 0-100 database quality to 0-1 confidence
   */
  fromDb(quality: number | null): number {
    if (quality === null || quality === undefined) return 0;
    return Math.max(0, Math.min(100, quality)) / 100;
  },

  /**
   * Check if quality (0-100) meets threshold (0-100)
   */
  meetsThreshold(quality: number | null, threshold: number): boolean {
    return (quality ?? 0) >= threshold;
  }
};
