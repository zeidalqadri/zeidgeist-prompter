// LLM Usage Tracker for /tweak page analytics

interface UsageEntry {
  provider: string
  timestamp: string
  sessionId: string
  success: boolean
  responseTime?: number
}

export class LLMUsageTracker {
  private static STORAGE_KEY = 'llmProviderUsage'
  private static SESSION_KEY = 'llmSessionId'
  private static MAX_ENTRIES = 100

  // Generate or get session ID
  private static getSessionId(): string {
    if (typeof window === 'undefined') return 'server'
    
    let sessionId = localStorage.getItem(this.SESSION_KEY)
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem(this.SESSION_KEY, sessionId)
    }
    return sessionId
  }

  // Track successful provider usage
  static trackUsage(provider: string, responseTime?: number): void {
    if (typeof window === 'undefined') return

    try {
      const sessionId = this.getSessionId()
      const entry: UsageEntry = {
        provider: provider.toLowerCase(),
        timestamp: new Date().toISOString(),
        sessionId,
        success: true,
        responseTime
      }

      // Get existing usage
      const existingUsage = this.getUsageHistory()
      
      // Add new entry and limit size
      const updatedUsage = [entry, ...existingUsage].slice(0, this.MAX_ENTRIES)
      
      // Save back to localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedUsage))
      
      console.log('📊 LLM usage tracked:', provider)
    } catch (error) {
      console.error('Error tracking LLM usage:', error)
    }
  }

  // Track failed provider usage
  static trackFailure(provider: string): void {
    if (typeof window === 'undefined') return

    try {
      const sessionId = this.getSessionId()
      const entry: UsageEntry = {
        provider: provider.toLowerCase(),
        timestamp: new Date().toISOString(),
        sessionId,
        success: false
      }

      const existingUsage = this.getUsageHistory()
      const updatedUsage = [entry, ...existingUsage].slice(0, this.MAX_ENTRIES)
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedUsage))
      
      console.log('❌ LLM failure tracked:', provider)
    } catch (error) {
      console.error('Error tracking LLM failure:', error)
    }
  }

  // Get usage history
  static getUsageHistory(): UsageEntry[] {
    if (typeof window === 'undefined') return []

    try {
      const usage = localStorage.getItem(this.STORAGE_KEY)
      return usage ? JSON.parse(usage) : []
    } catch (error) {
      console.error('Error getting LLM usage history:', error)
      return []
    }
  }

  // Get recent usage for display (last N entries)
  static getRecentUsage(limit: number = 10): Array<{provider: string, timestamp: string}> {
    const history = this.getUsageHistory()
    return history
      .filter(entry => entry.success)
      .slice(0, limit)
      .map(entry => ({
        provider: entry.provider,
        timestamp: this.formatTimestamp(entry.timestamp)
      }))
  }

  // Get usage statistics
  static getUsageStats(): Record<string, {count: number, successRate: number, avgResponseTime?: number}> {
    const history = this.getUsageHistory()
    const stats: Record<string, {total: number, success: number, totalResponseTime: number, responseCount: number}> = {}

    // Calculate raw stats
    history.forEach(entry => {
      if (!stats[entry.provider]) {
        stats[entry.provider] = { total: 0, success: 0, totalResponseTime: 0, responseCount: 0 }
      }
      
      stats[entry.provider].total++
      if (entry.success) {
        stats[entry.provider].success++
        if (entry.responseTime) {
          stats[entry.provider].totalResponseTime += entry.responseTime
          stats[entry.provider].responseCount++
        }
      }
    })

    // Convert to display format
    const displayStats: Record<string, {count: number, successRate: number, avgResponseTime?: number}> = {}
    
    Object.entries(stats).forEach(([provider, data]) => {
      displayStats[provider] = {
        count: data.success,
        successRate: data.total > 0 ? (data.success / data.total) * 100 : 0,
        avgResponseTime: data.responseCount > 0 ? data.totalResponseTime / data.responseCount : undefined
      }
    })

    return displayStats
  }

  // Clear usage history
  static clearHistory(): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(this.STORAGE_KEY)
      console.log('🗑️ LLM usage history cleared')
    } catch (error) {
      console.error('Error clearing LLM usage history:', error)
    }
  }

  // Format timestamp for display
  private static formatTimestamp(timestamp: string): string {
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      
      if (diffMs < 60000) { // Less than 1 minute
        return `${Math.floor(diffMs / 1000)}s ago`
      } else if (diffMs < 3600000) { // Less than 1 hour
        return `${Math.floor(diffMs / 60000)}m ago`
      } else if (diffMs < 86400000) { // Less than 1 day
        return `${Math.floor(diffMs / 3600000)}h ago`
      } else {
        return date.toLocaleDateString()
      }
    } catch (error) {
      return timestamp
    }
  }

  // Get provider preference statistics
  static getProviderPreferenceStats(): {mostUsed: string, leastUsed: string, distribution: Record<string, number>} {
    const stats = this.getUsageStats()
    const distribution: Record<string, number> = {}
    
    let mostUsed = ''
    let leastUsed = ''
    let maxCount = 0
    let minCount = Infinity

    Object.entries(stats).forEach(([provider, data]) => {
      distribution[provider] = data.count
      
      if (data.count > maxCount) {
        maxCount = data.count
        mostUsed = provider
      }
      
      if (data.count < minCount && data.count > 0) {
        minCount = data.count
        leastUsed = provider
      }
    })

    return {
      mostUsed,
      leastUsed: leastUsed === '' ? mostUsed : leastUsed,
      distribution
    }
  }
}