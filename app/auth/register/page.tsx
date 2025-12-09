"use client"

import { useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "../../../components/ui/button"
import { Loader2, Eye, EyeOff, ArrowLeft, Check } from "lucide-react"
import Link from "next/link"

export default function RegisterPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const returnTo = searchParams?.get("returnTo") || "/"

  // Password strength checks
  const hasMinLength = password.length >= 12
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const passwordsMatch = password === confirmPassword && password.length > 0

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Client-side validation
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (!hasMinLength || !hasUppercase || !hasNumber) {
      setError("Password does not meet requirements")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, username: username || undefined, password })
      })

      const data = await response.json() as { success?: boolean; error?: string }

      if (!response.ok || !data.success) {
        setError(data.error || "Registration failed")
        setIsLoading(false)
        return
      }

      // Success - redirect to return URL
      const decodedReturn = decodeURIComponent(returnTo)
      router.push(decodedReturn)
    } catch (err) {
      console.error("Registration error:", err)
      setError("Registration failed. Please try again.")
      setIsLoading(false)
    }
  }, [email, username, password, confirmPassword, returnTo, router, hasMinLength, hasUppercase, hasNumber])

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-black"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to mstprmpt
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-black mb-2">Create Account</h1>
          <p className="text-gray-600 mb-6">
            Create a free account to download the Chrome extension
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-black mb-1">
                Email *
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-black mb-1">
                Username (optional)
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="yourname"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-black mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Create a password"
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
                Confirm Password *
              </label>
              <input
                type={showPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${
                  confirmPassword && !passwordsMatch ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Confirm your password"
              />
              {confirmPassword && !passwordsMatch && (
                <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading || !passwordsMatch || !hasMinLength || !hasUppercase || !hasNumber}
              className="w-full bg-black text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href={`/auth/login?returnTo=${encodeURIComponent(returnTo)}`}
              className="text-black font-medium hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
