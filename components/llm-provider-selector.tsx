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
  const [preferences, setPreferences] = useState<ProviderPreferences>({
    selectionMode: 'random',
    forcedProvider: undefined,
    excludedProviders: [],
    sessionDuration: 24
  })
  
  const [recentUsage, setRecentUsage] = useState<Array<{provider: string, timestamp: string}>>([])
  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | 'pending'>>({})

  // Load current preferences from cookies/localStorage
  useEffect(() => {
    loadPreferences()
    loadRecentUsage()
  }, [])

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/tweak/provider-preference', {
        method: 'GET',
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.preferences) {
          setPreferences(data.preferences)
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    }
  }

  const savePreferences = async (newPreferences: ProviderPreferences) => {
    try {
      const response = await fetch('/api/tweak/provider-preference', {
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
          button.textContent = '✅ Saved!'
          setTimeout(() => {
            button.textContent = originalText
          }, 2000)
        }
      } else {
        alert('Failed to save preferences')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      alert('Error saving preferences')
    }
  }

  const loadRecentUsage = () => {
    // Use the LLMUsageTracker for consistent usage data
    const usage = LLMUsageTracker.getRecentUsage(10)
    setRecentUsage(usage)
  }

  const testProvider = async (providerName: string) => {
    setTesting(providerName)
    setTestResults(prev => ({ ...prev, [providerName]: 'pending' }))
    
    try {
      const response = await fetch('/api/engineer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Provider': providerName, // Custom header to force provider
        },
        body: JSON.stringify({
          prompt: 'Test prompt: Generate a simple greeting.',
          context: '',
          isRefinement: false
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.result && data.source === providerName.toLowerCase()) {
          setTestResults(prev => ({ ...prev, [providerName]: 'success' }))
          LLMUsageTracker.trackUsage(providerName) // Track successful test
        } else {
          setTestResults(prev => ({ ...prev, [providerName]: 'error' }))
          LLMUsageTracker.trackFailure(providerName) // Track failed test
        }
      } else {
        setTestResults(prev => ({ ...prev, [providerName]: 'error' }))
        LLMUsageTracker.trackFailure(providerName) // Track failed test
      }
    } catch (error) {
      console.error(`Error testing ${providerName}:`, error)
      setTestResults(prev => ({ ...prev, [providerName]: 'error' }))
      LLMUsageTracker.trackFailure(providerName) // Track failed test
    } finally {
      setTesting(null)
    }
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
        <h2 className="text-xl font-semibold mb-4 text-black-primary">🎯 Selection Mode</h2>
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
        <h2 className="text-xl font-semibold mb-4 text-black-primary">⚡ Provider Status</h2>
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
                    <span className="text-green-400 text-sm">✅</span>
                  )}
                  {provider.configured && !provider.enabled && (
                    <span className="text-yellow-400 text-sm">⚠️</span>
                  )}
                  {!provider.configured && (
                    <span className="text-red-400 text-sm">❌</span>
                  )}
                </div>
              </div>
              
              <p className="text-xs text-gray-60 mb-3">
                {provider.configured ? 'API Key Configured' : 'No API Key'}
                {provider.notes && ` - ${provider.notes}`}
              </p>
              
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
                      {testResults[provider.provider] === 'success' && '✅ '}
                      {testResults[provider.provider] === 'error' && '❌ '}
                      Test Provider
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Forced Provider Selection */}
      {preferences.selectionMode === 'forced' && (
        <div className="bg-white border border-gray-10 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-black-primary">🎯 Force Provider</h2>
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
          <h2 className="text-xl font-semibold mb-4 text-black-primary">🚫 Exclude from Rotation</h2>
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
        <h2 className="text-xl font-semibold mb-4 text-black-primary">⏰ Session Settings</h2>
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
        <h2 className="text-xl font-semibold mb-4 text-black-primary">📊 Recent Usage</h2>
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
          💾 Save Preferences
        </button>
        
        <button
          onClick={clearPreferences}
          className="bg-red-600 hover:bg-red-700 text-white-pure font-bold py-3 px-6 rounded-md transition duration-200"
        >
          🗑️ Clear All
        </button>
        
        <button
          onClick={onUpdate}
          className="bg-black-primary hover:bg-black-rich text-white-pure font-bold py-3 px-6 rounded-md transition duration-200"
        >
          🔄 Refresh Status
        </button>
        
        <button
          onClick={() => {
            window.open('/', '_blank')
          }}
          className="bg-gray-600 hover:bg-gray-700 text-white-pure font-bold py-3 px-6 rounded-md transition duration-200"
        >
          🧪 Test in New Tab
        </button>
      </div>
    </div>
  )
}