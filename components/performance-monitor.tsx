"use client"

import React, { useState, useEffect, memo } from 'react'
import { Activity, Clock, Database, Cpu, Zap } from 'lucide-react'

interface PerformanceMetrics {
  pageLoadTime: number
  apiResponseTime: number
  renderTime: number
  cacheHitRate: number
  totalRequests: number
  errors: number
  coreWebVitals: {
    LCP: number // Largest Contentful Paint
    FID: number // First Input Delay
    CLS: number // Cumulative Layout Shift
  }
}

const PerformanceMonitor = memo(() => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    pageLoadTime: 0,
    apiResponseTime: 0,
    renderTime: 0,
    cacheHitRate: 0,
    totalRequests: 0,
    errors: 0,
    coreWebVitals: { LCP: 0, FID: 0, CLS: 0 }
  })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Collect Core Web Vitals
    const collectWebVitals = () => {
      try {
        // Navigation Timing API for page load metrics
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navigation) {
          const pageLoadTime = navigation.loadEventEnd - navigation.fetchStart
          const renderTime = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
          
          setMetrics(prev => ({
            ...prev,
            pageLoadTime: Math.round(pageLoadTime),
            renderTime: Math.round(renderTime)
          }))
        }

        // Observe LCP
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          
          setMetrics(prev => ({
            ...prev,
            coreWebVitals: {
              ...prev.coreWebVitals,
              LCP: Math.round(lastEntry.startTime)
            }
          }))
        })
        
        observer.observe({ entryTypes: ['largest-contentful-paint'] })

        // Monitor API response times
        const originalFetch = window.fetch
        let totalApiTime = 0
        let apiCallCount = 0
        
        window.fetch = async (...args) => {
          const start = Date.now()
          try {
            const response = await originalFetch(...args)
            const duration = Date.now() - start
            totalApiTime += duration
            apiCallCount++
            
            setMetrics(prev => ({
              ...prev,
              apiResponseTime: Math.round(totalApiTime / apiCallCount),
              totalRequests: apiCallCount,
              cacheHitRate: response.headers.get('cf-cache-status') === 'HIT' ? 
                Math.min(prev.cacheHitRate + 0.1, 100) : prev.cacheHitRate
            }))
            
            return response
          } catch (error) {
            setMetrics(prev => ({ ...prev, errors: prev.errors + 1 }))
            throw error
          }
        }

        return () => {
          observer.disconnect()
          window.fetch = originalFetch
        }
      } catch (error) {
        console.warn('Performance monitoring not supported:', error)
      }
    }

    const cleanup = collectWebVitals()
    return cleanup
  }, [])

  // Toggle visibility with keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(!isVisible)
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [isVisible])

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors z-50"
        title="Show Performance Monitor (Ctrl+Shift+P)"
        aria-label="Show performance monitor"
      >
        <Activity size={16} />
      </button>
    )
  }

  const getScoreColor = (score: number, thresholds: [number, number]) => {
    if (score <= thresholds[0]) return 'text-green-600'
    if (score <= thresholds[1]) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center">
          <Activity size={16} className="mr-1" />
          Performance Monitor
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 text-xl leading-none"
          aria-label="Close performance monitor"
        >
          ×
        </button>
      </div>

      <div className="space-y-2 text-sm">
        {/* Core Web Vitals */}
        <div className="border-b pb-2">
          <div className="font-medium text-gray-700 mb-1">Core Web Vitals</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className={`font-bold ${getScoreColor(metrics.coreWebVitals.LCP, [2500, 4000])}`}>
                {metrics.coreWebVitals.LCP}ms
              </div>
              <div className="text-gray-500">LCP</div>
            </div>
            <div className="text-center">
              <div className={`font-bold ${getScoreColor(metrics.coreWebVitals.FID, [100, 300])}`}>
                {metrics.coreWebVitals.FID}ms
              </div>
              <div className="text-gray-500">FID</div>
            </div>
            <div className="text-center">
              <div className={`font-bold ${getScoreColor(metrics.coreWebVitals.CLS * 1000, [100, 250])}`}>
                {(metrics.coreWebVitals.CLS * 1000).toFixed(0)}
              </div>
              <div className="text-gray-500">CLS</div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center text-gray-600">
              <Clock size={12} className="mr-1" />
              Page Load
            </span>
            <span className={`font-medium ${getScoreColor(metrics.pageLoadTime, [1000, 3000])}`}>
              {metrics.pageLoadTime}ms
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="flex items-center text-gray-600">
              <Database size={12} className="mr-1" />
              API Response
            </span>
            <span className={`font-medium ${getScoreColor(metrics.apiResponseTime, [200, 500])}`}>
              {metrics.apiResponseTime}ms
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="flex items-center text-gray-600">
              <Cpu size={12} className="mr-1" />
              Render Time
            </span>
            <span className={`font-medium ${getScoreColor(metrics.renderTime, [16, 50])}`}>
              {metrics.renderTime}ms
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="flex items-center text-gray-600">
              <Zap size={12} className="mr-1" />
              Cache Hit Rate
            </span>
            <span className="font-medium text-blue-600">
              {metrics.cacheHitRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Request Stats */}
        <div className="border-t pt-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Requests: {metrics.totalRequests}</span>
            <span>Errors: {metrics.errors}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-400 text-center">
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  )
})

PerformanceMonitor.displayName = 'PerformanceMonitor'

export default PerformanceMonitor