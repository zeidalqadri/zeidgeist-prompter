import PromptEngineer from "../components/prompt-engineer"
import ErrorBoundary from "../components/ErrorBoundary"
import PerformanceMonitor from "../components/performance-monitor"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Raw → Refactored | mstprmpt.zeidgeist.com",
  description: "Prompt engineering service",
}

export default function Home() {
  return (
    <main id="main-content" role="main" className="min-h-screen bg-white-pure flex items-center justify-center p-2 sm:p-4 pb-safe-bottom pt-safe-top" aria-label="Prompt engineering interface">
      <ErrorBoundary>
        <PromptEngineer />
      </ErrorBoundary>
      {/* Performance monitoring only in development/testing */}
      {process.env.NODE_ENV !== 'production' && <PerformanceMonitor />}
    </main>
  )
}

