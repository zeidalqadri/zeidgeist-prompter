'use client'

import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-white-pure flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-black mb-4">Error</h1>
        <h2 className="text-xl font-bold text-black mb-4">Something went wrong</h2>
        <p className="text-black font-medium mb-8">
          {error.message || 'An unexpected error occurred'}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center px-4 py-2 border border-black text-base font-bold rounded-md text-white bg-black hover:bg-gray-800"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-black text-base font-bold rounded-md text-black bg-white hover:bg-gray-50"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  )
}
