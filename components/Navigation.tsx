'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface NavItem {
  key: string
  label: string
  path: string
  shortcut?: string
}

const navItems: NavItem[] = [
  { key: 'C', label: 'Create', path: '/' },
  { key: 'B', label: 'Browse', path: '/browse' },
  { key: 'T', label: 'Todo', path: '/todo' },
  { key: 'L', label: 'Log', path: '/log' },
]

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
      if (showSearch && e.key === 'Escape') {
        setShowSearch(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSearch])

  if (isMobile) {
    // Mobile: Bottom tab bar
    return (
      <>
        <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-50">
          <div className="flex justify-around items-center h-16">
            {navItems.map((item) => {
              const isActive = pathname === item.path
              return (
                <button
                  key={item.key}
                  onClick={() => router.push(item.path)}
                  className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                    isActive
                      ? 'text-yellow-400 bg-gray-800'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  }`}
                >
                  <span className="text-2xl font-mono font-bold">{item.key}</span>
                  <span className="text-xs mt-1">{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400" />
                  )}
                </button>
              )
            })}
            <button
              onClick={() => setShowSearch(true)}
              className="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
            >
              <span className="text-2xl font-mono font-bold">S</span>
              <span className="text-xs mt-1">Search</span>
            </button>
          </div>
        </nav>
        <div className="h-16" /> {/* Spacer for fixed bottom nav */}
      </>
    )
  }

  // Desktop: Left sidebar
  return (
    <>
      <nav className="fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-700 z-50">
        <div className="p-6">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-3xl font-mono font-bold text-yellow-400">ATOL_</h1>
            <p className="text-xs text-gray-500 mt-1 font-mono">SEMANTIC LEDGER</p>
          </div>

          {/* Navigation Items */}
          <div className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.path
              return (
                <button
                  key={item.key}
                  onClick={() => router.push(item.path)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all font-mono ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {isActive && <span className="mr-2">&gt;</span>}
                  <span className="font-bold text-yellow-400">{item.key}</span>
                  <span className="ml-1">{item.label.slice(1)}</span>
                </button>
              )
            })}
          </div>

          {/* Divider */}
          <div className="my-6 border-t border-gray-700" />

          {/* Search */}
          <button
            onClick={() => setShowSearch(true)}
            className="w-full text-left px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-all font-mono"
          >
            <span className="font-bold text-yellow-400">S</span>
            <span className="ml-1">earch</span>
            <span className="float-right text-xs bg-gray-800 px-2 py-1 rounded">ctrl+k</span>
          </button>
        </div>
      </nav>
      <div className="w-64" /> {/* Spacer for fixed sidebar */}

      {/* Search Overlay */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-start justify-center pt-32">
          <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-2xl shadow-2xl">
            <div className="p-4 border-b border-gray-700">
              <input
                type="text"
                placeholder="Search tasks, codes, or commands..."
                className="w-full bg-transparent text-white font-mono text-lg focus:outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowSearch(false)
                }}
              />
            </div>
            <div className="p-4 text-gray-500 font-mono text-sm">
              <p>Type to search across all tasks and categories</p>
              <p className="mt-2">Press ESC to close</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
