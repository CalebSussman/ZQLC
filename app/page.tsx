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
  const taskNameRef = useRef<HTMLInputElement>(null)
  
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
  
  // Code input state - for typing
  const [statusCode, setStatusCode] = useState('')
  const [universeCode, setUniverseCode] = useState('')
  const [phylumCode, setPhylumCode] = useState('')
  const [familyCode, setFamilyCode] = useState('')
  const [groupNum, setGroupNum] = useState('')
  const [taskNum, setTaskNum] = useState('')
  
  // Selected entities - for both typing and clicking
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null)
  const [selectedUniverse, setSelectedUniverse] = useState<Universe | null>(null)
  const [selectedPhylum, setSelectedPhylum] = useState<Phylum | null>(null)
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  
  // UI state
  const [focusedField, setFocusedField] = useState<string>('')
  const [entryNote, setEntryNote] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    loadData()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Handle code changes and entity selection
  useEffect(() => {
    if (statusCode) {
      const status = statuses.find(s => s.code.toUpperCase() === statusCode.toUpperCase())
      setSelectedStatus(status || null)
    }
  }, [statusCode, statuses])

  useEffect(() => {
    if (universeCode) {
      const universe = universes.find(u => u.code.toUpperCase() === universeCode.toUpperCase())
      setSelectedUniverse(universe || null)
      if (universe) loadPhylums(universe.id)
    } else {
      setSelectedUniverse(null)
      setPhylums([])
      setPhylumCode('')
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
      setFamilyCode('')
    }
  }, [phylumCode, phylums, selectedUniverse])

  useEffect(() => {
    if (selectedPhylum && familyCode) {
      const family = families.find(f => f.code.toUpperCase() === familyCode.toUpperCase())
      setSelectedFamily(family || null)
      if (selectedUniverse && selectedPhylum) {
        loadGroups(selectedUniverse.id, selectedPhylum.id, family?.id)
      }
    } else if (familyCode === '' && selectedPhylum) {
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
    if (selectedUniverse && selectedPhylum && groupNum && taskNum && taskNum.length === 2) {
      checkExistingTask()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUniverse, selectedPhylum, selectedFamily, groupNum, taskNum])

  async function loadData() {
    const { data: statusData } = await supabase
      .from('statuses')
      .select('*')
      .order('display_order')
    setStatuses(statusData || [])
    if (statusData && statusData.length > 0 && !selectedStatus) {
      setSelectedStatus(statusData[0])
      setStatusCode(statusData[0].code)
    }

    const { data: universesData } = await supabase
      .from('universes')
      .select('*')
      .order('display_order')
      .order('name')
    setUniverses(universesData || [])

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
      setTaskName(data.title) // Auto-populate task name
    } else {
      setIsExistingTask(false)
      setSelectedTask(null)
    }
  }

  async function createOrUpdateTask() {
    if (!selectedStatus || !selectedUniverse || !selectedPhylum || !groupNum || !taskNum) {
      alert('Please complete all required fields')
      return
    }

    const timestamp = new Date().toISOString()
    const baseCode = `${selectedUniverse.code}${selectedPhylum.code}${selectedFamily?.code || ''}-${groupNum.padStart(2, '0')}.${taskNum.padStart(2, '0')}`.toUpperCase()

    try {
      if (isExistingTask && selectedTask) {
        // Create new entry for existing task
        const { error } = await supabase
          .rpc('create_task_entry', {
            p_task_id: selectedTask.id,
            p_status_code: selectedStatus.code,
            p_note: entryNote || null,
            p_entry_timestamp: timestamp
          })

        if (error) throw error
        router.push(`/t/${baseCode}`)
      } else {
        if (!taskName) {
          alert('Please enter a task name')
          return
        }

        // Ensure group exists
        if (!selectedGroup && selectedUniverse && selectedPhylum) {
          const { data: existingGroup } = await supabase
            .from('groups')
            .select('*')
            .eq('universe_id', selectedUniverse.id)
            .eq('phylum_id', selectedPhylum.id)
            .eq('group_num', parseInt(groupNum))
            .is('family_id', selectedFamily?.id || null)
            .single()
          
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

        const fullCode = `${selectedStatus.code}-${timestamp.replace(/[T]/g, '.').replace(/[-:]/g, '.').substring(0, 16)}-${baseCode}`.toUpperCase()

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

        if (taskError) throw taskError

        if (task) {
          await supabase.rpc('create_task_entry', {
            p_task_id: task.id,
            p_status_code: selectedStatus.code,
            p_note: entryNote || 'Initial entry',
            p_entry_timestamp: timestamp
          })
          
          router.push(`/t/${baseCode}`)
        }
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to save. Please try again.')
    }
  }

  function handleCodeInput(field: string, value: string) {
    const upperValue = value.toUpperCase()
    
    switch(field) {
      case 'status':
        setStatusCode(upperValue.slice(0, 1))
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

  // Click handlers for selection (in addition to typing)
  function selectStatus(status: Status) {
    setSelectedStatus(status)
    setStatusCode(status.code)
    setFocusedField('')
  }

  function selectUniverse(universe: Universe) {
    setSelectedUniverse(universe)
    setUniverseCode(universe.code)
    setFocusedField('')
  }

  function selectPhylum(phylum: Phylum) {
    setSelectedPhylum(phylum)
    setPhylumCode(phylum.code)
    setFocusedField('')
  }

  function selectFamily(family: Family | null) {
    setSelectedFamily(family)
    setFamilyCode(family?.code || '')
    setFocusedField('')
  }

  const timestamp = new Date().toISOString()
    .replace(/[T]/g, '.')
    .replace(/[-:]/g, '.')
    .substring(0, 16)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Navigation - Apple-inspired */}
      <nav className={`bg-white/70 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50 ${isMobile ? 'px-4 py-3' : 'px-8 py-4'}`}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-semibold tracking-tight`}>ATOL</h1>
          
          <div className={`flex ${isMobile ? 'space-x-3 text-sm' : 'space-x-8'}`}>
            <button className="text-blue-600 font-medium relative">
              Dashboard
              <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-blue-600"></div>
            </button>
            <button 
              onClick={() => router.push('/categories')}
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Categories
            </button>
            <button className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
              To-do
            </button>
            <button className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
              Calendar
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className={`${isMobile ? 'p-4' : 'p-8'} max-w-7xl mx-auto`}>
        {/* Create/Update Task Card - Liquid Glass Effect */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl shadow-gray-200/50 p-6 mb-6 border border-gray-100">
          <h2 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold mb-6 bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent`}>
            {isExistingTask ? 'Add Entry' : 'Create new'}
          </h2>
          
          {/* Task Name */}
          <input
            ref={taskNameRef}
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="[TASK NAME]"
            disabled={isExistingTask}
            className={`w-full ${isMobile ? 'text-xl' : 'text-2xl'} bg-transparent border-b-2 border-gray-300 pb-2 mb-6 focus:outline-none focus:border-blue-500 transition-colors ${isExistingTask ? 'text-gray-600' : ''}`}
          />

          {/* Task Code Builder - Modern Layout */}
          <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
            {/* Status Row */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-gray-500 text-2xl">[</span>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={statusCode}
                    onChange={(e) => handleCodeInput('status', e.target.value)}
                    onClick={() => setFocusedField('status')}
                    className="w-10 text-2xl font-bold text-center bg-transparent border-b-2 border-gray-300 focus:border-purple-500 transition-colors text-purple-600"
                    placeholder="S"
                    maxLength={1}
                  />
                  <span className="text-gray-500 text-2xl mx-2">-</span>
                  <span className="text-gray-500 text-lg">R/D/F</span>
                </div>
                <span className="text-gray-500 text-2xl">] -</span>
              </div>
              {selectedStatus && (
                <div className="text-sm text-gray-600 ml-12">({selectedStatus.name})</div>
              )}
              
              {/* Status Selector */}
              {focusedField === 'status' && (
                <div className="mt-2 p-3 bg-gray-50 rounded-xl">
                  <div className="grid grid-cols-3 gap-2">
                    {statuses.map((status) => (
                      <button
                        key={status.code}
                        onClick={() => selectStatus(status)}
                        className={`p-2 rounded-lg text-center transition-all ${
                          selectedStatus?.code === status.code
                            ? 'bg-purple-100 border-2 border-purple-500'
                            : 'bg-white border border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="font-bold">{status.code}</div>
                        <div className="text-xs text-gray-600">{status.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Universe Row */}
            <div>
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  value={universeCode}
                  onChange={(e) => handleCodeInput('universe', e.target.value)}
                  onClick={() => setFocusedField('universe')}
                  className="w-12 text-4xl font-bold text-center bg-transparent border-b-2 border-gray-300 focus:border-blue-500 transition-colors"
                  placeholder="U"
                  maxLength={1}
                />
                {selectedUniverse && (
                  <span className="text-lg text-gray-600">({selectedUniverse.name})</span>
                )}
              </div>
              
              {focusedField === 'universe' && (
                <div className="mt-2 p-3 bg-gray-50 rounded-xl">
                  <div className="grid grid-cols-3 gap-2">
                    {universes.map((universe) => (
                      <button
                        key={universe.id}
                        onClick={() => selectUniverse(universe)}
                        className={`p-3 rounded-lg transition-all ${
                          selectedUniverse?.id === universe.id
                            ? 'bg-blue-100 border-2 border-blue-500'
                            : 'bg-white border border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="text-2xl font-bold">{universe.code}</div>
                        <div className="text-sm">{universe.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Phylum Row */}
            {selectedUniverse && (
              <div>
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    value={phylumCode}
                    onChange={(e) => handleCodeInput('phylum', e.target.value)}
                    onClick={() => setFocusedField('phylum')}
                    className="w-12 text-4xl font-bold text-center bg-transparent border-b-2 border-gray-300 focus:border-blue-500 transition-colors"
                    placeholder="P"
                    maxLength={1}
                  />
                  {selectedPhylum && (
                    <span className="text-lg text-gray-600">({selectedPhylum.name})</span>
                  )}
                </div>
                
                {focusedField === 'phylum' && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-xl">
                    <div className="grid grid-cols-3 gap-2">
                      {phylums.map((phylum) => (
                        <button
                          key={phylum.id}
                          onClick={() => selectPhylum(phylum)}
                          className={`p-3 rounded-lg transition-all ${
                            selectedPhylum?.id === phylum.id
                              ? 'bg-blue-100 border-2 border-blue-500'
                              : 'bg-white border border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <div className="text-2xl font-bold">{phylum.code}</div>
                          <div className="text-sm">{phylum.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Family Row */}
            {selectedPhylum && (
              <div>
                <div className="flex items-center space-x-4">
                  <span className="text-4xl font-bold">F -</span>
                  <input
                    type="text"
                    value={familyCode}
                    onChange={(e) => handleCodeInput('family', e.target.value)}
                    onClick={() => setFocusedField('family')}
                    className="w-12 text-4xl font-bold text-center bg-transparent border-b-2 border-gray-300 focus:border-blue-500 transition-colors"
                    placeholder="_"
                    maxLength={1}
                  />
                  {selectedFamily && (
                    <span className="text-lg text-gray-600">({selectedFamily.name})</span>
                  )}
                </div>
                
                {focusedField === 'family' && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-xl">
                    <button
                      onClick={() => selectFamily(null)}
                      className="w-full mb-2 p-2 text-left text-gray-500 hover:bg-white rounded-lg"
                    >
                      (No family - optional)
                    </button>
                    <div className="grid grid-cols-3 gap-2">
                      {families.map((family) => (
                        <button
                          key={family.id}
                          onClick={() => selectFamily(family)}
                          className={`p-3 rounded-lg transition-all ${
                            selectedFamily?.id === family.id
                              ? 'bg-blue-100 border-2 border-blue-500'
                              : 'bg-white border border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <div className="text-2xl font-bold">{family.code}</div>
                          <div className="text-sm">{family.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Group/Task Numbers */}
            {selectedPhylum && (
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  value={groupNum}
                  onChange={(e) => handleCodeInput('group', e.target.value)}
                  className="w-16 text-4xl font-mono font-bold text-center bg-transparent border-b-2 border-gray-300 focus:border-green-500 transition-colors"
                  placeholder="##"
                  maxLength={2}
                />
                <span className="text-4xl">.</span>
                <input
                  type="text"
                  value={taskNum}
                  onChange={(e) => handleCodeInput('task', e.target.value)}
                  className={`w-16 text-4xl font-mono font-bold text-center bg-transparent border-b-2 border-gray-300 focus:border-green-500 transition-colors ${isExistingTask ? 'text-green-600' : ''}`}
                  placeholder="##"
                  maxLength={2}
                />
                {selectedGroup && (
                  <span className="text-lg text-gray-600">({selectedGroup.name})</span>
                )}
              </div>
            )}

            {/* Timestamp */}
            <div className="text-gray-500 font-mono">{timestamp}</div>

            {/* Entry Note */}
            {isExistingTask && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Entry Note</label>
                <textarea
                  value={entryNote}
                  onChange={(e) => setEntryNote(e.target.value)}
                  placeholder="What's happening with this status change?"
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={createOrUpdateTask}
              disabled={!selectedStatus || !selectedUniverse || !selectedPhylum || !groupNum || !taskNum || (!isExistingTask && !taskName)}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all"
            >
              {isExistingTask ? 'Add Entry' : 'Create Task'}
            </button>
          </div>
        </div>

        {/* Recent Tasks - Modern Cards */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Recent Tasks</h3>
          {recentTasks.map((task) => (
            <div 
              key={task.id}
              onClick={() => router.push(`/t/${task.base_code || task.code}`)}
              className="bg-white/80 backdrop-blur-md rounded-xl p-4 border border-gray-100 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-mono text-sm text-gray-600 mb-1">
                    {task.code}
                  </div>
                  <div className="font-medium">
                    {task.title}
                  </div>
                  {task.current_status_name && (
                    <span className="inline-block mt-2 px-2 py-1 bg-gray-100 rounded-full text-xs">
                      {task.current_status_name}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(task.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
