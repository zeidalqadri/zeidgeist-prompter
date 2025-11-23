'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Button } from '../ui/button'
import { StyleSelector } from '../ui/style-selector'
import { ProgressBar } from '../ui/progress-bar'
import { Loader2, Wand2, Download, Copy } from 'lucide-react'

export function ImageGenerator() {
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('photorealistic')
  const [resolution, setResolution] = useState('1024x1024')
  const [isGenerating, setIsGenerating] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ percent: number; message: string; status: 'pending' | 'processing' | 'completed' | 'failed' }>({ percent: 0, message: '', status: 'pending' })
  const [result, setResult] = useState<{ imageUrl: string; imageId: string } | null>(null)
  const [quotaRemaining, setQuotaRemaining] = useState(3)
  const [error, setError] = useState<string | null>(null)

  // Fetch quota status on mount
  useEffect(() => {
    fetchQuota()
  }, [])

  const fetchQuota = async () => {
    try {
      const response = await fetch('/api/images/quota')
      if (response.ok) {
        const data = await response.json() as { generationsRemaining: number }
        setQuotaRemaining(data.generationsRemaining)
      }
    } catch (err) {
      console.error('Failed to fetch quota:', err)
    }
  }

  // Poll progress
  useEffect(() => {
    if (!taskId || !isGenerating) return

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/images/progress/${taskId}`)
        if (response.ok) {
          const data = await response.json() as { percent: number; message: string; status: 'pending' | 'processing' | 'completed' | 'failed'; result?: { imageUrl: string; imageId: string }; error?: string }
          setProgress({ percent: data.percent, message: data.message, status: data.status })

          if (data.status === 'completed' && data.result) {
            setResult(data.result)
            setIsGenerating(false)
            setQuotaRemaining(prev => Math.max(0, prev - 1))
            clearInterval(interval)
          } else if (data.status === 'failed') {
            setError(data.error || 'Generation failed')
            setIsGenerating(false)
            clearInterval(interval)
          }
        }
      } catch (err) {
        console.error('Progress poll error:', err)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [taskId, isGenerating])

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || quotaRemaining <= 0) return

    setIsGenerating(true)
    setError(null)
    setResult(null)
    setProgress({ percent: 0, message: 'Initializing...', status: 'processing' })

    try {
      const response = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style, resolution })
      })

      if (!response.ok) {
        const errorData = await response.json() as { error?: string }
        throw new Error(errorData.error || 'Generation failed')
      }

      const data = await response.json() as { taskId: string }
      setTaskId(data.taskId)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsGenerating(false)
    }
  }, [prompt, style, resolution, quotaRemaining])

  const handleDownload = () => {
    if (!result) return
    const link = document.createElement('a')
    link.href = result.imageUrl
    link.download = `generated-${result.imageId}.png`
    link.click()
  }

  const handleCopy = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result.imageUrl)
  }

  return (
    <div className="space-y-6">
      {/* Quota Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">
            Daily Quota
          </span>
          <span className="text-lg font-bold text-blue-700">
            {quotaRemaining} / 3 remaining
          </span>
        </div>
      </div>

      {/* Prompt Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Describe the image you want to generate
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A serene mountain landscape at sunset with a crystal-clear lake..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
          disabled={isGenerating}
        />
      </div>

      {/* Style Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Choose a style
        </label>
        <StyleSelector
          value={style}
          onChange={setStyle}
        />
      </div>

      {/* Resolution Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Resolution
        </label>
        <select
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2"
          disabled={isGenerating}
        >
          <option value="1024x1024">Square (1024x1024)</option>
          <option value="1024x1792">Portrait (1024x1792)</option>
          <option value="1792x1024">Landscape (1792x1024)</option>
        </select>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={!prompt.trim() || isGenerating || quotaRemaining <= 0}
        className="w-full h-12"
      >
        {isGenerating ? (
          <>
            <Loader2 className="animate-spin mr-2 h-5 w-5" />
            Generating...
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-5 w-5" />
            Generate Image
          </>
        )}
      </Button>

      {/* Progress */}
      {isGenerating && (
        <ProgressBar
          percent={progress.percent}
          message={progress.message}
          status={progress.status}
        />
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden border border-gray-200">
            <img
              src={result.imageUrl}
              alt="Generated"
              className="w-full"
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleDownload} variant="outline" className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button onClick={handleCopy} variant="outline" className="flex-1">
              <Copy className="mr-2 h-4 w-4" />
              Copy URL
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
