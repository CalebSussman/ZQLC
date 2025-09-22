import './globals.css'
import type { Metadata } from 'next'
import ClientLayout from '@/components/ClientLayout'

export const metadata: Metadata = {
  title: 'ATOL - Semantic Task Ledger',
  description: 'Task management system with structured semantic codes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F8F7F4] dark:bg-[#0A0A0B] text-[#1A1A1A] dark:text-[#E8E6E3]">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}
