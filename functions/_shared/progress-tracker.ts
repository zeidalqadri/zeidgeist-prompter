/**
 * Progress Tracking System for Long-Running Image Operations
 * Uses Cloudflare KV for real-time progress updates
 */

// Cloudflare KV Namespace type definition
interface KVPutOptions {
  expirationTtl?: number
  expiration?: number
  metadata?: any
}

interface KVNamespace {
  get<T = unknown>(key: string, options?: { type: 'json' }): Promise<T | null>
  get(key: string, options?: { type: 'text' }): Promise<string | null>
  get(key: string, options?: { type: 'arrayBuffer' }): Promise<ArrayBuffer | null>
  get(key: string, options?: { type: 'stream' }): Promise<ReadableStream | null>
  get(key: string): Promise<string | null>
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: KVPutOptions): Promise<void>
  delete(key: string): Promise<void>
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: { name: string; expiration?: number; metadata?: any }[]; list_complete: boolean; cursor?: string }>
}

export interface ProgressUpdate {
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  percent: number // 0-100
  message: string
  currentStep?: string
  totalSteps?: number
  startedAt: string
  updatedAt: string
  completedAt?: string
  error?: string
  result?: any
}

export interface ProgressTrackerEnv {
  PROGRESS_TRACKER?: KVNamespace
}

/**
 * Create a new progress tracker
 * @param taskId - Unique task identifier
 * @param env - Cloudflare environment with KV binding
 * @returns Initial progress update
 */
export async function initializeProgress(
  taskId: string,
  env: ProgressTrackerEnv
): Promise<ProgressUpdate> {
  const progress: ProgressUpdate = {
    taskId,
    status: 'pending',
    percent: 0,
    message: 'Initializing...',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  if (env.PROGRESS_TRACKER) {
    const options: KVPutOptions = { expirationTtl: 900 } // 15 minutes TTL
    await env.PROGRESS_TRACKER.put(
      `progress:${taskId}`,
      JSON.stringify(progress),
      options
    )
  }

  console.log(`📊 Initialized progress tracker: ${taskId}`)

  return progress
}

/**
 * Update progress for a task
 * @param taskId - Task identifier
 * @param percent - Progress percentage (0-100)
 * @param message - Status message
 * @param env - Cloudflare environment
 */
export async function updateProgress(
  taskId: string,
  percent: number,
  message: string,
  env: ProgressTrackerEnv,
  currentStep?: string,
  totalSteps?: number
): Promise<void> {
  if (!env.PROGRESS_TRACKER) {
    console.warn('⚠️ Progress tracker KV not available')
    return
  }

  const existing = await env.PROGRESS_TRACKER.get(`progress:${taskId}`)

  if (!existing) {
    console.warn(`⚠️ Progress tracker not found: ${taskId}`)
    return
  }

  const progress: ProgressUpdate = JSON.parse(existing as string)

  progress.percent = Math.min(100, Math.max(0, percent))
  progress.message = message
  progress.status = percent >= 100 ? 'completed' : 'processing'
  progress.updatedAt = new Date().toISOString()

  if (currentStep) progress.currentStep = currentStep
  if (totalSteps) progress.totalSteps = totalSteps

  if (percent >= 100) {
    progress.completedAt = new Date().toISOString()
  }

  const options: KVPutOptions = { expirationTtl: 900 }
  await env.PROGRESS_TRACKER.put(
    `progress:${taskId}`,
    JSON.stringify(progress),
    options
  )

  console.log(`📊 Progress updated: ${taskId} - ${percent}% - ${message}`)
}

/**
 * Mark task as completed
 * @param taskId - Task identifier
 * @param result - Task result data
 * @param env - Cloudflare environment
 */
export async function completeProgress(
  taskId: string,
  result: any,
  env: ProgressTrackerEnv
): Promise<void> {
  if (!env.PROGRESS_TRACKER) {
    return
  }

  const existing = await env.PROGRESS_TRACKER.get(`progress:${taskId}`)

  if (!existing) {
    console.warn(`⚠️ Progress tracker not found: ${taskId}`)
    return
  }

  const progress: ProgressUpdate = JSON.parse(existing as string)

  progress.status = 'completed'
  progress.percent = 100
  progress.message = 'Completed successfully'
  progress.completedAt = new Date().toISOString()
  progress.updatedAt = new Date().toISOString()
  progress.result = result

  const options: KVPutOptions = { expirationTtl: 900 }
  await env.PROGRESS_TRACKER.put(
    `progress:${taskId}`,
    JSON.stringify(progress),
    options
  )

  console.log(`✅ Task completed: ${taskId}`)
}

/**
 * Mark task as failed
 * @param taskId - Task identifier
 * @param error - Error message
 * @param env - Cloudflare environment
 */
export async function failProgress(
  taskId: string,
  error: string,
  env: ProgressTrackerEnv
): Promise<void> {
  if (!env.PROGRESS_TRACKER) {
    return
  }

  const existing = await env.PROGRESS_TRACKER.get(`progress:${taskId}`)

  if (!existing) {
    console.warn(`⚠️ Progress tracker not found: ${taskId}`)
    return
  }

  const progress: ProgressUpdate = JSON.parse(existing as string)

  progress.status = 'failed'
  progress.message = 'Task failed'
  progress.error = error
  progress.completedAt = new Date().toISOString()
  progress.updatedAt = new Date().toISOString()

  const options: KVPutOptions = { expirationTtl: 900 }
  await env.PROGRESS_TRACKER.put(
    `progress:${taskId}`,
    JSON.stringify(progress),
    options
  )

  console.error(`❌ Task failed: ${taskId} - ${error}`)
}

/**
 * Get progress for a task
 * @param taskId - Task identifier
 * @param env - Cloudflare environment
 * @returns Progress update or null
 */
export async function getProgress(
  taskId: string,
  env: ProgressTrackerEnv
): Promise<ProgressUpdate | null> {
  if (!env.PROGRESS_TRACKER) {
    return null
  }

  const data = await env.PROGRESS_TRACKER.get(`progress:${taskId}`)

  if (!data) {
    return null
  }

  return JSON.parse(data as string)
}

/**
 * Delete progress tracker (cleanup)
 * @param taskId - Task identifier
 * @param env - Cloudflare environment
 */
export async function deleteProgress(
  taskId: string,
  env: ProgressTrackerEnv
): Promise<void> {
  if (!env.PROGRESS_TRACKER) {
    return
  }

  await env.PROGRESS_TRACKER.delete(`progress:${taskId}`)
  console.log(`🗑️ Deleted progress tracker: ${taskId}`)
}

/**
 * Create a progress callback function
 * @param taskId - Task identifier
 * @param env - Cloudflare environment
 * @returns Progress callback function
 */
export function createProgressCallback(
  taskId: string,
  env: ProgressTrackerEnv
): (percent: number, message: string) => Promise<void> {
  return async (percent: number, message: string) => {
    await updateProgress(taskId, percent, message, env)
  }
}
