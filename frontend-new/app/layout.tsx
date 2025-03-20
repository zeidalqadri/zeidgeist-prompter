import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Raw → Refined | Zeidgeist Prompter",
  description: "AI-powered prompt engineering service that refines your prompts for better results",
  authors: [{ name: "Zeidgeist", url: "https://zeidgeist.com" }],
  creator: "Zeidgeist",
  publisher: "Zeidgeist",
  keywords: ["prompt engineering", "AI", "LLM", "prompt refinement", "zeidgeist"],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}

