'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Task, Universe, Phylum, Family } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Data
  const [universes, setUniverses] = useState<Universe[]>([])
  const [phylums, setPhylums] = useState<Phylum[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [recentTasks, setRecentTasks] = useState<Task[]>([])
  
  // Task creation state
  const [taskName, setTaskName] = useState('')
  const [taskCode, setTaskCode] = useState('')
  const [selectedUniverse, setSelectedUniverse] = useState<Universe | null>(null)
  const [selectedPhylum, setSelectedPhylum] = useState<Phylum | null>(null)
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null)
  const [groupNum, setGroupNum] = useState('##')
  const [taskNum, setTaskNum] = useState('##')
  
  // UI state
  const [focusedField, setFocusedField] = useState<string>('')
  const [showCreateUniverse, setShowCreateUniverse] = useState(false)
  const [showCreatePhylum, setShowCreatePhylum] = useState(false)
  const [showCreateFamily, setShowCreateFamily] = useState(false)
  const [newUniverseName, setNewUniverseName] = useState('')
  const [newPhylumName, setNewPhylumName] = useState('')
  const [newFamilyName, setNewFamilyName] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    // Update filtered data when selections change
    if (selectedUniverse) {
      loadPhylums(selectedUniverse.id)
    } else {
      setPhylums([])
      setSelectedPhylum(null)
    }
  }, [selectedUniverse])

  useEffect(() => {
    if (selectedPhylum) {
      loadFamilies(selectedPhylum.id)
    } else {
      setFamilies([])
      setSelectedFamily(null)
    }
  }, [selectedPhylum])

  useEffect(() => {
    // Generate next group/task numbers when universe and phylum are selected
    if (selectedUniverse && selectedPhylum) {
      generateNextNumbers()
    }
  }, [selectedUniverse, selectedPhylum])

  async function loadData() {
    // Load universes
    const { data: universesData } = await supabase
      .from('universes')
      .select('*')
      .order('name')
    setUniverses(universesData || [])

    // Load recent tasks
    const { data: tasksData } = await supabase
      .from('task_details')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(5)
    setRecentTasks(tasksData || [])
  }

  async function loadPhylums(universeId: string) {
    const { data } = await supabase
      .from('phyla')
      .select('*')
      .eq('universe_id', universeId)
      .order('name')
    setPhylums(data || [])
  }

  async function loadFamilies(phylumId: string) {
    const { data } = await supabase
      .from('families')
      .select('*')
      .eq('phylum_id', phylumId)
      .order('name')
    setFamilies(data || [])
  }

  async function generateNextNumbers() {
    if (!selectedUniverse || !selectedPhylum) return

    const { data } = await supabase
      .from('tasks')
      .select('group_num, task_num')
      .eq('universe_id', selectedUniverse.id)
      .eq('phylum_id', selectedPhylum.id)
      .order('group_num', { ascending: false })
      .order('task_num', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const lastTask = data[0]
      if (lastTask.task_num >= 99) {
        setGroupNum(String(lastTask.group_num + 1).padStart(2, '0'))
        setTaskNum('01')
      } else {
        setGroupNum(String(lastTask.group_num).padStart(2, '0'))
        setTaskNum(String(lastTask.task_num + 1).padStart(2, '0'))
      }
    } else {
      setGroupNum('01')
      setTaskNum('01')
    }
  }

  async function createUniverse() {
    if (!newUniverseName) return
    
    const code = newUniverseName.substring(0, 3).toLowerCase()
    const { data } = await supabase
      .from('universes')
      .insert({
        code,
        name: newUniverseName,
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
      })
      .select()
      .single()
    
    if (data) {
      setUniverses([...universes, data])
      setSelectedUniverse(data)
      setNewUniverseName('')
      setShowCreateUniverse(false)
    }
  }

  async function createPhylum() {
    if (!newPhylumName || !selectedUniverse) return
    
    const code = newPhylumName.substring(0, 3).toLowerCase()
    const { data } = await supabase
      .from('phyla')
      .insert({
        universe_id: selectedUniverse.id,
        code,
        name: newPhylumName
      })
      .select()
      .single()
    
    if (data) {
      setPhylums([...phylums, data])
      setSelectedPhylum(data)
      setNewPhylumName('')
      setShowCreatePhylum(false)
    }
  }

  async function createFamily() {
    if (!newFamilyName || !selectedPhylum) return
    
    const code = newFamilyName.substring(0, 3).toLowerCase()
    const { data } = await supabase
      .from('families')
      .insert({
        phylum_id: selectedPhylum.id,
        code,
        name: newFamilyName
      })
      .select()
      .single()
    
    if (data) {
      setFamilies([...families, data])
      setSelectedFamily(data)
      setNewFamilyName('')
      setShowCreateFamily(false)
    }
  }

  async function createTask() {
    if (!taskName || !selectedUniverse || !selectedPhylum || groupNum === '##' || taskNum === '##') {
      return
    }

    const code = `${selectedUniverse.code}${selectedPhylum.code}${selectedFamily?.code || ''}-${groupNum}${taskNum}`.toLowerCase()

    const { data: task } = await supabase
      .from('tasks')
      .insert({
        code,
        title: taskName,
        universe_id: selectedUniverse.id,
        phylum_id: selectedPhylum.id,
        family_id: selectedFamily?.id || null,
        group_num: parseInt(groupNum),
        task_num: parseInt(taskNum),
        priority: 3,
        status: 'active'
      })
      .select()
      .single()

    if (task) {
      router.push(`/t/${code}`)
    }
  }

  function getDisplayCode() {
    const u = selectedUniverse?.code.toUpperCase() || 'U'
    const p = selectedPhylum?.code.toUpperCase() || 'P'
    const f = selectedFamily?.code.toUpperCase() || ''
    return `${u}${f ? '/' : ''}${p}${f ? '/' : ''}${f}${f ? '' : ''}-${groupNum}.${taskNum}`
  }

  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\//g, '.').replace(', ', ':').replace(/:/g, '.', 2)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex h-screen">
        {/* Left Sidebar */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6">
          <h1 className="text-3xl font-bold mb-8">ATOL</h1>
          
          <nav className="space-y-2">
            <button className="w-full text-left px-4 py-2 rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
              Dashboard
            </button>
            <button 
              onClick={() => router.push('/categories')}
              className="w-full text-left px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Categories
            </button>
            <button className="w-full text-left px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
              To-do
            </button>
            <button className="w-full text-left px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
              Calendar
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Create New Section */}
          <div className="bg-yellow-100 dark:bg-yellow-900/20 rounded-lg p-8 mb-8">
            <h2 className="text-4xl font-bold mb-6">Create new</h2>
            
            {/* Task Name Input */}
            <input
              ref={inputRef}
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="[TASK NAME]"
              className="w-full text-2xl bg-transparent border-b-2 border-gray-400 pb-2 mb-6 focus:outline-none focus:border-blue-600"
            />

            {/* Task Code Builder */}
            <div className="text-3xl font-mono mb-4">
              <span className="text-gray-500">[</span>
              
              {/* Universe selector */}
              <span 
                className={`cursor-pointer px-1 ${selectedUniverse ? 'text-blue-600' : 'text-gray-400'} hover:bg-gray-200 dark:hover:bg-gray-700 rounded`}
                onClick={() => setFocusedField('universe')}
              >
                {selectedUniverse ? selectedUniverse.code.toUpperCase() : 'U'}
              </span>
              
              <span className="text-gray-500">/</span>
              
              {/* Phylum selector */}
              <span 
                className={`cursor-pointer px-1 ${selectedPhylum ? 'text-blue-600' : 'text-gray-400'} hover:bg-gray-200 dark:hover:bg-gray-700 rounded`}
                onClick={() => setFocusedField('phylum')}
              >
                {selectedPhylum ? selectedPhylum.code.toUpperCase() : 'P'}
              </span>
              
              <span className="text-gray-500">/</span>
              
              {/* Family selector */}
              <span 
                className={`cursor-pointer px-1 ${selectedFamily ? 'text-blue-600' : 'text-gray-400'} hover:bg-gray-200 dark:hover:bg-gray-700 rounded`}
                onClick={() => setFocusedField('family')}
              >
                {selectedFamily ? selectedFamily.code.toUpperCase() : 'F'}
              </span>
              
              <span className="text-gray-500">]-</span>
              
              {/* Group number */}
              <input
                type="text"
                value={groupNum}
                onChange={(e) => setGroupNum(e.target.value.replace(/\D/g, '').slice(0, 2).padStart(2, '0'))}
                className="w-16 text-center bg-transparent border-b border-gray-400 focus:outline-none focus:border-blue-600"
                placeholder="##"
              />
              
              <span className="text-gray-500">.</span>
              
              {/* Task number */}
              <input
                type="text"
                value={taskNum}
                onChange={(e) => setTaskNum(e.target.value.replace(/\D/g, '').slice(0, 2).padStart(2, '0'))}
                className="w-16 text-center bg-transparent border-b border-gray-400 focus:outline-none focus:border-blue-600"
                placeholder="##"
              />
            </div>

            <div className="text-gray-500 mb-6">{timestamp}</div>

            {/* Selector Dropdowns */}
            {focusedField === 'universe' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
                <h3 className="font-semibold mb-2">Select Universe:</h3>
                <div className="space-y-1">
                  {universes.map((universe) => (
                    <button
                      key={universe.id}
                      onClick={() => {
                        setSelectedUniverse(universe)
                        setFocusedField('phylum')
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <span className="font-mono">{universe.code.toUpperCase()}</span> - {universe.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowCreateUniverse(true)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded text-blue-600"
                  >
                    + Create new Universe
                  </button>
                </div>
                
                {showCreateUniverse && (
                  <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                    <input
                      type="text"
                      value={newUniverseName}
                      onChange={(e) => setNewUniverseName(e.target.value)}
                      placeholder="New universe name"
                      className="w-full px-2 py-1 border rounded"
                      onKeyDown={(e) => e.key === 'Enter' && createUniverse()}
                    />
                  </div>
                )}
              </div>
            )}

            {focusedField === 'phylum' && selectedUniverse && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
                <h3 className="font-semibold mb-2">Select Phylum:</h3>
                <div className="space-y-1">
                  {phylums.map((phylum) => (
                    <button
                      key={phylum.id}
                      onClick={() => {
                        setSelectedPhylum(phylum)
                        setFocusedField('family')
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <span className="font-mono">{phylum.code.toUpperCase()}</span> - {phylum.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowCreatePhylum(true)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded text-blue-600"
                  >
                    + Create new Phylum
                  </button>
                </div>
                
                {showCreatePhylum && (
                  <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                    <input
                      type="text"
                      value={newPhylumName}
                      onChange={(e) => setNewPhylumName(e.target.value)}
                      placeholder="New phylum name"
                      className="w-full px-2 py-1 border rounded"
                      onKeyDown={(e) => e.key === 'Enter' && createPhylum()}
                    />
                  </div>
                )}
              </div>
            )}

            {focusedField === 'family' && selectedPhylum && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
                <h3 className="font-semibold mb-2">Select Family (Optional):</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setSelectedFamily(null)
                      setFocusedField('')
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500"
                  >
                    (No family)
                  </button>
                  {families.map((family) => (
                    <button
                      key={family.id}
                      onClick={() => {
                        setSelectedFamily(family)
                        setFocusedField('')
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <span className="font-mono">{family.code.toUpperCase()}</span> - {family.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowCreateFamily(true)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded text-blue-600"
                  >
                    + Create new Family
                  </button>
                </div>
                
                {showCreateFamily && (
                  <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                    <input
                      type="text"
                      value={newFamilyName}
                      onChange={(e) => setNewFamilyName(e.target.value)}
                      placeholder="New family name"
                      className="w-full px-2 py-1 border rounded"
                      onKeyDown={(e) => e.key === 'Enter' && createFamily()}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Create Task Button */}
            <button
              onClick={createTask}
              disabled={!taskName || !selectedUniverse || !selectedPhylum || groupNum === '##' || taskNum === '##'}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Task
            </button>
          </div>

          {/* Recent Tasks */}
          <div className="bg-green-100 dark:bg-green-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Tasks</h3>
            <div className="space-y-2">
              {recentTasks.map((task) => (
                <div 
                  key={task.id}
                  onClick={() => router.push(`/t/${task.code}`)}
                  className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded hover:bg-white dark:hover:bg-gray-800 cursor-pointer"
                >
                  <span className="font-mono text-sm">
                   {task.code.toUpperCase()}: &quot;{task.title}&quot;
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(task.updated_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
