'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-black mb-4">Application Error</h1>
            <h2 className="text-xl font-bold text-black mb-4">Something went wrong</h2>
            <p className="text-black font-medium mb-8">
              {error.message || 'An unexpected application error occurred'}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={reset}
                className="inline-flex items-center px-4 py-2 border border-black text-base font-bold rounded-md text-white bg-black hover:bg-gray-800"
              >
                Try again
              </button>
              <a
                href="/"
                className="inline-flex items-center px-4 py-2 border border-black text-base font-bold rounded-md text-black bg-white hover:bg-gray-50"
              >
                Return Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
