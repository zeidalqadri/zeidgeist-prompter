/**
 * Quota Management System
 * Enforces daily limits: 3 image generations per user per day
 * Resets automatically at midnight UTC
 */

import { db } from './db'
import { imageQuotas } from '../../app/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export interface QuotaLimits {
  generationsPerDay: number
  uploadsPerDay: number
  analysesPerDay: number
}

export interface QuotaStatus {
  userId: string
  date: string
  generationsUsed: number
  uploadsUsed: number
  analysesUsed: number
  generationsRemaining: number
  uploadsRemaining: number
  analysesRemaining: number
  limits: QuotaLimits
  resetAt: string
}

// Default quota limits
const DEFAULT_LIMITS: QuotaLimits = {
  generationsPerDay: 3,
  uploadsPerDay: 10,
  analysesPerDay: 20
}

/**
 * Get current date string in YYYY-MM-DD format (UTC)
 */
function getCurrentDateString(): string {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

/**
 * Get quota reset time (midnight UTC)
 */
function getResetTime(): string {
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  return tomorrow.toISOString()
}

/**
 * Get quota status for a user
 * @param userId - User ID
 * @param limits - Custom quota limits (optional)
 * @returns Quota status
 */
export async function getQuotaStatus(
  userId: string,
  limits: QuotaLimits = DEFAULT_LIMITS
): Promise<QuotaStatus> {
  const today = getCurrentDateString()

  // Get or create quota record
  const existing = await db
    .select()
    .from(imageQuotas)
    .where(and(
      eq(imageQuotas.userId, userId),
      eq(imageQuotas.date, today)
    ))
    .limit(1)

  let quota

  if (existing.length === 0) {
    // Create new quota record for today
    const newQuota = await db
      .insert(imageQuotas)
      .values({
        userId,
        date: today,
        generationsUsed: 0,
        uploadsUsed: 0,
        analysesUsed: 0
      })
      .returning()

    quota = newQuota[0]
  } else {
    quota = existing[0]
  }

  return {
    userId,
    date: today,
    generationsUsed: quota.generationsUsed,
    uploadsUsed: quota.uploadsUsed,
    analysesUsed: quota.analysesUsed,
    generationsRemaining: Math.max(0, limits.generationsPerDay - quota.generationsUsed),
    uploadsRemaining: Math.max(0, limits.uploadsPerDay - quota.uploadsUsed),
    analysesRemaining: Math.max(0, limits.analysesPerDay - quota.analysesUsed),
    limits,
    resetAt: getResetTime()
  }
}

/**
 * Check if user can perform an operation
 * @param userId - User ID
 * @param operation - Operation type
 * @param limits - Custom quota limits (optional)
 * @returns Whether operation is allowed
 */
export async function checkQuota(
  userId: string,
  operation: 'generation' | 'upload' | 'analysis',
  limits: QuotaLimits = DEFAULT_LIMITS
): Promise<{ allowed: boolean; remaining: number; resetAt: string }> {
  const status = await getQuotaStatus(userId, limits)

  let allowed: boolean
  let remaining: number

  switch (operation) {
    case 'generation':
      allowed = status.generationsRemaining > 0
      remaining = status.generationsRemaining
      break
    case 'upload':
      allowed = status.uploadsRemaining > 0
      remaining = status.uploadsRemaining
      break
    case 'analysis':
      allowed = status.analysesRemaining > 0
      remaining = status.analysesRemaining
      break
  }

  if (!allowed) {
    console.warn(`⚠️ Quota exceeded for user ${userId}: ${operation}`)
  }

  return {
    allowed,
    remaining,
    resetAt: status.resetAt
  }
}

/**
 * Increment quota usage
 * @param userId - User ID
 * @param operation - Operation type
 * @returns Updated quota status
 */
export async function incrementQuota(
  userId: string,
  operation: 'generation' | 'upload' | 'analysis'
): Promise<QuotaStatus> {
  const today = getCurrentDateString()

  // Get or create quota record
  const existing = await db
    .select()
    .from(imageQuotas)
    .where(and(
      eq(imageQuotas.userId, userId),
      eq(imageQuotas.date, today)
    ))
    .limit(1)

  if (existing.length === 0) {
    // Create new quota record
    await db
      .insert(imageQuotas)
      .values({
        userId,
        date: today,
        generationsUsed: operation === 'generation' ? 1 : 0,
        uploadsUsed: operation === 'upload' ? 1 : 0,
        analysesUsed: operation === 'analysis' ? 1 : 0
      })
  } else {
    // Update existing record
    const updates: any = {
      updatedAt: new Date()
    }

    if (operation === 'generation') {
      updates.generationsUsed = existing[0].generationsUsed + 1
    } else if (operation === 'upload') {
      updates.uploadsUsed = existing[0].uploadsUsed + 1
    } else if (operation === 'analysis') {
      updates.analysesUsed = existing[0].analysesUsed + 1
    }

    await db
      .update(imageQuotas)
      .set(updates)
      .where(and(
        eq(imageQuotas.userId, userId),
        eq(imageQuotas.date, today)
      ))
  }

  console.log(`📊 Incremented ${operation} quota for user ${userId}`)

  return await getQuotaStatus(userId)
}

/**
 * Enforce quota (check and increment in one operation)
 * @param userId - User ID
 * @param operation - Operation type
 * @param limits - Custom quota limits (optional)
 * @throws Error if quota exceeded
 */
export async function enforceQuota(
  userId: string,
  operation: 'generation' | 'upload' | 'analysis',
  limits: QuotaLimits = DEFAULT_LIMITS
): Promise<void> {
  const check = await checkQuota(userId, operation, limits)

  if (!check.allowed) {
    throw new Error(
      `Daily ${operation} quota exceeded. ${check.remaining} remaining. Resets at ${check.resetAt}`
    )
  }

  await incrementQuota(userId, operation)
}

/**
 * Reset quota for a user (admin function)
 * @param userId - User ID
 */
export async function resetQuota(userId: string): Promise<void> {
  const today = getCurrentDateString()

  await db
    .update(imageQuotas)
    .set({
      generationsUsed: 0,
      uploadsUsed: 0,
      analysesUsed: 0,
      lastReset: new Date(),
      updatedAt: new Date()
    })
    .where(and(
      eq(imageQuotas.userId, userId),
      eq(imageQuotas.date, today)
    ))

  console.log(`🔄 Reset quota for user ${userId}`)
}

/**
 * Get quota statistics for all users (admin function)
 * @returns Quota statistics
 */
export async function getQuotaStatistics(): Promise<{
  totalGenerations: number
  totalUploads: number
  totalAnalyses: number
  activeUsers: number
}> {
  const today = getCurrentDateString()

  const stats = await db
    .select()
    .from(imageQuotas)
    .where(eq(imageQuotas.date, today))

  const totalGenerations = stats.reduce((sum, s) => sum + s.generationsUsed, 0)
  const totalUploads = stats.reduce((sum, s) => sum + s.uploadsUsed, 0)
  const totalAnalyses = stats.reduce((sum, s) => sum + s.analysesUsed, 0)
  const activeUsers = stats.length

  return {
    totalGenerations,
    totalUploads,
    totalAnalyses,
    activeUsers
  }
}
