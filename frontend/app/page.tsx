import PromptEngineer from "@/components/prompt-engineer"
import { BrandHeader, BrandFooter } from "@/components/ui/branding"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Raw → Refined | Zeidgeist",
  description: "Prompt engineering service",
}

export default function Home() {
  return (
    <>
      <BrandHeader />
      <main className="min-h-screen flex items-center justify-center py-16 px-4">
        <div className="container mx-auto">
          <div className="max-w-2xl mx-auto">
            <PromptEngineer />
          </div>
        </div>
      </main>
      <BrandFooter />
    </>
  )
}

