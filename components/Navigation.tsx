'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/lib/supabase'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Task[]>([])
  const [isSearching, setIsSearching] = useState(false)

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
        setSearchQuery('')
        setSearchResults([])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSearch])

  // Search functionality
  useEffect(() => {
    const searchTasks = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      try {
        // Search in tasks by title, code, and base_code
        const { data: taskResults } = await supabase
          .from('task_details')
          .select('*')
          .or(`title.ilike.%${searchQuery}%,code.ilike.%${searchQuery}%,base_code.ilike.%${searchQuery}%,display_code.ilike.%${searchQuery}%`)
          .limit(10)

        // Search in task notes
        const { data: noteResults } = await supabase
          .from('task_notes')
          .select(`
            task_id,
            content,
            tasks!inner(*)
          `)
          .ilike('content', `%${searchQuery}%`)
          .limit(5)

        // Combine results and remove duplicates
        const allTasks = [...(taskResults || [])]

        // Add tasks from note matches (if not already included)
        if (noteResults) {
          for (const note of noteResults) {
            const task = (note as any).tasks
            if (task && !allTasks.find(t => t.id === task.id)) {
              // Get full task details
              const { data: fullTask } = await supabase
                .from('task_details')
                .select('*')
                .eq('id', task.id)
                .single()

              if (fullTask) {
                allTasks.push(fullTask)
              }
            }
          }
        }

        setSearchResults(allTasks.slice(0, 10)) // Limit to 10 results
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    // Debounce search
    const timeoutId = setTimeout(searchTasks, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const handleSearchSelect = (task: Task) => {
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
    router.push(`/t/${task.base_code?.toLowerCase()}`)
  }

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
          <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-2xl shadow-2xl max-h-96 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <input
                type="text"
                placeholder="Search tasks, codes, or commands..."
                className="w-full bg-transparent text-white font-mono text-lg focus:outline-none"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowSearch(false)
                    setSearchQuery('')
                    setSearchResults([])
                  }
                  if (e.key === 'Enter' && searchResults.length > 0) {
                    handleSearchSelect(searchResults[0])
                  }
                }}
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {isSearching && (
                <div className="p-4 text-gray-500 font-mono text-sm text-center">
                  Searching...
                </div>
              )}

              {!isSearching && searchQuery && searchResults.length === 0 && (
                <div className="p-4 text-gray-500 font-mono text-sm text-center">
                  No results found
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="py-2">
                  {searchResults.map((task, index) => (
                    <button
                      key={task.id}
                      onClick={() => handleSearchSelect(task)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-800 font-mono border-b border-gray-700 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-white font-bold">
                            {task.display_code || task.base_code} - {task.title}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {task.universe_name} {' > '} {task.phylum_name}
                            {task.family_name && ` > ${task.family_name}`} {' > '} {task.group_name}
                          </div>
                          {task.current_status_name && (
                            <div className="text-xs text-yellow-400 mt-1">
                              Status: {task.current_status_name}
                            </div>
                          )}
                        </div>
                        <div className="text-gray-500 text-xs ml-4">
                          {index === 0 && 'Enter'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!searchQuery && (
                <div className="p-4 text-gray-500 font-mono text-sm">
                  <p>Type to search across all tasks and categories</p>
                  <p className="mt-2">• Search by task title, code, or notes</p>
                  <p>• Press Enter to open first result</p>
                  <p>• Press ESC to close</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
