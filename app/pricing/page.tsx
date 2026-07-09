'use client'

import { Button } from '../../components/ui/button'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.mstprmpt.zeidgeist.com'

interface PlanFeature {
  text: string
  included: boolean
}

interface Plan {
  name: string
  price: string
  period: string
  description: string
  features: PlanFeature[]
  cta: string
  highlighted?: boolean
  tier: 'free' | 'pro' | 'enterprise'
}

const PLANS: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Try prompt enhancement with no commitment',
    tier: 'free',
    cta: 'Get Started',
    features: [
      { text: '50 enhancements/month', included: true },
      { text: '5 requests/minute', included: true },
      { text: 'Cost-optimized models', included: true },
      { text: 'Web app access', included: true },
      { text: 'Chrome extension', included: true },
      { text: 'API access', included: false },
      { text: 'Provider selection', included: false },
      { text: 'Priority support', included: false },
    ],
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For developers and power users',
    tier: 'pro',
    cta: 'Upgrade to Pro',
    highlighted: true,
    features: [
      { text: '1,000 enhancements/month', included: true },
      { text: '30 requests/minute', included: true },
      { text: 'All models (GPT-4o, Claude, etc.)', included: true },
      { text: 'Web app access', included: true },
      { text: 'Chrome extension', included: true },
      { text: 'Full API access + keys', included: true },
      { text: 'Provider selection', included: true },
      { text: 'Email support', included: true },
    ],
  },
  {
    name: 'Enterprise',
    price: '$99',
    period: '/month',
    description: 'For teams and high-volume usage',
    tier: 'enterprise',
    cta: 'Contact Sales',
    features: [
      { text: 'Unlimited enhancements', included: true },
      { text: '100 requests/minute', included: true },
      { text: 'All models + priority routing', included: true },
      { text: 'Web app access', included: true },
      { text: 'Chrome extension', included: true },
      { text: 'Full API access + keys', included: true },
      { text: 'Team management', included: true },
      { text: 'Priority support + SLA', included: true },
    ],
  },
]

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

async function handleUpgrade(tier: 'pro' | 'enterprise'): Promise<void> {
  const sessionToken = localStorage.getItem('mstprmpt_session_token')
  if (!sessionToken) {
    window.location.href = '/auth/login?redirect=/pricing'
    return
  }

  const res = await fetch(`${API_BASE}/v1/billing/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({
      targetTier: tier,
      successUrl: `${window.location.origin}/dashboard?upgraded=true`,
      cancelUrl: `${window.location.origin}/pricing`,
      email: localStorage.getItem('mstprmpt_email') || '',
      orgName: localStorage.getItem('mstprmpt_org_name') || '',
    }),
  })

  if (!res.ok) {
    const errBody = await res.json() as { error?: { message?: string } }
    alert(errBody.error?.message || 'Failed to start checkout')
    return
  }

  const json = await res.json() as { data: { checkoutUrl: string } }
  window.location.href = json.data.checkoutUrl
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-900 mb-4 inline-block">
            &larr; Back to app
          </a>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Refine your prompts with AI. Start free, upgrade when you need more.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.tier}
              className={`rounded-2xl border p-8 flex flex-col ${
                plan.highlighted
                  ? 'border-black shadow-xl ring-1 ring-black relative'
                  : 'border-gray-200'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-black text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">{plan.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500 ml-1">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-start gap-2">
                    {feature.included ? <CheckIcon /> : <XIcon />}
                    <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {plan.tier === 'free' ? (
                <Button variant="outline" className="w-full" onClick={() => { window.location.href = '/' }}>
                  {plan.cta}
                </Button>
              ) : plan.tier === 'enterprise' ? (
                <Button variant="outline" className="w-full" onClick={() => { window.location.href = 'mailto:zeidalqadri@gmail.com?subject=mstprmpt%20Enterprise' }}>
                  {plan.cta}
                </Button>
              ) : (
                <Button className="w-full" onClick={() => handleUpgrade(plan.tier as 'pro' | 'enterprise')}>
                  {plan.cta}
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Need API access?
          </h3>
          <p className="text-gray-600 mb-4">
            Check out our <a href="/docs" className="text-blue-600 hover:underline">API documentation</a> to integrate prompt enhancement into your apps.
          </p>
        </div>
      </div>
    </main>
  )
}
