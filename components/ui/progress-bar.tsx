'use client'

import React from 'react'

interface ProgressBarProps {
  percent: number
  message?: string
  status?: 'pending' | 'processing' | 'completed' | 'failed'
  className?: string
}

export function ProgressBar({ percent, message, status = 'processing', className = '' }: ProgressBarProps) {
  const clampedPercent = Math.min(100, Math.max(0, percent))

  const statusColors = {
    pending: 'bg-gray-400',
    processing: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500'
  }

  const barColor = statusColors[status]

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-2">
        {message && <span className="text-sm text-gray-700">{message}</span>}
        <span className="text-sm font-medium text-gray-900">{clampedPercent}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
    </div>
  )
}
