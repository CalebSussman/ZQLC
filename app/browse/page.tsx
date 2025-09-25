'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Universe, Phylum, Family, Task } from '@/lib/supabase'
import SimpleCreateForm from '@/components/SimpleCreateForm'
import CSVImportDialog from '@/components/CSVImportDialog'

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
  const [creatingTask, setCreatingTask] = useState(false)

  // Form state - separate for each entity type
  const [universeCode, setUniverseCode] = useState('')
  const [universeName, setUniverseName] = useState('')
  const [phylumCode, setPhylumCode] = useState('')
  const [phylumName, setPhylumName] = useState('')
  const [familyCode, setFamilyCode] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [groupName, setGroupName] = useState('')
  const [newGroupNum, setNewGroupNum] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskNum, setTaskNum] = useState('')

  // Edit state
  const [editingItem, setEditingItem] = useState<'universe' | 'phylum' | 'family' | 'group' | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editError, setEditError] = useState('')

  // CSV Import state
  const [showImportDialog, setShowImportDialog] = useState(false)

  // Load functions
  const loadUniverses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('universes')
        .select('*')
        .order('display_order')
      if (error) {
        console.error('Error in loadUniverses:', error)
      } else {
        setUniverses(data || [])
      }
    } catch (error) {
      console.error('Exception in loadUniverses:', error)
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

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load data after mounting - separate effect
  useEffect(() => {
    if (mounted) {
      loadUniverses()
    }
  }, [mounted])

  useEffect(() => {
    if (mounted && selectedUniverse) {
      loadPhylums()
      if (isMobile) setMobileTab('PHY')
    }
  }, [selectedUniverse, mounted, isMobile])

  useEffect(() => {
    if (mounted && selectedPhylum) {
      loadFamilies()
      loadGroups()
      if (isMobile) setMobileTab('FAM')
    }
  }, [selectedPhylum, mounted, isMobile])

  useEffect(() => {
    if (mounted && selectedPhylum && selectedGroup) {
      loadTasks()
      if (isMobile) setMobileTab('TSK')
    }
  }, [selectedGroup, mounted, selectedPhylum, isMobile])


  // Don't render anything until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] dark:bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-gray-500 font-mono">Loading...</div>
      </div>
    )
  }


  async function createUniverse(code?: string, name?: string) {
    const finalCode = code || universeCode
    const finalName = name || universeName

    if (!finalCode?.trim() || !finalName?.trim()) {
      alert('Please enter both a code and name')
      return
    }

    const trimmedCode = finalCode.trim().toUpperCase().slice(0, 1)

    // Check for duplicate codes before attempting to create
    const existingUniverse = universes.find(u => u.code === trimmedCode)
    if (existingUniverse) {
      alert(`A universe with code "${trimmedCode}" already exists: ${existingUniverse.name}`)
      return
    }

    try {

      const { data, error } = await supabase
        .from('universes')
        .insert({
          code: trimmedCode,
          name: finalName.trim(),
          color: '#' + Math.floor(Math.random()*16777215).toString(16),
          display_order: universes.length + 1
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        alert(`Error creating universe: ${error.message}`)
        return
      }

      if (data) {

        // Update local state immediately
        setUniverses(prev => [...prev, data])

        // Reset form
        setCreatingUniverse(false)
        setUniverseCode('')
        setUniverseName('')

        // Reload from database to ensure consistency
        await loadUniverses()
      }
    } catch (error) {
      console.error('Exception in createUniverse:', error)
      alert(`Failed to create universe: ${(error as any)?.message || error}`)
    }
  }

  async function createPhylum(code?: string, name?: string) {
    const finalCode = code || phylumCode
    const finalName = name || phylumName

    if (!finalCode?.trim() || !finalName?.trim() || !selectedUniverse) {
      alert('Please enter both a code and name')
      return
    }

    const trimmedCode = finalCode.trim().toUpperCase().slice(0, 1)

    // Check for duplicate codes
    const existingPhylum = phylums.find(p => p.code === trimmedCode)
    if (existingPhylum) {
      alert(`A phylum with code "${trimmedCode}" already exists: ${existingPhylum.name}`)
      return
    }

    try {
      const { data, error } = await supabase
        .from('phyla')
        .insert({
          universe_id: selectedUniverse.id,
          code: trimmedCode,
          name: finalName.trim()
        })
        .select()
        .single()

      if (error) {
        alert(`Error creating phylum: ${error.message}`)
        return
      }

      if (data) {
        setPhylums(prev => [...prev, data])
        setCreatingPhylum(false)
        setPhylumCode('')
        setPhylumName('')
        await loadPhylums()
      }
    } catch (error) {
      console.error('Error creating phylum:', error)
      alert(`Failed to create phylum: ${(error as any)?.message || error}`)
    }
  }

  async function createFamily(code?: string, name?: string) {
    const finalCode = code || familyCode
    const finalName = name || familyName

    if (!finalCode?.trim() || !finalName?.trim() || !selectedPhylum) {
      alert('Please enter both a code and name')
      return
    }

    const trimmedCode = finalCode.trim().toUpperCase().slice(0, 1)

    // Check for duplicate codes
    const existingFamily = families.find(f => f.code === trimmedCode)
    if (existingFamily) {
      alert(`A family with code "${trimmedCode}" already exists: ${existingFamily.name}`)
      return
    }

    try {
      const { data, error } = await supabase
        .from('families')
        .insert({
          phylum_id: selectedPhylum.id,
          code: trimmedCode,
          name: finalName.trim()
        })
        .select()
        .single()

      if (error) {
        alert(`Error creating family: ${error.message}`)
        return
      }

      if (data) {
        setFamilies(prev => [...prev, data])
        setCreatingFamily(false)
        setFamilyCode('')
        setFamilyName('')
        await loadFamilies()
      }
    } catch (error) {
      console.error('Error creating family:', error)
      alert(`Failed to create family: ${(error as any)?.message || error}`)
    }
  }

  async function createGroup(code?: string, name?: string) {
    const finalCode = code || newGroupNum
    const finalName = name || groupName

    if (!finalCode?.trim() || !finalName?.trim() || !selectedPhylum || !selectedUniverse) {
      alert('Please enter both a group number and name')
      return
    }

    const groupNumber = parseInt(finalCode.trim())
    if (isNaN(groupNumber) || groupNumber < 1 || groupNumber > 99) {
      alert('Group number must be between 1 and 99')
      return
    }

    // Check for duplicate group numbers
    const existingGroup = groups.find(g => g.group_num === groupNumber)
    if (existingGroup) {
      alert(`A group with number "${groupNumber}" already exists: ${existingGroup.name}`)
      return
    }

    try {
      const { data, error } = await supabase
        .from('groups')
        .insert({
          universe_id: selectedUniverse.id,
          phylum_id: selectedPhylum.id,
          family_id: selectedFamily?.id || null,
          group_num: groupNumber,
          name: finalName.trim()
        })
        .select()
        .single()

      if (error) {
        alert(`Error creating group: ${error.message}`)
        return
      }

      if (data) {
        setCreatingGroup(false)
        setNewGroupNum('')
        setGroupName('')
        await loadGroups()
      }
    } catch (error) {
      console.error('Error creating group:', error)
      alert(`Failed to create group: ${(error as any)?.message || error}`)
    }
  }

  async function createTask() {
    if (!taskTitle || !taskNum || !selectedGroup || !selectedPhylum || !selectedUniverse) return

    const timestamp = new Date()
    const timestampStr = timestamp.toISOString()
      .replace('T', '_')
      .replace(/[-:]/g, '.')
      .substring(0, 16)

    const baseCode = `${selectedUniverse.code}${selectedPhylum.code}${selectedFamily?.code || ''}-${String(selectedGroup.group_num).padStart(2, '0')}.${taskNum.padStart(2, '0')}`.toUpperCase()
    const fullCode = `R-${timestampStr}=${baseCode}`

    try {
      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          code: fullCode,
          base_code: baseCode,
          title: taskTitle,
          universe_id: selectedUniverse.id,
          phylum_id: selectedPhylum.id,
          family_id: selectedFamily?.id || null,
          group_num: selectedGroup.group_num,
          task_num: parseInt(taskNum),
          priority: 3,
          status: 'active',
          task_timestamp: timestamp.toISOString()
        })
        .select()
        .single()

      if (error) throw error

      if (task) {
        await supabase.rpc('create_task_entry', {
          p_task_id: task.id,
          p_status_code: 'R',
          p_note: 'Initial entry',
          p_entry_timestamp: timestamp.toISOString()
        })

        loadTasks()
        setCreatingTask(false)
        setTaskTitle('')
        setTaskNum('')
      }
    } catch (error) {
      console.error('Error creating task:', error)
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

  // Delete functions
  async function deleteUniverse(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete the universe "${name}"? This will also delete all associated phyla, families, groups, and tasks. This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('universes')
        .delete()
        .eq('id', id)

      if (error) throw error

      setUniverses(universes.filter(u => u.id !== id))

      // Clear selection if this universe was selected
      if (selectedUniverse?.id === id) {
        setSelectedUniverse(null)
        setSelectedPhylum(null)
        setSelectedFamily(null)
        setSelectedGroup(null)
      }
    } catch (error) {
      console.error('Error deleting universe:', error)
      alert('Failed to delete universe')
    }
  }

  async function deletePhylum(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete the phylum "${name}"? This will also delete all associated families, groups, and tasks. This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('phyla')
        .delete()
        .eq('id', id)

      if (error) throw error

      setPhylums(phylums.filter(p => p.id !== id))

      // Clear selection if this phylum was selected
      if (selectedPhylum?.id === id) {
        setSelectedPhylum(null)
        setSelectedFamily(null)
        setSelectedGroup(null)
      }
    } catch (error) {
      console.error('Error deleting phylum:', error)
      alert('Failed to delete phylum')
    }
  }

  async function deleteFamily(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete the family "${name}"? This will also delete all associated groups and tasks. This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('families')
        .delete()
        .eq('id', id)

      if (error) throw error

      setFamilies(families.filter(f => f.id !== id))

      // Clear selection if this family was selected
      if (selectedFamily?.id === id) {
        setSelectedFamily(null)
        setSelectedGroup(null)
      }
    } catch (error) {
      console.error('Error deleting family:', error)
      alert('Failed to delete family')
    }
  }

  async function deleteGroup(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete the group "${name}"? This will also delete all associated tasks. This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id)

      if (error) throw error

      setGroups(groups.filter(g => g.id !== id))

      // Clear selection if this group was selected
      if (selectedGroup?.id === id) {
        setSelectedGroup(null)
      }
    } catch (error) {
      console.error('Error deleting group:', error)
      alert('Failed to delete group')
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

  // CSV Export functionality
  async function exportToCSV() {
    try {
      // Get all data with relationships
      const { data: allTaskDetails } = await supabase
        .from('task_details')
        .select('*')
        .order('universe_code, phylum_code, family_code, group_num, task_num')

      const { data: allUniverses } = await supabase
        .from('universes')
        .select('*')
        .order('display_order')

      const { data: allPhyla } = await supabase
        .from('phyla')
        .select('*, universe:universes(code, name)')
        .order('display_order')

      const { data: allFamilies } = await supabase
        .from('families')
        .select('*, phylum:phyla(code, name, universe:universes(code, name))')
        .order('display_order')

      const { data: allGroups } = await supabase
        .from('groups_with_counts')
        .select('*')
        .order('group_num')

      // Create CSV data array
      const csvData: any[] = []
      const addedEntities = new Set<string>()

      // Add all universes
      allUniverses?.forEach(universe => {
        const key = `universe-${universe.code}`
        if (!addedEntities.has(key)) {
          csvData.push({
            type: 'universe',
            universe_code: universe.code,
            universe_name: universe.name,
            phylum_code: '',
            phylum_name: '',
            family_code: '',
            family_name: '',
            group_num: '',
            group_name: '',
            task_num: '',
            task_title: '',
            task_status: '',
            task_priority: '',
            base_code: '',
            id: universe.id,
            display_order: universe.display_order || 0
          })
          addedEntities.add(key)
        }
      })

      // Add all phyla
      allPhyla?.forEach(phylum => {
        const key = `phylum-${(phylum.universe as any)?.code}-${phylum.code}`
        if (!addedEntities.has(key)) {
          csvData.push({
            type: 'phylum',
            universe_code: (phylum.universe as any)?.code || '',
            universe_name: (phylum.universe as any)?.name || '',
            phylum_code: phylum.code,
            phylum_name: phylum.name,
            family_code: '',
            family_name: '',
            group_num: '',
            group_name: '',
            task_num: '',
            task_title: '',
            task_status: '',
            task_priority: '',
            base_code: '',
            id: phylum.id,
            display_order: phylum.display_order || 0
          })
          addedEntities.add(key)
        }
      })

      // Add all families
      allFamilies?.forEach(family => {
        const universeCode = (family.phylum as any)?.universe?.code || ''
        const phylumCode = (family.phylum as any)?.code || ''
        const key = `family-${universeCode}-${phylumCode}-${family.code}`
        if (!addedEntities.has(key)) {
          csvData.push({
            type: 'family',
            universe_code: universeCode,
            universe_name: (family.phylum as any)?.universe?.name || '',
            phylum_code: phylumCode,
            phylum_name: (family.phylum as any)?.name || '',
            family_code: family.code,
            family_name: family.name,
            group_num: '',
            group_name: '',
            task_num: '',
            task_title: '',
            task_status: '',
            task_priority: '',
            base_code: '',
            id: family.id,
            display_order: family.display_order || 0
          })
          addedEntities.add(key)
        }
      })

      // Add all groups
      allGroups?.forEach(group => {
        // Get universe and phylum info
        const universe = allUniverses?.find(u => u.id === group.universe_id)
        const phylum = allPhyla?.find(p => p.id === group.phylum_id)
        const family = allFamilies?.find(f => f.id === group.family_id)

        const key = `group-${universe?.code}-${phylum?.code}-${family?.code || 'null'}-${group.group_num}`
        if (!addedEntities.has(key)) {
          csvData.push({
            type: 'group',
            universe_code: universe?.code || '',
            universe_name: universe?.name || '',
            phylum_code: phylum?.code || '',
            phylum_name: phylum?.name || '',
            family_code: family?.code || '',
            family_name: family?.name || '',
            group_num: group.group_num,
            group_name: group.name || '',
            task_num: '',
            task_title: '',
            task_status: '',
            task_priority: '',
            base_code: '',
            id: group.id,
            display_order: 0
          })
          addedEntities.add(key)
        }
      })

      // Add all tasks
      allTaskDetails?.forEach(task => {
        csvData.push({
          type: 'task',
          universe_code: task.universe_code || '',
          universe_name: task.universe_name || '',
          phylum_code: task.phylum_code || '',
          phylum_name: task.phylum_name || '',
          family_code: task.family_code || '',
          family_name: task.family_name || '',
          group_num: task.group_num,
          group_name: task.group_name || '',
          task_num: task.task_num,
          task_title: task.title,
          task_status: task.current_status || task.status,
          task_priority: task.priority,
          base_code: task.base_code,
          id: task.id,
          display_order: 0
        })
      })

      // Convert to CSV
      const headers = [
        'type', 'universe_code', 'universe_name', 'phylum_code', 'phylum_name',
        'family_code', 'family_name', 'group_num', 'group_name', 'task_num',
        'task_title', 'task_status', 'task_priority', 'base_code', 'id', 'display_order'
      ]

      const csvRows = [headers.join(',')]
      csvData.forEach(row => {
        const values = headers.map(header => {
          const value = row[header] || ''
          // Escape commas and quotes in CSV
          return typeof value === 'string' && (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value
        })
        csvRows.push(values.join(','))
      })

      // Create and download file
      const csvContent = csvRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')

      const currentDate = new Date().toISOString().split('T')[0]
      const filename = `atol-system-export-${currentDate}.csv`

      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      alert(`System data exported successfully!\nFile: ${filename}\nRecords: ${csvData.length}`)

    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export system data. Please check the console for details.')
    }
  }

  // Open import dialog
  function importFromCSV() {
    setShowImportDialog(true)
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
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            startEdit('universe', universe.id, universe.code, universe.name)
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          ∴
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteUniverse(universe.id, universe.name)
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
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
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            startEdit('phylum', phylum.id, phylum.code, phylum.name)
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          ∴
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deletePhylum(phylum.id, phylum.name)
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={() => setCreatingPhylum(true)}
                className="w-full p-4 border-2 border-dashed border-gray-400 rounded-lg font-mono text-gray-500"
              >
                + CREATE NEW
              </button>
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
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            startEdit('family', family.id, family.code, family.name)
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          ∴
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteFamily(family.id, family.name)
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={() => setCreatingFamily(true)}
                className="w-full p-4 border-2 border-dashed border-gray-400 rounded-lg font-mono text-gray-500"
              >
                + CREATE NEW
              </button>
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
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            startEdit('group', group.id || String(group.group_num), '', group.name)
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          ∴
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteGroup(group.id || '', group.name)
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={() => setCreatingGroup(true)}
                className="w-full p-4 border-2 border-dashed border-gray-400 rounded-lg font-mono text-gray-500"
              >
                + CREATE NEW
              </button>
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
              {!creatingTask ? (
                <button
                  onClick={() => setCreatingTask(true)}
                  className="w-full p-4 border-2 border-dashed border-gray-400 rounded-lg font-mono text-gray-500"
                >
                  + CREATE NEW
                </button>
              ) : (
                <div className="p-4 bg-white dark:bg-gray-900 rounded-lg space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={taskNum}
                      onChange={(e) => setTaskNum(e.target.value.replace(/\D/g, '').slice(0, 2))}
                      className="w-16 px-2 py-1 font-mono bg-gray-100 dark:bg-gray-700 rounded text-center"
                      maxLength={2}
                      placeholder="##"
                    />
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="flex-1 px-2 py-1 font-mono bg-gray-100 dark:bg-gray-700 rounded"
                      placeholder="Task title"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={createTask}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setCreatingTask(false)
                        setTaskTitle('')
                        setTaskNum('')
                      }}
                      className="px-3 py-1 bg-gray-400 text-white rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* System Management Bar - Mobile */}
        <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 rounded-b-lg">
          <div className="flex justify-center items-center gap-2 font-mono">
            <button
              onClick={exportToCSV}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-mono rounded transition-colors"
            >
              [SAVE]
            </button>
            <button
              onClick={importFromCSV}
              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm font-mono rounded transition-colors"
            >
              [LOAD]
            </button>
          </div>
        </div>

        {/* CSV Import Dialog */}
        <CSVImportDialog
          isOpen={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          onImportComplete={() => {
            loadUniverses()
            loadPhylums()
            loadFamilies()
            loadGroups()
            loadTasks()
          }}
        />
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
                  <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        startEdit('universe', universe.id, universe.code, universe.name)
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      ∴
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteUniverse(universe.id, universe.name)
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
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
            <SimpleCreateForm
              placeholder="Universe Name"
              codeMaxLength={1}
              onCancel={() => {
                setCreatingUniverse(false)
                setUniverseCode('')
                setUniverseName('')
              }}
              onCreate={async (code, name) => {
                await createUniverse(code, name)
              }}
            />
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
                      <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            startEdit('phylum', phylum.id, phylum.code, phylum.name)
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          ∴
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deletePhylum(phylum.id, phylum.name)
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
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
                <SimpleCreateForm
                  placeholder="Phylum Name"
                  codeMaxLength={1}
                  onCancel={() => {
                    setCreatingPhylum(false)
                    setPhylumCode('')
                    setPhylumName('')
                  }}
                  onCreate={async (code, name) => {
                    await createPhylum(code, name)
                  }}
                />
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
                      <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            startEdit('family', family.id, family.code, family.name)
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          ∴
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteFamily(family.id, family.name)
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
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
                <SimpleCreateForm
                  placeholder="Family Name"
                  codeMaxLength={1}
                  onCancel={() => {
                    setCreatingFamily(false)
                    setFamilyCode('')
                    setFamilyName('')
                  }}
                  onCreate={async (code, name) => {
                    await createFamily(code, name)
                  }}
                />
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
                      <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            startEdit('group', group.id || String(group.group_num), '', group.name)
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          ∴
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteGroup(group.id || '', group.name)
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
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
                <SimpleCreateForm
                  placeholder="Group Name"
                  codeMaxLength={2}
                  codeType="numeric"
                  codePlaceholder="01"
                  onCancel={() => {
                    setCreatingGroup(false)
                    setNewGroupNum('')
                    setGroupName('')
                  }}
                  onCreate={async (code, name) => {
                    await createGroup(code, name)
                  }}
                />
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
              {!creatingTask ? (
                <button
                  onClick={() => setCreatingTask(true)}
                  className="w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800 font-mono text-gray-500"
                >
                  + CREATE
                </button>
              ) : (
                <div className="p-4 bg-gray-100 dark:bg-gray-800">
                  <input
                    type="text"
                    placeholder="Task Number"
                    value={taskNum}
                    onChange={(e) => setTaskNum(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    className="w-full mb-2 px-2 py-1 font-mono bg-white dark:bg-gray-700 rounded"
                    maxLength={2}
                  />
                  <input
                    type="text"
                    placeholder="Task Title"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full mb-2 px-2 py-1 font-mono bg-white dark:bg-gray-700 rounded"
                  />
                  <div className="flex gap-2">
                    <button onClick={createTask} className="px-3 py-1 bg-blue-600 text-white rounded">Create</button>
                    <button onClick={() => {
                      setCreatingTask(false)
                      setTaskTitle('')
                      setTaskNum('')
                    }} className="px-3 py-1 bg-gray-400 text-white rounded">Cancel</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 text-gray-400 text-center font-mono">Select a Group</div>
          )}
        </Column>
      </div>

      {/* System Management Bar - spans full width below columns */}
      <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 rounded-b-lg">
        <div className="flex justify-center items-center gap-2 font-mono">
          <button
            onClick={exportToCSV}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-mono rounded transition-colors"
          >
            [SAVE]
          </button>
          <button
            onClick={importFromCSV}
            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm font-mono rounded transition-colors"
          >
            [LOAD]
          </button>
        </div>
      </div>

      {/* CSV Import Dialog */}
      <CSVImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportComplete={() => {
          loadUniverses()
          loadPhylums()
          loadFamilies()
          loadGroups()
          loadTasks()
        }}
      />
    </div>
  )
}