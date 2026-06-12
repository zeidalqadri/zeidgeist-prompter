/**
 * Unified D1 Database Adapter
 *
 * Single database adapter for all application data on Cloudflare D1.
 * Consolidates auth, prompts, history, feedback, logs, and analytics.
 *
 * Extends D1AuthDatabase with all additional table operations.
 */

import { D1AuthDatabase, createD1AuthDb } from './db-d1';
import type { D1User, D1Session } from './db-d1';

// Re-export auth types
export type { D1User, D1Session };

// ============================================
// Type Definitions for All Tables
// ============================================

export interface D1PromptHistory {
  id: string;
  original: string;
  refined: string;
  context: string | null;
  metadata: string | null;
  ip_address: string | null;
  user_id: string | null;
  timestamp: string;
  created_at: string;
  updated_at: string;
}

export interface D1Feedback {
  id: string;
  enhancement_id: string | null;
  original_prompt: string;
  enhanced_prompt: string;
  was_successful: number;
  score: number;
  feedback_text: string | null;
  user_agent: string | null;
  ip_address: string | null;
  user_id: string | null;
  timestamp: string;
  created_at: string;
}

export interface D1EnhancementLog {
  id: string;
  original_prompt: string | null;
  enhanced_prompt: string | null;
  prompt_length: number;
  has_context: number;
  has_image_input: number;
  is_refinement: number;
  is_expansion: number;
  repeat_count: number;
  source: string;
  enhancement_model: string | null;
  response_time: number | null;
  processing_time: number | null;
  was_identical: number;
  had_error: number;
  context: string | null;
  user_id: string | null;
  timestamp: string;
  created_at: string;
}

export interface D1Prompt {
  id: string;
  original_text: string;
  text_hash: string;
  category_id: string | null;
  latest_version: number;
  total_uses: number;
  avg_quality_score: number | null;
  is_public: number;
  created_at: string;
  updated_at: string;
}

export interface D1PromptVersion {
  id: string;
  prompt_id: string;
  version_number: number;
  enhanced_text: string;
  enhancement_source: string;
  quality_score: number | null;
  metrics_data: string | null;
  is_baseline: number;
  created_at: string;
}

export interface D1TrainingExample {
  id: string;
  raw_prompt: string;
  enhanced_prompt: string;
  context: string | null;
  category: string | null;
  keywords: string | null;
  source: string;
  quality: number;
  usage_count: number;
  metadata: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface D1ExtensionDownload {
  id: string;
  user_id: string;
  extension_version: string;
  ip_address: string | null;
  user_agent: string | null;
  referrer: string | null;
  created_at: string;
}

export interface D1AuditLog {
  id: string;
  event_type: string;
  event_category: string;
  severity: string;
  action: string;
  user_id: string | null;
  user_email: string | null;
  user_ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  resource_name: string | null;
  request_method: string | null;
  request_path: string | null;
  request_query_params: string | null;
  request_headers: string | null;
  response_status_code: number | null;
  response_time_ms: number | null;
  old_values: string | null;
  new_values: string | null;
  metadata: string | null;
  tags: string | null;
  is_suspicious: number;
  risk_score: number;
  threat_indicators: string | null;
  retention_period_days: number;
  is_immutable: number;
  created_at: string;
}

// D1 Database interface
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(columnName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: {
    duration: number;
    changes: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
  };
}

interface D1ExecResult {
  count: number;
  duration: number;
}

/**
 * Unified D1 Database - All tables in one adapter
 */
export class D1UnifiedDatabase extends D1AuthDatabase {
  private database: D1Database;

  constructor(db: D1Database) {
    super(db);
    this.database = db;
  }

  // ===== Prompt History Operations =====

