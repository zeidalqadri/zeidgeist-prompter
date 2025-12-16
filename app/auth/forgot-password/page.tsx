"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "../../../components/ui/button"
import { Loader2, ArrowLeft, Check, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [pin, setPin] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Password validation
  const hasMinLength = newPassword.length >= 12
  const hasUppercase = /[A-Z]/.test(newPassword)
  const hasNumber = /[0-9]/.test(newPassword)
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Client-side validation
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (!hasMinLength || !hasUppercase || !hasNumber) {
      setError("Password does not meet requirements")
      return
    }

    if (!/^\d{6}$/.test(pin)) {
      setError("PIN must be exactly 6 digits")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pin, newPassword })
      })

      const data = await response.json() as { success?: boolean; error?: string }

      if (!response.ok || !data.success) {
        setError(data.error || "Password reset failed")
        setIsLoading(false)
        return
      }

      // Success - show message then redirect to login
      setSuccess(true)
      setIsLoading(false)

      setTimeout(() => {
        router.push("/auth/login")
      }, 2000)
    } catch (err) {
      console.error("Password reset error:", err)
      setError("Password reset failed. Please try again.")
      setIsLoading(false)
    }
  }, [email, pin, newPassword, confirmPassword, router, hasMinLength, hasUppercase, hasNumber])

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link
            href="/auth/login"
            className="inline-flex items-center text-sm text-gray-600 hover:text-black"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to Sign In
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-black mb-2">Reset Password</h1>
          <p className="text-gray-600 mb-6">
            Enter your email and 6-digit recovery PIN to reset your password.
          </p>

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded text-green-700 text-sm flex items-center">
              <Check size={16} className="mr-2 flex-shrink-0" />
              Password reset successful! Redirecting to login...
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-black mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={success}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-black mb-1">
                Recovery PIN
              </label>
              <input
                type="text"
                id="pin"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                disabled={success}
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100 font-mono text-lg tracking-widest text-center"
                placeholder="000000"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter the 6-digit PIN you set during registration or in your account settings.
              </p>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-black mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={success}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100"
                  placeholder="Create a new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password requirements */}
              <div className="mt-2 space-y-1">
                <div className={`flex items-center text-xs ${hasMinLength ? 'text-green-600' : 'text-gray-500'}`}>
                  <Check size={12} className={`mr-1 ${hasMinLength ? 'opacity-100' : 'opacity-30'}`} />
                  At least 12 characters
                </div>
                <div className={`flex items-center text-xs ${hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
                  <Check size={12} className={`mr-1 ${hasUppercase ? 'opacity-100' : 'opacity-30'}`} />
                  One uppercase letter
                </div>
                <div className={`flex items-center text-xs ${hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                  <Check size={12} className={`mr-1 ${hasNumber ? 'opacity-100' : 'opacity-30'}`} />
                  One number
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-black mb-1">
                Confirm New Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={success}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100 ${
                  confirmPassword && !passwordsMatch ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Confirm your new password"
              />
              {confirmPassword && !passwordsMatch && (
                <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading || success || !passwordsMatch || !hasMinLength || !hasUppercase || !hasNumber || pin.length !== 6}
              className="w-full bg-black text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Resetting password...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Remember your password?{" "}
            <Link href="/auth/login" className="text-black font-medium hover:underline">
              Sign in
            </Link>
          </div>

          <div className="mt-4 text-center text-sm text-gray-500">
            Don&apos;t have a recovery PIN?{" "}
            <Link href="/auth/register" className="text-black font-medium hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
