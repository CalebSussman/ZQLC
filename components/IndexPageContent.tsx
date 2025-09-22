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

export default function IndexPageContent() {
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

  // Rest of the component implementation...
  return (
    <div className="min-h-screen bg-[#F8F7F4] dark:bg-[#0A0A0B] flex items-center justify-center">
      <div className="text-gray-500 font-mono">Index page content here...</div>
    </div>
  )
}