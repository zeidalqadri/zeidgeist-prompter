/**
 * Privacy Monitoring and Alerting System
 * Real-time detection and alerting for privacy violations
 */

export interface PrivacyAlert {
  id: string;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: string;
  description: string;
  metadata: Record<string, any>;
}

export interface MonitoringMetrics {
  totalRequests: number;
  uniqueIPs: number;
  violationAttempts: number;
  sharedNetworkAccess: number;
  rateLimitExceeded: number;
  crossUserAttempts: number;
}

class PrivacyMonitor {
  private metrics: MonitoringMetrics = {
    totalRequests: 0,
    uniqueIPs: 0,
    violationAttempts: 0,
    sharedNetworkAccess: 0,
    rateLimitExceeded: 0,
    crossUserAttempts: 0
  };
  
  private alerts: PrivacyAlert[] = [];
  private ipSet = new Set<string>();
  private suspiciousPatterns = new Map<string, number>();
  
  // Thresholds for alerting
  private readonly THRESHOLDS = {
    VIOLATION_ATTEMPTS_PER_HOUR: 10,
    CROSS_USER_ATTEMPTS_PER_IP: 3,
    RATE_LIMIT_VIOLATIONS_PER_IP: 5,
    SHARED_NETWORK_THRESHOLD: 0.3, // 30% of traffic
  };
  
  /**
   * Track a request for monitoring
   */
  trackRequest(
    ipAddress: string,
    endpoint: string,
    metadata?: Record<string, any>
  ): void {
    this.metrics.totalRequests++;
    
    if (!this.ipSet.has(ipAddress)) {
      this.ipSet.add(ipAddress);
      this.metrics.uniqueIPs++;
    }
    
    // Check for suspicious patterns
    this.detectSuspiciousPatterns(ipAddress, endpoint, metadata);
  }
  
  /**
   * Track a privacy violation attempt
   */
  trackViolation(
    ipAddress: string,
    violationType: string,
    details?: Record<string, any>
  ): void {
    this.metrics.violationAttempts++;
    
    const patternKey = `${ipAddress}:${violationType}`;
    const count = (this.suspiciousPatterns.get(patternKey) || 0) + 1;
    this.suspiciousPatterns.set(patternKey, count);
    
    // Generate alert if threshold exceeded
    if (count >= this.THRESHOLDS.CROSS_USER_ATTEMPTS_PER_IP) {
      this.generateAlert({
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        severity: count >= 5 ? 'CRITICAL' : 'HIGH',
        type: 'PRIVACY_VIOLATION_PATTERN',
        description: `IP ${this.anonymizeIP(ipAddress)} has attempted ${count} privacy violations`,
        metadata: {
          ipAddress: this.anonymizeIP(ipAddress),
          violationType,
          attemptCount: count,
          ...details
        }
      });
    }
  }
  
  /**
   * Track shared network access
   */
  trackSharedNetworkAccess(ipAddress: string): void {
    this.metrics.sharedNetworkAccess++;
    
    const sharedRatio = this.metrics.sharedNetworkAccess / this.metrics.totalRequests;
    if (sharedRatio > this.THRESHOLDS.SHARED_NETWORK_THRESHOLD) {
      this.generateAlert({
        id: `alert-${Date.now()}-shared`,
        timestamp: new Date(),
        severity: 'MEDIUM',
        type: 'HIGH_SHARED_NETWORK_USAGE',
        description: `${(sharedRatio * 100).toFixed(1)}% of traffic from shared networks`,
        metadata: {
          ratio: sharedRatio,
          totalShared: this.metrics.sharedNetworkAccess,
          totalRequests: this.metrics.totalRequests
        }
      });
    }
  }
  
  /**
   * Track rate limit violations
   */
  trackRateLimitViolation(ipAddress: string): void {
    this.metrics.rateLimitExceeded++;
    
    const key = `ratelimit:${ipAddress}`;
    const count = (this.suspiciousPatterns.get(key) || 0) + 1;
    this.suspiciousPatterns.set(key, count);
    
    if (count >= this.THRESHOLDS.RATE_LIMIT_VIOLATIONS_PER_IP) {
      this.generateAlert({
        id: `alert-${Date.now()}-ratelimit`,
        timestamp: new Date(),
        severity: 'MEDIUM',
        type: 'EXCESSIVE_RATE_LIMIT_VIOLATIONS',
        description: `IP has exceeded rate limits ${count} times`,
        metadata: {
          ipAddress: this.anonymizeIP(ipAddress),
          violationCount: count
        }
      });
    }
  }
  
