/**
 * Request Batching System
 *
 * Batches similar prompts together to:
 * - Reduce redundant LLM API calls
 * - Optimize processing for similar requests
 * - Share results across concurrent requests
 */

export interface BatchRequest {
  id: string
  prompt: string
  context?: string
  timestamp: number
  resolve: (result: string) => void
  reject: (error: Error) => void
}

export interface BatchConfig {
  maxBatchSize: number
  maxWaitTime: number // milliseconds
  similarityThreshold: number // 0-1, higher = more similar required
}

export class RequestBatcher {
  private batches: Map<string, BatchRequest[]> = new Map()
  private processing: Set<string> = new Set()
  private timers: Map<string, NodeJS.Timeout> = new Map()

  constructor(
    private config: BatchConfig = {
      maxBatchSize: 10,
      maxWaitTime: 100, // 100ms window
      similarityThreshold: 0.85
    }
  ) {}

  /**
   * Add request to batch and return promise
   */
  async batchRequest(
    prompt: string,
    context: string | undefined,
    processor: (prompts: string[], contexts: (string | undefined)[]) => Promise<string[]>
  ): Promise<string> {
    const batchKey = this.getBatchKey(prompt)

    return new Promise<string>((resolve, reject) => {
      const request: BatchRequest = {
        id: this.generateId(),
        prompt,
        context,
        timestamp: Date.now(),
        resolve,
        reject
      }

      // Add to batch
      if (!this.batches.has(batchKey)) {
        this.batches.set(batchKey, [])
      }

      const batch = this.batches.get(batchKey)!
      batch.push(request)

      console.log(`[Batcher] Added request to batch ${batchKey}, size: ${batch.length}`)

      // Process immediately if batch is full
      if (batch.length >= this.config.maxBatchSize) {
        this.processBatch(batchKey, processor)
        return
      }

      // Schedule batch processing if not already scheduled
      if (!this.timers.has(batchKey)) {
        const timer = setTimeout(() => {
          this.processBatch(batchKey, processor)
        }, this.config.maxWaitTime)

        this.timers.set(batchKey, timer)
      }
    })
  }

  /**
   * Process a batch of requests
   */
  private async processBatch(
    batchKey: string,
    processor: (prompts: string[], contexts: (string | undefined)[]) => Promise<string[]>
  ): Promise<void> {
    // Clear timer
    const timer = this.timers.get(batchKey)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(batchKey)
    }

    // Get batch
    const batch = this.batches.get(batchKey)
    if (!batch || batch.length === 0) {
      return
    }

    // Remove batch from queue
    this.batches.delete(batchKey)

    // Mark as processing
    this.processing.add(batchKey)

    try {
      console.log(`[Batcher] Processing batch ${batchKey} with ${batch.length} requests`)

      // Check if all prompts are identical - if so, process once
      const uniquePrompts = [...new Set(batch.map(r => r.prompt))]

      if (uniquePrompts.length === 1) {
        console.log(`[Batcher] All prompts identical, processing once`)
        const results = await processor([uniquePrompts[0]], [batch[0].context])

        // Resolve all requests with the same result
        batch.forEach(req => req.resolve(results[0]))
      } else {
        // Process all prompts
        const prompts = batch.map(r => r.prompt)
        const contexts = batch.map(r => r.context)
        const results = await processor(prompts, contexts)

        // Resolve each request with its corresponding result
        batch.forEach((req, index) => {
          req.resolve(results[index])
        })
      }

      console.log(`[Batcher] Batch ${batchKey} completed successfully`)
    } catch (error) {
      console.error(`[Batcher] Batch ${batchKey} failed:`, error)

      // Reject all requests
      batch.forEach(req => {
        req.reject(error instanceof Error ? error : new Error(String(error)))
      })
    } finally {
      // Mark as no longer processing
      this.processing.delete(batchKey)
    }
  }

  /**
   * Generate batch key based on prompt similarity
   */
  private getBatchKey(prompt: string): string {
    // Normalize prompt
    const normalized = prompt.toLowerCase().trim()

    // Extract key terms (simple approach - could use TF-IDF or embeddings)
    const words = normalized.split(/\s+/)
    const keyTerms = words.filter(w => w.length > 4) // Words > 4 chars
      .slice(0, 5) // First 5 key terms
      .sort()
      .join('_')

    return keyTerms || 'default'
  }

  /**
   * Calculate similarity between two prompts (simple approach)
   */
  private calculateSimilarity(prompt1: string, prompt2: string): number {
    const words1 = new Set(prompt1.toLowerCase().split(/\s+/))
    const words2 = new Set(prompt2.toLowerCase().split(/\s+/))

    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])

    return intersection.size / union.size // Jaccard similarity
  }

  /**
   * Generate unique request ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`
  }

  /**
   * Get current batch statistics
   */
  getStats(): {
    activeBatches: number
    processingBatches: number
    totalPending: number
  } {
    const totalPending = Array.from(this.batches.values())
      .reduce((sum, batch) => sum + batch.length, 0)

    return {
      activeBatches: this.batches.size,
      processingBatches: this.processing.size,
      totalPending
    }
  }

  /**
   * Clear all batches (for cleanup)
   */
  clear(): void {
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer))
    this.timers.clear()

    // Reject all pending requests
    this.batches.forEach(batch => {
      batch.forEach(req => {
        req.reject(new Error('Batch cleared'))
      })
    })

    this.batches.clear()
    this.processing.clear()
  }
}

/**
 * Global request batcher singleton (per worker instance)
 */
let globalBatcher: RequestBatcher | null = null

export function getRequestBatcher(config?: BatchConfig): RequestBatcher {
  if (!globalBatcher) {
    globalBatcher = new RequestBatcher(config)
  }
  return globalBatcher
}

/**
 * Reset global batcher (useful for testing)
 */
export function resetRequestBatcher(): void {
  if (globalBatcher) {
    globalBatcher.clear()
    globalBatcher = null
  }
}
