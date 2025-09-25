'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Task, Universe, Phylum, Family, Group } from '@/lib/supabase'

interface Status {
  code: string
  name: string
  description: string
}

const STATUSES: Status[] = [
  { code: 'R', name: 'Received', description: 'Task received and acknowledged' },
  { code: 'D', name: 'Delivered', description: 'Task delivered or presented' },
  { code: 'F', name: 'Filed', description: 'Task filed for reference' },
  { code: 'C', name: 'Completed', description: 'Task fully completed' },
  { code: 'P', name: 'Pending', description: 'Task pending external action' },
  { code: 'X', name: 'Cancelled', description: 'Task cancelled' }
]

export default function CreatePage() {
  const router = useRouter()
  const taskNameRef = useRef<HTMLInputElement>(null)
  
  // Data
  const [universes, setUniverses] = useState<Universe[]>([])
  const [phylums, setPhylums] = useState<Phylum[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [recentTasks, setRecentTasks] = useState<Task[]>([])
  
  // Task state
  const [taskName, setTaskName] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null)
  const [selectedUniverse, setSelectedUniverse] = useState<Universe | null>(null)
  const [selectedPhylum, setSelectedPhylum] = useState<Phylum | null>(null)
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [groupNum, setGroupNum] = useState('')
  const [taskNum, setTaskNum] = useState('')
  
  // UI state
  const [focusedField, setFocusedField] = useState<'status' | 'universe' | 'phylum' | 'family' | 'group' | null>('status')
  const [statusCode, setStatusCode] = useState('')
  const [universeCode, setUniverseCode] = useState('')
  const [phylumCode, setPhylumCode] = useState('')
  const [familyCode, setFamilyCode] = useState('')
  const [isExistingTask, setIsExistingTask] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedUniverse) {
      loadPhylums(selectedUniverse.id)
    }
  }, [selectedUniverse])

  useEffect(() => {
    if (selectedPhylum) {
      loadFamilies(selectedPhylum.id)
      if (selectedUniverse) {
        loadGroups(selectedUniverse.id, selectedPhylum.id, selectedFamily?.id)
      }
    }
  }, [selectedPhylum, selectedUniverse, selectedFamily])

  // Keyboard event handler for typing auto-selection
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return // Don't interfere with input fields

      const key = e.key.toUpperCase()

      // Status panel auto-selection
      if ((!selectedStatus || focusedField === 'status')) {
        const status = STATUSES.find(s => s.code === key)
        if (status) {
          setSelectedStatus(status)
          setStatusCode(key)
          setFocusedField('universe')
          return
        }
      }

      // Universe panel auto-selection
      if (selectedStatus && (!selectedUniverse || focusedField === 'universe')) {
        const universe = universes.find(u => u.code === key)
        if (universe) {
          setSelectedUniverse(universe)
          setUniverseCode(key)
          setFocusedField('phylum')
          return
        }
      }

      // Phylum panel auto-selection
      if (selectedUniverse && (!selectedPhylum || focusedField === 'phylum')) {
        const phylum = phylums.find(p => p.code === key)
        if (phylum) {
          setSelectedPhylum(phylum)
          setPhylumCode(key)
          setFocusedField('family')
          return
        }
      }

      // Family panel auto-selection
      if (selectedPhylum && (!selectedFamily || focusedField === 'family')) {
        const family = families.find(f => f.code === key)
        if (family) {
          setSelectedFamily(family)
          setFamilyCode(key)
          setFocusedField('group')
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [selectedStatus, selectedUniverse, selectedPhylum, selectedFamily, focusedField, universes, phylums, families])

  async function loadInitialData() {
    // Load universes
    const { data: universesData } = await supabase
      .from('universes')
      .select('*')
      .order('display_order')
    setUniverses(universesData || [])

    // Load recent tasks
    const { data: tasksData } = await supabase
      .from('task_details')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(10)
    setRecentTasks(tasksData || [])
  }

  async function loadPhylums(universeId: string) {
    const { data } = await supabase
      .from('phyla')
      .select('*')
      .eq('universe_id', universeId)
      .order('display_order')
    setPhylums(data || [])
  }

  async function loadFamilies(phylumId: string) {
    const { data } = await supabase
      .from('families')
      .select('*')
      .eq('phylum_id', phylumId)
      .order('display_order')
    setFamilies(data || [])
  }

  async function loadGroups(universeId: string, phylumId: string, familyId?: string | null) {
    const query = supabase
      .from('groups_with_counts')
      .select('*')
      .eq('universe_id', universeId)
      .eq('phylum_id', phylumId)
    
    if (familyId) {
      query.eq('family_id', familyId)
    } else {
      query.is('family_id', null)
    }
    
    const { data } = await query.order('group_num')
    setGroups(data || [])
  }

  async function createTask() {
    if (!selectedStatus || !selectedUniverse || !selectedPhylum || !groupNum || !taskNum || !taskName) {
      alert('Please complete all required fields')
      return
    }

    const timestamp = new Date()
    const timestampStr = timestamp.toISOString()
      .replace('T', '_')
      .replace(/[-:]/g, '.')
      .substring(0, 16)
    
    const baseCode = `${selectedUniverse.code}${selectedPhylum.code}${selectedFamily?.code || ''}-${groupNum.padStart(2, '0')}.${taskNum.padStart(2, '0')}`.toUpperCase()
    const fullCode = `${selectedStatus.code}-${timestampStr}=${baseCode}`

    try {
      // Create task
      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          code: fullCode,
          base_code: baseCode,
          title: taskName,
          universe_id: selectedUniverse.id,
          phylum_id: selectedPhylum.id,
          family_id: selectedFamily?.id || null,
          group_num: parseInt(groupNum),
          task_num: parseInt(taskNum),
          priority: 3,
          status: 'active',
          task_timestamp: timestamp.toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Create initial entry
      if (task) {
        await supabase.rpc('create_task_entry', {
          p_task_id: task.id,
          p_status_code: selectedStatus.code,
          p_note: 'Initial entry',
          p_entry_timestamp: timestamp.toISOString()
        })

        // Create calendar entry for today with 10-minute duration
        const now = new Date()
        const startTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

        // Calculate end time (10 minutes later)
        const endDate = new Date(now.getTime() + 10 * 60 * 1000)
        const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`

        await supabase
          .from('calendar_entries')
          .insert({
            task_code: baseCode,
            status_code: selectedStatus.code,
            work_description: taskName,
            date: now.toISOString().split('T')[0], // Today's date
            start_time: startTime,
            end_time: endTime,
            is_parallel: false,
            track_number: 1
          })

        // Add to current card
        const { data: currentCard } = await supabase
          .from('cards')
          .select('id')
          .eq('status', 'active')
          .single()

        if (currentCard) {
          await supabase
            .from('task_cards')
            .insert({
              task_id: task.id,
              card_id: currentCard.id
            })
        }

        router.push(`/t/${baseCode.toLowerCase()}`)
      }
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Failed to create task')
    }
  }

  const getFullCode = () => {
    if (!selectedStatus || !selectedUniverse || !selectedPhylum || !groupNum || !taskNum) return ''
    
    const timestamp = new Date().toISOString()
      .replace('T', '_')
      .replace(/[-:]/g, '.')
      .substring(0, 16)
    
    const baseCode = `${selectedUniverse.code}${selectedPhylum.code}${selectedFamily?.code || ''}-${groupNum.padStart(2, '0')}.${taskNum.padStart(2, '0')}`.toUpperCase()
    
    return `${selectedStatus.code}-${timestamp}=${baseCode}`
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4] dark:bg-[#0A0A0B] p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 border-b-2 border-gray-300 dark:border-gray-700 pb-4">
          <h1 className="text-3xl font-mono font-bold text-gray-900 dark:text-gray-100">
            CREATE NEW TASK
          </h1>
          <div className="mt-2 h-1 w-32 bg-gradient-to-r from-yellow-400 to-yellow-500" />
        </div>

        {/* Task Name */}
        <div className="mb-8 bg-[#FFF9C4] dark:bg-[#3D3A2B] p-4 sm:p-6 rounded-lg">
          <div className="flex items-center gap-2 sm:gap-4">
            <input
              ref={taskNameRef}
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="[TASK NAME]"
              className="flex-1 min-w-0 text-lg sm:text-2xl font-mono bg-transparent border-b-2 border-gray-400 dark:border-gray-600 pb-2 focus:outline-none focus:border-blue-600 placeholder-gray-500"
            />
            <button
              onClick={createTask}
              disabled={!selectedStatus || !selectedUniverse || !selectedPhylum || !groupNum || !taskNum || !taskName}
              className="flex-shrink-0 px-3 py-2 sm:px-4 sm:py-2 text-xl sm:text-2xl font-mono font-bold bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              &gt;
            </button>
          </div>
        </div>

        {/* Code Builder */}
        <div className="mb-8 bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-300 dark:border-gray-700">
          <div className="font-mono text-lg mb-4 flex items-center">
            <span className="text-gray-500">[</span>
            <input
              type="text"
              value={statusCode || selectedStatus?.code || ''}
              onChange={(e) => {
                const value = e.target.value.toUpperCase()
                setStatusCode(value)
                if (value) {
                  const status = STATUSES.find(s => s.code === value)
                  if (status) setSelectedStatus(status)
                }
              }}
              onFocus={() => setFocusedField('status')}
              onClick={() => setFocusedField('status')}
              className="w-6 text-purple-600 font-bold bg-transparent border-none focus:outline-none focus:bg-purple-50 dark:focus:bg-purple-900/20 text-center cursor-pointer"
              placeholder="S"
              maxLength={1}
            />
            <span className="text-gray-500">-</span>
            <input
              type="text"
              value={universeCode || selectedUniverse?.code || ''}
              onChange={(e) => {
                const value = e.target.value.toUpperCase()
                setUniverseCode(value)
                if (value) {
                  const universe = universes.find(u => u.code === value)
                  if (universe) setSelectedUniverse(universe)
                }
              }}
              onFocus={() => setFocusedField('universe')}
              onClick={() => setFocusedField('universe')}
              className="w-6 text-blue-600 bg-transparent border-none focus:outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20 text-center cursor-pointer"
              placeholder="U"
              maxLength={1}
            />
            <span className="text-gray-500">/</span>
            <input
              type="text"
              value={phylumCode || selectedPhylum?.code || ''}
              onChange={(e) => {
                const value = e.target.value.toUpperCase()
                setPhylumCode(value)
                if (value) {
                  const phylum = phylums.find(p => p.code === value)
                  if (phylum) setSelectedPhylum(phylum)
                }
              }}
              onFocus={() => setFocusedField('phylum')}
              onClick={() => setFocusedField('phylum')}
              className="w-6 text-blue-600 bg-transparent border-none focus:outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20 text-center cursor-pointer"
              placeholder="P"
              maxLength={1}
            />
            <span className="text-gray-500">/</span>
            <input
              type="text"
              value={familyCode || selectedFamily?.code || ''}
              onChange={(e) => {
                const value = e.target.value.toUpperCase()
                setFamilyCode(value)
                if (value) {
                  const family = families.find(f => f.code === value)
                  if (family) setSelectedFamily(family)
                } else {
                  setSelectedFamily(null)
                }
              }}
              onFocus={() => setFocusedField('family')}
              onClick={() => setFocusedField('family')}
              className="w-6 text-blue-600 bg-transparent border-none focus:outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20 text-center cursor-pointer"
              placeholder="F"
              maxLength={1}
            />
            <span className="text-gray-500">]-</span>
            <input
              type="text"
              value={groupNum}
              onChange={(e) => setGroupNum(e.target.value.replace(/\D/g, '').slice(0, 2))}
              onFocus={() => setFocusedField('group')}
              onClick={() => setFocusedField('group')}
              className="w-8 text-green-600 bg-transparent border-none focus:outline-none focus:bg-green-50 dark:focus:bg-green-900/20 text-center cursor-pointer"
              placeholder="##"
              maxLength={2}
            />
            <span className="text-gray-500">.</span>
            <input
              type="text"
              value={taskNum}
              onChange={(e) => setTaskNum(e.target.value.replace(/\D/g, '').slice(0, 2))}
              className="w-8 text-green-600 bg-transparent border-none focus:outline-none focus:bg-green-50 dark:focus:bg-green-900/20 text-center"
              placeholder="##"
              maxLength={2}
            />
          </div>
          
          {selectedStatus && selectedUniverse && selectedPhylum && groupNum && taskNum && (
            <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Status prefix: {selectedStatus.code}-{new Date().toISOString().replace('T', '_').replace(/[-:]/g, '.').substring(0, 16)}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Core code: {`${selectedUniverse.code}${selectedPhylum.code}${selectedFamily?.code || ''}-${groupNum.padStart(2, '0')}.${taskNum.padStart(2, '0')}`.toUpperCase()}</div>
              <div className="text-sm font-mono font-bold">{getFullCode()}</div>
            </div>
          )}
        </div>

        {/* Contextual Panels */}
        {/* Status Panel */}
        {(!selectedStatus || focusedField === 'status') && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-900 rounded-lg border-2 border-purple-500">
            <h3 className="font-mono font-bold mb-4">Select Status:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {STATUSES.map((status) => (
                <button
                  key={status.code}
                  onClick={() => {
                    setSelectedStatus(status)
                    setStatusCode(status.code)
                    setFocusedField('universe')
                  }}
                  className={`p-4 rounded-lg border-2 transition-all hover:scale-105 font-mono ${
                    selectedStatus?.code === status.code
                      ? 'bg-purple-100 dark:bg-purple-900 border-purple-600'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:border-purple-400'
                  }`}
                >
                  <div className="text-xl font-bold text-purple-600 dark:text-purple-400">[{status.code}]</div>
                  <div className="text-sm mt-1">{status.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Universe Panel */}
        {selectedStatus && (!selectedUniverse || focusedField === 'universe') && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-900 rounded-lg border-2 border-blue-500">
            <h3 className="font-mono font-bold mb-4">Select Universe:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {universes.map((universe) => (
                <button
                  key={universe.id}
                  onClick={() => {
                    setSelectedUniverse(universe)
                    setUniverseCode(universe.code)
                    setFocusedField('phylum')
                  }}
                  className={`p-4 rounded-lg border-2 transition-all hover:scale-105 font-mono ${
                    selectedUniverse?.id === universe.id
                      ? 'bg-blue-100 dark:bg-blue-900 border-blue-600'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:border-blue-400'
                  }`}
                >
                  <div className="text-xl font-bold">{universe.code}</div>
                  <div className="text-sm mt-1">({universe.name})</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Phylum Panel */}
        {selectedUniverse && (!selectedPhylum || focusedField === 'phylum') && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-900 rounded-lg border-2 border-blue-500">
            <h3 className="font-mono font-bold mb-4">Select Phylum:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {phylums.map((phylum) => (
                <button
                  key={phylum.id}
                  onClick={() => {
                    setSelectedPhylum(phylum)
                    setPhylumCode(phylum.code)
                    setFocusedField('family')
                  }}
                  className={`p-4 rounded-lg border-2 transition-all hover:scale-105 font-mono ${
                    selectedPhylum?.id === phylum.id
                      ? 'bg-blue-100 dark:bg-blue-900 border-blue-600'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:border-blue-400'
                  }`}
                >
                  <div className="text-xl font-bold">{phylum.code}</div>
                  <div className="text-sm mt-1">({phylum.name})</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Family Panel (Optional) */}
        {selectedPhylum && (!selectedFamily || focusedField === 'family') && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-900 rounded-lg border-2 border-yellow-500">
            <h3 className="font-mono font-bold mb-4">Select Family (Optional):</h3>
            <button
              onClick={() => {
                setSelectedFamily(null)
                setFamilyCode('')
                setFocusedField('group')
              }}
              className="w-full mb-3 p-3 text-left font-mono text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700"
            >
              → Skip to Group (no family)
            </button>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {families.map((family) => (
                <button
                  key={family.id}
                  onClick={() => {
                    setSelectedFamily(family)
                    setFamilyCode(family.code)
                    setFocusedField('group')
                  }}
                  className={`p-4 rounded-lg border-2 transition-all hover:scale-105 font-mono ${
                    selectedFamily?.id === family.id
                      ? 'bg-yellow-100 dark:bg-yellow-900 border-yellow-600'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:border-yellow-400'
                  }`}
                >
                  <div className="text-xl font-bold">{family.code}</div>
                  <div className="text-sm mt-1">({family.name})</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Group Panel */}
        {selectedPhylum && (!groupNum || focusedField === 'group') && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-900 rounded-lg border-2 border-green-500">
            <h3 className="font-mono font-bold mb-4">Select or Create Group:</h3>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {groups.map((group) => (
                <button
                  key={`${group.group_num}`}
                  onClick={() => {
                    setSelectedGroup(group)
                    setGroupNum(String(group.group_num).padStart(2, '0'))
                    setFocusedField(null)
                  }}
                  className={`p-3 rounded-lg border-2 transition-all hover:scale-105 font-mono ${
                    selectedGroup?.group_num === group.group_num
                      ? 'bg-green-100 dark:bg-green-900 border-green-600'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:border-green-400'
                  }`}
                >
                  <div className="text-lg font-bold">{String(group.group_num).padStart(2, '0')}</div>
                  <div className="text-xs truncate">{group.name}</div>
                  <div className="text-xs text-gray-500">{group.task_count || 0} tasks</div>
                </button>
              ))}
              <button
                onClick={() => {
                  const nextGroup = Math.max(...groups.map(g => g.group_num), -1) + 1
                  setGroupNum(String(nextGroup).padStart(2, '0'))
                  setFocusedField(null)
                }}
                className="p-3 rounded-lg border-2 border-dashed border-gray-400 hover:border-green-400 transition-all font-mono"
              >
                <div className="text-2xl text-gray-400">+</div>
                <div className="text-xs">New</div>
              </button>
            </div>
          </div>
        )}

        {/* Task Number Panel */}
        {groupNum && !taskNum && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-900 rounded-lg border-2 border-green-500">
            <h3 className="font-mono font-bold mb-4">Enter Task Number:</h3>
            <input
              type="text"
              value={taskNum}
              onChange={(e) => setTaskNum(e.target.value.replace(/\D/g, '').slice(0, 2))}
              placeholder="##"
              className="w-24 px-4 py-3 text-xl font-mono text-center bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-green-500"
              maxLength={2}
            />
            {taskNum.length === 2 && (
              <button
                onClick={createTask}
                className="ml-4 px-6 py-3 bg-green-600 text-white font-mono rounded-lg hover:bg-green-700 transition-colors"
              >
                CREATE TASK
              </button>
            )}
          </div>
        )}

        {/* Recent Tasks */}
        <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h3 className="font-mono font-bold mb-3">Recent Tasks:</h3>
          <div className="space-y-2">
            {recentTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                onClick={() => router.push(`/t/${task.base_code?.toLowerCase()}`)}
                className="flex items-center p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer font-mono text-sm"
              >
                <span className="text-gray-500">&gt;</span>
                <span className="ml-2 font-bold">{task.base_code}</span>
                <span className="ml-3 text-gray-600 dark:text-gray-400">&quot;{task.title}&quot;</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
