'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Universe, Phylum, Family, Task } from '@/lib/supabase'

interface Group {
  number: number
  tasks: Task[]
}

export default function Categories() {
  const router = useRouter()
  
  // Data
  const [universes, setUniverses] = useState<Universe[]>([])
  const [phylums, setPhylums] = useState<Phylum[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  
  // Selection state
  const [selectedUniverse, setSelectedUniverse] = useState<Universe | null>(null)
  const [selectedPhylum, setSelectedPhylum] = useState<Phylum | null>(null)
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  
  // Creation state
  const [creatingUniverse, setCreatingUniverse] = useState(false)
  const [creatingPhylum, setCreatingPhylum] = useState(false)
  const [creatingFamily, setCreatingFamily] = useState(false)
  const [newUniverseName, setNewUniverseName] = useState('')
  const [newUniverseCode, setNewUniverseCode] = useState('')
  const [newPhylumName, setNewPhylumName] = useState('')
  const [newPhylumCode, setNewPhylumCode] = useState('')
  const [newFamilyName, setNewFamilyName] = useState('')
  const [newFamilyCode, setNewFamilyCode] = useState('')

  useEffect(() => {
    loadUniverses()
  }, [])

  useEffect(() => {
    if (selectedUniverse) {
      loadPhylums()
    } else {
      setPhylums([])
      setSelectedPhylum(null)
    }
  }, [selectedUniverse])

  useEffect(() => {
    if (selectedPhylum) {
      loadFamilies()
      loadGroups()
    } else {
      setFamilies([])
      setGroups([])
      setSelectedFamily(null)
      setSelectedGroup(null)
    }
  }, [selectedPhylum])

  useEffect(() => {
    if (selectedPhylum && selectedGroup !== null) {
      loadTasks()
    } else {
      setTasks([])
      setSelectedTask(null)
    }
  }, [selectedPhylum, selectedFamily, selectedGroup])

  async function loadUniverses() {
    const { data } = await supabase
      .from('universes')
      .select('*')
      .order('code')
    setUniverses(data || [])
  }

  async function loadPhylums() {
    if (!selectedUniverse) return
    const { data } = await supabase
      .from('phyla')
      .select('*')
      .eq('universe_id', selectedUniverse.id)
      .order('code')
    setPhylums(data || [])
  }

  async function loadFamilies() {
    if (!selectedPhylum) return
    const { data } = await supabase
      .from('families')
      .select('*')
      .eq('phylum_id', selectedPhylum.id)
      .order('code')
    setFamilies(data || [])
  }

  async function loadGroups() {
    if (!selectedPhylum) return
    
    const query = supabase
      .from('tasks')
      .select('group_num, id')
      .eq('universe_id', selectedUniverse!.id)
      .eq('phylum_id', selectedPhylum.id)
    
    if (selectedFamily) {
      query.eq('family_id', selectedFamily.id)
    }
    
    const { data } = await query.order('group_num')
    
    if (data) {
      const groupMap = new Map<number, number>()
      data.forEach(task => {
        groupMap.set(task.group_num, (groupMap.get(task.group_num) || 0) + 1)
      })
      
      const groupList = Array.from(groupMap.entries()).map(([num, count]) => ({
        number: num,
        tasks: []
      }))
      
      setGroups(groupList)
    }
  }

  async function loadTasks() {
    if (!selectedPhylum || selectedGroup === null) return
    
    const query = supabase
      .from('task_details')
      .select('*')
      .eq('universe_id', selectedUniverse!.id)
      .eq('phylum_id', selectedPhylum.id)
      .eq('group_num', selectedGroup)
    
    if (selectedFamily) {
      query.eq('family_id', selectedFamily.id)
    }
    
    const { data } = await query.order('task_num')
    setTasks(data || [])
  }

  async function createUniverse() {
    if (!newUniverseName || !newUniverseCode) return
    
    const { data } = await supabase
      .from('universes')
      .insert({
        code: newUniverseCode.toLowerCase().slice(0, 3),
        name: newUniverseName,
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
      })
      .select()
      .single()
    
    if (data) {
      setUniverses([...universes, data])
      setSelectedUniverse(data)
      setNewUniverseName('')
      setNewUniverseCode('')
      setCreatingUniverse(false)
    }
  }

  async function createPhylum() {
    if (!newPhylumName || !newPhylumCode || !selectedUniverse) return
    
    const { data } = await supabase
      .from('phyla')
      .insert({
        universe_id: selectedUniverse.id,
        code: newPhylumCode.toLowerCase().slice(0, 3),
        name: newPhylumName
      })
      .select()
      .single()
    
    if (data) {
      setPhylums([...phylums, data])
      setSelectedPhylum(data)
      setNewPhylumName('')
      setNewPhylumCode('')
      setCreatingPhylum(false)
    }
  }

  async function createFamily() {
    if (!newFamilyName || !newFamilyCode || !selectedPhylum) return
    
    const { data } = await supabase
      .from('families')
      .insert({
        phylum_id: selectedPhylum.id,
        code: newFamilyCode.toLowerCase().slice(0, 3),
        name: newFamilyName
      })
      .select()
      .single()
    
    if (data) {
      setFamilies([...families, data])
      setSelectedFamily(data)
      setNewFamilyName('')
      setNewFamilyCode('')
      setCreatingFamily(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex h-screen">
        {/* Left Sidebar */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6">
          <h1 className="text-3xl font-bold mb-8">ATOL</h1>
          
          <nav className="space-y-2">
            <button 
              onClick={() => router.push('/')}
              className="w-full text-left px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Dashboard
            </button>
            <button className="w-full text-left px-4 py-2 rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
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

        {/* Main Content - Scroll Wheels */}
        <div className="flex-1 flex">
          {/* Universe Column */}
          <div className="flex-1 border-r border-gray-300 dark:border-gray-700">
            <div className="bg-red-100 dark:bg-red-900/20 p-4 border-b border-gray-300 dark:border-gray-700">
              <h2 className="font-bold text-red-600 dark:text-red-400">UNIVERSE</h2>
            </div>
            <div className="h-full overflow-y-auto">
              {universes.map((universe) => (
                <div
                  key={universe.id}
                  onClick={() => setSelectedUniverse(universe)}
                  className={`p-4 cursor-pointer border-b hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    selectedUniverse?.id === universe.id 
                      ? 'bg-yellow-100 dark:bg-yellow-900/20' 
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{universe.code.toUpperCase()}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">({universe.name})</span>
                  </div>
                </div>
            })}
              
              {/* Create Universe */}
              {!creatingUniverse ? (
                <button
                  onClick={() => setCreatingUniverse(true)}
                  className="w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <span className="text-2xl text-gray-400">+ (CREATE)</span>
                </button>
              ) : (
                <div className="p-4 bg-gray-100 dark:bg-gray-800">
                  <input
                    type="text"
                    placeholder="Code (3 letters)"
                    value={newUniverseCode}
                    onChange={(e) => setNewUniverseCode(e.target.value.toUpperCase().slice(0, 3))}
                    className="w-full mb-2 px-2 py-1 bg-white dark:bg-gray-700 rounded"
                    maxLength={3}
                  />
                  <input
                    type="text"
                    placeholder="Name"
                    value={newUniverseName}
                    onChange={(e) => setNewUniverseName(e.target.value)}
                    className="w-full mb-2 px-2 py-1 bg-white dark:bg-gray-700 rounded"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={createUniverse}
                      className="px-3 py-1 bg-blue-600 text-white rounded"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setCreatingUniverse(false)
                        setNewUniverseName('')
                        setNewUniverseCode('')
                      }}
                      className="px-3 py-1 bg-gray-400 text-white rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Phylum Column */}
          <div className="flex-1 border-r border-gray-300 dark:border-gray-700">
            <div className="bg-orange-100 dark:bg-orange-900/20 p-4 border-b border-gray-300 dark:border-gray-700">
              <h2 className="font-bold text-orange-600 dark:text-orange-400">PHYLUM</h2>
            </div>
            <div className="h-full overflow-y-auto">
              {selectedUniverse ? (
                <>
                  {phylums.map((phylum) => (
                    <div
                      key={phylum.id}
                      onClick={() => setSelectedPhylum(phylum)}
                      className={`p-4 cursor-pointer border-b hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        selectedPhylum?.id === phylum.id 
                          ? 'bg-yellow-100 dark:bg-yellow-900/20' 
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold">{phylum.code.toUpperCase()}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">({phylum.name})</span>
                      </div>
                    </div>
                  ))}
                  
                  {!creatingPhylum ? (
                    <button
                      onClick={() => setCreatingPhylum(true)}
                      className="w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <span className="text-xl text-gray-400">+ CREATE</span>
                    </button>
                  ) : (
                    <div className="p-4 bg-gray-100 dark:bg-gray-800">
                      <input
                        type="text"
                        placeholder="Code (3 letters)"
                        value={newPhylumCode}
                        onChange={(e) => setNewPhylumCode(e.target.value.toUpperCase().slice(0, 3))}
                        className="w-full mb-2 px-2 py-1 bg-white dark:bg-gray-700 rounded"
                        maxLength={3}
                      />
                      <input
                        type="text"
                        placeholder="Name"
                        value={newPhylumName}
                        onChange={(e) => setNewPhylumName(e.target.value)}
                        className="w-full mb-2 px-2 py-1 bg-white dark:bg-gray-700 rounded"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={createPhylum}
                          className="px-3 py-1 bg-blue-600 text-white rounded"
                        >
                          Create
                        </button>
                        <button
                          onClick={() => {
                            setCreatingPhylum(false)
                            setNewPhylumName('')
                            setNewPhylumCode('')
                          }}
                          className="px-3 py-1 bg-gray-400 text-white rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 text-gray-400 text-center">
                  Select a Universe
                </div>
              )}
            </div>
          </div>

          {/* Family Column */}
          <div className="flex-1 border-r border-gray-300 dark:border-gray-700">
            <div className="bg-yellow-100 dark:bg-yellow-900/20 p-4 border-b border-gray-300 dark:border-gray-700">
              <h2 className="font-bold text-yellow-700 dark:text-yellow-400">FAMILY</h2>
            </div>
            <div className="h-full overflow-y-auto">
              {selectedPhylum ? (
                <>
                  {families.map((family) => (
                    <div
                      key={family.id}
                      onClick={() => setSelectedFamily(family)}
                      className={`p-4 cursor-pointer border-b hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        selectedFamily?.id === family.id 
                          ? 'bg-yellow-100 dark:bg-yellow-900/20' 
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{family.code.toUpperCase()}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">({family.name})</span>
                      </div>
                    </div>
                  ))}
                  
                  {!creatingFamily ? (
                    <button
                      onClick={() => setCreatingFamily(true)}
                      className="w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <span className="text-lg text-gray-400">+ CREATE</span>
                    </button>
                  ) : (
                    <div className="p-4 bg-gray-100 dark:bg-gray-800">
                      <input
                        type="text"
                        placeholder="Code (3 letters)"
                        value={newFamilyCode}
                        onChange={(e) => setNewFamilyCode(e.target.value.toUpperCase().slice(0, 3))}
                        className="w-full mb-2 px-2 py-1 bg-white dark:bg-gray-700 rounded"
                        maxLength={3}
                      />
                      <input
                        type="text"
                        placeholder="Name"
                        value={newFamilyName}
                        onChange={(e) => setNewFamilyName(e.target.value)}
                        className="w-full mb-2 px-2 py-1 bg-white dark:bg-gray-700 rounded"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={createFamily}
                          className="px-3 py-1 bg-blue-600 text-white rounded"
                        >
                          Create
                        </button>
                        <button
                          onClick={() => {
                            setCreatingFamily(false)
                            setNewFamilyName('')
                            setNewFamilyCode('')
                          }}
                          className="px-3 py-1 bg-gray-400 text-white rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 text-gray-400 text-center">
                  Select a Phylum
                </div>
              )}
            </div>
          </div>

          {/* Group Column */}
          <div className="flex-1 border-r border-gray-300 dark:border-gray-700">
            <div className="bg-green-100 dark:bg-green-900/20 p-4 border-b border-gray-300 dark:border-gray-700">
              <h2 className="font-bold text-green-600 dark:text-green-400">GROUP</h2>
            </div>
            <div className="h-full overflow-y-auto">
              {selectedPhylum ? (
                <>
                  {groups.map((group) => (
                    <div
                      key={group.number}
                      onClick={() => setSelectedGroup(group.number)}
                      className={`p-4 cursor-pointer border-b hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        selectedGroup === group.number 
                          ? 'bg-yellow-100 dark:bg-yellow-900/20' 
                          : ''
                      }`}
                    >
                      <span className="text-lg font-mono">
                        {String(group.number).padStart(2, '0')} - {selectedUniverse?.code.toUpperCase() || ''}{selectedPhylum?.code.toUpperCase() || ''}
                      </span>
                    </div>
                  ))}
                  <button
                    onClick={() => router.push('/new')}
                    className="w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <span className="text-lg text-gray-400">+ CREATE</span>
                  </button>
                </>
              ) : (
                <div className="p-4 text-gray-400 text-center">
                  Select a Phylum
                </div>
              )}
            </div>
          </div>

          {/* Task Column */}
          <div className="flex-1">
            <div className="bg-blue-100 dark:bg-blue-900/20 p-4 border-b border-gray-300 dark:border-gray-700">
              <h2 className="font-bold text-blue-600 dark:text-blue-400">TASK</h2>
            </div>
            <div className="h-full overflow-y-auto">
              {selectedGroup !== null ? (
                <>
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => router.push(`/t/${task.code}`)}
                      className={`p-4 cursor-pointer border-b hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        selectedTask?.id === task.id 
                          ? 'bg-yellow-100 dark:bg-yellow-900/20' 
                          : ''
                      }`}
                    >
                      <div className="font-mono text-sm mb-1">
                        {String(task.task_num).padStart(2, '0')} "{task.title}"
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => router.push('/new')}
                    className="w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <span className="text-sm text-gray-400">+ CREATE</span>
                  </button>
                </>
              ) : (
                <div className="p-4 text-gray-400 text-center">
                  Select a Group
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
