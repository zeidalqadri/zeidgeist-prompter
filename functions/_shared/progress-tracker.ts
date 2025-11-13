/**
 * Progress Tracking System for Long-Running Image Operations
 * Uses Cloudflare KV for real-time progress updates
 */

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
    await env.PROGRESS_TRACKER.put(
      `progress:${taskId}`,
      JSON.stringify(progress),
      { expirationTtl: 900 } // 15 minutes TTL
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

  const progress: ProgressUpdate = JSON.parse(existing)

  progress.percent = Math.min(100, Math.max(0, percent))
  progress.message = message
  progress.status = percent >= 100 ? 'completed' : 'processing'
  progress.updatedAt = new Date().toISOString()

  if (currentStep) progress.currentStep = currentStep
  if (totalSteps) progress.totalSteps = totalSteps

  if (percent >= 100) {
    progress.completedAt = new Date().toISOString()
  }

  await env.PROGRESS_TRACKER.put(
    `progress:${taskId}`,
    JSON.stringify(progress),
    { expirationTtl: 900 }
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

  const progress: ProgressUpdate = JSON.parse(existing)

  progress.status = 'completed'
  progress.percent = 100
  progress.message = 'Completed successfully'
  progress.completedAt = new Date().toISOString()
  progress.updatedAt = new Date().toISOString()
  progress.result = result

  await env.PROGRESS_TRACKER.put(
    `progress:${taskId}`,
    JSON.stringify(progress),
    { expirationTtl: 900 }
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

  const progress: ProgressUpdate = JSON.parse(existing)

  progress.status = 'failed'
  progress.message = 'Task failed'
  progress.error = error
  progress.completedAt = new Date().toISOString()
  progress.updatedAt = new Date().toISOString()

  await env.PROGRESS_TRACKER.put(
    `progress:${taskId}`,
    JSON.stringify(progress),
    { expirationTtl: 900 }
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

  return JSON.parse(data)
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
