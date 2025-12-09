"use client"

import { useState, useCallback } from "react"
import { Download, Loader2 } from "lucide-react"
import { Button } from "./ui/button"
import { AuthRequiredModal } from "./auth-required-modal"

export function ExtensionDownloadButton() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = useCallback(async () => {
    setIsDownloading(true)
    setError(null)

    try {
      const response = await fetch('/api/extension/download', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.status === 401) {
        // User needs to authenticate
        sessionStorage.setItem('downloadAfterAuth', 'true')
        setShowAuthModal(true)
        setIsDownloading(false)
        return
      }

      if (response.status === 429) {
        const data = await response.json() as { error?: string }
        setError(data.error || 'Rate limit exceeded. Please try again later.')
        setIsDownloading(false)
        return
      }

      if (!response.ok) {
        const data = await response.json() as { error?: string }
        setError(data.error || 'Download failed')
        setIsDownloading(false)
        return
      }

      // Success - trigger download
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'mstprmpt-extension.zip'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download error:', err)
      setError('Download failed. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }, [])

  const handleCloseModal = useCallback(() => {
    setShowAuthModal(false)
  }, [])

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-1.5 text-xs h-7 min-h-[28px] px-2"
        onClick={handleDownload}
        disabled={isDownloading}
        title={error || "Download Chrome Extension"}
      >
        {isDownloading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Download size={12} />
        )}
        <span className="hidden sm:inline">Chrome Extension</span>
        <span className="sm:hidden">Ext</span>
      </Button>

      {showAuthModal && (
        <AuthRequiredModal
          onClose={handleCloseModal}
          returnAction="download"
        />
      )}
    </>
  )
}
