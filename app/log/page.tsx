'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/lib/supabase'

interface CalendarEntry {
  id: string
  task_code: string
  status_code: string
  work_description: string
  date: string
  start_time: string
  end_time: string | null
  is_parallel: boolean
  track_number: number
  created_at: string
}

interface DragState {
  isDragging: boolean
  dragType: 'task' | 'entry' | null
  draggedItem: Task | CalendarEntry | null
  startPosition: { x: number; y: number }
  currentPosition: { x: number; y: number }
}

export default function LogPage() {
  // Core state
  const [currentDate, setCurrentDate] = useState(new Date())
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // UI state
  const [showTaskPanel, setShowTaskPanel] = useState(false)
  const [hoveredTimeSlot, setHoveredTimeSlot] = useState<string | null>(null)
  const [hoveredHour, setHoveredHour] = useState<number | null>(null)
  const [hoveredEntry, setHoveredEntry] = useState<CalendarEntry | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [selectedEntry, setSelectedEntry] = useState<CalendarEntry | null>(null)

  // Drag state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragType: null,
    draggedItem: null,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 }
  })

  // Task search state
  const [showTaskSearch, setShowTaskSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Task[]>([])
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')

  // SOA state
  const [showSOA, setShowSOA] = useState(false)
  const [soaContent, setSOAContent] = useState<string>('')
  const [isGeneratingSOA, setIsGeneratingSOA] = useState(false)

  // Refs
  const calendarRef = useRef<HTMLDivElement>(null)
  const dragPreviewRef = useRef<HTMLDivElement>(null)

  // Initialize
  useEffect(() => {
    setIsHydrated(true)
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (isHydrated) {
      loadEntries()
      loadTasks()
    }
  }, [currentDate, isHydrated])

  // Data loading functions
  const loadEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_entries')
        .select('*')
        .eq('date', currentDate.toISOString().split('T')[0])
        .order('start_time')

      if (error) throw error
      setEntries(data || [])
    } catch (error) {
      console.error('Error loading entries:', error)
    }
  }

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('task_details')
        .select('*')
        .in('status', ['active'])
        .order('updated_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }

  // Task search functionality
  const searchTasks = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('task_details')
        .select('*')
        .or(`title.ilike.%${query}%,code.ilike.%${query}%,base_code.ilike.%${query}%`)
        .limit(20)

      if (error) throw error
      setSearchResults(data || [])
    } catch (error) {
      console.error('Error searching tasks:', error)
      setSearchResults([])
    }
  }

  // Time utility functions
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }


  // Mac Dock-style magnification heights
  const getHourHeight = (hour: number) => {
    if (!hoveredHour || dragState.isDragging) return 64 // Default height (4 quarters * 16px each)

    const distance = Math.abs(hour - hoveredHour)
    if (distance === 0) return 120 // Hovered hour (magnified)
    if (distance === 1) return 90  // Adjacent hours
    if (distance === 2) return 65  // Second adjacent
    return 40 // Base height for distant hours
  }

  // Generate time slots with magnification (7:00 AM to 10:00 PM in 15-minute increments)
  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 7; hour <= 22; hour++) {
      const hourHeight = getHourHeight(hour)
      const quarterHeight = hourHeight / 4

      for (let quarter = 0; quarter < 4; quarter++) {
        const minutes = hour * 60 + quarter * 15
        const timeString = minutesToTime(minutes)
        slots.push({
          time: timeString,
          minutes: minutes,
          hour: hour,
          quarter: quarter,
          height: quarterHeight,
          label: quarter === 0 ? `${hour === 12 ? 12 : hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'PM' : 'AM'}` : ''
        })
      }
    }
    return slots
  }

  // Group entries by time slot for intelligent layout
  const getEntriesForTimeSlot = (timeSlot: string) => {
    const slotMinutes = timeToMinutes(timeSlot)
    return entries.filter(entry => {
      const entryStart = timeToMinutes(entry.start_time)
      const entryEnd = entry.end_time ? timeToMinutes(entry.end_time) : entryStart + 60
      return slotMinutes >= entryStart && slotMinutes < entryEnd
    })
  }

  // Get all unique tasks across all entries for continuous bar rendering
  const getUniqueTaskEntries = () => {
    const taskGroups: { [taskCode: string]: CalendarEntry[] } = {}

    entries.forEach(entry => {
      if (!taskGroups[entry.task_code]) {
        taskGroups[entry.task_code] = []
      }
      taskGroups[entry.task_code].push(entry)
    })

    // Convert to continuous task bars with merged time spans
    return Object.entries(taskGroups).map(([taskCode, taskEntries]) => {
      // Sort entries by start time
      const sortedEntries = [...taskEntries].sort((a, b) =>
        timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
      )

      // Find continuous time spans
      const spans: { start: string, end: string, entries: CalendarEntry[] }[] = []
      let currentSpan = {
        start: sortedEntries[0].start_time,
        end: sortedEntries[0].end_time || minutesToTime(timeToMinutes(sortedEntries[0].start_time) + 60),
        entries: [sortedEntries[0]]
      }

      for (let i = 1; i < sortedEntries.length; i++) {
        const entry = sortedEntries[i]
        const entryStart = timeToMinutes(entry.start_time)
        const currentEnd = timeToMinutes(currentSpan.end)

        // If entries are adjacent or overlapping, merge them
        if (entryStart <= currentEnd + 15) { // Allow 15-minute gaps
          currentSpan.end = entry.end_time || minutesToTime(entryStart + 60)
          currentSpan.entries.push(entry)
        } else {
          // Start new span
          spans.push(currentSpan)
          currentSpan = {
            start: entry.start_time,
            end: entry.end_time || minutesToTime(entryStart + 60),
            entries: [entry]
          }
        }
      }
      spans.push(currentSpan)

      return {
        taskCode,
        spans,
        primaryEntry: sortedEntries[0], // For colors and click handling
        hasMultipleStatuses: taskEntries.some(e => e.status_code !== taskEntries[0].status_code)
      }
    })
  }

  // Calculate position and size for a continuous task bar
  const getTaskBarLayout = (span: { start: string, end: string }, trackIndex: number, totalTracks: number) => {
    const startMinutes = timeToMinutes(span.start)
    const endMinutes = timeToMinutes(span.end)

    // Calculate position from top based on start time
    let top = 0
    const slots = generateTimeSlots()

    for (const slot of slots) {
      if (slot.minutes >= startMinutes) break
      top += slot.height
    }

    // Calculate height based on duration and magnification
    let height = 0
    for (const slot of slots) {
      if (slot.minutes >= startMinutes && slot.minutes < endMinutes) {
        height += slot.height
      }
    }

    // Position horizontally with track system for overlapping tasks
    const trackWidth = 100 / totalTracks // Full width divided by tracks
    const trackLeft = trackIndex * trackWidth // No left margin, full width usage

    return {
      top: `${top}px`,
      left: `${trackLeft}%`,
      width: `${trackWidth}%`,
      height: `${height}px`,
      minHeight: '20px'
    }
  }

  // Format status code as S-TASK-CODE
  const formatStatusCode = (entry: CalendarEntry) => {
    return `${entry.status_code}-${entry.task_code}`
  }

  // Generate SOA (Statement of Activities) for current date
  const generateSOA = async () => {
    setIsGeneratingSOA(true)
    try {
      const dateStr = currentDate.toISOString().split('T')[0]

      // Get all entries for the current date
      const { data: dayEntries } = await supabase
        .from('calendar_entries')
        .select('*')
        .eq('date', dateStr)
        .order('start_time')

      // Get task details for all entries
      const taskCodes = Array.from(new Set(dayEntries?.map(e => e.task_code) || []))
      const { data: tasks } = await supabase
        .from('task_details')
        .select('*')
        .in('base_code', taskCodes)

      const taskMap = (tasks || []).reduce((acc, task) => {
        acc[task.base_code] = task
        return acc
      }, {} as Record<string, any>)

      // Group by universe for SOA structure
      const universeGroups: Record<string, { name: string, entries: any[] }> = {}

      dayEntries?.forEach(entry => {
        const task = taskMap[entry.task_code]
        if (task) {
          const universeName = task.universe_name || 'Unknown'
          if (!universeGroups[universeName]) {
            universeGroups[universeName] = { name: universeName, entries: [] }
          }
          universeGroups[universeName].entries.push({
            ...entry,
            taskTitle: task.title,
            taskCode: task.base_code,
            fullStatusCode: formatStatusCode(entry)
          })
        }
      })

      // Generate visual content with ASCII art
      const dateFormatted = currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

      let content = `╔════════════════════════════════════════════════════════════════╗\n`
      content += `║                    DAILY ACTIVITY REPORT                      ║\n`
      content += `╠════════════════════════════════════════════════════════════════╣\n`
      content += `║ Date: ${dateFormatted.padEnd(53)} ║\n`
      content += `╚════════════════════════════════════════════════════════════════╝\n\n`

      if (Object.keys(universeGroups).length === 0) {
        content += `┌─────────────────────────────────────────┐\n`
        content += `│           NO ACTIVITIES LOGGED          │\n`
        content += `│              FOR THIS DATE              │\n`
        content += `└─────────────────────────────────────────┘\n`
      } else {
        Object.entries(universeGroups).forEach(([universeName, group], universeIndex) => {
          const universeIcon = universeName === 'Work' ? '🏢' :
                              universeName === 'Personal' ? '👤' :
                              universeName === 'Home' ? '🏠' : '📁'

          content += `\n┌─ ${universeIcon} ${universeName.toUpperCase()} UNIVERSE ─────────────────────────────────┐\n`

          group.entries.forEach((entry, entryIndex) => {
            const duration = entry.end_time
              ? `${entry.start_time}-${entry.end_time}`
              : `${entry.start_time}→`

            const statusIcon = entry.status_code === 'R' ? '📥' :
                              entry.status_code === 'P' ? '⏳' :
                              entry.status_code === 'D' ? '📤' :
                              entry.status_code === 'C' ? '✅' :
                              entry.status_code === 'F' ? '📁' : '❌'

            const connector = entryIndex === group.entries.length - 1 ? '└─' : '├─'

            content += `│ ${connector} ${statusIcon} [${entry.fullStatusCode}] ${entry.taskTitle}\n`
            content += `│    ⏰ ${duration}`
            if (entry.work_description && entry.work_description !== entry.taskTitle) {
              content += ` │ ${entry.work_description.substring(0, 40)}`
              if (entry.work_description.length > 40) content += '...'
            }
            content += '\n'
          })

          content += `└──────────────────────────────── ${group.entries.length} activities ─┘\n`
        })

        // Add visual summary
        const totalEntries = Object.values(universeGroups).reduce((sum, group) => sum + group.entries.length, 0)
        const uniqueTasks = new Set(Object.values(universeGroups).flatMap(group =>
          group.entries.map(e => e.task_code)
        )).size

        content += `\n╔═══════════════════ SUMMARY ════════════════════╗\n`
        content += `║ Total Activities: ${totalEntries.toString().padStart(2)} 📊                    ║\n`
        content += `║ Unique Tasks:     ${uniqueTasks.toString().padStart(2)} 📋                    ║\n`
        content += `║ Universes:        ${Object.keys(universeGroups).length.toString().padStart(2)} 🌌                    ║\n`
        content += `╚════════════════════════════════════════════════╝\n`
      }

      content += `\n┌─────────────────────────────────────────────────┐\n`
      content += `│ Generated: ${new Date().toLocaleString().padEnd(32)} │\n`
      content += `│ System: ATOL Semantic Ledger v1.0              │\n`
      content += `└─────────────────────────────────────────────────┘`

      setSOAContent(content)
      setShowSOA(true)
    } catch (error) {
      console.error('Error generating SOA:', error)
    } finally {
      setIsGeneratingSOA(false)
    }
  }

  // Download SOA as markdown file
  const downloadSOA = () => {
    const dateStr = currentDate.toISOString().split('T')[0]
    const filename = `SOA-${dateStr}.md`

    const blob = new Blob([soaContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Entry management functions
  const createEntry = async (task: Task, timeSlot: string) => {
    try {
      const startMinutes = timeToMinutes(timeSlot)
      const endMinutes = startMinutes + 30 // Default 30 minute duration
      const endTime = minutesToTime(Math.min(endMinutes, 22 * 60 + 45)) // Cap at 10:45 PM

      // Use base_code or truncate code to fit database constraint (varchar 20)
      const taskCode = task.base_code || task.code.substring(0, 20)

      const { error } = await supabase
        .from('calendar_entries')
        .insert({
          task_code: taskCode,
          status_code: 'P',
          work_description: task.title,
          date: currentDate.toISOString().split('T')[0],
          start_time: timeSlot,
          end_time: endTime,
          is_parallel: false,
          track_number: 1
        })

      if (error) throw error
      loadEntries()
      setShowTaskSearch(false)
      setSearchQuery('')
      setSearchResults([])
    } catch (error) {
      console.error('Error creating entry:', error)
      alert('Failed to create entry: ' + (error as Error).message)
    }
  }

  const updateEntry = async (entryId: string, updates: Partial<CalendarEntry>) => {
    try {
      const { error } = await supabase
        .from('calendar_entries')
        .update(updates)
        .eq('id', entryId)

      if (error) throw error
      loadEntries()
    } catch (error) {
      console.error('Error updating entry:', error)
      alert('Failed to update entry: ' + (error as Error).message)
    }
  }

  const deleteEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_entries')
        .delete()
        .eq('id', entryId)

      if (error) throw error
      loadEntries()
      setSelectedEntry(null)
    } catch (error) {
      console.error('Error deleting entry:', error)
      alert('Failed to delete entry: ' + (error as Error).message)
    }
  }

  // Drag and drop event handlers
  const handleMouseDown = (e: React.MouseEvent, item: Task | CalendarEntry, type: 'task' | 'entry') => {
    e.preventDefault()
    e.stopPropagation()

    setDragState({
      isDragging: true,
      dragType: type,
      draggedItem: item,
      startPosition: { x: e.clientX, y: e.clientY },
      currentPosition: { x: e.clientX, y: e.clientY }
    })

    // Create drag preview
    if (dragPreviewRef.current) {
      const preview = dragPreviewRef.current
      preview.style.display = 'block'
      preview.style.left = `${e.clientX + 10}px`
      preview.style.top = `${e.clientY + 10}px`
      preview.textContent = type === 'task'
        ? `${(item as Task).code} - ${(item as Task).title}`
        : `${(item as CalendarEntry).task_code} (${(item as CalendarEntry).start_time})`
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragState.isDragging) return

    setDragState(prev => ({
      ...prev,
      currentPosition: { x: e.clientX, y: e.clientY }
    }))

    // Update drag preview position
    if (dragPreviewRef.current) {
      dragPreviewRef.current.style.left = `${e.clientX + 10}px`
      dragPreviewRef.current.style.top = `${e.clientY + 10}px`
    }

    // Determine hovered time slot with magnification support
    if (calendarRef.current) {
      const rect = calendarRef.current.getBoundingClientRect()
      const y = e.clientY - rect.top
      const timeSlots = generateTimeSlots()

      let cumulativeHeight = 0
      let foundSlot = null

      for (const slot of timeSlots) {
        if (y >= cumulativeHeight && y < cumulativeHeight + slot.height) {
          foundSlot = slot.time
          break
        }
        cumulativeHeight += slot.height
      }

      setHoveredTimeSlot(foundSlot)
    }
  }

  const handleMouseUp = () => {
    if (!dragState.isDragging || !dragState.draggedItem) {
      resetDragState()
      return
    }

    // Handle drop on time slot - only for tasks, not entries
    if (hoveredTimeSlot && calendarRef.current && dragState.dragType === 'task') {
      const targetTime = hoveredTimeSlot
      // Creating new entry from task
      createEntry(dragState.draggedItem as Task, targetTime)
    }

    resetDragState()
  }

  const resetDragState = () => {
    setDragState({
      isDragging: false,
      dragType: null,
      draggedItem: null,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 }
    })
    setHoveredTimeSlot(null)

    if (dragPreviewRef.current) {
      dragPreviewRef.current.style.display = 'none'
    }
  }

  // Mouse event listeners
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
      if (dragState.isDragging) {
        handleMouseMove(e)
      }
    }

    document.addEventListener('mousemove', handleGlobalMouseMove)
    if (dragState.isDragging) {
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState.isDragging, hoveredTimeSlot])

  // Date navigation
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1))
    setCurrentDate(newDate)
  }

  const formatDate = () => {
    return currentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Calculate layout for entries in a time slot (colored bars)
  const getEntryBarLayout = (entry: CalendarEntry, entries: CalendarEntry[]) => {
    const entryIndex = entries.findIndex(e => e.id === entry.id)
    const totalEntries = entries.length

    if (totalEntries === 0) return null

    // Calculate width and position
    const availableWidth = 100 // percentage
    const widthPerEntry = availableWidth / totalEntries
    const leftOffset = entryIndex * widthPerEntry

    return {
      width: `${widthPerEntry}%`,
      left: `${leftOffset}%`,
      height: '100%'
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'R': return 'bg-blue-500'
      case 'P': return 'bg-yellow-500'
      case 'D': return 'bg-purple-500'
      case 'C': return 'bg-green-500'
      case 'F': return 'bg-gray-500'
      case 'X': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  if (!isHydrated) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4] dark:bg-[#0A0A0B]">
      {/* Header */}
      <div className="border-b-2 border-gray-900 dark:border-gray-300 p-4">
        <div className="flex items-center justify-between font-mono">
          <h1 className="text-xl font-bold">{formatDate()}</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateDate('prev')}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              [&lt;]
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-xs"
            >
              TODAY
            </button>
            <button
              onClick={() => navigateDate('next')}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              [&gt;]
            </button>
            <div className="w-px h-6 bg-gray-400 mx-2" />
            <button
              onClick={() => setShowTaskPanel(!showTaskPanel)}
              className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                showTaskPanel
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              [TASKS]
            </button>
            <button
              onClick={generateSOA}
              disabled={isGeneratingSOA}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded text-xs font-mono transition-colors"
            >
              {isGeneratingSOA ? '[GENERATING...]' : '[SOA]'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Task Panel */}
        {showTaskPanel && (
          <div className={`${isMobile ? 'fixed inset-0 z-40 bg-black/50' : 'w-80'}`}>
            <div className={`bg-white dark:bg-gray-900 h-full border-r border-gray-300 dark:border-gray-700 p-4 overflow-y-auto ${
              isMobile ? 'w-80 shadow-xl' : ''
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-mono font-bold">Available Tasks</h2>
                {isMobile && (
                  <button
                    onClick={() => setShowTaskPanel(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-move hover:shadow-md transition-shadow"
                    onMouseDown={(e) => handleMouseDown(e, task, 'task')}
                  >
                    <div className="font-mono font-bold text-sm">
                      {task.display_code || task.base_code || task.code}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {task.title}
                    </div>
                    {(task as any).current_status && (
                      <div className="text-xs text-gray-500 mt-1">
                        Status: {(task as any).current_status}
                      </div>
                    )}
                  </div>
                ))}

                {tasks.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No active tasks found
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Calendar */}
        <div className="flex-1 p-4">
          <div className="relative">
            <div
              ref={calendarRef}
              className="relative bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden"
              onMouseLeave={() => {
                setHoveredTimeSlot(null)
                setHoveredEntry(null)
                setHoveredHour(null)
              }}
            >
              {/* Time grid - empty slots for magnification and drop zones */}
              {generateTimeSlots().map((slot) => (
                <div
                  key={slot.time}
                  className={`relative border-b border-gray-100 dark:border-gray-800 transition-all duration-300 ease-out ${
                    hoveredTimeSlot === slot.time && dragState.isDragging ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  } ${!dragState.isDragging ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''}`}
                  style={{
                    height: `${slot.height}px` // Use dynamic magnified height
                  }}
                  onMouseEnter={() => {
                    if (!dragState.isDragging) {
                      setHoveredTimeSlot(slot.time)
                      setHoveredHour(slot.hour)
                    }
                  }}
                  onClick={() => {
                    if (!dragState.isDragging) {
                      setSelectedTimeSlot(slot.time)
                      setShowTaskSearch(true)
                    }
                  }}
                >
                  {/* Time label - moved to right */}
                  {slot.label && (
                    <div className="absolute right-2 top-1 text-xs font-mono text-gray-500 z-20">
                      {slot.label}
                    </div>
                  )}

                  {/* Quarter hour marker */}
                  <div className="absolute left-2 top-0 w-4 h-px bg-gray-300 dark:bg-gray-600 z-20" />

                  {/* Drop zone indicator */}
                  {hoveredTimeSlot === slot.time && dragState.isDragging && (
                    <div className="absolute inset-x-2 inset-y-1 border-2 border-dashed border-blue-400 dark:border-blue-500 rounded bg-blue-50 dark:bg-blue-900/20 z-10" />
                  )}

                  {/* Empty slot click area */}
                  {!dragState.isDragging && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <div className="text-xs text-gray-400 font-mono">+ Add task</div>
                    </div>
                  )}
                </div>
              ))}

              {/* Continuous task bars positioned absolutely */}
              {getUniqueTaskEntries().map((taskEntry, taskIndex) =>
                taskEntry.spans.map((span, spanIndex) => {
                  const barLayout = getTaskBarLayout(span, taskIndex, getUniqueTaskEntries().length)

                  return (
                    <div
                      key={`${taskEntry.taskCode}-${spanIndex}`}
                      className={`absolute transition-all duration-200 cursor-pointer hover:opacity-80 rounded ${
                        taskEntry.hasMultipleStatuses
                          ? 'bg-gradient-to-r from-blue-500 via-yellow-500 to-green-500' // Multi-status gradient
                          : getStatusColor(taskEntry.primaryEntry.status_code)
                      } ${
                        hoveredEntry?.task_code === taskEntry.taskCode ? 'ring-2 ring-white ring-opacity-50' : ''
                      }`}
                      style={{
                        ...barLayout,
                        zIndex: 30,
                        margin: '2px'
                      }}
                      onMouseEnter={() => {
                        setHoveredEntry(taskEntry.primaryEntry)
                      }}
                      onMouseLeave={() => setHoveredEntry(null)}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setSelectedEntry(span.entries[0]) // Click on first entry in span
                      }}
                    >
                      <div className={`absolute inset-0 flex items-center transition-all duration-200 ${
                        hoveredEntry?.task_code === taskEntry.taskCode
                          ? 'justify-end pr-4' // Move to right when editing/hovered
                          : 'justify-center' // Centered by default
                      }`}>
                        <div className="text-xs text-white text-center">
                          <div className="font-mono font-bold truncate">
                            {formatStatusCode(taskEntry.primaryEntry)}
                          </div>
                          <div className="opacity-90 text-xs">
                            {span.start} - {span.end}
                          </div>
                          {span.entries.length > 1 && (
                            <div className="opacity-75 text-xs">
                              {span.entries.length} entries
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}

              {/* Click hint */}
              {!dragState.isDragging && entries.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
                  <div className="text-center font-mono">
                    <div>Drag tasks from panel to schedule</div>
                    <div className="text-sm mt-1">Or click time slots to search tasks</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Drag Preview */}
      <div
        ref={dragPreviewRef}
        className="fixed z-50 bg-blue-600 text-white px-2 py-1 rounded shadow-lg font-mono text-sm pointer-events-none"
        style={{ display: 'none' }}
      />

      {/* Entry Hover Infographic */}
      {hoveredEntry && (
        <div
          className="fixed z-40 bg-gray-900 text-white p-4 rounded-lg shadow-2xl border border-gray-700 font-mono text-sm max-w-sm"
          style={{
            left: `${mousePosition.x + 15}px`,
            top: `${mousePosition.y + 15}px`,
            pointerEvents: 'none'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className={`w-4 h-4 rounded ${getStatusColor(hoveredEntry.status_code)}`} />
            <div className="font-bold text-yellow-400">
              [{hoveredEntry.status_code}] {hoveredEntry.task_code}
            </div>
          </div>

          {/* Time Info */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Start:</span>
              <span>{hoveredEntry.start_time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">End:</span>
              <span>{hoveredEntry.end_time || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Duration:</span>
              <span>
                {hoveredEntry.end_time
                  ? `${timeToMinutes(hoveredEntry.end_time) - timeToMinutes(hoveredEntry.start_time)} min`
                  : 'Unknown'
                }
              </span>
            </div>
          </div>

          {/* Description */}
          {hoveredEntry.work_description && (
            <div className="mt-3 pt-2 border-t border-gray-700">
              <div className="text-gray-400 text-xs mb-1">Description:</div>
              <div className="text-xs text-gray-200">
                {hoveredEntry.work_description}
              </div>
            </div>
          )}

          {/* Actions hint */}
          <div className="mt-3 pt-2 border-t border-gray-700 text-xs text-gray-500">
            Click to edit
          </div>
        </div>
      )}

      {/* Task Search Modal */}
      {showTaskSearch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-2xl max-h-96 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Schedule task at {selectedTimeSlot} on {currentDate.toLocaleDateString()}
              </div>
              <input
                type="text"
                placeholder="Search existing tasks..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  searchTasks(e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowTaskSearch(false)
                    setSearchQuery('')
                    setSearchResults([])
                  }
                  if (e.key === 'Enter' && searchResults.length > 0) {
                    createEntry(searchResults[0], selectedTimeSlot)
                  }
                }}
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {searchQuery && searchResults.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  No tasks found matching "{searchQuery}"
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {searchResults.map((task, index) => (
                    <button
                      key={task.id}
                      onClick={() => createEntry(task, selectedTimeSlot)}
                      className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="font-mono font-bold">
                        {task.display_code || task.base_code || task.code} - {task.title}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {(task as any).universe_name || 'Unknown'} &gt; {(task as any).phylum_name || 'Unknown'}
                      </div>
                      {index === 0 && (
                        <div className="text-xs text-blue-500 mt-1">Press Enter to select</div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {!searchQuery && (
                <div className="p-4 text-gray-500 text-sm">
                  <p>Type to search for existing tasks to schedule</p>
                  <p className="mt-2">• Search by task title, code, or identifier</p>
                  <p>• Press Enter to select first result</p>
                  <p>• Press ESC to cancel</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => {
                  setShowTaskSearch(false)
                  setSearchQuery('')
                  setSearchResults([])
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entry Details Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-md">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-mono font-bold">Edit Entry</h3>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-mono mb-1">Task Code</label>
                <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-mono">
                  {selectedEntry.task_code}
                </div>
                <div className="text-xs text-gray-500 mt-1">Task code cannot be changed</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-mono mb-1">Start Time</label>
                  <input
                    type="time"
                    value={selectedEntry.start_time}
                    onChange={(e) => setSelectedEntry({...selectedEntry, start_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-mono mb-1">End Time</label>
                  <input
                    type="time"
                    value={selectedEntry.end_time || ''}
                    onChange={(e) => setSelectedEntry({...selectedEntry, end_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-mono mb-1">Description</label>
                <textarea
                  value={selectedEntry.work_description}
                  onChange={(e) => setSelectedEntry({...selectedEntry, work_description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-mono mb-2">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { code: 'R', name: 'Received', color: 'bg-blue-500' },
                    { code: 'P', name: 'Pending', color: 'bg-yellow-500' },
                    { code: 'D', name: 'Delivered', color: 'bg-purple-500' },
                    { code: 'C', name: 'Completed', color: 'bg-green-500' },
                    { code: 'F', name: 'Filed', color: 'bg-gray-500' },
                    { code: 'X', name: 'Cancelled', color: 'bg-red-500' }
                  ].map(status => (
                    <button
                      key={status.code}
                      onClick={() => setSelectedEntry({...selectedEntry, status_code: status.code})}
                      className={`p-2 rounded text-xs font-mono text-white transition-opacity ${
                        status.color
                      } ${selectedEntry.status_code === status.code ? 'opacity-100' : 'opacity-50'}`}
                    >
                      [{status.code}] {status.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <button
                onClick={() => {
                  updateEntry(selectedEntry.id, {
                    status_code: selectedEntry.status_code,
                    work_description: selectedEntry.work_description,
                    start_time: selectedEntry.start_time,
                    end_time: selectedEntry.end_time
                  })
                  setSelectedEntry(null)
                }}
                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors font-mono"
              >
                Save
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this entry?')) {
                    deleteEntry(selectedEntry.id)
                  }
                }}
                className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 transition-colors font-mono"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedEntry(null)}
                className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600 transition-colors font-mono"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOA Modal */}
      {showSOA && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b-2 border-gray-900 dark:border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-mono font-bold">╔═══ STATEMENT OF ACTIVITIES ═══╗</h3>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 font-mono">
                    ║ {formatDate()} ║
                  </div>
                </div>
                <button
                  onClick={() => setShowSOA(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="bg-[#F8F7F4] dark:bg-[#0A0A0B] border-2 border-gray-900 dark:border-gray-300 rounded p-3 sm:p-4 font-mono text-xs sm:text-sm">
                <div className="whitespace-pre-wrap">{soaContent}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 sm:p-6 border-t-2 border-gray-900 dark:border-gray-300 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={downloadSOA}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded hover:bg-green-700 transition-colors font-mono text-xs sm:text-sm"
              >
                [↓ DOWNLOAD .MD]
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(soaContent)
                  alert('SOA copied to clipboard!')
                }}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded hover:bg-blue-700 transition-colors font-mono text-xs sm:text-sm"
              >
                [📋 COPY]
              </button>
              <button
                onClick={() => setShowSOA(false)}
                className="flex-1 bg-gray-500 text-white py-3 px-4 rounded hover:bg-gray-600 transition-colors font-mono text-xs sm:text-sm"
              >
                [✕ CLOSE]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}