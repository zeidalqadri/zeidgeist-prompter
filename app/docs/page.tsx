'use client'

import { useState } from 'react'

const API_BASE = 'https://api.mstprmpt.zeidgeist.com'

type Lang = 'curl' | 'python' | 'node'

const CODE_EXAMPLES: Record<string, Record<Lang, string>> = {
  enhance: {
    curl: `curl -X POST ${API_BASE}/v1/enhance \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer mst_live_YOUR_KEY" \\
  -d '{
    "prompt": "Write a better email subject line",
    "options": {
      "costPreset": "balanced"
    }
  }'`,
    python: `import requests

response = requests.post(
    "${API_BASE}/v1/enhance",
    headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer mst_live_YOUR_KEY",
    },
    json={
        "prompt": "Write a better email subject line",
        "options": {"costPreset": "balanced"},
    },
)

data = response.json()
print(data["data"]["enhancedPrompt"])`,
    node: `const response = await fetch("${API_BASE}/v1/enhance", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer mst_live_YOUR_KEY",
  },
  body: JSON.stringify({
    prompt: "Write a better email subject line",
    options: { costPreset: "balanced" },
  }),
});

const { data } = await response.json();
console.log(data.enhancedPrompt);`,
  },
  register: {
    curl: `curl -X POST ${API_BASE}/v1/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "you@example.com",
    "password": "your-secure-password",
    "name": "Your Name",
    "orgName": "Your Org"
  }'`,
    python: `import requests

response = requests.post(
    "${API_BASE}/v1/auth/register",
    json={
        "email": "you@example.com",
        "password": "your-secure-password",
        "name": "Your Name",
        "orgName": "Your Org",
    },
)

data = response.json()
api_key = data["data"]["apiKey"]["key"]
print(f"Save your API key: {api_key}")`,
    node: `const response = await fetch("${API_BASE}/v1/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "you@example.com",
    password: "your-secure-password",
    name: "Your Name",
    orgName: "Your Org",
  }),
});

const { data } = await response.json();
console.log("Save your API key:", data.apiKey.key);`,
  },
}

interface Endpoint {
  method: string
  path: string
  description: string
  auth: string
  body?: Record<string, string>
  response?: string
}

