import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white-pure flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-black mb-4">404</h1>
        <h2 className="text-2xl font-bold text-black mb-4">Route Not Found</h2>
        <p className="text-black font-medium mb-8">Requested resource unavailable.</p>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 border border-black text-base font-bold rounded-md text-white bg-black hover:bg-gray-800"
        >
          Return Home
        </Link>
      </div>
    </div>
  )
}