  /**
   * Detect suspicious patterns in requests
   */
  private detectSuspiciousPatterns(
    ipAddress: string,
    endpoint: string,
    metadata?: Record<string, any>
  ): void {
    // Pattern 1: Rapid endpoint scanning
    const scanKey = `scan:${ipAddress}`;
    const endpoints = this.suspiciousPatterns.get(scanKey) || 0;
    if (endpoints > 10) {
      this.generateAlert({
        id: `alert-${Date.now()}-scan`,
        timestamp: new Date(),
        severity: 'HIGH',
        type: 'ENDPOINT_SCANNING',
        description: 'Potential endpoint scanning detected',
        metadata: {
          ipAddress: this.anonymizeIP(ipAddress),
          endpointCount: endpoints
        }
      });
    }
    
    // Pattern 2: Unusual user agent changes
    if (metadata?.userAgentChanged) {
      this.generateAlert({
        id: `alert-${Date.now()}-ua`,
        timestamp: new Date(),
        severity: 'LOW',
        type: 'USER_AGENT_ROTATION',
        description: 'User agent rotation detected',
        metadata: {
          ipAddress: this.anonymizeIP(ipAddress)
        }
      });
    }
    
    // Pattern 3: Cross-user access attempts
    if (metadata?.crossUserAttempt) {
      this.metrics.crossUserAttempts++;
      this.trackViolation(ipAddress, 'CROSS_USER_ACCESS', metadata);
    }
  }
  
  /**
   * Generate and store an alert
   */
  private generateAlert(alert: PrivacyAlert): void {
    this.alerts.push(alert);
    
    // Log critical and high severity alerts
    if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
      console.error('[PRIVACY ALERT]', JSON.stringify(alert, null, 2));
      
      // In production, this would:
      // - Send to SIEM system
      // - Trigger PagerDuty/email alerts
      // - Log to secure audit trail
      // - Potentially trigger automatic mitigation
    } else {
      console.warn('[PRIVACY ALERT]', JSON.stringify(alert, null, 2));
    }
    
    // Keep only last 1000 alerts in memory
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }
  }
  
  /**
   * Get current metrics
   */
  getMetrics(): MonitoringMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Get recent alerts
   */
  getAlerts(severity?: PrivacyAlert['severity']): PrivacyAlert[] {
    if (severity) {
      return this.alerts.filter(a => a.severity === severity);
    }
    return [...this.alerts];
  }
  
  /**
   * Reset metrics (for testing or scheduled resets)
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      uniqueIPs: 0,
      violationAttempts: 0,
      sharedNetworkAccess: 0,
      rateLimitExceeded: 0,
      crossUserAttempts: 0
    };
    this.ipSet.clear();
    this.suspiciousPatterns.clear();
  }
  
  /**
   * Anonymize IP for logging
   */
  private anonymizeIP(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    return 'anonymous';
  }
  
  /**
   * Export metrics for monitoring dashboard
   */
  exportMetrics(): string {
    const metrics = this.getMetrics();
    const criticalAlerts = this.alerts.filter(a => a.severity === 'CRITICAL').length;
    const highAlerts = this.alerts.filter(a => a.severity === 'HIGH').length;
    
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics,
      alertCounts: {
        critical: criticalAlerts,
        high: highAlerts,
        total: this.alerts.length
      },
      health: {
        status: criticalAlerts > 0 ? 'CRITICAL' : highAlerts > 2 ? 'WARNING' : 'HEALTHY',
        violationRate: this.metrics.violationAttempts / Math.max(1, this.metrics.totalRequests),
        uniqueIPRatio: this.metrics.uniqueIPs / Math.max(1, this.metrics.totalRequests)
      }
    }, null, 2);
  }
}

// Singleton instance
export const privacyMonitor = new PrivacyMonitor();

/**
 * Middleware function for request monitoring
 */
export function monitorRequest(request: Request, context: any): void {
  const ipAddress = request.headers.get('cf-connecting-ip') || 
                   request.headers.get('x-forwarded-for') || 
                   'unknown';
  
  const endpoint = new URL(request.url).pathname;
  
  privacyMonitor.trackRequest(ipAddress, endpoint, {
    method: request.method,
    userAgent: request.headers.get('user-agent'),
    timestamp: new Date().toISOString()
  });
}

/**
 * Get monitoring dashboard data
 */
export function getMonitoringDashboard(): any {
  return {
    metrics: privacyMonitor.getMetrics(),
    recentAlerts: privacyMonitor.getAlerts().slice(-10),
    criticalAlerts: privacyMonitor.getAlerts('CRITICAL'),
    healthStatus: privacyMonitor.exportMetrics()
  };
}

export default privacyMonitor;