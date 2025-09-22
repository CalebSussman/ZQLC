'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Universe, Phylum, Family, Task } from '@/lib/supabase'

interface Group {
  id?: string
  universe_id: string
  phylum_id: string
  family_id?: string
  group_num: number
  name: string
  description?: string
  task_count?: number
}

export default function BrowsePage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileTab, setMobileTab] = useState<'UNI' | 'PHY' | 'FAM' | 'GRP' | 'TSK'>('UNI')

  // Data
  const [universes, setUniverses] = useState<Universe[]>([])
  const [phylums, setPhylums] = useState<Phylum[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [tasks, setTasks] = useState<Task[]>([])

  // Selection
  const [selectedUniverse, setSelectedUniverse] = useState<Universe | null>(null)
  const [selectedPhylum, setSelectedPhylum] = useState<Phylum | null>(null)
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)

  // Creation state
  const [creatingUniverse, setCreatingUniverse] = useState(false)
  const [creatingPhylum, setCreatingPhylum] = useState(false)
  const [creatingFamily, setCreatingFamily] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)

  // Form state
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newGroupNum, setNewGroupNum] = useState('')

  // Load functions
  const loadUniverses = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('universes')
        .select('*')
        .order('display_order')
      setUniverses(data || [])
    } catch (error) {
      console.error('Error loading universes:', error)
    }
  }, [])

  const loadPhylums = useCallback(async () => {
    if (!selectedUniverse) return
    try {
      const { data } = await supabase
        .from('phyla')
        .select('*')
        .eq('universe_id', selectedUniverse.id)
        .order('display_order')
      setPhylums(data || [])
    } catch (error) {
      console.error('Error loading phylums:', error)
    }
  }, [selectedUniverse])

  const loadFamilies = useCallback(async () => {
    if (!selectedPhylum) return
    try {
      const { data } = await supabase
        .from('families')
        .select('*')
        .eq('phylum_id', selectedPhylum.id)
        .order('display_order')
      setFamilies(data || [])
    } catch (error) {
      console.error('Error loading families:', error)
    }
  }, [selectedPhylum])

  const loadGroups = useCallback(async () => {
    if (!selectedPhylum || !selectedUniverse) return
    try {
      const query = supabase
        .from('groups_with_counts')
        .select('*')
        .eq('universe_id', selectedUniverse.id)
        .eq('phylum_id', selectedPhylum.id)

      if (selectedFamily) {
        query.eq('family_id', selectedFamily.id)
      } else {
        query.is('family_id', null)
      }

      const { data } = await query.order('group_num')
      setGroups(data || [])
    } catch (error) {
      console.error('Error loading groups:', error)
    }
  }, [selectedPhylum, selectedUniverse, selectedFamily])

  const loadTasks = useCallback(async () => {
    if (!selectedPhylum || !selectedUniverse || !selectedGroup) return
    try {
      const query = supabase
        .from('task_details')
        .select('*')
        .eq('universe_id', selectedUniverse.id)
        .eq('phylum_id', selectedPhylum.id)
        .eq('group_num', selectedGroup.group_num)

      if (selectedFamily) {
        query.eq('family_id', selectedFamily.id)
      }

      const { data } = await query.order('task_num')
      setTasks(data || [])
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }, [selectedPhylum, selectedUniverse, selectedGroup, selectedFamily])

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true)
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Load data after mounting
    loadUniverses()

    return () => window.removeEventListener('resize', checkMobile)
  }, [loadUniverses])

  useEffect(() => {
    if (mounted && selectedUniverse) {
      loadPhylums()
      if (isMobile) setMobileTab('PHY')
    }
  }, [selectedUniverse, mounted, isMobile, loadPhylums])

  useEffect(() => {
    if (mounted && selectedPhylum) {
      loadFamilies()
      loadGroups()
      if (isMobile) setMobileTab('FAM')
    }
  }, [selectedPhylum, mounted, isMobile, loadFamilies, loadGroups])

  useEffect(() => {
    if (mounted && selectedPhylum && selectedGroup) {
      loadTasks()
      if (isMobile) setMobileTab('TSK')
    }
  }, [selectedGroup, mounted, selectedPhylum, isMobile, loadTasks])

  // Don't render anything until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] dark:bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-gray-500 font-mono">Loading...</div>
      </div>
    )
  }

  async function createUniverse() {
    if (!newCode || !newName) return
    try {
      const { data } = await supabase
        .from('universes')
        .insert({
          code: newCode.toUpperCase().slice(0, 1),
          name: newName,
          color: '#' + Math.floor(Math.random()*16777215).toString(16)
        })
        .select()
        .single()

      if (data) {
        setUniverses([...universes, data])
        setCreatingUniverse(false)
        setNewCode('')
        setNewName('')
      }
    } catch (error) {
      console.error('Error creating universe:', error)
    }
  }

  async function createPhylum() {
    if (!newCode || !newName || !selectedUniverse) return
    try {
      const { data } = await supabase
        .from('phyla')
        .insert({
          universe_id: selectedUniverse.id,
          code: newCode.toUpperCase().slice(0, 1),
          name: newName
        })
        .select()
        .single()

      if (data) {
        setPhylums([...phylums, data])
        setCreatingPhylum(false)
        setNewCode('')
        setNewName('')
      }
    } catch (error) {
      console.error('Error creating phylum:', error)
    }
  }

  async function createFamily() {
    if (!newCode || !newName || !selectedPhylum) return
    try {
      const { data } = await supabase
        .from('families')
        .insert({
          phylum_id: selectedPhylum.id,
          code: newCode.toUpperCase().slice(0, 1),
          name: newName
        })
        .select()
        .single()

      if (data) {
        setFamilies([...families, data])
        setCreatingFamily(false)
        setNewCode('')
        setNewName('')
      }
    } catch (error) {
      console.error('Error creating family:', error)
    }
  }

  async function createGroup() {
    if (!newGroupNum || !newName || !selectedPhylum || !selectedUniverse) return
    try {
      await supabase
        .from('groups')
        .insert({
          universe_id: selectedUniverse.id,
          phylum_id: selectedPhylum.id,
          family_id: selectedFamily?.id || null,
          group_num: parseInt(newGroupNum),
          name: newName
        })

      loadGroups()
      setCreatingGroup(false)
      setNewGroupNum('')
      setNewName('')
    } catch (error) {
      console.error('Error creating group:', error)
    }
  }

  // Column component for desktop
  const Column = ({ title, color, children }: { title: string; color: string; children: React.ReactNode }) => (
    <div className="flex-1 flex flex-col h-full border-r border-gray-300 dark:border-gray-700 last:border-r-0">
      <div className={`p-4 border-b border-gray-300 dark:border-gray-700 ${color}`}>
        <h2 className="font-mono font-bold text-sm">{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )

  if (isMobile) {
    // Mobile Tab View
    return (
      <div className="min-h-screen bg-[#F8F7F4] dark:bg-[#0A0A0B]">
        {/* Tab Bar */}
        <div className="flex border-b-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
          {(['UNI', 'PHY', 'FAM', 'GRP', 'TSK'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={`flex-1 p-3 font-mono font-bold text-sm ${
                mobileTab === tab
                  ? 'bg-yellow-100 dark:bg-yellow-900/20 border-b-2 border-yellow-500'
                  : 'text-gray-500'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {mobileTab === 'UNI' && (
            <div className="space-y-2">
              {universes.map((universe) => (
                <button
                  key={universe.id}
                  onClick={() => setSelectedUniverse(universe)}
                  className={`w-full text-left p-4 rounded-lg font-mono ${
                    selectedUniverse?.id === universe.id
                      ? 'bg-yellow-100 dark:bg-yellow-900/20 ring-2 ring-yellow-500'
                      : 'bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="text-xl font-bold">{universe.code}</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">{universe.name}</span>
                  <div className="mt-1 h-2 bg-gray-200 dark:bg-gray-700 rounded">
                    <div className="h-full bg-yellow-500 rounded" style={{ width: '60%' }} />
                  </div>
                </button>
              ))}
              <button
                onClick={() => setCreatingUniverse(true)}
                className="w-full p-4 border-2 border-dashed border-gray-400 rounded-lg font-mono text-gray-500"
              >
                + CREATE NEW
              </button>
            </div>
          )}

          {mobileTab === 'PHY' && selectedUniverse && (
            <div className="space-y-2">
              {phylums.map((phylum) => (
                <button
                  key={phylum.id}
                  onClick={() => setSelectedPhylum(phylum)}
                  className={`w-full text-left p-4 rounded-lg font-mono ${
                    selectedPhylum?.id === phylum.id
                      ? 'bg-yellow-100 dark:bg-yellow-900/20 ring-2 ring-yellow-500'
                      : 'bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="text-xl font-bold">{phylum.code}</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">{phylum.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Similar patterns for FAM, GRP, TSK tabs would go here */}
        </div>
      </div>
    )
  }

  // Desktop 5-Column View
  return (
    <div className="h-screen flex flex-col bg-[#F8F7F4] dark:bg-[#0A0A0B]">
      <div className="flex-1 flex overflow-hidden">
        {/* Universe Column */}
        <Column title="UNIVERSE" color="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400">
          {universes.map((universe) => (
            <div
              key={universe.id}
              onClick={() => setSelectedUniverse(universe)}
              className={`p-4 cursor-pointer border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                selectedUniverse?.id === universe.id ? 'bg-yellow-100 dark:bg-yellow-900/20' : ''
              }`}
            >
              <div className="font-mono">
                <span className="text-xl font-bold">{universe.code}</span>
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">({universe.name})</span>
              </div>
              {selectedUniverse?.id === universe.id && (
                <div className="mt-2 h-1 bg-gradient-to-r from-yellow-400 to-yellow-500" />
              )}
            </div>
          ))}

          {!creatingUniverse ? (
            <button
              onClick={() => setCreatingUniverse(true)}
              className="w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800 font-mono text-gray-500"
            >
              + CREATE
            </button>
          ) : (
            <div className="p-4 bg-gray-100 dark:bg-gray-800">
              <input
                type="text"
                placeholder="Code"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase().slice(0, 1))}
                className="w-full mb-2 px-2 py-1 font-mono bg-white dark:bg-gray-700 rounded"
                maxLength={1}
              />
              <input
                type="text"
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full mb-2 px-2 py-1 font-mono bg-white dark:bg-gray-700 rounded"
              />
              <div className="flex gap-2">
                <button onClick={createUniverse} className="px-3 py-1 bg-blue-600 text-white rounded">Create</button>
                <button onClick={() => setCreatingUniverse(false)} className="px-3 py-1 bg-gray-400 text-white rounded">Cancel</button>
              </div>
            </div>
          )}
        </Column>

        {/* Phylum Column */}
        <Column title="PHYLUM" color="bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400">
          {selectedUniverse ? (
            <>
              {phylums.map((phylum) => (
                <div
                  key={phylum.id}
                  onClick={() => setSelectedPhylum(phylum)}
                  className={`p-4 cursor-pointer border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    selectedPhylum?.id === phylum.id ? 'bg-yellow-100 dark:bg-yellow-900/20' : ''
                  }`}
                >
                  <div className="font-mono">
                    <span className="text-xl font-bold">{phylum.code}</span>
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">({phylum.name})</span>
                  </div>
                </div>
              ))}

              {!creatingPhylum ? (
                <button
                  onClick={() => setCreatingPhylum(true)}
                  className="w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800 font-mono text-gray-500"
                >
                  + CREATE
                </button>
              ) : (
                <div className="p-4 bg-gray-100 dark:bg-gray-800">
                  <input
                    type="text"
                    placeholder="Code"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase().slice(0, 1))}
                    className="w-full mb-2 px-2 py-1 font-mono bg-white dark:bg-gray-700 rounded"
                    maxLength={1}
                  />
                  <input
                    type="text"
                    placeholder="Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full mb-2 px-2 py-1 font-mono bg-white dark:bg-gray-700 rounded"
                  />
                  <div className="flex gap-2">
                    <button onClick={createPhylum} className="px-3 py-1 bg-blue-600 text-white rounded">Create</button>
                    <button onClick={() => setCreatingPhylum(false)} className="px-3 py-1 bg-gray-400 text-white rounded">Cancel</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 text-gray-400 text-center font-mono">Select a Universe</div>
          )}
        </Column>

        {/* Family Column */}
        <Column title="FAMILY" color="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">
          {selectedPhylum ? (
            <>
              {families.map((family) => (
                <div
                  key={family.id}
                  onClick={() => setSelectedFamily(family)}
                  className={`p-4 cursor-pointer border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    selectedFamily?.id === family.id ? 'bg-yellow-100 dark:bg-yellow-900/20' : ''
                  }`}
                >
                  <div className="font-mono">
                    <span className="text-lg font-bold">{family.code}</span>
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">({family.name})</span>
                  </div>
                </div>
              ))}

              {!creatingFamily ? (
                <button
                  onClick={() => setCreatingFamily(true)}
                  className="w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800 font-mono text-gray-500"
                >
                  + CREATE
                </button>
              ) : (
                <div className="p-4 bg-gray-100 dark:bg-gray-800">
                  <input
                    type="text"
                    placeholder="Code"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase().slice(0, 1))}
                    className="w-full mb-2 px-2 py-1 font-mono bg-white dark:bg-gray-700 rounded"
                    maxLength={1}
                  />
                  <input
                    type="text"
                    placeholder="Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full mb-2 px-2 py-1 font-mono bg-white dark:bg-gray-700 rounded"
                  />
                  <div className="flex gap-2">
                    <button onClick={createFamily} className="px-3 py-1 bg-blue-600 text-white rounded">Create</button>
                    <button onClick={() => setCreatingFamily(false) } className="px-3 py-1 bg-gray-400 text-white rounded">Cancel</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 text-gray-400 text-center font-mono">Select a Phylum</div>
          )}
        </Column>

        {/* Group Column */}
        <Column title="GROUP" color="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
          {selectedPhylum ? (
            <>
              {groups.map((group) => (
                <div
                  key={`${group.group_num}`}
                  onClick={() => setSelectedGroup(group)}
                  className={`p-4 cursor-pointer border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    selectedGroup?.group_num === group.group_num ? 'bg-yellow-100 dark:bg-yellow-900/20' : ''
                  }`}
                >
                  <div className="font-mono">
                    <span className="font-bold">{String(group.group_num).padStart(2, '0')}</span>
                    <span className="ml-2 text-sm">- {group.name}</span>
                  </div>
                  {group.task_count !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">{group.task_count} tasks</div>
                  )}
                </div>
              ))}

              {!creatingGroup ? (
                <button
                  onClick={() => setCreatingGroup(true)}
                  className="w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800 font-mono text-gray-500"
                >
                  + CREATE
                </button>
              ) : (
                <div className="p-4 bg-gray-100 dark:bg-gray-800">
                  <input
                    type="text"
                    placeholder="Number"
                    value={newGroupNum}
                    onChange={(e) => setNewGroupNum(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    className="w-full mb-2 px-2 py-1 font-mono bg-white dark:bg-gray-700 rounded"
                    maxLength={2}
                  />
                  <input
                    type="text"
                    placeholder="Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full mb-2 px-2 py-1 font-mono bg-white dark:bg-gray-700 rounded"
                  />
                  <div className="flex gap-2">
                    <button onClick={createGroup} className="px-3 py-1 bg-blue-600 text-white rounded">Create</button>
                    <button onClick={() => setCreatingGroup(false)} className="px-3 py-1 bg-gray-400 text-white rounded">Cancel</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 text-gray-400 text-center font-mono">Select a Phylum</div>
          )}
        </Column>

        {/* Task Column */}
        <Column title="TASK" color="bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
          {selectedGroup ? (
            <>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => router.push(`/t/${task.base_code?.toLowerCase()}`)}
                  className="p-4 cursor-pointer border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="font-mono">
                    <div className="font-bold">{String(task.task_num).padStart(2, '0')} ...</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">&quot;{task.title}&quot;</div>
                    {task.current_status && (
                      <div className="text-xs text-gray-500 mt-1">Status: {task.current_status_name}</div>
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={() => router.push('/')}
                className="w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800 font-mono text-gray-500"
              >
                + CREATE
              </button>
            </>
          ) : (
            <div className="p-4 text-gray-400 text-center font-mono">Select a Group</div>
          )}
        </Column>
      </div>
    </div>
  )
}