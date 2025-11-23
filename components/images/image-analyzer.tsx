'use client'

import React, { useState } from 'react'
import { Button } from '../ui/button'
import { Search, Loader2 } from 'lucide-react'

export function ImageAnalyzer() {
  const [imageId, setImageId] = useState('')
  const [analysisType, setAnalysisType] = useState('caption')
  const [prompt, setPrompt] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!imageId) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/images/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId, analysisType, prompt: analysisType === 'qa' ? prompt : undefined })
      })

      if (!response.ok) {
        const errorData = await response.json() as { error?: string }
        throw new Error(errorData.error || 'Analysis failed')
      }

      const data = await response.json() as { result: string; confidence?: number }
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Image ID</label>
        <input
          type="text"
          value={imageId}
          onChange={(e) => setImageId(e.target.value)}
          placeholder="Enter image ID"
          className="w-full p-3 border border-gray-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Type</label>
        <select
          value={analysisType}
          onChange={(e) => setAnalysisType(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg"
        >
          <option value="caption">Caption</option>
          <option value="scene">Scene Description</option>
          <option value="objects">Object Detection</option>
          <option value="qa">Question & Answer</option>
        </select>
      </div>

      {analysisType === 'qa' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What question do you have about this image?"
            className="w-full p-3 border border-gray-300 rounded-lg"
          />
        </div>
      )}

      <Button onClick={handleAnalyze} disabled={!imageId || isAnalyzing} className="w-full">
        {isAnalyzing ? (<><Loader2 className="animate-spin mr-2" /> Analyzing...</>) : (<><Search className="mr-2" /> Analyze Image</>)}
      </Button>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>}
      {result && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Analysis Result:</p>
          <p className="text-sm text-gray-900">{result.result}</p>
          {result.confidence && <p className="text-xs text-gray-500 mt-2">Confidence: {result.confidence}%</p>}
        </div>
      )}
    </div>
  )
}
