import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Raw → Refined | mstprmpt.zeidgeist.com",
  description: "Prompt engineering service",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-black text-white px-4 py-2 rounded z-50 focus:z-50">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  )
}

