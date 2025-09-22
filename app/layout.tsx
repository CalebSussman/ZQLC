'use client'

import './globals.css'
import Navigation from '@/components/Navigation'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>ATOL - Semantic Task Ledger</title>
        <meta name="description" content="Task management system with structured semantic codes" />
      </head>
      <body className="min-h-screen bg-[#F8F7F4] dark:bg-[#0A0A0B] text-[#1A1A1A] dark:text-[#E8E6E3]">
        <div className="flex">
          <Navigation />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
