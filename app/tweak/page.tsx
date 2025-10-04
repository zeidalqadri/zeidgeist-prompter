'use client'

import { useState, useEffect } from 'react'
import LLMProviderSelector from '../../components/llm-provider-selector'

interface ProviderStatus {
  provider: string
  configured: boolean
  enabled: boolean
  notes?: string
  keyPreview?: string
}

export default function TweakPage() {
  const API_BASE = (process.env.NEXT_PUBLIC_API_URL as string)
    || 'https://mstprmpt.zeidgeist.com'
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [password, setPassword] = useState('')
  const [providers, setProviders] = useState<ProviderStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null)

  // Simple password protection (can be enhanced with proper auth)
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Simple password check - in production, this could be more secure
    if (password === 'tweak123' || password === 'debug') {
      setIsAuthorized(true)
      checkApi().then((ok) => {
        if (ok) {
          loadProviderStatus()
        }
      })
    } else {
      alert('Invalid password')
      setPassword('')
    }
  }

  const checkApi = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/api/health/liveness`, { method: 'GET' })
      const ok = res.ok
      setApiAvailable(ok)
      return ok
    } catch {
      setApiAvailable(false)
      return false
    }
  }

  // Load current provider status from dedicated endpoint
  const loadProviderStatus = async () => {
    setLoading(true)
    try {
      if (apiAvailable === false) {
        return
      }
      const response = await fetch(`${API_BASE}/api/tweak/provider-status`, {
        headers: {
          'Authorization': 'Bearer debug-token-not-set'
        }
      })
      
      if (response.ok) {
        const data = await response.json() as any
        setProviders(data.providers || [])
      } else {
        console.warn('Could not load provider status')
      }
    } catch (error) {
      console.warn('Provider status fetch failed (is API running on :8788?)')
    } finally {
      setLoading(false)
    }
  }

  // Password protection screen
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-white-pure flex items-center justify-center p-4">
        <div className="bg-white border border-gray-10 p-8 rounded-lg shadow-sm max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6 text-center text-black-primary">LLM Tweaker</h1>
          <p className="text-gray-60 mb-6 text-center">
            Secret configuration page for LLM provider selection
          </p>
          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium mb-2 text-black-primary">
                Access Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-10 rounded-md text-black-primary placeholder-gray-30 focus:outline-none focus:ring-2 focus:ring-black-primary"
                placeholder="Enter password..."
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-black-primary hover:bg-black-rich text-white-pure font-bold py-2 px-4 rounded-md transition duration-200"
            >
              Access Configuration
            </button>
          </form>
          <p className="text-xs text-gray-30 mt-4 text-center">
            Hint: try 'tweak123' or 'debug'
          </p>
        </div>
      </div>
    )
  }

  // Main configuration interface
  return (
    <div className="min-h-screen bg-white-pure">
      {/* Header */}
      <div className="bg-white border-b border-gray-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-black-primary">LLM Provider Configuration</h1>
              <span className="bg-red-500 text-xs px-2 py-1 rounded-full text-white">SECRET</span>
            </div>
            <div className="flex items-center space-x-4">
              {/* API status badge */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-60">API:</span>
                {apiAvailable === null && (
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">Unknown</span>
                )}
                {apiAvailable === true && (
                  <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                    <span className="w-2 h-2 rounded-full bg-green-600 mr-1"></span>
                    Online
                  </span>
                )}
                {apiAvailable === false && (
                  <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-red-100 text-red-800">
                    <span className="w-2 h-2 rounded-full bg-red-600 mr-1"></span>
                    Offline
                  </span>
                )}
                <button
                  onClick={async () => {
                    const ok = await checkApi()
                    if (ok) {
                      loadProviderStatus()
                    }
                  }}
                  className="text-sm text-gray-60 hover:text-black-primary underline"
                >
                  Retry
                </button>
              </div>
              <span className="text-sm text-gray-60">
                Session: {new Date().toLocaleTimeString()}
              </span>
              <button
                onClick={() => {
                  setIsAuthorized(false)
                  setPassword('')
                }}
                className="text-sm text-gray-60 hover:text-black-primary"
              >
                Lock
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {apiAvailable === false && (
          <div className="mb-6 p-4 rounded-md border border-yellow-300 bg-yellow-50 text-yellow-900">
            API server appears offline. Start Workers dev server: <code className="font-mono">wrangler pages dev dist --port=8788 --no-local</code>
          </div>
        )}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black-primary mx-auto"></div>
            <p className="mt-4 text-gray-60">Loading provider status...</p>
          </div>
        ) : (
          <LLMProviderSelector providers={providers} onUpdate={loadProviderStatus} />
        )}

        {/* Footer Information */}
        <div className="mt-12 p-4 bg-white-soft border border-gray-10 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-black-primary">Security & Usage Notes</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-60">
            <div>
              <h4 className="font-medium text-black-primary mb-2">Session Storage</h4>
              <ul className="space-y-1">
                <li>• Preferences stored in secure HTTP-only cookies</li>
                <li>• Session expires after 24 hours</li>
                <li>• No API keys are exposed or stored</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-black-primary mb-2">Provider Selection</h4>
              <ul className="space-y-1">
                <li>• Default: Random rotation for load balancing</li>
                <li>• Force mode: Uses only selected provider</li>
                <li>• Fallback: Automatically tries other providers if selected fails</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
