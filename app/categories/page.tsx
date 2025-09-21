'use client'

import { useEffect, useState } from 'react'
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
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  
  // Creation/Edit state
  const [creatingUniverse, setCreatingUniverse] = useState(false)
  const [creatingPhylum, setCreatingPhylum] = useState(false)
  const [creatingFamily, setCreatingFamily] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [editingUniverse, setEditingUniverse] = useState<string | null>(null)
  const [editingPhylum, setEditingPhylum] = useState<string | null>(null)
  const [editingFamily, setEditingFamily] = useState<string | null>(null)
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  
  // Form state
  const [newUniverseName, setNewUniverseName] = useState('')
  const [newUniverseCode, setNewUniverseCode] = useState('')
  const [newPhylumName, setNewPhylumName] = useState('')
  const [newPhylumCode, setNewPhylumCode] = useState('')
  const [newFamilyName, setNewFamilyName] = useState('')
  const [newFamilyCode, setNewFamilyCode] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupNum, setNewGroupNum] = useState('')
  
  // Edit form state
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPhylum])

  useEffect(() => {
    if (selectedPhylum && selectedGroup) {
      loadTasks()
    } else {
      setTasks([])
      setSelectedTask(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPhylum, selectedFamily, selectedGroup])

  async function loadUniverses() {
    const { data } = await supabase
      .from('universes')
      .select('*')
      .order('display_order')
      .order('code')
    setUniverses(data || [])
  }

  async function loadPhylums() {
    if (!selectedUniverse) return
    const { data } = await supabase
      .from('phyla')
      .select('*')
      .eq('universe_id', selectedUniverse.id)
      .order('display_order')
      .order('code')
    setPhylums(data || [])
  }

  async function loadFamilies() {
    if (!selectedPhylum) return
    const { data } = await supabase
      .from('families')
      .select('*')
      .eq('phylum_id', selectedPhylum.id)
      .order('display_order')
      .order('code')
    setFamilies(data || [])
  }

  async function loadGroups() {
    if (!selectedPhylum || !selectedUniverse) return
    
    const query = supabase
      .from('groups')
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
  }

  async function loadTasks() {
    if (!selectedPhylum || !selectedUniverse || !selectedGroup) return
    
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
  }

  async function createUniverse() {
    if (!newUniverseName || !newUniverseCode) return
    
    const { data } = await supabase
      .from('universes')
      .insert({
        code: newUniverseCode.toUpperCase().slice(0, 1),
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
        code: newPhylumCode.toUpperCase().slice(0, 1),
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
        code: newFamilyCode.toUpperCase().slice(0, 1),
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

  async function createGroup() {
    if (!newGroupName || !newGroupNum || !selectedPhylum || !selectedUniverse) return
    
    const { data } = await supabase
      .from('groups')
      .insert({
        universe_id: selectedUniverse.id,
        phylum_id: selectedPhylum.id,
        family_id: selectedFamily?.id || null,
        group_num: parseInt(newGroupNum),
        name: newGroupName
      })
      .select()
      .single()
    
    if (data) {
      setGroups([...groups, data])
      setSelectedGroup(data)
      setNewGroupName('')
      setNewGroupNum('')
      setCreatingGroup(false)
    }
  }

  async function updateCategory(type: 'universe' | 'phylum' | 'family' | 'group', id: string) {
    const table = type === 'group' ? 'groups' : type === 'universe' ? 'universes' : type === 'phylum' ? 'phyla' : 'families'
    
    const updateData: any = { name: editName }
    if (type !== 'group') {
      updateData.code = editCode.toUpperCase().slice(0, 1)
    }
    
    const { data } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (data) {
      if (type === 'universe') {
        setUniverses(universes.map(u => u.id === id ? data : u))
        setEditingUniverse(null)
      } else if (type === 'phylum') {
        setPhylums(phylums.map(p => p.id === id ? data : p))
        setEditingPhylum(null)
      } else if (type === 'family') {
        setFamilies(families.map(f => f.id === id ? data : f))
        setEditingFamily(null)
      } else if (type === 'group') {
        loadGroups()
        setEditingGroup(null)
      }
      setEditName('')
      setEditCode('')
    }
  }

  function startEdit(type: 'universe' | 'phylum' | 'family' | 'group', item: any) {
    setEditName(item.name)
    setEditCode(item.code || '')
    
    if (type === 'universe') setEditingUniverse(item.id)
    else if (type === 'phylum') setEditingPhylum(item.id)
    else if (type === 'family') setEditingFamily(item.id)
    else if (type === 'group') setEditingGroup(item.id)
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
                  onClick={() => editingUniverse !== universe.id && setSelectedUniverse(universe)}
                  className={`p-4 cursor-pointer border-b hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    selectedUniverse?.id === universe.id 
                      ? 'bg-yellow-100 dark:bg-yellow-900/20' 
                      : ''
                  }`}
                >
                  {editingUniverse === universe.id ? (
                    <div className="space-y-2" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value.toUpperCase().slice(0, 1))}
                        className="w-12 px-2 py-1 bg-white dark:bg-gray-700 rounded"
                        placeholder="Code"
                        maxLength={1}
                      />
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1 bg-white dark:bg-gray-700 rounded"
                        placeholder="Name"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateCategory('universe', universe.id)}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingUniverse(null)}
                          className="px-2 py-1 bg-gray-400 text-white rounded text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{universe.code.toUpperCase()}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">({universe.name})</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          startEdit('universe', universe)
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Create Universe */}
              {!creatingUniverse ? (
                <button
                  onClick={() => setCreatingUniverse(true)}
                  className="w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <span className="text-2xl text-gray-400">+ CREATE</span>
                </button>
              ) : (
                <div className="p-4 bg-gray-100 dark:bg-gray-800">
                  <input
                    type="text"
                    placeholder="Code (1 letter)"
                    value={newUniverseCode}
                    onChange={(e) => setNewUniverseCode(e.target.value.toUpperCase().slice(0, 1))}
                    className="w-full mb-2 px-2 py-1 bg-white dark:bg-gray-700 rounded"
                    maxLength={1}
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
                      onClick={() => editingPhylum !== phylum.id && setSelectedPhylum(phylum)}
                      className={`p-4 cursor-pointer border-b hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        selectedPhylum?.id === phylum.id 
                          ? 'bg-yellow-100 dark:bg-yellow-900/20' 
                          : ''
                      }`}
                    >
                      {editingPhylum === phylum.id ? (
                        <div className="space-y-2" onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editCode}
                            onChange={(e) => setEditCode(e.target.value.toUpperCase().slice(0, 1))}
                            className="w-12 px-2 py-1 bg-white dark:bg-gray-700 rounded"
                            placeholder="Code"
                            maxLength={1}
                          />
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2 py-1 bg-white dark:bg-gray-700 rounded"
                            placeholder="Name"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateCategory('phylum', phylum.id)}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingPhylum(null)}
                              className="px-2 py-1 bg-gray-400 text-white rounded text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">{phylum.code.toUpperCase()}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">({phylum.name})</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              startEdit('phylum', phylum)
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            ✏️
                          </button>
                        </div>
                      )}
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
                        placeholder="Code (1 letter)"
                        value={newPhylumCode}
                        onChange={(e) => setNewPhylumCode(e.target.value.toUpperCase().slice(0, 1))}
                        className="w-full mb-2 px-2 py-1 bg-white dark:bg-gray-700 rounded"
                        maxLength={1}
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
                      onClick={() => editingFamily !== family.id && setSelectedFamily(family)}
                      className={`p-4 cursor-pointer border-b hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        selectedFamily?.id === family.id 
                          ? 'bg-yellow-100 dark:bg-yellow-900/20' 
                          : ''
                      }`}
                    >
                      {editingFamily === family.id ? (
                        <div className="space-y-2" onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editCode}
                            onChange={(e) => setEditCode(e.target.value.toUpperCase().slice(0, 1))}
                            className="w-12 px-2 py-1 bg-white dark:bg-gray-700 rounded"
                            placeholder="Code"
                            maxLength={1}
                          />
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2 py-1 bg-white dark:bg-gray-700 rounded"
                            placeholder="Name"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateCategory('family', family.id)}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingFamily(null)}
                              className="px-2 py-1 bg-gray-400 text-white rounded text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">{family.code.toUpperCase()}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">({family.name})</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              startEdit('family', family)
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            ✏️
                          </button>
                        </div>
                      )}
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
                        placeholder="Code (1 letter)"
                        value={newFamilyCode}
                        onChange={(e) => setNewFamilyCode(e.target.value.toUpperCase().slice(0, 1))}
                        className="w-full mb-2 px-2 py-1 bg-white dark:bg-gray-700 rounded"
                        maxLength={1}
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
                      key={group.id || group.group_num}
                      onClick={() => editingGroup !== group.id && setSelectedGroup(group)}
                      className={`p-4 cursor-pointer border-b hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        selectedGroup?.group_num === group.group_num 
                          ? 'bg-yellow-100 dark:bg-yellow-900/20' 
                          : ''
                      }`}
                    >
                      {editingGroup === group.id ? (
                        <div className="space-y-2" onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2 py-1 bg-white dark:bg-gray-700 rounded"
                            placeholder="Group Name"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateCategory('group', group.id!)}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingGroup(null)}
                              className="px-2 py-1 bg-gray-400 text-white rounded text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-mono">
                            {String(group.group_num).padStart(2, '0')} - {group.name}
                          </span>
                          {group.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                startEdit('group', group)
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {!creatingGroup ? (
                    <button
                      onClick={() => setCreatingGroup(true)}
                      className="w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <span className="text-lg text-gray-400">+ CREATE</span>
                    </button>
                  ) : (
                    <div className="p-4 bg-gray-100 dark:bg-gray-800">
                      <input
                        type="text"
                        placeholder="Group Number"
                        value={newGroupNum}
                        onChange={(e) => setNewGroupNum(e.target.value.replace(/\D/g, '').slice(0, 2))}
                        className="w-full mb-2 px-2 py-1 bg-white dark:bg-gray-700 rounded"
                        maxLength={2}
                      />
                      <input
                        type="text"
                        placeholder="Group Name"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="w-full mb-2 px-2 py-1 bg-white dark:bg-gray-700 rounded"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={createGroup}
                          className="px-3 py-1 bg-blue-600 text-white rounded"
                        >
                          Create
                        </button>
                        <button
                          onClick={() => {
                            setCreatingGroup(false)
                            setNewGroupName('')
                            setNewGroupNum('')
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

          {/* Task Column */}
          <div className="flex-1">
            <div className="bg-blue-100 dark:bg-blue-900/20 p-4 border-b border-gray-300 dark:border-gray-700">
              <h2 className="font-bold text-blue-600 dark:text-blue-400">TASK</h2>
            </div>
            <div className="h-full overflow-y-auto">
              {selectedGroup ? (
                <>
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => router.push(`/t/${task.base_code || task.code}`)}
                      className={`p-4 cursor-pointer border-b hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        selectedTask?.id === task.id 
                          ? 'bg-yellow-100 dark:bg-yellow-900/20' 
                          : ''
                      }`}
                    >
                      <div>
                        <div className="font-mono text-sm mb-1">
                          {String(task.task_num).padStart(2, '0')} - &quot;{task.title}&quot;
                        </div>
                        {task.current_status && (
                          <div className="text-xs text-gray-500">
                            Status: {task.current_status_name}
                          </div>
                        )}
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
}
