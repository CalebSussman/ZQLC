'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Card {
  id: string
  card_number: string
  start_date: string
  end_date?: string
  status: 'active' | 'filed'
  filing_task_id?: string
  total_tasks?: number
  completed_tasks?: number
  pending_tasks?: number
}

interface CardTask {
  id: string
  task_id: string
  card_id: string
  position: number
  base_code: string
  title: string
  current_status: string
  status_name: string
  priority: number
}

export default function TodoPage() {
  const router = useRouter()
  const [currentCard, setCurrentCard] = useState<Card | null>(null)
  const [cardTasks, setCardTasks] = useState<CardTask[]>([])
  const [filingTask, setFilingTask] = useState<CardTask | null>(null)
  const [archivedCards, setArchivedCards] = useState<Card[]>([])
  const [showArchive, setShowArchive] = useState(false)
  const [dayCount, setDayCount] = useState(0)

  useEffect(() => {
    loadCurrentCard()
    loadArchivedCards()
  }, [])

  useEffect(() => {
    if (currentCard) {
      loadCardTasks()
      calculateDayCount()
    }
  }, [currentCard])

  async function loadCurrentCard() {
    const { data } = await supabase
      .from('current_card')
      .select('*')
      .single()
    
    setCurrentCard(data)
  }

  async function loadCardTasks() {
    if (!currentCard) return

    const { data } = await supabase
      .from('card_task_details')
      .select('*')
      .eq('card_id', currentCard.id)
      .order('position')
    
    if (data) {
      // Separate filing task from regular tasks
      const filing = data.find(t => 
        t.base_code.startsWith('CCA-01.') && 
        t.title.toLowerCase().includes('file')
      )
      const regular = data.filter(t => t !== filing)
      
      setFilingTask(filing || null)
      setCardTasks(regular)
    }
  }

  async function loadArchivedCards() {
    const { data } = await supabase
      .from('cards')
      .select('*')
      .eq('status', 'filed')
      .order('end_date', { ascending: false })
      .limit(10)
    
    setArchivedCards(data || [])
  }

  function calculateDayCount() {
    if (!currentCard) return
    const start = new Date(currentCard.start_date)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    setDayCount(diffDays)
  }

  async function toggleTaskStatus(task: CardTask) {
    const statusOrder = ['R', 'P', 'D', 'F', 'C', 'X']
    const currentIndex = statusOrder.indexOf(task.current_status)
    const nextIndex = (currentIndex + 1) % statusOrder.length
    const nextStatus = statusOrder[nextIndex]

    await supabase.rpc('create_task_entry', {
      p_task_id: task.task_id,
      p_status_code: nextStatus,
      p_note: 'Status changed via todo',
      p_entry_timestamp: new Date().toISOString()
    })

    loadCardTasks()
  }

  async function fileCard() {
    if (!currentCard || !filingTask) return

    // Mark filing task as completed
    await supabase.rpc('create_task_entry', {
      p_task_id: filingTask.task_id,
      p_status_code: 'C',
      p_note: `Filed ${currentCard.card_number}`,
      p_entry_timestamp: new Date().toISOString()
    })

    // File the card (this creates the next card automatically)
    await supabase.rpc('file_card', {
      p_card_id: currentCard.id,
      p_filing_task_id: filingTask.task_id
    })

    // Reload everything
    loadCurrentCard()
    loadArchivedCards()
  }

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'C': return '■'
      case 'X': return '■'
      default: return '□'
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'R': return 'text-blue-600'
      case 'P': return 'text-yellow-600'
      case 'D': return 'text-green-600'
      case 'F': return 'text-gray-600'
      case 'C': return 'text-gray-400 line-through'
      case 'X': return 'text-red-400 line-through'
      default: return ''
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4] dark:bg-[#0A0A0B] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Card Header */}
        <div className="mb-8 pb-6 border-b-4 border-gray-900 dark:border-gray-300">
          <div className="flex items-baseline justify-between">
            <h1 className="text-4xl font-mono font-bold">
              ATOL-{currentCard?.card_number || '...'}
            </h1>
            <div className="text-sm font-mono text-gray-600 dark:text-gray-400">
              STARTED {currentCard?.start_date} | DAY {dayCount}
            </div>
          </div>
          <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded">
            <div 
              className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded"
              style={{ width: `${currentCard?.completed_tasks && currentCard?.total_tasks ? (currentCard.completed_tasks / currentCard.total_tasks * 100) : 0}%` }}
            />
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-3 mb-8">
          {cardTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => toggleTaskStatus(task)}
              className={`p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700 hover:shadow-lg transition-all cursor-pointer font-mono ${
                getStatusColor(task.current_status)
              }`}
            >
              <div className="flex items-start">
                <span className="text-2xl mr-3">{getStatusIcon(task.current_status)}</span>
                <div className="flex-1">
                  <div className="flex items-baseline">
                    <span className="font-bold text-lg mr-2">[{task.current_status}]</span>
                    <span className="font-bold mr-3">{task.base_code}</span>
                    <span className="text-gray-600 dark:text-gray-400">&quot;{task.title}&quot;</span>
                  </div>
                  {task.current_status === 'C' && (
                    <div className="text-xs text-gray-500 mt-1">(completed)</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Statistics */}
        <div className="mb-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-center">
          <div className="border-t border-b border-gray-400 dark:border-gray-600 py-2">
            {currentCard?.total_tasks || 0} TASKS | {currentCard?.completed_tasks || 0} COMPLETE | {currentCard?.pending_tasks || 0} PENDING
          </div>
        </div>

        {/* Filing Box */}
        {filingTask && (
          <div className="mb-8 p-6 bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border-4 border-double border-purple-600">
            <div className="font-mono text-center">
              <div className="text-xl font-bold mb-2">
                {filingTask.base_code}: FILE ATOL-{currentCard?.card_number} → {
                  // Calculate next roman numeral
                  currentCard?.card_number === 'XVI' ? 'XVII' :
                  currentCard?.card_number === 'XVII' ? 'XVIII' :
                  currentCard?.card_number === 'XVIII' ? 'XIX' :
                  currentCard?.card_number === 'XIX' ? 'XX' :
                  'XXI'
                }
              </div>
              <button
                onClick={fileCard}
                className="px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors"
              >
                [COMPLETE FILING]
              </button>
            </div>
          </div>
        )}

        {/* Archive Navigation */}
        <div className="flex justify-between items-center font-mono">
          <button
            onClick={() => {
              const prevCardNum = parseInt(currentCard?.card_number || '0') - 1
              if (prevCardNum > 0) {
                // Navigate to previous card
              }
            }}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            [&lt;] ATOL-{
              currentCard?.card_number === 'XVII' ? 'XVI' :
              currentCard?.card_number === 'XVIII' ? 'XVII' :
              'XV'
            }
          </button>
          
          <button
            onClick={() => setShowArchive(!showArchive)}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            [ARCHIVES]
          </button>
        </div>

        {/* Archive View */}
        {showArchive && (
          <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h3 className="font-mono font-bold mb-4">Filed Cards:</h3>
            <div className="space-y-2">
              {archivedCards.map((card) => (
                <div key={card.id} className="font-mono text-sm">
                  <span className="font-bold">ATOL-{card.card_number}</span>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">
                    {card.start_date} → {card.end_date}
                  </span>
                  <span className="ml-3 text-gray-500">
                    ({card.total_tasks} tasks)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
