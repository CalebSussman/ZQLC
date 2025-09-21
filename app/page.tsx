'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Task, Universe, Phylum, Family, Group } from '@/lib/supabase'

interface Status {
  code: string
  name: string
  description: string
}

export default function Home() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Data
  const [universes, setUniverses] = useState<Universe[]>([])
  const [phylums, setPhylums] = useState<Phylum[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [recentTasks, setRecentTasks] = useState<Task[]>([])
  const [existingTasks, setExistingTasks] = useState<Task[]>([])
  
  // Task creation state
  const [taskName, setTaskName] = useState('')
  const [isExistingTask, setIsExistingTask] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  
  // Code input state
  const [statusCode, setStatusCode] = useState('')
  const [universeCode, setUniverseCode] = useState('')
  const [phylumCode, setPhylumCode] = useState('')
  const [familyCode, setFamilyCode] = useState('')
  const [groupNum, setGroupNum] = useState('')
  const [taskNum, setTaskNum] = useState('')
  
  // Selected entities
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null)
  const [selectedUniverse, setSelectedUniverse] = useState<Universe | null>(null)
  const [selectedPhylum, setSelectedPhylum] = useState<Phylum | null>(null)
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  
  // UI state
  const [focusedField, setFocusedField] = useState<string>('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [entryNote, setEntryNote] = useState('')
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if mobile
    setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', () => setIsMobile(window.innerWidth < 768))
    
    loadData()
  }, [])

  // Load data based on selections
  useEffect(() => {
    if (universeCode) {
      const universe = universes.find(u => u.code.toUpperCase() === universeCode.toUpperCase())
      setSelectedUniverse(universe || null)
      if (universe) loadPhylums(universe.id)
    } else {
      setSelectedUniverse(null)
      setPhylums([])
    }
  }, [universeCode, universes])

  useEffect(() => {
    if (selectedUniverse && phylumCode) {
      const phylum = phylums.find(p => p.code.toUpperCase() === phylumCode.toUpperCase())
      setSelectedPhylum(phylum || null)
      if (phylum) {
        loadFamilies(phylum.id)
        loadGroups(selectedUniverse.id, phylum.id, selectedFamily?.id)
      }
    } else {
      setSelectedPhylum(null)
      setFamilies([])
      setGroups([])
    }
  }, [phylumCode, phylums, selectedUniverse, selectedFamily])

  useEffect(() => {
    if (selectedPhylum && familyCode) {
      const family = families.find(f => f.code.toUpperCase() === familyCode.toUpperCase())
      setSelectedFamily(family || null)
      if (selectedUniverse && selectedPhylum) {
        loadGroups(selectedUniverse.id, selectedPhylum.id, family?.id)
      }
    } else if (familyCode === '') {
      setSelectedFamily(null)
      if (selectedUniverse && selectedPhylum) {
        loadGroups(selectedUniverse.id, selectedPhylum.id, null)
      }
    }
  }, [familyCode, families, selectedUniverse, selectedPhylum])

  useEffect(() => {
    if (groupNum && selectedUniverse && selectedPhylum) {
      const group = groups.find(g => g.group_num === parseInt(groupNum))
      setSelectedGroup(group || null)
      
      // Load tasks in this group to suggest next number or allow entry
      if (group || groupNum.length === 2) {
        loadTasksInGroup()
      }
    } else {
      setSelectedGroup(null)
      setExistingTasks([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupNum, groups, selectedUniverse, selectedPhylum])

  useEffect(() => {
    // Check if this is an existing task
    if (selectedUniverse && selectedPhylum && groupNum && taskNum && taskNum.length === 2) {
      checkExistingTask()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUniverse, selectedPhylum, selectedFamily, groupNum, taskNum])

  async function loadData() {
    // Load statuses
    const { data: statusData } = await supabase
      .from('statuses')
      .select('*')
      .order('display_order')
    setStatuses(statusData || [])
    if (statusData && statusData.length > 0) {
      setSelectedStatus(statusData[0])
      setStatusCode(statusData[0].code)
    }

    // Load universes
    const { data: universesData } = await supabase
      .from('universes')
      .select('*')
      .order('display_order')
      .order('name')
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
      .order('name')
    setPhylums(data || [])
  }

  async function loadFamilies(phylumId: string) {
    const { data } = await supabase
      .from('families')
      .select('*')
      .eq('phylum_id', phylumId)
      .order('display_order')
      .order('name')
    setFamilies(data || [])
  }

  async function loadGroups(universeId: string, phylumId: string, familyId?: string | null) {
    const query = supabase
      .from('groups')
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

  async function loadTasksInGroup() {
    if (!selectedUniverse || !selectedPhylum || !groupNum) return
    
    const query = supabase
      .from('task_details')
      .select('*')
      .eq('universe_id', selectedUniverse.id)
      .eq('phylum_id', selectedPhylum.id)
      .eq('group_num', parseInt(groupNum))
    
    if (selectedFamily) {
      query.eq('family_id', selectedFamily.id)
    }
    
    const { data } = await query.order('task_num', { ascending: false })
    setExistingTasks(data || [])
    
    // Suggest next task number if creating new
    if (data && data.length > 0 && !taskNum) {
      const lastTaskNum = data[0].task_num
      setTaskNum(String(lastTaskNum + 1).padStart(2, '0'))
    }
  }

  async function checkExistingTask() {
    const baseCode = `${selectedUniverse?.code}${selectedPhylum?.code}${selectedFamily?.code || ''}-${groupNum.padStart(2, '0')}.${taskNum.padStart(2, '0')}`.toUpperCase()
    
    const { data } = await supabase
      .from('task_details')
      .select('*')
      .eq('base_code', baseCode)
      .single()
    
    if (data) {
      setIsExistingTask(true)
      setSelectedTask(data)
      setTaskName(data.title)
    } else {
      setIsExistingTask(false)
      setSelectedTask(null)
      if (!taskName) {
        setTaskName('')
      }
    }
  }

  async function createOrUpdateTask() {
    if (!selectedStatus || !selectedUniverse || !selectedPhylum || !groupNum || !taskNum) {
      alert('Please complete all required fields')
      return
    }

    const timestamp = new Date().toISOString()
    const baseCode = `${selectedUniverse.code}${selectedPhylum.code}${selectedFamily?.code || ''}-${groupNum.padStart(2, '0')}.${taskNum.padStart(2, '0')}`.toUpperCase()
    const fullCode = `${selectedStatus.code}-${timestamp.replace(/[T]/g, '.').replace(/[-:]/g, '.').substring(0, 16)}-${baseCode}`.toUpperCase()

    if (isExistingTask && selectedTask) {
      // Create new entry for existing task
      const { error } = await supabase
        .rpc('create_task_entry', {
          p_task_id: selectedTask.id,
          p_status_code: selectedStatus.code,
          p_note: entryNote || null,
          p_entry_timestamp: timestamp
        })

      if (error) {
        console.error('Error creating entry:', error)
        alert('Failed to create entry')
      } else {
        router.push(`/t/${baseCode}`)
      }
    } else {
      // Create new task
      if (!taskName) {
        alert('Please enter a task name')
        return
      }

      // First create/ensure group exists
      if (!selectedGroup && selectedUniverse && selectedPhylum) {
        // Check if group exists first
        const { data: existingGroup } = await supabase
          .from('groups')
          .select('*')
          .eq('universe_id', selectedUniverse.id)
          .eq('phylum_id', selectedPhylum.id)
          .eq('group_num', parseInt(groupNum))
          .is('family_id', selectedFamily?.id || null)
          .single()
        
        // Only create if it doesn't exist
        if (!existingGroup) {
          await supabase
            .from('groups')
            .insert({
              universe_id: selectedUniverse.id,
              phylum_id: selectedPhylum.id,
              family_id: selectedFamily?.id || null,
              group_num: parseInt(groupNum),
              name: `Group ${groupNum}`
            })
        }
      }

      // Create task
      const { data: task, error: taskError } = await supabase
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
          task_timestamp: timestamp
        })
        .select()
        .single()

      if (taskError) {
        console.error('Error creating task:', taskError)
        alert('Failed to create task')
      } else if (task) {
        // Create initial entry
        await supabase.rpc('create_task_entry', {
          p_task_id: task.id,
          p_status_code: selectedStatus.code,
          p_note: entryNote || 'Initial entry',
          p_entry_timestamp: timestamp
        })
        
        router.push(`/t/${baseCode}`)
      }
    }
  }

  function handleCodeInput(field: string, value: string) {
    const upperValue = value.toUpperCase()
    
    switch(field) {
      case 'status':
        setStatusCode(upperValue.slice(0, 1))
        const status = statuses.find(s => s.code === upperValue)
        if (status) setSelectedStatus(status)
        break
      case 'universe':
        setUniverseCode(upperValue.slice(0, 1))
        break
      case 'phylum':
        setPhylumCode(upperValue.slice(0, 1))
        break
      case 'family':
        setFamilyCode(upperValue.slice(0, 1))
        break
      case 'group':
        setGroupNum(value.replace(/\D/g, '').slice(0, 2))
        break
      case 'task':
        setTaskNum(value.replace(/\D/g, '').slice(0, 2))
        break
    }
  }

  const timestamp = new Date().toISOString()
    .replace(/[T]/g, '.')
    .replace(/[-:]/g, '.')
    .substring(0, 16)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className={`flex ${isMobile ? 'flex-col' : 'h-screen'}`}>
        {/* Sidebar - Collapsible on mobile */}
        <div className={`${isMobile ? 'w-full' : 'w-64'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6`}>
          <h1 className="text-3xl font-bold mb-8">ATOL</h1>
          
          <nav className={`space-y-2 ${isMobile ? 'flex flex-row space-y-0 space-x-2 overflow-x-auto' : ''}`}>
            <button className={`${isMobile ? 'px-3 py-1 text-sm' : 'w-full text-left px-4 py-2'} rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300`}>
              Dashboard
            </button>
            <button 
              onClick={() => router.push('/categories')}
              className={`${isMobile ? 'px-3 py-1 text-sm' : 'w-full text-left px-4 py-2'} rounded hover:bg-gray-100 dark:hover:bg-gray-700`}
            >
              Categories
            </button>
            <button className={`${isMobile ? 'px-3 py-1 text-sm' : 'w-full text-left px-4 py-2'} rounded hover:bg-gray-100 dark:hover:bg-gray-700`}>
              To-do
            </button>
            <button className={`${isMobile ? 'px-3 py-1 text-sm' : 'w-full text-left px-4 py-2'} rounded hover:bg-gray-100 dark:hover:bg-gray-700`}>
              Calendar
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          {/* Create/Update Task Section */}
          <div className="bg-yellow-100 dark:bg-yellow-900/20 rounded-lg p-6 mb-8">
            <h2 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold mb-6`}>
              {isExistingTask ? 'Add Entry to Task' : 'Create New Task'}
            </h2>
            
            {/* Task Name Input */}
            <input
              ref={inputRef}
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder={isExistingTask ? 'Task name (loaded from existing)' : '[TASK NAME]'}
              disabled={isExistingTask}
              className={`w-full ${isMobile ? 'text-lg' : 'text-2xl'} bg-transparent border-b-2 border-gray-400 pb-2 mb-6 focus:outline-none focus:border-blue-600 ${isExistingTask ? 'text-gray-600' : ''}`}
            />

            {/* Task Code Builder - Mobile Responsive */}
            <div className={`${isMobile ? 'text-xl' : 'text-3xl'} font-mono mb-4`}>
              <div className={`${isMobile ? 'flex flex-col space-y-2' : 'flex items-center'}`}>
                {/* Status */}
                <div className={`flex items-center ${isMobile ? '' : 'mr-2'}`}>
                  <span className="text-gray-500">[</span>
                  <input
                    type="text"
                    value={statusCode}
                    onChange={(e) => handleCodeInput('status', e.target.value)}
                    className="w-8 text-center bg-transparent border-b border-gray-400 focus:outline-none focus:border-purple-600 text-purple-600 font-bold"
                    placeholder="S"
                    maxLength={1}
                  />
                  <span className="text-gray-500 mx-1">-</span>
                </div>

                {/* Categories */}
                <div className="flex items-center">
                  <input
                    type="text"
                    value={universeCode}
                    onChange={(e) => handleCodeInput('universe', e.target.value)}
                    className={`w-8 text-center bg-transparent border-b border-gray-400 focus:outline-none focus:border-blue-600 ${selectedUniverse ? 'text-blue-600' : ''}`}
                    placeholder="U"
                    maxLength={1}
                  />
                  <span className="text-gray-500">/</span>
                  <input
                    type="text"
                    value={phylumCode}
                    onChange={(e) => handleCodeInput('phylum', e.target.value)}
                    className={`w-8 text-center bg-transparent border-b border-gray-400 focus:outline-none focus:border-blue-600 ${selectedPhylum ? 'text-blue-600' : ''}`}
                    placeholder="P"
                    maxLength={1}
                    disabled={!selectedUniverse}
                  />
                  <span className="text-gray-500">/</span>
                  <input
                    type="text"
                    value={familyCode}
                    onChange={(e) => handleCodeInput('family', e.target.value)}
                    className={`w-8 text-center bg-transparent border-b border-gray-400 focus:outline-none focus:border-blue-600 ${selectedFamily ? 'text-blue-600' : ''}`}
                    placeholder="F"
                    maxLength={1}
                    disabled={!selectedPhylum}
                  />
                  <span className="text-gray-500">]-</span>
                </div>

                {/* Numbers */}
                <div className="flex items-center">
                  <input
                    type="text"
                    value={groupNum}
                    onChange={(e) => handleCodeInput('group', e.target.value)}
                    className={`w-12 text-center bg-transparent border-b border-gray-400 focus:outline-none focus:border-blue-600 ${selectedGroup ? 'text-green-600' : ''}`}
                    placeholder="##"
                    maxLength={2}
                    disabled={!selectedPhylum}
                  />
                  <span className="text-gray-500">.</span>
                  <input
                    type="text"
                    value={taskNum}
                    onChange={(e) => handleCodeInput('task', e.target.value)}
                    className={`w-12 text-center bg-transparent border-b border-gray-400 focus:outline-none focus:border-blue-600 ${isExistingTask ? 'text-green-600 font-bold' : ''}`}
                    placeholder="##"
                    maxLength={2}
                    disabled={!groupNum}
                  />
                </div>
              </div>
            </div>

            {/* Display selected names */}
            <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mb-4 space-y-1`}>
              {selectedStatus && <div>Status: {selectedStatus.name}</div>}
              {selectedUniverse && <div>Universe: {selectedUniverse.name}</div>}
              {selectedPhylum && <div>Phylum: {selectedPhylum.name}</div>}
              {selectedFamily && <div>Family: {selectedFamily.name}</div>}
              {selectedGroup && <div>Group: {groupNum} - {selectedGroup.name}</div>}
              {isExistingTask && selectedTask && (
                <div className="text-green-600 font-semibold">
                  ✓ Existing task found: &quot;{selectedTask.title}&quot;
                </div>
              )}
            </div>

            {/* Timestamp */}
            <div className="text-gray-500 mb-6">{timestamp}</div>

            {/* Entry Note for existing tasks */}
            {isExistingTask && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Entry Note</label>
                <textarea
                  value={entryNote}
                  onChange={(e) => setEntryNote(e.target.value)}
                  placeholder="What's happening with this status change?"
                  rows={2}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            )}

            {/* Suggestions for existing tasks in group */}
            {existingTasks.length > 0 && !isExistingTask && (
              <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded">
                <div className="text-sm font-semibold mb-2">Tasks in this group:</div>
                <div className={`${isMobile ? 'space-y-1' : 'space-y-2'}`}>
                  {existingTasks.slice(0, 5).map((task) => (
                    <div 
                      key={task.id}
                      onClick={() => {
                        setTaskNum(String(task.task_num).padStart(2, '0'))
                      }}
                      className="text-xs cursor-pointer hover:bg-gray-100 p-1 rounded"
                    >
                      {task.task_num.toString().padStart(2, '0')} - {task.title}
                      {task.current_status && ` (${task.current_status_name})`}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={createOrUpdateTask}
              disabled={!selectedStatus || !selectedUniverse || !selectedPhylum || !groupNum || !taskNum || (!isExistingTask && !taskName)}
              className={`${isMobile ? 'w-full' : ''} px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isExistingTask ? 'Add Entry' : 'Create Task'}
            </button>
            {/* Selection Panels - Add this entire section */}
{/* Status Selector - Always visible */}
{statuses.length > 0 && (
  <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
    <h3 className="font-semibold mb-2 dark:text-white">Select Status:</h3>
    <div className="grid grid-cols-3 gap-2">
      {statuses.map((status) => (
        <button
          key={status.code}
          onClick={() => {
            setSelectedStatus(status)
            setStatusCode(status.code)
          }}
          className={`p-3 rounded border transition-all ${
            (selectedStatus?.code === status.code || statusCode.toUpperCase() === status.code)
              ? 'bg-purple-100 dark:bg-purple-900 border-purple-500 dark:border-purple-400 ring-2 ring-purple-400'
              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500'
          }`}
        >
          <div className="font-bold text-purple-600 dark:text-purple-400">{status.code}</div>
          <div className="text-sm dark:text-gray-300">{status.name}</div>
        </button>
      ))}
    </div>
  </div>
)}

{/* Universe Selector */}
{universes.length > 0 && (
  <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
    <h3 className="font-semibold mb-2 dark:text-white">Select Universe:</h3>
    <div className="grid grid-cols-3 gap-2">
      {universes.map((universe) => (
        <button
          key={universe.id}
          onClick={() => {
            setSelectedUniverse(universe)
            setUniverseCode(universe.code)
          }}
          className={`p-3 rounded border transition-all ${
            (selectedUniverse?.id === universe.id || universeCode.toUpperCase() === universe.code.toUpperCase())
              ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 dark:border-blue-400 ring-2 ring-blue-400'
              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
          }`}
        >
          <div className="font-bold text-xl dark:text-white">{universe.code}</div>
          <div className="text-sm dark:text-gray-300">{universe.name}</div>
        </button>
      ))}
    </div>
  </div>
)}

{/* Phylum Selector */}
{phylums.length > 0 && (
  <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
    <h3 className="font-semibold mb-2 dark:text-white">Select Phylum:</h3>
    <div className="grid grid-cols-3 gap-2">
      {phylums.map((phylum) => (
        <button
          key={phylum.id}
          onClick={() => {
            setSelectedPhylum(phylum)
            setPhylumCode(phylum.code)
          }}
          className={`p-3 rounded border transition-all ${
            (selectedPhylum?.id === phylum.id || phylumCode.toUpperCase() === phylum.code.toUpperCase())
              ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 dark:border-blue-400 ring-2 ring-blue-400'
              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
          }`}
        >
          <div className="font-bold text-xl dark:text-white">{phylum.code}</div>
          <div className="text-sm dark:text-gray-300">{phylum.name}</div>
        </button>
      ))}
    </div>
  </div>
)}

{/* Family Selector */}
{families.length > 0 && (
  <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
    <h3 className="font-semibold mb-2 dark:text-white">Select Family (Optional):</h3>
    <button
      onClick={() => {
        setSelectedFamily(null)
        setFamilyCode('')
      }}
      className={`w-full mb-2 p-2 text-left rounded transition-all ${
        !selectedFamily && !familyCode
          ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500 dark:border-blue-400'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
    >
      (No family - skip to group)
    </button>
    <div className="grid grid-cols-3 gap-2">
      {families.map((family) => (
        <button
          key={family.id}
          onClick={() => {
            setSelectedFamily(family)
            setFamilyCode(family.code)
          }}
          className={`p-3 rounded border transition-all ${
            (selectedFamily?.id === family.id || familyCode.toUpperCase() === family.code.toUpperCase())
              ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 dark:border-blue-400 ring-2 ring-blue-400'
              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
          }`}
        >
          <div className="font-bold text-xl dark:text-white">{family.code}</div>
          <div className="text-sm dark:text-gray-300">{family.name}</div>
        </button>
      ))}
    </div>
  </div>
)}

{/* Groups Selector */}
{groups.length > 0 && (
  <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
    <h3 className="font-semibold mb-2 dark:text-white">Select Group:</h3>
    <div className="grid grid-cols-4 gap-2">
      {groups.map((group) => (
        <button
          key={group.id || group.group_num}
          onClick={() => {
            setGroupNum(String(group.group_num).padStart(2, '0'))
            setSelectedGroup(group)
          }}
          className={`p-2 rounded border transition-all ${
            (selectedGroup?.group_num === group.group_num || parseInt(groupNum) === group.group_num)
              ? 'bg-green-100 dark:bg-green-900 border-green-500 dark:border-green-400 ring-2 ring-green-400'
              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500'
          }`}
        >
          <div className="font-mono font-bold dark:text-white">{String(group.group_num).padStart(2, '0')}</div>
          <div className="text-xs dark:text-gray-300">{group.name}</div>
        </button>
      ))}
    </div>
  </div>
)}
          </div>

          {/* Recent Tasks - Mobile Optimized */}
          <div className="bg-green-100 dark:bg-green-900/20 rounded-lg p-4 md:p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Tasks</h3>
            <div className="space-y-2">
              {recentTasks.map((task) => (
                <div 
                  key={task.id}
                  onClick={() => router.push(`/t/${task.base_code || task.code}`)}
                  className="flex flex-col md:flex-row md:items-center md:justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded hover:bg-white dark:hover:bg-gray-800 cursor-pointer"
                >
                  <div>
                    <div className="font-mono text-sm">
                      {task.code}
                    </div>
                    <div className="text-sm">
                      &quot;{task.title}&quot;
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 mt-1 md:mt-0">
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