  async createPromptHistory(entry: {
    original: string;
    refined: string;
    context?: string;
    metadata?: string;
    ipAddress?: string;
    userId?: string;
  }): Promise<D1PromptHistory> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.database.prepare(`
      INSERT INTO prompt_history (id, original, refined, context, metadata, ip_address, user_id, timestamp, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      entry.original,
      entry.refined,
      entry.context || null,
      entry.metadata || null,
      entry.ipAddress || null,
      entry.userId || null,
      now,
      now,
      now
    ).run();

    return (await this.findPromptHistoryById(id))!;
  }

  async findPromptHistoryById(id: string): Promise<D1PromptHistory | null> {
    return await this.database.prepare(
      'SELECT * FROM prompt_history WHERE id = ? LIMIT 1'
    ).bind(id).first<D1PromptHistory>();
  }

  async listPromptHistory(options: {
    userId?: string;
    ipAddress?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<D1PromptHistory[]> {
    const { userId, ipAddress, limit = 50, offset = 0 } = options;

    let query = 'SELECT * FROM prompt_history WHERE 1=1';
    const params: unknown[] = [];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    if (ipAddress) {
      query += ' AND ip_address = ?';
      params.push(ipAddress);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await this.database.prepare(query).bind(...params).all<D1PromptHistory>();
    return result.results || [];
  }

  async deletePromptHistoryByUser(userId: string): Promise<number> {
    const result = await this.database.prepare(
      'DELETE FROM prompt_history WHERE user_id = ?'
    ).bind(userId).run();
    return result.meta.changes;
  }

  // ===== Feedback Operations =====

  async createFeedback(entry: {
    enhancementId?: string;
    originalPrompt: string;
    enhancedPrompt: string;
    wasSuccessful: boolean;
    score?: number;
    feedbackText?: string;
    userAgent?: string;
    ipAddress?: string;
    userId?: string;
  }): Promise<D1Feedback> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.database.prepare(`
      INSERT INTO feedback (id, enhancement_id, original_prompt, enhanced_prompt, was_successful, score, feedback_text, user_agent, ip_address, user_id, timestamp, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      entry.enhancementId || null,
      entry.originalPrompt,
      entry.enhancedPrompt,
      entry.wasSuccessful ? 1 : 0,
      entry.score || 0,
      entry.feedbackText || null,
      entry.userAgent || null,
      entry.ipAddress || null,
      entry.userId || null,
      now,
      now
    ).run();

    return (await this.findFeedbackById(id))!;
  }

  async findFeedbackById(id: string): Promise<D1Feedback | null> {
    return await this.database.prepare(
      'SELECT * FROM feedback WHERE id = ? LIMIT 1'
    ).bind(id).first<D1Feedback>();
  }

  async listFeedback(options: {
    userId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<D1Feedback[]> {
    const { userId, limit = 50, offset = 0 } = options;

    let query = 'SELECT * FROM feedback WHERE 1=1';
    const params: unknown[] = [];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await this.database.prepare(query).bind(...params).all<D1Feedback>();
    return result.results || [];
  }

  // ===== Enhancement Logs Operations =====

  async createEnhancementLog(entry: {
    originalPrompt?: string;
    enhancedPrompt?: string;
    promptLength: number;
    hasContext: boolean;
    isRefinement: boolean;
    isExpansion: boolean;
    repeatCount?: number;
    source: string;
    enhancementModel?: string;
    responseTime?: number;
    processingTime?: number;
    wasIdentical?: boolean;
    hadError?: boolean;
    context?: string;
    userId?: string;
  }): Promise<D1EnhancementLog> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.database.prepare(`
      INSERT INTO enhancement_logs (
        id, original_prompt, enhanced_prompt, prompt_length, has_context, has_image_input, is_refinement, is_expansion,
        repeat_count, source, enhancement_model, response_time, processing_time, was_identical, had_error,
        context, user_id, timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      entry.originalPrompt || null,
      entry.enhancedPrompt || null,
      entry.promptLength,
      entry.hasContext ? 1 : 0,
      (entry as any).hasImageInput ? 1 : 0,
      entry.isRefinement ? 1 : 0,
      entry.isExpansion ? 1 : 0,
      entry.repeatCount || 0,
      entry.source,
      entry.enhancementModel || null,
      entry.responseTime || null,
      entry.processingTime || null,
      entry.wasIdentical ? 1 : 0,
      entry.hadError ? 1 : 0,
      entry.context || null,
      entry.userId || null,
      now,
      now
    ).run();

    return (await this.findEnhancementLogById(id))!;
  }

  async findEnhancementLogById(id: string): Promise<D1EnhancementLog | null> {
    return await this.database.prepare(
      'SELECT * FROM enhancement_logs WHERE id = ? LIMIT 1'
    ).bind(id).first<D1EnhancementLog>();
  }

  async listEnhancementLogs(options: {
    userId?: string;
    source?: string;
    hadError?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<D1EnhancementLog[]> {
    const { userId, source, hadError, limit = 50, offset = 0 } = options;

    let query = 'SELECT * FROM enhancement_logs WHERE 1=1';
    const params: unknown[] = [];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    if (source) {
      query += ' AND source = ?';
      params.push(source);
    }
    if (hadError !== undefined) {
      query += ' AND had_error = ?';
      params.push(hadError ? 1 : 0);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await this.database.prepare(query).bind(...params).all<D1EnhancementLog>();
    return result.results || [];
  }

  async getEnhancementStats(options: {
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{
    total: number;
    errors: number;
    avgResponseTime: number;
    bySource: Record<string, number>;
  }> {
    const { startDate, endDate } = options;

    let whereClause = '1=1';
    const params: unknown[] = [];

    if (startDate) {
      whereClause += ' AND timestamp >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND timestamp <= ?';
      params.push(endDate);
    }

    const [stats, bySrc] = await Promise.all([
      this.database.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN had_error = 1 THEN 1 ELSE 0 END) as errors,
          AVG(response_time) as avg_response_time
        FROM enhancement_logs WHERE ${whereClause}
      `).bind(...params).first<{ total: number; errors: number; avg_response_time: number }>(),
      this.database.prepare(`
        SELECT source, COUNT(*) as count
        FROM enhancement_logs WHERE ${whereClause}
        GROUP BY source
      `).bind(...params).all<{ source: string; count: number }>()
    ]);

