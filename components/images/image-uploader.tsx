'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '../ui/button'
import { Upload, Loader2 } from 'lucide-react'

export function ImageUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
    }
  }

  const handleUpload = useCallback(async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsUploading(false)
    }
  }, [file])

  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            {file ? file.name : 'Click to upload image (max 10MB)'}
          </p>
          <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP supported</p>
        </label>
      </div>

      {file && (
        <Button onClick={handleUpload} disabled={isUploading} className="w-full">
          {isUploading ? (
            <><Loader2 className="animate-spin mr-2" /> Uploading...</>
          ) : (
            <><Upload className="mr-2" /> Upload Image</>
          )}
        </Button>
      )}

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>}
      {result && <div className="bg-green-50 border border-green-200 rounded-lg p-4"><p className="text-sm text-green-700">Upload successful! Image ID: {result.imageId}</p></div>}
    </div>
  )
}
