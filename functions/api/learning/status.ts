/**
 * Learning Status API Endpoint - ENABLED & OPTIMIZED
 *
 * Returns learning system status with pagination support for patterns.
 */

import { createDb, trainingExamples, enhancementLogs, feedback } from '../../_shared/db'
import { eq, gte, desc, sql, and } from 'drizzle-orm'

// Configuration
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

// Handle CORS preflight requests
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

/**
 * API endpoint to get learning system status with pagination
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - includePatterns: Whether to include pattern details (default: false)
 */
export async function onRequestGet(context: any): Promise<Response> {
  try {
    const { env, request } = context
    const url = new URL(request.url)

    // Parse pagination parameters
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(url.searchParams.get('limit') || String(DEFAULT_PAGE_SIZE))))
    const includePatterns = url.searchParams.get('includePatterns') === 'true'
    const offset = (page - 1) * limit

    const db = createDb(env)

    if (!db) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Database not available',
        stats: null
      }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://mstprmpt.zeidgeist.com',
        },
      })
    }

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Run queries in parallel for efficiency
    const [
      totalPatternsResult,
      activePatternsResult,
      recentEnhancementsResult,
      localEnhancementsResult,
      topPatterns
    ] = await Promise.all([
      // Total patterns count
      db.select({ count: sql<number>`count(*)` }).from(trainingExamples),

      // Active patterns count
      db.select({ count: sql<number>`count(*)` })
        .from(trainingExamples)
        .where(eq(trainingExamples.isActive, true)),

      // Recent enhancements count and breakdown
      db.select({
        total: sql<number>`count(*)`,
        local: sql<number>`sum(case when source = 'local' then 1 else 0 end)`,
        llm: sql<number>`sum(case when source != 'local' then 1 else 0 end)`
      })
        .from(enhancementLogs)
        .where(gte(enhancementLogs.createdAt, oneWeekAgo)),

      // Local enhancements with feedback
      db.select({
        total: sql<number>`count(*)`,
        successful: sql<number>`sum(case when ${feedback.wasSuccessful} = 1 and ${feedback.score} >= 4 then 1 else 0 end)`
      })
        .from(enhancementLogs)
        .leftJoin(feedback, eq(feedback.enhancementId, enhancementLogs.id))
        .where(
          and(
            eq(enhancementLogs.source, 'local'),
            gte(enhancementLogs.createdAt, oneWeekAgo)
          )
        ),

      // Top patterns (paginated) if requested
      includePatterns
        ? db.select({
            id: trainingExamples.id,
            category: trainingExamples.category,
            quality: trainingExamples.quality,
            usageCount: trainingExamples.usageCount,
            isActive: trainingExamples.isActive,
            createdAt: trainingExamples.createdAt,
            updatedAt: trainingExamples.updatedAt
          })
            .from(trainingExamples)
            .where(eq(trainingExamples.isActive, true))
            .orderBy(desc(trainingExamples.quality))
            .limit(limit)
            .offset(offset)
        : Promise.resolve([])
    ])

    // Calculate metrics
    const totalPatterns = totalPatternsResult[0]?.count || 0
    const activePatterns = activePatternsResult[0]?.count || 0
    const recentEnhancements = recentEnhancementsResult[0] || { total: 0, local: 0, llm: 0 }
    const localWithFeedback = localEnhancementsResult[0] || { total: 0, successful: 0 }

    const llmDependencyScore = recentEnhancements.total > 0
      ? 1 - ((recentEnhancements.local || 0) / recentEnhancements.total)
      : 1

    const localAccuracyScore = localWithFeedback.total > 0
      ? (localWithFeedback.successful || 0) / localWithFeedback.total
      : 0

    const responseBody = {
      success: true,
      message: 'Learning status retrieved successfully',
      stats: {
        totalPatterns,
        activePatterns,
        inactivePatterns: totalPatterns - activePatterns,
        recentEnhancements: {
          total: recentEnhancements.total || 0,
          local: recentEnhancements.local || 0,
          llm: recentEnhancements.llm || 0
        },
        metrics: {
          llmDependencyScore: parseFloat(llmDependencyScore.toFixed(3)),
          llmDependencyPercent: `${(llmDependencyScore * 100).toFixed(1)}%`,
          localAccuracyScore: parseFloat(localAccuracyScore.toFixed(3)),
          localAccuracyPercent: `${(localAccuracyScore * 100).toFixed(1)}%`
        }
      },
      summary: {
        isActive: true,
        llmIndependence: `${((1 - llmDependencyScore) * 100).toFixed(1)}%`,
        localAccuracy: `${(localAccuracyScore * 100).toFixed(1)}%`,
        totalPatterns,
        recentLocalEnhancements: recentEnhancements.local || 0,
      },
      // Pagination info
      pagination: includePatterns ? {
        page,
        limit,
        totalItems: activePatterns,
        totalPages: Math.ceil(activePatterns / limit),
        hasMore: offset + limit < activePatterns
      } : null,
      // Top patterns if requested
      patterns: includePatterns ? topPatterns : undefined
    }

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://mstprmpt.zeidgeist.com',
      },
    })
  } catch (error) {
    console.error('Error getting learning status:', error)

    const errorResponse = {
      success: false,
      error: 'Failed to get learning status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://mstprmpt.zeidgeist.com',
      },
    })
  }
}
