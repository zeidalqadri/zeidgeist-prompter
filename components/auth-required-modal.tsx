"use client"

import { useCallback } from "react"
import { Button } from "./ui/button"
import { X, LogIn, UserPlus } from "lucide-react"

interface AuthRequiredModalProps {
  onClose: () => void
  returnAction?: string
}

export function AuthRequiredModal({ onClose, returnAction = "download" }: AuthRequiredModalProps) {
  const handleSignIn = useCallback(() => {
    const returnUrl = encodeURIComponent(`/?action=${returnAction}`)
    window.location.href = `/auth/login?returnTo=${returnUrl}`
  }, [returnAction])

  const handleCreateAccount = useCallback(() => {
    const returnUrl = encodeURIComponent(`/?action=${returnAction}`)
    window.location.href = `/auth/register?returnTo=${returnUrl}`
  }, [returnAction])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 id="auth-modal-title" className="text-lg font-semibold text-black">
            Sign in required
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
            aria-label="Close"
          >
            <X size={16} />
          </Button>
        </div>

        <p className="text-gray-600 mb-6">
          Sign in to download the Chrome extension. Your download will start automatically after signing in.
        </p>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleSignIn}
            className="w-full bg-black text-white hover:bg-gray-800"
          >
            <LogIn size={16} className="mr-2" />
            Sign In
          </Button>

          <Button
            variant="outline"
            onClick={handleCreateAccount}
            className="w-full"
          >
            <UserPlus size={16} className="mr-2" />
            Create Account
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Free account required for download tracking
        </p>
      </div>
    </div>
  )
}