    const bySource: Record<string, number> = {};
    for (const row of bySrc.results || []) {
      bySource[row.source] = row.count;
    }

    return {
      total: stats?.total || 0,
      errors: stats?.errors || 0,
      avgResponseTime: stats?.avg_response_time || 0,
      bySource
    };
  }

  // ===== Training Examples Operations =====

  async createTrainingExample(entry: {
    rawPrompt: string;
    enhancedPrompt: string;
    context?: string;
    category?: string;
    keywords?: string;
    source: string;
    quality?: number;
    metadata?: string;
  }): Promise<D1TrainingExample> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.database.prepare(`
      INSERT INTO training_examples (
        id, raw_prompt, enhanced_prompt, context, category, keywords, source, quality, usage_count, metadata, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, ?, ?)
    `).bind(
      id,
      entry.rawPrompt,
      entry.enhancedPrompt,
      entry.context || null,
      entry.category || null,
      entry.keywords || null,
      entry.source,
      entry.quality || 0,
      entry.metadata || null,
      now,
      now
    ).run();

    return (await this.findTrainingExampleById(id))!;
  }

  async findTrainingExampleById(id: string): Promise<D1TrainingExample | null> {
    return await this.database.prepare(
      'SELECT * FROM training_examples WHERE id = ? LIMIT 1'
    ).bind(id).first<D1TrainingExample>();
  }

  async listActiveTrainingExamples(options: {
    category?: string;
    minQuality?: number;
    limit?: number;
  } = {}): Promise<D1TrainingExample[]> {
    const { category, minQuality = 0, limit = 100 } = options;

    let query = 'SELECT * FROM training_examples WHERE is_active = 1 AND quality >= ?';
    const params: unknown[] = [minQuality];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY quality DESC, usage_count DESC LIMIT ?';
    params.push(limit);

    const result = await this.database.prepare(query).bind(...params).all<D1TrainingExample>();
    return result.results || [];
  }

  async incrementTrainingExampleUsage(id: string): Promise<void> {
    await this.database.prepare(
      'UPDATE training_examples SET usage_count = usage_count + 1 WHERE id = ?'
    ).bind(id).run();
  }

  // ===== Extension Downloads Operations =====

  async createExtensionDownload(entry: {
    userId: string;
    extensionVersion: string;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
  }): Promise<D1ExtensionDownload> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.database.prepare(`
      INSERT INTO extension_downloads (id, user_id, extension_version, ip_address, user_agent, referrer, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      entry.userId,
      entry.extensionVersion,
      entry.ipAddress || null,
      entry.userAgent || null,
      entry.referrer || null,
      now
    ).run();

    return (await this.findExtensionDownloadById(id))!;
  }

  async findExtensionDownloadById(id: string): Promise<D1ExtensionDownload | null> {
    return await this.database.prepare(
      'SELECT * FROM extension_downloads WHERE id = ? LIMIT 1'
    ).bind(id).first<D1ExtensionDownload>();
  }

  async listExtensionDownloads(userId: string): Promise<D1ExtensionDownload[]> {
    const result = await this.database.prepare(
      'SELECT * FROM extension_downloads WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all<D1ExtensionDownload>();
    return result.results || [];
  }

  // ===== Audit Logs Operations =====

  async createAuditLog(entry: {
    eventType: string;
    eventCategory: string;
    severity: string;
    action: string;
    userId?: string;
    userEmail?: string;
    userIpAddress?: string;
    userAgent?: string;
    sessionId?: string;
    resourceType?: string;
    resourceId?: string;
    resourceName?: string;
    requestMethod?: string;
    requestPath?: string;
    requestQueryParams?: string;
    requestHeaders?: string;
    responseStatusCode?: number;
    responseTimeMs?: number;
    oldValues?: string;
    newValues?: string;
    metadata?: string;
    tags?: string;
    isSuspicious?: boolean;
    riskScore?: number;
    threatIndicators?: string;
    retentionPeriodDays?: number;
  }): Promise<D1AuditLog> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.database.prepare(`
      INSERT INTO audit_logs (
        id, event_type, event_category, severity, action, user_id, user_email, user_ip_address, user_agent,
        session_id, resource_type, resource_id, resource_name, request_method, request_path, request_query_params,
        request_headers, response_status_code, response_time_ms, old_values, new_values, metadata, tags,
        is_suspicious, risk_score, threat_indicators, retention_period_days, is_immutable, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).bind(
      id,
      entry.eventType,
      entry.eventCategory,
      entry.severity,
      entry.action,
      entry.userId || null,
      entry.userEmail || null,
      entry.userIpAddress || null,
      entry.userAgent || null,
      entry.sessionId || null,
      entry.resourceType || null,
      entry.resourceId || null,
      entry.resourceName || null,
      entry.requestMethod || null,
      entry.requestPath || null,
      entry.requestQueryParams || null,
      entry.requestHeaders || null,
      entry.responseStatusCode || null,
      entry.responseTimeMs || null,
      entry.oldValues || null,
      entry.newValues || null,
      entry.metadata || null,
      entry.tags || null,
      entry.isSuspicious ? 1 : 0,
      entry.riskScore || 0,
      entry.threatIndicators || null,
      entry.retentionPeriodDays || 90,
      now
    ).run();

    return (await this.findAuditLogById(id))!;
  }

  async findAuditLogById(id: string): Promise<D1AuditLog | null> {
    return await this.database.prepare(
      'SELECT * FROM audit_logs WHERE id = ? LIMIT 1'
    ).bind(id).first<D1AuditLog>();
  }

  async listAuditLogs(options: {
    userId?: string;
    eventType?: string;
    eventCategory?: string;
    severity?: string;
    isSuspicious?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<D1AuditLog[]> {
    const { userId, eventType, eventCategory, severity, isSuspicious, limit = 50, offset = 0 } = options;

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: unknown[] = [];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    if (eventType) {
      query += ' AND event_type = ?';
      params.push(eventType);
    }
    if (eventCategory) {
      query += ' AND event_category = ?';
      params.push(eventCategory);
    }
    if (severity) {
      query += ' AND severity = ?';
      params.push(severity);
    }
    if (isSuspicious !== undefined) {
      query += ' AND is_suspicious = ?';
      params.push(isSuspicious ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await this.database.prepare(query).bind(...params).all<D1AuditLog>();
    return result.results || [];
  }

  async deleteExpiredAuditLogs(): Promise<number> {
    const result = await this.database.prepare(`
      DELETE FROM audit_logs
      WHERE is_immutable = 0
      AND datetime(created_at, '+' || retention_period_days || ' days') < datetime('now')
    `).run();
    return result.meta.changes;
  }

  // ===== Prompts Repository Operations =====

  async createPrompt(entry: {
    originalText: string;
    textHash: string;
    categoryId?: string;
    isPublic?: boolean;
  }): Promise<D1Prompt> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.database.prepare(`
      INSERT INTO prompts (id, original_text, text_hash, category_id, latest_version, total_uses, is_public, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, 0, ?, ?, ?)
    `).bind(
      id,
      entry.originalText,
      entry.textHash,
      entry.categoryId || null,
      entry.isPublic ? 1 : 0,
      now,
      now
    ).run();

    return (await this.findPromptById(id))!;
  }

  async findPromptById(id: string): Promise<D1Prompt | null> {
    return await this.database.prepare(
      'SELECT * FROM prompts WHERE id = ? LIMIT 1'
    ).bind(id).first<D1Prompt>();
  }

  async findPromptByHash(textHash: string): Promise<D1Prompt | null> {
    return await this.database.prepare(
      'SELECT * FROM prompts WHERE text_hash = ? LIMIT 1'
    ).bind(textHash).first<D1Prompt>();
  }

  async incrementPromptUses(id: string): Promise<void> {
    await this.database.prepare(
      'UPDATE prompts SET total_uses = total_uses + 1 WHERE id = ?'
    ).bind(id).run();
  }

  async createPromptVersion(entry: {
    promptId: string;
    versionNumber: number;
    enhancedText: string;
    enhancementSource: string;
    qualityScore?: number;
    metricsData?: string;
    isBaseline?: boolean;
  }): Promise<D1PromptVersion> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.database.prepare(`
      INSERT INTO prompt_versions (id, prompt_id, version_number, enhanced_text, enhancement_source, quality_score, metrics_data, is_baseline, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      entry.promptId,
      entry.versionNumber,
      entry.enhancedText,
      entry.enhancementSource,
      entry.qualityScore || null,
      entry.metricsData || null,
      entry.isBaseline ? 1 : 0,
      now
    ).run();

    // Update latest version on parent prompt
    await this.database.prepare(
      'UPDATE prompts SET latest_version = ? WHERE id = ?'
    ).bind(entry.versionNumber, entry.promptId).run();

    return (await this.findPromptVersionById(id))!;
  }

  async findPromptVersionById(id: string): Promise<D1PromptVersion | null> {
    return await this.database.prepare(
      'SELECT * FROM prompt_versions WHERE id = ? LIMIT 1'
    ).bind(id).first<D1PromptVersion>();
  }

  async listPromptVersions(promptId: string): Promise<D1PromptVersion[]> {
    const result = await this.database.prepare(
      'SELECT * FROM prompt_versions WHERE prompt_id = ? ORDER BY version_number DESC'
    ).bind(promptId).all<D1PromptVersion>();
    return result.results || [];
  }

  // ===== GDPR/Privacy Operations =====

  async exportUserData(userId: string): Promise<{
    user: D1User | null;
    sessions: D1Session[];
    promptHistory: D1PromptHistory[];
    feedback: D1Feedback[];
    enhancementLogs: D1EnhancementLog[];
    extensionDownloads: D1ExtensionDownload[];
    auditLogs: D1AuditLog[];
  }> {
    const [user, sessions, promptHistory, feedback, enhancementLogs, extensionDownloads, auditLogs] = await Promise.all([
      this.findUserById(userId),
      this.listUserSessions(userId),
      this.listPromptHistory({ userId, limit: 10000 }),
      this.listFeedback({ userId, limit: 10000 }),
      this.listEnhancementLogs({ userId, limit: 10000 }),
      this.listExtensionDownloads(userId),
      this.listAuditLogs({ userId, limit: 10000 })
    ]);

    return { user, sessions, promptHistory, feedback, enhancementLogs, extensionDownloads, auditLogs };
  }

  async deleteAllUserData(userId: string): Promise<{
    promptHistoryDeleted: number;
    feedbackDeleted: number;
    logsDeleted: number;
    downloadsDeleted: number;
    auditLogsDeleted: number;
    sessionsRevoked: boolean;
    userDeactivated: boolean;
  }> {
    // Delete all user data (order matters for foreign keys)
    const [promptHistoryResult, feedbackResult, logsResult, downloadsResult, auditLogsResult] = await Promise.all([
      this.database.prepare('DELETE FROM prompt_history WHERE user_id = ?').bind(userId).run(),
      this.database.prepare('DELETE FROM feedback WHERE user_id = ?').bind(userId).run(),
      this.database.prepare('DELETE FROM enhancement_logs WHERE user_id = ?').bind(userId).run(),
      this.database.prepare('DELETE FROM extension_downloads WHERE user_id = ?').bind(userId).run(),
      this.database.prepare('DELETE FROM audit_logs WHERE user_id = ? AND is_immutable = 0').bind(userId).run()
    ]);

    // Revoke sessions and deactivate user
    await this.revokeAllUserSessions(userId);
    await this.updateUser(userId, { isActive: false });

    return {
      promptHistoryDeleted: promptHistoryResult.meta.changes,
      feedbackDeleted: feedbackResult.meta.changes,
      logsDeleted: logsResult.meta.changes,
      downloadsDeleted: downloadsResult.meta.changes,
      auditLogsDeleted: auditLogsResult.meta.changes,
      sessionsRevoked: true,
      userDeactivated: true
    };
  }
}

/**
 * Create unified database instance from environment
 */
export function createUnifiedDb(env: { AUTH_DB?: D1Database }): D1UnifiedDatabase | null {
  if (!env.AUTH_DB) {
    console.warn('AUTH_DB (D1) not configured');
    return null;
  }

  return new D1UnifiedDatabase(env.AUTH_DB);
}

/**
 * Get database or throw - for routes that require database
 */
export function requireDb(env: { AUTH_DB?: D1Database }): D1UnifiedDatabase {
  const db = createUnifiedDb(env);
  if (!db) {
    throw new Error('Database not configured');
  }
  return db;
}
