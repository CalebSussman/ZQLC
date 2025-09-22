'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type ViewMode = 'day' | 'week' | 'month'

interface LogEntry {
  id: string
  task_code: string
  status_code: string
  work_description: string
  date: string
  start_time: string
  end_time?: string
  is_parallel: boolean
  track_number: number
}

interface Card {
  card_number: string
  start_date: string
  end_date?: string
  status: string
}

export default function LogPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [showAddEntry, setShowAddEntry] = useState(false)
  
  // New entry form state
  const [newTaskCode, setNewTaskCode] = useState('')
  const [newStatusCode, setNewStatusCode] = useState('P')
  const [newDescription, setNewDescription] = useState('')
  const [newStartTime, setNewStartTime] = useState('')

  useEffect(() => {
  loadEntries()
  if (viewMode === 'month') {
    loadCards()
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [currentDate, viewMode])

  async function loadEntries() {
    let startDate: Date
    let endDate: Date

    if (viewMode === 'day') {
      startDate = new Date(currentDate)
      endDate = new Date(currentDate)
    } else if (viewMode === 'week') {
      startDate = new Date(currentDate)
      startDate.setDate(startDate.getDate() - startDate.getDay())
      endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 6)
    } else {
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    }

    const { data } = await supabase
      .from('calendar_entries')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date')
      .order('start_time')

    setEntries(data || [])
  }

  async function loadCards() {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const { data } = await supabase
      .from('cards')
      .select('*')
      .or(`start_date.gte.${year}-${String(month + 1).padStart(2, '0')}-01,end_date.lte.${year}-${String(month + 1).padStart(2, '0')}-31`)
      .order('start_date')

    setCards(data || [])
  }

  async function addEntry() {
    if (!newTaskCode || !newStartTime) {
      alert('Task code and start time are required')
      return
    }

    await supabase
      .from('calendar_entries')
      .insert({
        task_code: newTaskCode.toUpperCase(),
        status_code: newStatusCode,
        work_description: newDescription,
        date: currentDate.toISOString().split('T')[0],
        start_time: newStartTime,
        is_parallel: false,
        track_number: 1
      })

    loadEntries()
    setShowAddEntry(false)
    setNewTaskCode('')
    setNewDescription('')
    setNewStartTime('')
  }

  function navigate(direction: 'prev' | 'next') {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    }
    setCurrentDate(newDate)
  }

  const formatDate = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
      }).toUpperCase()
    } else if (viewMode === 'week') {
      const weekStart = new Date(currentDate)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      return `WEEK ${Math.ceil((weekStart.getDate() + 6) / 7)}: ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}-${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}`
    } else {
      return currentDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      }).toUpperCase()
    }
  }

  // Day View Component
  const DayView = () => {
    const hours = Array.from({ length: 16 }, (_, i) => i + 7) // 7 AM to 10 PM

    return (
      <div className="space-y-2 font-mono">
        {hours.map((hour) => {
          const hourStr = String(hour).padStart(2, '0')
          const quarters = ['00', '15', '30', '45']
          
          return quarters.map((quarter) => {
            const timeStr = `${hourStr}:${quarter}`
            const entry = entries.find(e => e.start_time.startsWith(timeStr))
            const isBreak = hour === 9 || hour === 10 || hour === 12
            
            return (
              <div key={timeStr} className="flex">
                <div className="w-20 text-gray-500">{timeStr}</div>
                <div className="flex-1">
                  {isBreak && quarter === '00' ? (
                    <div className="h-px bg-gradient-to-r from-yellow-400 to-yellow-500" />
                  ) : entry ? (
                    <div className={`p-2 rounded ${
                      entry.status_code === 'P' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                      entry.status_code === 'C' ? 'bg-green-100 dark:bg-green-900/20' :
                      'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      {entry.status_code === 'R' || entry.status_code === 'D' ? (
                        <span className="text-sm">
                          • {entry.start_time} {entry.task_code} [{entry.status_code}] {entry.work_description}
                        </span>
                      ) : (
                        <div className="flex items-center">
                          <span className="text-2xl mr-2">
                            {entry.status_code === 'P' ? '███' : '▓▓▓'}
                          </span>
                          <span>
                            {entry.task_code} [{entry.status_code}]: {entry.work_description}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-px bg-gray-300 dark:bg-gray-700" />
                  )}
                </div>
              </div>
            )
          })
        }).flat()}
      </div>
    )
  }

  // Week View Component
  const WeekView = () => {
    const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    const hours = Array.from({ length: 10 }, (_, i) => i + 8) // 8 AM to 5 PM

    return (
      <div className="font-mono">
        <div className="grid grid-cols-8 gap-2 mb-4">
          <div></div>
          {weekDays.map((day, index) => {
            const date = new Date(currentDate)
            date.setDate(date.getDate() - date.getDay() + index + 1)
            return (
              <div key={day} className="text-center font-bold">
                {day}<br />
                {date.getDate()}
              </div>
            )
          })}
        </div>
        
        <div className="border-t-2 border-gray-400 dark:border-gray-600 pt-2">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 gap-2 mb-2">
              <div className="text-right pr-2">{String(hour).padStart(2, '0')}</div>
              {weekDays.map((_, dayIndex) => {
                const hasEntry = entries.some(e => {
                  const entryHour = parseInt(e.start_time.split(':')[0])
                  const entryDay = new Date(e.date).getDay()
                  return entryHour === hour && entryDay === dayIndex + 1
                })
                
                return (
                  <div key={dayIndex} className="h-8 flex items-center justify-center">
                    {hasEntry ? (
                      <span className="text-2xl">███</span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-700">░░░</span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Month View Component
  const MonthView = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPadding = firstDay.getDay()
    const totalDays = lastDay.getDate()
    
    const weeks = Math.ceil((totalDays + startPadding) / 7)
    
    return (
      <div className="font-mono">
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
            <div key={day} className="text-center font-bold p-2">{day}</div>
          ))}
        </div>
        
        {Array.from({ length: weeks }, (_, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-2 mb-2">
            {Array.from({ length: 7 }, (_, dayIndex) => {
              const dayNumber = weekIndex * 7 + dayIndex - startPadding + 1
              
              if (dayNumber < 1 || dayNumber > totalDays) {
                return <div key={dayIndex} className="p-4"></div>
              }
              
              const dayCard = cards.find(c => {
                const start = new Date(c.start_date).getDate()
                const end = c.end_date ? new Date(c.end_date).getDate() : null
                
                return start === dayNumber || end === dayNumber
              })
              
              const hasActivity = entries.some(e => 
                new Date(e.date).getDate() === dayNumber
              )
              
              return (
                <div 
                  key={dayIndex}
                  className="p-2 border border-gray-300 dark:border-gray-700 rounded text-center"
                >
                  <div className="font-bold">{dayNumber}</div>
                  {dayCard?.start_date && new Date(dayCard.start_date).getDate() === dayNumber && (
                    <div className="text-xs">[</div>
                  )}
                  {dayCard?.end_date && new Date(dayCard.end_date).getDate() === dayNumber && (
                    <div className="text-xs">]</div>
                  )}
                  <div className="mt-1">
                    {hasActivity ? '███' : dayNumber < new Date().getDate() ? '░░░' : '???'}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        
        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded">
          <div className="text-sm">
            [ = Start ] = Filed ███ = High ░░░ = Low
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4] dark:bg-[#0A0A0B] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 pb-6 border-b-4 border-gray-900 dark:border-gray-300">
          <div className="flex items-center justify-between font-mono">
            <h1 className="text-3xl font-bold">{formatDate()}</h1>
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate('prev')} className="text-2xl">[&lt;]</button>
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded"
              >
                TODAY
              </button>
              <button onClick={() => navigate('next')} className="text-2xl">[&gt;]</button>
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded"
                onClick={() => {
                  // Generate summary
                  alert(`Generating ${viewMode === 'day' ? 'SOA' : viewMode === 'week' ? 'SOWA' : 'SOMA'}...`)
                }}
              >
                [{viewMode === 'day' ? 'SOA' : viewMode === 'week' ? 'SOWA' : 'SOMA'}]
              </button>
            </div>
          </div>
          
          <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500" style={{ width: '60%' }} />
          </div>
        </div>

        {/* View Content */}
        <div className="mb-8">
          {viewMode === 'day' && <DayView />}
          {viewMode === 'week' && <WeekView />}
          {viewMode === 'month' && <MonthView />}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 font-mono">
          {viewMode === 'day' && (
            <button
              onClick={() => setShowAddEntry(!showAddEntry)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              [+ ADD ENTRY]
            </button>
          )}
          <button
            onClick={() => setViewMode('day')}
            className={`px-4 py-2 rounded ${viewMode === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            [DAY VIEW]
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 rounded ${viewMode === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            [WEEK VIEW]
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 rounded ${viewMode === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            [MONTH VIEW]
          </button>
        </div>

        {/* Add Entry Form */}
        {showAddEntry && (
          <div className="mt-8 p-4 bg-white dark:bg-gray-900 rounded-lg border-2 border-green-500">
            <h3 className="font-mono font-bold mb-4">ADD ENTRY (TASK CODE REQUIRED)</h3>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="TASK CODE (e.g., WDA-12.03)"
                value={newTaskCode}
                onChange={(e) => setNewTaskCode(e.target.value.toUpperCase())}
                className="px-3 py-2 font-mono bg-gray-50 dark:bg-gray-800 border rounded"
              />
              <select
                value={newStatusCode}
                onChange={(e) => setNewStatusCode(e.target.value)}
                className="px-3 py-2 font-mono bg-gray-50 dark:bg-gray-800 border rounded"
              >
                <option value="R">R - Received</option>
                <option value="P">P - Pending</option>
                <option value="D">D - Delivered</option>
                <option value="C">C - Completed</option>
              </select>
              <input
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                className="px-3 py-2 font-mono bg-gray-50 dark:bg-gray-800 border rounded"
              />
              <input
                type="text"
                placeholder="Description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="px-3 py-2 font-mono bg-gray-50 dark:bg-gray-800 border rounded"
              />
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowAddEntry(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={addEntry}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Add Entry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
