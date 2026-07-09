'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '../../components/ui/button'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.mstprmpt.zeidgeist.com'

interface UsageData {
  totalRequests: number
  limit: number
  remaining: number
  period: string
}

interface OrgInfo {
  planTier: string
  orgName: string
}

function getCurrentPeriod(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

export default function DashboardPage() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sessionToken = typeof window !== 'undefined' ? localStorage.getItem('mstprmpt_session_token') : null

  const fetchUsage = useCallback(async () => {
    if (!sessionToken) return

    try {
      const period = getCurrentPeriod()
      const res = await fetch(`${API_BASE}/v1/usage?period=${period}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      })

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('mstprmpt_session_token')
          window.location.href = '/auth/login?redirect=/dashboard'
          return
        }
        throw new Error('Failed to fetch usage')
      }

      const json = await res.json() as { data: { totalRequests: number; limit: number; remaining: number; period: string } }
      setUsage({
        totalRequests: json.data.totalRequests ?? 0,
        limit: json.data.limit ?? 50,
        remaining: json.data.remaining ?? 50,
        period: json.data.period ?? period,
      })

      const orgName = localStorage.getItem('mstprmpt_org_name') || 'Your Organization'
      const planTier = localStorage.getItem('mstprmpt_plan_tier') || 'free'
      setOrg({ orgName, planTier })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [sessionToken])

  useEffect(() => {
    if (!sessionToken) {
      window.location.href = '/auth/login?redirect=/dashboard'
      return
    }
    fetchUsage()
  }, [sessionToken, fetchUsage])

  async function handleManageBilling(): Promise<void> {
    if (!sessionToken) return
    const res = await fetch(`${API_BASE}/v1/billing/portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ returnUrl: window.location.href }),
    })

    if (!res.ok) {
      alert('Failed to open billing portal')
      return
    }

    const json = await res.json() as { data: { portalUrl: string } }
    window.location.href = json.data.portalUrl
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading dashboard...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => { setError(null); setLoading(true); fetchUsage() }}>Retry</Button>
        </div>
      </main>
    )
  }

  const usagePercent = usage ? Math.min(100, (usage.totalRequests / usage.limit) * 100) : 0
  const isUnlimited = usage?.limit === -1

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <a href="/" className="text-sm text-gray-500 hover:text-gray-900 mb-1 inline-block">
              &larr; Back to app
            </a>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500">{org?.orgName}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { window.location.href = '/docs' }}>
              API Docs
            </Button>
            {org?.planTier === 'free' ? (
              <Button onClick={() => { window.location.href = '/pricing' }}>
                Upgrade
              </Button>
            ) : (
              <Button variant="outline" onClick={handleManageBilling}>
                Manage Billing
              </Button>
            )}
          </div>
        </div>

        {/* Plan Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Current Plan</p>
              <p className="text-2xl font-bold text-gray-900 capitalize">{org?.planTier || 'Free'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-500">Billing Period</p>
              <p className="text-lg text-gray-900">{usage?.period || getCurrentPeriod()}</p>
            </div>
          </div>
        </div>

        {/* Usage */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage This Month</h2>

          {isUnlimited ? (
            <div>
              <p className="text-3xl font-bold text-gray-900">{usage?.totalRequests ?? 0}</p>
              <p className="text-sm text-gray-500 mt-1">enhancements (unlimited plan)</p>
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between mb-2">
                <p className="text-3xl font-bold text-gray-900">
                  {usage?.totalRequests ?? 0}
                  <span className="text-lg font-normal text-gray-500"> / {usage?.limit ?? 50}</span>
                </p>
                <p className="text-sm text-gray-500">{usage?.remaining ?? 0} remaining</p>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              {usagePercent > 80 && org?.planTier === 'free' && (
                <p className="text-sm text-amber-600 mt-3">
                  Running low on enhancements.{' '}
                  <a href="/pricing" className="underline font-medium">Upgrade to Pro</a> for 1,000/month.
                </p>
              )}
            </>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="/"
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors"
          >
            <p className="font-semibold text-gray-900">Enhance Prompts</p>
            <p className="text-sm text-gray-500 mt-1">Open the prompt engineer</p>
          </a>
          <a
            href="/docs"
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors"
          >
            <p className="font-semibold text-gray-900">API Documentation</p>
            <p className="text-sm text-gray-500 mt-1">Integrate via REST API</p>
          </a>
          <a
            href="/pricing"
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors"
          >
            <p className="font-semibold text-gray-900">Plans & Pricing</p>
            <p className="text-sm text-gray-500 mt-1">Compare features</p>
          </a>
        </div>
      </div>
    </main>
  )
}
