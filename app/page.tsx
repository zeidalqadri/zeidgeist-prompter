import PromptEngineer from "@/components/prompt-engineer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Raw → Refined | zeidgeistdotcom",
  description: "Prompt engineering service",
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white-pure flex items-center justify-center p-4">
      <PromptEngineer />
    </main>
  )
}

