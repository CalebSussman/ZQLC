'use client'

import Navigation from './Navigation'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
