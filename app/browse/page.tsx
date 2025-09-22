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

  // Form state - separate for each entity type
  const [universeCode, setUniverseCode] = useState('')
  const [universeName, setUniverseName] = useState('')
  const [phylumCode, setPhylumCode] = useState('')
  const [phylumName, setPhylumName] = useState('')
  const [familyCode, setFamilyCode] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [groupName, setGroupName] = useState('')
  const [newGroupNum, setNewGroupNum] = useState('')

  // Edit state
  const [editingItem, setEditingItem] = useState<'universe' | 'phylum' | 'family' | 'group' | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editError, setEditError] = useState('')

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
    console.log('createUniverse called with:', { universeCode, universeName })
    console.log('Validation check:', {
      universeCodeTruthy: !!universeCode,
      universeNameTruthy: !!universeName,
      universeCodeLength: universeCode?.length,
      universeNameLength: universeName?.length
    })
    if (!universeCode || !universeName) {
      console.log('Validation failed - missing code or name', { universeCode, universeName })
      return
    }
    console.log('Validation passed, proceeding with database insert')
    console.log('About to call Supabase with:', {
      code: universeCode.toUpperCase().slice(0, 1),
      name: universeName,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      display_order: universes.length + 1
    })

    try {
      console.log('Calling Supabase insert...')
      const result = await supabase
        .from('universes')
        .insert({
          code: universeCode.toUpperCase().slice(0, 1),
          name: universeName,
          color: '#' + Math.floor(Math.random()*16777215).toString(16),
          display_order: universes.length + 1
        })
        .select()
        .single()

      console.log('Supabase call completed:', result)
      const { data, error } = result
      console.log('Destructured response:', { data, error })

      if (error) {
        console.error('Supabase error:', error)
        alert(`Error creating universe: ${error.message}`)
        return
      }

      if (data) {
        console.log('Current universes before update:', universes.length, universes)

        // Use functional state update to ensure React detects the change
        setUniverses(prevUniverses => {
          const newUniverses = [...prevUniverses, data]
          console.log('New universes array:', newUniverses.length, newUniverses)
          return newUniverses
        })

        setCreatingUniverse(false)
        setUniverseCode('')
        setUniverseName('')
        console.log('Universe created successfully:', data)
        console.log('State updates called - universe should appear in UI')

        // Force a re-render by reloading from database
        setTimeout(() => {
          console.log('Reloading universes from database...')
          loadUniverses()
        }, 100)
      } else {
        console.log('No data returned from insert')
      }
    } catch (error) {
      console.error('Caught exception in createUniverse:', error)
      console.error('Error type:', typeof error)
      console.error('Error details:', {
        message: (error as any)?.message,
        stack: (error as any)?.stack,
        name: (error as any)?.name
      })
      alert(`Failed to create universe: ${(error as any)?.message || error}`)
    }
  }

  async function createPhylum() {
    if (!phylumCode || !phylumName || !selectedUniverse) return
    try {
      const { data } = await supabase
        .from('phyla')
        .insert({
          universe_id: selectedUniverse.id,
          code: phylumCode.toUpperCase().slice(0, 1),
          name: phylumName
        })
        .select()
        .single()

      if (data) {
        setPhylums([...phylums, data])
        setCreatingPhylum(false)
        setPhylumCode('')
        setPhylumName('')
      }
    } catch (error) {
      console.error('Error creating phylum:', error)
    }
  }

  async function createFamily() {
    if (!familyCode || !familyName || !selectedPhylum) return
    try {
      const { data } = await supabase
        .from('families')
        .insert({
          phylum_id: selectedPhylum.id,
          code: familyCode.toUpperCase().slice(0, 1),
          name: familyName
        })
        .select()
        .single()

      if (data) {
        setFamilies([...families, data])
        setCreatingFamily(false)
        setFamilyCode('')
        setFamilyName('')
      }
    } catch (error) {
      console.error('Error creating family:', error)
    }
  }

  async function createGroup() {
    if (!newGroupNum || !groupName || !selectedPhylum || !selectedUniverse) return
    try {
      await supabase
        .from('groups')
        .insert({
          universe_id: selectedUniverse.id,
          phylum_id: selectedPhylum.id,
          family_id: selectedFamily?.id || null,
          group_num: parseInt(newGroupNum),
          name: groupName
        })

      loadGroups()
      setCreatingGroup(false)
      setNewGroupNum('')
      setGroupName('')
    } catch (error) {
      console.error('Error creating group:', error)
    }
  }

  // Update functions
  async function updateUniverse(id: string, code: string, name: string) {
    try {
      const { error } = await supabase
        .from('universes')
        .update({ code: code.toUpperCase().slice(0, 1), name })
        .eq('id', id)

      if (error) throw error

      setUniverses(universes.map(u => u.id === id ? { ...u, code: code.toUpperCase().slice(0, 1), name } : u))
      setEditingItem(null)
      setEditingId(null)
      setEditName('')
      setEditCode('')
    } catch (error) {
      console.error('Error updating universe:', error)
      alert('Failed to update universe')
    }
  }

  async function updatePhylum(id: string, code: string, name: string) {
    try {
      const { error } = await supabase
        .from('phyla')
        .update({ code: code.toUpperCase().slice(0, 1), name })
        .eq('id', id)

      if (error) throw error

      setPhylums(phylums.map(p => p.id === id ? { ...p, code: code.toUpperCase().slice(0, 1), name } : p))
      setEditingItem(null)
      setEditingId(null)
      setEditName('')
      setEditCode('')
    } catch (error) {
      console.error('Error updating phylum:', error)
      alert('Failed to update phylum')
    }
  }

  async function updateFamily(id: string, code: string, name: string) {
    try {
      const { error } = await supabase
        .from('families')
        .update({ code: code.toUpperCase().slice(0, 1), name })
        .eq('id', id)

      if (error) throw error

      setFamilies(families.map(f => f.id === id ? { ...f, code: code.toUpperCase().slice(0, 1), name } : f))
      setEditingItem(null)
      setEditingId(null)
      setEditName('')
      setEditCode('')
    } catch (error) {
      console.error('Error updating family:', error)
      alert('Failed to update family')
    }
  }

  async function updateGroup(id: string, name: string) {
    try {
      const { error } = await supabase
        .from('groups')
        .update({ name })
        .eq('id', id)

      if (error) throw error

      setGroups(groups.map(g => g.id === id ? { ...g, name } : g))
      setEditingItem(null)
      setEditingId(null)
      setEditName('')
      setEditCode('')
    } catch (error) {
      console.error('Error updating group:', error)
      alert('Failed to update group')
    }
  }

  // Edit helper functions
  const startEdit = (type: 'universe' | 'phylum' | 'family' | 'group', id: string, currentCode: string, currentName: string) => {
    setEditingItem(type)
    setEditingId(id)
    setEditCode(currentCode)
    setEditName(currentName)
  }

  const cancelEdit = () => {
    setEditingItem(null)
    setEditingId(null)
    setEditName('')
    setEditCode('')
    setEditError('')
  }

  const saveEdit = async () => {
    if (!editingItem || !editingId) return

    setEditError('')

    // Validation
    if (!editName.trim()) {
      setEditError('Name is required')
      return
    }

    if (editingItem !== 'group' && !editCode.trim()) {
      setEditError('Code is required')
      return
    }

    // Check for duplicate codes
    if (editingItem !== 'group') {
      const isDuplicate = (() => {
        switch (editingItem) {
          case 'universe':
            return universes.some(u => u.id !== editingId && u.code.toLowerCase() === editCode.toLowerCase())
          case 'phylum':
            return phylums.some(p => p.id !== editingId && p.code.toLowerCase() === editCode.toLowerCase())
          case 'family':
            return families.some(f => f.id !== editingId && f.code.toLowerCase() === editCode.toLowerCase())
          default:
            return false
        }
      })()

      if (isDuplicate) {
        setEditError(`Code "${editCode}" already exists`)
        return
      }
    }

    switch (editingItem) {
      case 'universe':
        await updateUniverse(editingId, editCode, editName)
        break
      case 'phylum':
        await updatePhylum(editingId, editCode, editName)
        break
      case 'family':
        await updateFamily(editingId, editCode, editName)
        break
      case 'group':
        await updateGroup(editingId, editName)
        break
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
                <div key={universe.id} className="relative">
                  {editingItem === 'universe' && editingId === universe.id ? (
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value.toUpperCase().slice(0, 1))}
                          className="w-12 px-2 py-1 font-mono bg-gray-100 dark:bg-gray-700 rounded text-center"
                          maxLength={1}
                          placeholder="C"
                        />
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 font-mono bg-gray-100 dark:bg-gray-700 rounded"
                          placeholder="Name"
                        />
                      </div>
                      {editError && (
                        <div className="text-red-600 text-xs">{editError}</div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 bg-gray-400 text-white rounded text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`p-4 rounded-lg font-mono ${
                        selectedUniverse?.id === universe.id
                          ? 'bg-yellow-100 dark:bg-yellow-900/20 ring-2 ring-yellow-500'
                          : 'bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div
                        onClick={() => setSelectedUniverse(universe)}
                        className="cursor-pointer"
                      >
                        <span className="text-xl font-bold">{universe.code}</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">{universe.name}</span>
                        <div className="mt-1 h-2 bg-gray-200 dark:bg-gray-700 rounded">
                          <div className="h-full bg-yellow-500 rounded" style={{ width: '60%' }} />
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          startEdit('universe', universe.id, universe.code, universe.name)
                        }}
                        className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600"
                        title="Edit"
                      >
                        ∴
                      </button>
                    </div>
                  )}
                </div>
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
                <div key={phylum.id} className="relative">
                  {editingItem === 'phylum' && editingId === phylum.id ? (
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value.toUpperCase().slice(0, 1))}
                          className="w-12 px-2 py-1 font-mono bg-gray-100 dark:bg-gray-700 rounded text-center"
                          maxLength={1}
                          placeholder="C"
                        />
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 font-mono bg-gray-100 dark:bg-gray-700 rounded"
                          placeholder="Name"
                        />
                      </div>
                      {editError && (
                        <div className="text-red-600 text-xs">{editError}</div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 bg-gray-400 text-white rounded text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`p-4 rounded-lg font-mono ${
                        selectedPhylum?.id === phylum.id
                          ? 'bg-yellow-100 dark:bg-yellow-900/20 ring-2 ring-yellow-500'
                          : 'bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div
                        onClick={() => setSelectedPhylum(phylum)}
                        className="cursor-pointer"
                      >
                        <span className="text-xl font-bold">{phylum.code}</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">{phylum.name}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          startEdit('phylum', phylum.id, phylum.code, phylum.name)
                        }}
                        className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600"
                        title="Edit"
                      >
                        ∴
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {mobileTab === 'FAM' && selectedPhylum && (
            <div className="space-y-2">
              {families.map((family) => (
                <div key={family.id} className="relative">
                  {editingItem === 'family' && editingId === family.id ? (
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value.toUpperCase().slice(0, 1))}
                          className="w-12 px-2 py-1 font-mono bg-gray-100 dark:bg-gray-700 rounded text-center"
                          maxLength={1}
                          placeholder="C"
                        />
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 font-mono bg-gray-100 dark:bg-gray-700 rounded"
                          placeholder="Name"
                        />
                      </div>
                      {editError && (
                        <div className="text-red-600 text-xs">{editError}</div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 bg-gray-400 text-white rounded text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`p-4 rounded-lg font-mono ${
                        selectedFamily?.id === family.id
                          ? 'bg-yellow-100 dark:bg-yellow-900/20 ring-2 ring-yellow-500'
                          : 'bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div
                        onClick={() => setSelectedFamily(family)}
                        className="cursor-pointer"
                      >
                        <span className="text-xl font-bold">{family.code}</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">{family.name}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          startEdit('family', family.id, family.code, family.name)
                        }}
                        className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600"
                        title="Edit"
                      >
                        ∴
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {mobileTab === 'GRP' && selectedPhylum && (
            <div className="space-y-2">
              {groups.map((group) => (
                <div key={group.group_num} className="relative">
                  {editingItem === 'group' && editingId === group.id ? (
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1 font-mono bg-gray-100 dark:bg-gray-700 rounded"
                        placeholder="Group name"
                      />
                      {editError && (
                        <div className="text-red-600 text-xs">{editError}</div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 bg-gray-400 text-white rounded text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`p-4 rounded-lg font-mono ${
                        selectedGroup?.group_num === group.group_num
                          ? 'bg-yellow-100 dark:bg-yellow-900/20 ring-2 ring-yellow-500'
                          : 'bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div
                        onClick={() => setSelectedGroup(group)}
                        className="cursor-pointer"
                      >
                        <div className="font-bold">{String(group.group_num).padStart(2, '0')}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{group.name}</div>
                        {group.task_count !== undefined && (
                          <div className="text-xs text-gray-500 mt-1">{group.task_count} tasks</div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          startEdit('group', group.id || String(group.group_num), '', group.name)
                        }}
                        className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600"
                        title="Edit"
                      >
                        ∴
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {mobileTab === 'TSK' && selectedGroup && (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => window.location.href = `/t/${task.code}`}
                  className="p-4 bg-white dark:bg-gray-900 rounded-lg font-mono hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <div className="font-bold text-lg">{task.code}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.title}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    Status: {task.status} | Priority: {task.priority} | Group: {String(task.group_num).padStart(2, '0')}
                  </div>
                </div>
              ))}
            </div>
          )}
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
              className={`p-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                selectedUniverse?.id === universe.id ? 'bg-yellow-100 dark:bg-yellow-900/20' : ''
              }`}
            >
              {editingItem === 'universe' && editingId === universe.id ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value.toUpperCase().slice(0, 1))}
                      className="w-12 px-2 py-1 font-mono bg-white dark:bg-gray-700 rounded text-center"
                      maxLength={1}
                      placeholder="C"
                    />
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 font-mono bg-white dark:bg-gray-700 rounded"
                      placeholder="Name"
                    />
                  </div>
                  {editError && (
                    <div className="text-red-600 text-xs">{editError}</div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="px-3 py-1 bg-green-600 text-white rounded text-xs"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1 bg-gray-400 text-white rounded text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="group relative">
                  <div
                    onClick={() => setSelectedUniverse(universe)}
                    className="cursor-pointer font-mono"
                  >
                    <span className="text-xl font-bold">{universe.code}</span>
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">({universe.name})</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      startEdit('universe', universe.id, universe.code, universe.name)
                    }}
                    className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-opacity"
                    title="Edit"
                  >
                    ∴
                  </button>
                  {selectedUniverse?.id === universe.id && (
                    <div className="mt-2 h-1 bg-gradient-to-r from-yellow-400 to-yellow-500" />
                  )}
                </div>
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
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={universeCode}
                    onChange={(e) => setUniverseCode(e.target.value.toUpperCase().slice(0, 1))}
                    className="w-12 px-2 py-1 font-mono bg-white dark:bg-gray-700 rounded text-center"
                    maxLength={1}
                    placeholder="C"
                  />
                  <input
                    type="text"
                    value={universeName}
                    onChange={(e) => setUniverseName(e.target.value)}
                    className="flex-1 px-2 py-1 font-mono bg-white dark:bg-gray-700 rounded"
                    placeholder="Name"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      console.log('Create button clicked')
                      console.log('Current state:', { universeCode, universeName })
                      createUniverse()
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded text-xs"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setCreatingUniverse(false)
                      setUniverseCode('')
                      setUniverseName('')
                    }}
                    className="px-3 py-1 bg-gray-400 text-white rounded text-xs"
                  >
                    Cancel
                  </button>
                </div>
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
                  className={`p-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    selectedPhylum?.id === phylum.id ? 'bg-yellow-100 dark:bg-yellow-900/20' : ''
                  }`}
                >
                  {editingItem === 'phylum' && editingId === phylum.id ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value.toUpperCase().slice(0, 1))}
                          className="w-12 px-2 py-1 font-mono bg-white dark:bg-gray-700 rounded text-center"
                          maxLength={1}
                          placeholder="C"
                        />
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 font-mono bg-white dark:bg-gray-700 rounded"
                          placeholder="Name"
                        />
                      </div>
                      {editError && (
                        <div className="text-red-600 text-xs">{editError}</div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 bg-gray-400 text-white rounded text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative">
                      <div
                        onClick={() => setSelectedPhylum(phylum)}
                        className="cursor-pointer font-mono"
                      >
                        <span className="text-xl font-bold">{phylum.code}</span>
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">({phylum.name})</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          startEdit('phylum', phylum.id, phylum.code, phylum.name)
                        }}
                        className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-opacity"
                        title="Edit"
                      >
                        ∴
                      </button>
                    </div>
                  )}
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
                    value={phylumCode}
                    onChange={(e) => setPhylumCode(e.target.value.toUpperCase().slice(0, 1))}
                    className="w-full mb-2 px-2 py-1 font-mono bg-white dark:bg-gray-700 rounded"
                    maxLength={1}
                  />
                  <input
                    type="text"
                    placeholder="Name"
                    value={phylumName}
                    onChange={(e) => setPhylumName(e.target.value)}
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
                  className={`p-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    selectedFamily?.id === family.id ? 'bg-yellow-100 dark:bg-yellow-900/20' : ''
                  }`}
                >
                  {editingItem === 'family' && editingId === family.id ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value.toUpperCase().slice(0, 1))}
                          className="w-12 px-2 py-1 font-mono bg-white dark:bg-gray-700 rounded text-center"
                          maxLength={1}
                          placeholder="C"
                        />
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 font-mono bg-white dark:bg-gray-700 rounded"
                          placeholder="Name"
                        />
                      </div>
                      {editError && (
                        <div className="text-red-600 text-xs">{editError}</div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 bg-gray-400 text-white rounded text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative">
                      <div
                        onClick={() => setSelectedFamily(family)}
                        className="cursor-pointer font-mono"
                      >
                        <span className="text-lg font-bold">{family.code}</span>
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">({family.name})</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          startEdit('family', family.id, family.code, family.name)
                        }}
                        className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-opacity"
                        title="Edit"
                      >
                        ∴
                      </button>
                    </div>
                  )}
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
                    value={familyCode}
                    onChange={(e) => setFamilyCode(e.target.value.toUpperCase().slice(0, 1))}
                    className="w-full mb-2 px-2 py-1 font-mono bg-white dark:bg-gray-700 rounded"
                    maxLength={1}
                  />
                  <input
                    type="text"
                    placeholder="Name"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
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
                  className={`p-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    selectedGroup?.group_num === group.group_num ? 'bg-yellow-100 dark:bg-yellow-900/20' : ''
                  }`}
                >
                  {editingItem === 'group' && editingId === group.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1 font-mono bg-white dark:bg-gray-700 rounded"
                        placeholder="Group name"
                      />
                      {editError && (
                        <div className="text-red-600 text-xs">{editError}</div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 bg-gray-400 text-white rounded text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative">
                      <div
                        onClick={() => setSelectedGroup(group)}
                        className="cursor-pointer font-mono"
                      >
                        <span className="font-bold">{String(group.group_num).padStart(2, '0')}</span>
                        <span className="ml-2 text-sm">- {group.name}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          startEdit('group', group.id || String(group.group_num), '', group.name)
                        }}
                        className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-opacity"
                        title="Edit"
                      >
                        ∴
                      </button>
                      {group.task_count !== undefined && (
                        <div className="text-xs text-gray-500 mt-1">{group.task_count} tasks</div>
                      )}
                    </div>
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
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
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