'use client'

import { useState, useEffect } from 'react'
import { LLMUsageTracker } from '../app/lib/llm-usage-tracker'

interface ProviderStatus {
  provider: string
  configured: boolean
  enabled: boolean
  notes?: string
  keyPreview?: string
}

interface ProviderPreferences {
  selectionMode: 'random' | 'forced' | 'custom'
  forcedProvider?: string
  excludedProviders: string[]
  sessionDuration: number
}

interface Props {
  providers: ProviderStatus[]
  onUpdate: () => void
}

export default function LLMProviderSelector({ providers, onUpdate }: Props) {
  const API_BASE = (process.env.NEXT_PUBLIC_API_URL as string)
    || 'https://mstprmpt.zeidgeist.com'

  const [preferences, setPreferences] = useState<ProviderPreferences>({
    selectionMode: 'random',
    forcedProvider: undefined,
    excludedProviders: [],
    sessionDuration: 24
  })
  
  const [recentUsage, setRecentUsage] = useState<Array<{provider: string, timestamp: string}>>([])
  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | 'pending'>>({})
  const [testErrors, setTestErrors] = useState<Record<string, string>>({})
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null)

  // Load current preferences from cookies/localStorage
  useEffect(() => {
    ;(async () => {
      const ok = await checkApi()
      if (ok) {
        await loadPreferences()
      }
      loadRecentUsage()
    })()
  }, [])

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

  const loadPreferences = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/tweak/provider-preference`, {
        method: 'GET',
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json() as any
        if (data.preferences) {
          setPreferences(data.preferences)
        }
      }
    } catch (error) {
      console.warn('Preferences fetch failed (is API running on :8788?)')
    }
  }

  const savePreferences = async (newPreferences: ProviderPreferences) => {
    try {
      const response = await fetch(`${API_BASE}/api/tweak/provider-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ preferences: newPreferences })
      })
      
      if (response.ok) {
        setPreferences(newPreferences)
        // Show success feedback
        const button = document.getElementById('save-button')
        if (button) {
          const originalText = button.textContent
          button.textContent = 'Saved!'
          setTimeout(() => {
            button.textContent = originalText
          }, 2000)
        }
      } else {
        alert('Failed to save preferences')
      }
    } catch (error) {
      console.warn('Error saving preferences')
      alert('Error saving preferences')
    }
  }

  const loadRecentUsage = () => {
    // Use the LLMUsageTracker for consistent usage data
    const usage = LLMUsageTracker.getRecentUsage(10)
    setRecentUsage(usage)
  }

  const testProvider = async (providerName: string) => {
    if (apiAvailable === false) {
      alert('API server is offline. Start it on :8788 to run tests.')
      return
    }
    setTesting(providerName)
    setTestResults(prev => ({ ...prev, [providerName]: 'pending' }))
    
    try {
      const response = await fetch(`${API_BASE}/api/engineer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Provider': providerName, // Custom header to force provider
        },
        credentials: 'include',
        body: JSON.stringify({
          prompt: 'Test prompt: Generate a simple greeting.',
          context: '',
          isRefinement: false
        })
      })

      if (response.ok) {
        const data = await response.json() as any
        const source = data?.metadata?.source?.toLowerCase?.()
        if (data.result && source === providerName.toLowerCase()) {
          setTestResults(prev => ({ ...prev, [providerName]: 'success' }))
          setTestErrors(prev => ({ ...prev, [providerName]: '' }))
          LLMUsageTracker.trackUsage(providerName) // Track successful test
        } else {
          setTestResults(prev => ({ ...prev, [providerName]: 'error' }))
          const msg = !data?.result
            ? 'No result received from provider'
            : `Unexpected provider source: ${source || 'unknown'}`
          setTestErrors(prev => ({ ...prev, [providerName]: msg }))
          LLMUsageTracker.trackFailure(providerName) // Track failed test
        }
      } else {
        setTestResults(prev => ({ ...prev, [providerName]: 'error' }))
        setTestErrors(prev => ({ ...prev, [providerName]: `HTTP ${response.status} ${response.statusText}` }))
        LLMUsageTracker.trackFailure(providerName) // Track failed test
      }
    } catch (error) {
      console.error(`Error testing ${providerName}:`, error)
      setTestResults(prev => ({ ...prev, [providerName]: 'error' }))
      setTestErrors(prev => ({ ...prev, [providerName]: error instanceof Error ? error.message : 'Unknown error' }))
      LLMUsageTracker.trackFailure(providerName) // Track failed test
    } finally {
      setTesting(null)
    }
  }

  const testAllProviders = async () => {
    for (const p of providers) {
      if (p.configured && p.enabled) {
        await testProvider(p.provider)
      }
    }
  }

  // Toggle a provider enabled/disabled by updating excludedProviders
  const setProviderEnabled = async (providerName: string, enabled: boolean) => {
    const normalized = providerName
    const currentlyExcluded = preferences.excludedProviders || []
    const nextExcluded = enabled
      ? currentlyExcluded.filter((p) => p !== normalized)
      : Array.from(new Set([...currentlyExcluded, normalized]))

    const nextPrefs: ProviderPreferences = {
      ...preferences,
      excludedProviders: nextExcluded,
    }

    await savePreferences(nextPrefs)
    onUpdate()
  }

  const clearPreferences = async () => {
    const defaultPrefs: ProviderPreferences = {
      selectionMode: 'random',
      forcedProvider: undefined,
      excludedProviders: [],
      sessionDuration: 24
    }
    await savePreferences(defaultPrefs)
  }

  const availableProviders = providers.filter(p => p.configured && p.enabled)
  const configuredProviders = providers.filter(p => p.configured)
  
  return (
    <div className="space-y-8">
      {/* Selection Mode */}
      <div className="bg-white border border-gray-10 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-black-primary">Selection Mode</h2>
        <div className="space-y-3">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="selectionMode"
              value="random"
              checked={preferences.selectionMode === 'random'}
              onChange={(e) => setPreferences(prev => ({ ...prev, selectionMode: e.target.value as any }))}
              className="text-black-primary"
            />
            <div>
              <span className="font-medium text-black-primary">Random (Load Balanced)</span>
              <p className="text-sm text-gray-60">Default behavior - randomly selects from available providers</p>
            </div>
          </label>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="selectionMode"
              value="forced"
              checked={preferences.selectionMode === 'forced'}
              onChange={(e) => setPreferences(prev => ({ ...prev, selectionMode: e.target.value as any }))}
              className="text-black-primary"
            />
            <div>
              <span className="font-medium text-black-primary">Force Specific Provider</span>
              <p className="text-sm text-gray-60">Always use the selected provider (with fallback)</p>
            </div>
          </label>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="selectionMode"
              value="custom"
              checked={preferences.selectionMode === 'custom'}
              onChange={(e) => setPreferences(prev => ({ ...prev, selectionMode: e.target.value as any }))}
              className="text-black-primary"
            />
            <div>
              <span className="font-medium text-black-primary">Custom Rotation</span>
              <p className="text-sm text-gray-60">Random selection excluding specified providers</p>
            </div>
          </label>
        </div>
      </div>

      {/* Provider Status */}
      <div className="bg-white border border-gray-10 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-black-primary">Provider Status</h2>
          <button
            onClick={testAllProviders}
            className="py-2 px-3 text-sm bg-black-primary hover:bg-black-rich text-white-pure rounded-md transition duration-200"
          >
            Test All
          </button>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider) => (
            <div key={provider.provider} className={`p-4 rounded-lg border ${
              provider.configured && provider.enabled 
                ? 'border-green-500 bg-green-50' 
                : provider.configured 
                ? 'border-yellow-500 bg-yellow-50'
                : 'border-red-500 bg-red-50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-black-primary">{provider.provider}</h3>
                <div className="flex items-center space-x-2">
                  {provider.configured && provider.enabled && (
                    <span className="text-green-600 text-xs font-medium px-2 py-1 bg-green-100 rounded">Active</span>
                  )}
                  {provider.configured && !provider.enabled && (
                    <span className="text-yellow-600 text-xs font-medium px-2 py-1 bg-yellow-100 rounded">Warning</span>
                  )}
                  {!provider.configured && (
                    <span className="text-red-600 text-xs font-medium px-2 py-1 bg-red-100 rounded">Inactive</span>
                  )}
                </div>
              </div>
              
              <p className="text-xs text-gray-60 mb-3">
                {provider.configured ? 'API Key Configured' : 'No API Key'}
                {provider.notes && ` - ${provider.notes}`}
              </p>

              {/* Enable/Disable switch */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-60">Enabled</span>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={provider.enabled}
                    onChange={(e) => setProviderEnabled(provider.provider, e.target.checked)}
                    disabled={!provider.configured}
                  />
                  <div className={`w-9 h-5 rounded-full transition-colors ${
                    provider.configured ? 'bg-gray-300 peer-checked:bg-black-primary' : 'bg-gray-200'
                  } relative`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      provider.enabled ? 'translate-x-4' : ''
                    }`}></span>
                  </div>
                </label>
              </div>
              
              {provider.keyPreview && (
                <p className="text-xs text-gray-30 mb-3 font-mono">
                  Key: {provider.keyPreview}
                </p>
              )}
              
              {provider.configured && provider.enabled && (
                <button
                  onClick={() => testProvider(provider.provider)}
                  disabled={testing === provider.provider}
                  className="w-full py-1 px-2 text-xs bg-black-primary hover:bg-black-rich disabled:bg-gray-30 text-white-pure rounded transition duration-200"
                >
                  {testing === provider.provider ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin rounded-full h-3 w-3 border-b border-white mr-2"></span>
                      Testing...
                    </span>
                  ) : (
                    <>
                      {testResults[provider.provider] === 'success' && 'Success: '}
                      {testResults[provider.provider] === 'error' && 'Error: '}
                      Test Provider
                    </>
                  )}
                </button>
              )}

              {testResults[provider.provider] === 'error' && testErrors[provider.provider] && (
                <p className="mt-2 text-xs text-red-700">
                  {testErrors[provider.provider]}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Forced Provider Selection */}
      {preferences.selectionMode === 'forced' && (
        <div className="bg-white border border-gray-10 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-black-primary">Force Provider</h2>
          <select
            value={preferences.forcedProvider || ''}
            onChange={(e) => setPreferences(prev => ({ 
              ...prev, 
              forcedProvider: e.target.value || undefined 
            }))}
            className="w-full md:w-64 px-3 py-2 bg-white border border-gray-10 rounded-md text-black-primary focus:outline-none focus:ring-2 focus:ring-black-primary"
          >
            <option value="">Select provider to force...</option>
            {availableProviders.map((provider) => (
              <option key={provider.provider} value={provider.provider}>
                {provider.provider}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-60 mt-2">
            Selected provider will be used for all requests (with automatic fallback if it fails)
          </p>
        </div>
      )}

      {/* Custom Rotation */}
      {preferences.selectionMode === 'custom' && (
        <div className="bg-white border border-gray-10 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-black-primary">Exclude from Rotation</h2>
          <div className="space-y-2">
            {availableProviders.map((provider) => (
              <label key={provider.provider} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.excludedProviders.includes(provider.provider)}
                  onChange={(e) => {
                    const providerName = provider.provider
                    setPreferences(prev => ({
                      ...prev,
                      excludedProviders: e.target.checked
                        ? [...prev.excludedProviders, providerName]
                        : prev.excludedProviders.filter(p => p !== providerName)
                    }))
                  }}
                  className="text-black-primary"
                />
                <span className="text-black-primary">{provider.provider}</span>
              </label>
            ))}
          </div>
          <p className="text-sm text-gray-60 mt-3">
            Excluded providers will not be used in random rotation
          </p>
        </div>
      )}

      {/* Session Settings */}
      <div className="bg-white border border-gray-10 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-black-primary">Session Settings</h2>
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-black-primary">Session Duration:</label>
          <select
            value={preferences.sessionDuration}
            onChange={(e) => setPreferences(prev => ({ 
              ...prev, 
              sessionDuration: parseInt(e.target.value) 
            }))}
            className="px-3 py-2 bg-white border border-gray-10 rounded-md text-black-primary focus:outline-none focus:ring-2 focus:ring-black-primary"
          >
            <option value={1}>1 hour</option>
            <option value={6}>6 hours</option>
            <option value={24}>24 hours</option>
            <option value={72}>3 days</option>
            <option value={168}>1 week</option>
          </select>
        </div>
      </div>

      {/* Recent Usage */}
      <div className="bg-white border border-gray-10 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-black-primary">Recent Usage</h2>
        {recentUsage.length > 0 ? (
          <div className="space-y-2">
            {recentUsage.map((usage, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="font-medium text-black-primary">{usage.provider}</span>
                <span className="text-gray-60">{usage.timestamp}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-60">No recent usage data available</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <button
          id="save-button"
          onClick={() => savePreferences(preferences)}
          className="bg-black-primary hover:bg-black-rich text-white-pure font-bold py-3 px-6 rounded-md transition duration-200"
        >
          Save Preferences
        </button>
        
        <button
          onClick={clearPreferences}
          className="bg-red-600 hover:bg-red-700 text-white-pure font-bold py-3 px-6 rounded-md transition duration-200"
        >
          Clear All
        </button>
        
        <button
          onClick={onUpdate}
          className="bg-black-primary hover:bg-black-rich text-white-pure font-bold py-3 px-6 rounded-md transition duration-200"
        >
          Refresh Status
        </button>
        
        <button
          onClick={() => {
            window.open('/', '_blank')
          }}
          className="bg-gray-600 hover:bg-gray-700 text-white-pure font-bold py-3 px-6 rounded-md transition duration-200"
        >
          Test in New Tab
        </button>
      </div>
    </div>
  )
}
