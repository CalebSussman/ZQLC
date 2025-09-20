import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ATOL - Semantic Task Ledger',
  description: 'Task management system with semantic organization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <a href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  ATOL
                </a>
                <span className="ml-3 text-sm text-gray-500">Semantic Task Ledger</span>
              </div>
              <div className="flex items-center space-x-4">
                <a href="/new" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  + New Task
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