const ENDPOINTS: Endpoint[] = [
  {
    method: 'POST',
    path: '/v1/auth/register',
    description: 'Create an account and get your API key',
    auth: 'None',
    body: {
      email: 'string (required)',
      password: 'string (min 12 chars, required)',
      name: 'string (required)',
      orgName: 'string (required)',
    },
    response: '{ user, org, apiKey: { key, keyPrefix, note } }',
  },
  {
    method: 'POST',
    path: '/v1/auth/login',
    description: 'Log in and get a session token for dashboard',
    auth: 'None',
    body: { email: 'string', password: 'string' },
    response: '{ user, organizations, sessionToken, expiresAt }',
  },
  {
    method: 'POST',
    path: '/v1/auth/forgot-password',
    description: 'Request a password reset token',
    auth: 'None',
    body: { email: 'string' },
    response: '{ message }',
  },
  {
    method: 'POST',
    path: '/v1/auth/reset-password',
    description: 'Reset password with token from forgot-password',
    auth: 'None',
    body: { token: 'string', newPassword: 'string (min 12 chars)' },
    response: '{ message }',
  },
  {
    method: 'POST',
    path: '/v1/auth/change-password',
    description: 'Change password (requires current password)',
    auth: 'Bearer (session token)',
    body: { currentPassword: 'string', newPassword: 'string (min 12 chars)' },
    response: '{ message }',
  },
  {
    method: 'POST',
    path: '/v1/enhance',
    description: 'Enhance a prompt using AI',
    auth: 'Bearer mst_live_...',
    body: {
      prompt: 'string (1-10000 chars, required)',
      context: 'string (optional, max 5000)',
      'options.costPreset': '"maxQuality" | "balanced" | "costSavings" | "aggressive"',
      'options.lambda': 'number (0-0.02, cost optimization weight)',
      'options.preferredProvider': '"claude" | "openai" | "deepseek" | "mistral" | "gemini"',
    },
    response: '{ id, enhancedPrompt, provider, model, processingTimeMs, usage }',
  },
  {
    method: 'GET',
    path: '/v1/usage?period=YYYY-MM',
    description: 'Get usage stats for the current billing period',
    auth: 'Bearer mst_live_...',
    response: '{ totalRequests, limit, remaining, period, perKey[] }',
  },
  {
    method: 'POST',
    path: '/v1/keys',
    description: 'Create a new API key',
    auth: 'Bearer mst_live_...',
    body: { name: 'string (required)', scopes: 'string[] (default: ["enhance"])', expiresAt: 'ISO date (optional)' },
    response: '{ key, keyPrefix, id, scopes }',
  },
  {
    method: 'GET',
    path: '/v1/keys',
    description: 'List all active API keys',
    auth: 'Bearer mst_live_...',
    response: '{ keys: [{ id, name, keyPrefix, scopes, createdAt }] }',
  },
  {
    method: 'DELETE',
    path: '/v1/keys/:id',
    description: 'Revoke an API key',
    auth: 'Bearer mst_live_...',
  },
  {
    method: 'POST',
    path: '/v1/keys/:id/rotate',
    description: 'Rotate an API key (revokes old, creates new)',
    auth: 'Bearer mst_live_...',
    response: '{ key, keyPrefix, id }',
  },
  {
    method: 'POST',
    path: '/v1/billing/checkout',
    description: 'Create a Stripe checkout session to upgrade',
    auth: 'Bearer (API key or session token)',
    body: {
      targetTier: '"pro" | "enterprise"',
      successUrl: 'string (URL)',
      cancelUrl: 'string (URL)',
      email: 'string',
      orgName: 'string',
    },
    response: '{ checkoutUrl }',
  },
  {
    method: 'GET',
    path: '/v1/health',
    description: 'Health check with provider status',
    auth: 'None',
    response: '{ status, providers: { enabled, count } }',
  },
]

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="relative">
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        className="absolute top-2 right-2 text-gray-400 hover:text-white text-xs bg-gray-800 px-2 py-1 rounded"
        onClick={() => {
          navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  )
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-green-100 text-green-800',
    POST: 'bg-blue-100 text-blue-800',
    DELETE: 'bg-red-100 text-red-800',
    PUT: 'bg-yellow-100 text-yellow-800',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${colors[method] || 'bg-gray-100'}`}>
      {method}
    </span>
  )
}

export default function DocsPage() {
  const [lang, setLang] = useState<Lang>('curl')

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6">
        <div className="mb-8">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-900 mb-1 inline-block">
            &larr; Back to app
          </a>
          <h1 className="text-3xl font-bold text-gray-900">API Documentation</h1>
          <p className="text-gray-600 mt-2">
            Integrate prompt enhancement into your applications with the mstprmpt REST API.
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Base URL: <code className="bg-gray-100 px-2 py-0.5 rounded">{API_BASE}</code>
          </p>
        </div>

        {/* Quick Start */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Start</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Get your API key</h3>
              <p className="text-gray-600 mb-3">
                Register to get your API key. Save it — it&apos;s only shown once.
              </p>
              <div className="flex gap-2 mb-3">
                {(['curl', 'python', 'node'] as const).map((l) => (
                  <button
                    key={l}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      lang === l ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    onClick={() => setLang(l)}
                  >
                    {l === 'node' ? 'Node.js' : l.charAt(0).toUpperCase() + l.slice(1)}
                  </button>
                ))}
              </div>
              <CodeBlock code={CODE_EXAMPLES.register[lang]} />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Enhance a prompt</h3>
              <p className="text-gray-600 mb-3">
                Pass your raw prompt and get back a refined version.
              </p>
              <CodeBlock code={CODE_EXAMPLES.enhance[lang]} />
            </div>
          </div>
        </section>

        {/* Authentication */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication</h2>
          <div className="bg-gray-50 rounded-lg p-5 space-y-3">
            <p className="text-gray-700">
              All API requests (except auth and health) require an API key passed via the{' '}
              <code className="bg-gray-200 px-1 rounded">Authorization</code> header:
            </p>
            <CodeBlock code="Authorization: Bearer mst_live_YOUR_KEY" />
            <p className="text-sm text-gray-500">
              API keys start with <code className="bg-gray-200 px-1 rounded">mst_live_</code> for production.
              You can create, list, revoke, and rotate keys via the <code>/v1/keys</code> endpoints.
            </p>
          </div>
        </section>

        {/* Rate Limits */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Rate Limits</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-semibold text-gray-900">Plan</th>
                  <th className="text-left py-2 pr-4 font-semibold text-gray-900">Monthly Limit</th>
                  <th className="text-left py-2 pr-4 font-semibold text-gray-900">Rate</th>
                  <th className="text-left py-2 font-semibold text-gray-900">Price</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4">Free</td>
                  <td className="py-2 pr-4">50 enhancements</td>
                  <td className="py-2 pr-4">5 req/min</td>
                  <td className="py-2">$0</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-medium">Pro</td>
                  <td className="py-2 pr-4">1,000 enhancements</td>
                  <td className="py-2 pr-4">30 req/min</td>
                  <td className="py-2">$29/mo</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Enterprise</td>
                  <td className="py-2 pr-4">Unlimited</td>
                  <td className="py-2 pr-4">100 req/min</td>
                  <td className="py-2">$99/mo</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Rate limit headers (<code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code>,{' '}
            <code>Retry-After</code>) are included on every response.
          </p>
        </section>

        {/* Endpoints */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Endpoints</h2>
          <div className="space-y-6">
            {ENDPOINTS.map((ep) => (
              <div key={`${ep.method}-${ep.path}`} className="border border-gray-200 rounded-lg p-5">
                <div className="flex items-center gap-3 mb-2">
                  <MethodBadge method={ep.method} />
                  <code className="text-sm font-mono text-gray-900">{ep.path}</code>
                </div>
                <p className="text-gray-600 text-sm mb-3">{ep.description}</p>
                <p className="text-xs text-gray-500">
                  Auth: <code className="bg-gray-100 px-1 rounded">{ep.auth}</code>
                </p>

                {ep.body && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Request Body</p>
                    <div className="bg-gray-50 rounded p-3 text-sm font-mono">
                      {Object.entries(ep.body).map(([key, val]) => (
                        <div key={key}>
                          <span className="text-blue-700">{key}</span>
                          <span className="text-gray-500">: {val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {ep.response && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Response</p>
                    <code className="text-sm text-gray-700 bg-gray-50 px-2 py-1 rounded block">
                      {ep.response}
                    </code>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Error Handling */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Handling</h2>
          <p className="text-gray-600 mb-3">All errors follow this format:</p>
          <CodeBlock
            code={`{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_KEY",
    "message": "Invalid or revoked API key"
  }
}`}
          />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-semibold text-gray-900">HTTP Status</th>
                  <th className="text-left py-2 font-semibold text-gray-900">Meaning</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono">400</td><td className="py-2">Bad request / validation error</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono">401</td><td className="py-2">Missing or invalid API key</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono">402</td><td className="py-2">Monthly quota exceeded</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono">403</td><td className="py-2">Insufficient scope or permissions</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono">429</td><td className="py-2">Rate limit exceeded</td></tr>
                <tr><td className="py-2 pr-4 font-mono">500</td><td className="py-2">Internal server error</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className="text-center border-t border-gray-200 pt-8">
          <p className="text-gray-500 text-sm">
            Need help? Contact <a href="mailto:zeidalqadri@gmail.com" className="text-blue-600 hover:underline">zeidalqadri@gmail.com</a>
          </p>
        </div>
      </div>
    </main>
  )
}
