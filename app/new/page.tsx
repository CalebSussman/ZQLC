'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Universe, Phylum, Family } from '@/lib/supabase'

export default function NewTask() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [universes, setUniverses] = useState<Universe[]>([])
  const [phylums, setPhylums] = useState<Phylum[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  
  const [selectedUniverse, setSelectedUniverse] = useState('')
  const [selectedPhylum, setSelectedPhylum] = useState('')
  const [selectedFamily, setSelectedFamily] = useState('')
  
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState(3)
  const [taskNote, setTaskNote] = useState('')
  
  const [groupNum, setGroupNum] = useState<number>(1)
  const [taskNum, setTaskNum] = useState<number>(1)

  useEffect(() => {
    fetchUniverses()
  }, [])

  useEffect(() => {
    if (selectedUniverse) {
      fetchPhylums(selectedUniverse)
      setSelectedPhylum('')
      setSelectedFamily('')
      setFamilies([])
    }
  }, [selectedUniverse])

  useEffect(() => {
    if (selectedPhylum) {
      fetchFamilies(selectedPhylum)
      setSelectedFamily('')
    }
  }, [selectedPhylum])

  useEffect(() => {
    if (selectedUniverse && selectedPhylum) {
      generateNextNumbers()
    }
  }, [selectedUniverse, selectedPhylum])

  async function fetchUniverses() {
    const { data } = await supabase
      .from('universes')
      .select('*')
      .order('name')
    if (data) setUniverses(data)
  }

  async function fetchPhylums(universeId: string) {
    const { data } = await supabase
      .from('phyla')
      .select('*')
      .eq('universe_id', universeId)
      .order('name')
    if (data) setPhylums(data)
  }

  async function fetchFamilies(phylumId: string) {
    const { data } = await supabase
      .from('families')
      .select('*')
      .eq('phylum_id', phylumId)
      .order('name')
    if (data) setFamilies(data)
  }

  async function generateNextNumbers() {
    // Get the highest group/task numbers for this universe-phylum combination
    const { data } = await supabase
      .from('tasks')
      .select('group_num, task_num')
      .eq('universe_id', selectedUniverse)
      .eq('phylum_id', selectedPhylum)
      .order('group_num', { ascending: false })
      .order('task_num', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const lastTask = data[0]
      if (lastTask.task_num >= 99) {
        setGroupNum(lastTask.group_num + 1)
        setTaskNum(1)
      } else {
        setGroupNum(lastTask.group_num)
        setTaskNum(lastTask.task_num + 1)
      }
    } else {
      setGroupNum(1)
      setTaskNum(1)
    }
  }

  function generateTaskCode() {
    if (!selectedUniverse || !selectedPhylum) return ''
    
    const universe = universes.find(u => u.id === selectedUniverse)
    const phylum = phylums.find(p => p.id === selectedPhylum)
    const family = families.find(f => f.id === selectedFamily)
    
    const uCode = universe?.code || 'xxx'
    const pCode = phylum?.code || 'xxx'
    const fCode = family?.code || ''
    
    const groupStr = groupNum.toString().padStart(2, '0')
    const taskStr = taskNum.toString().padStart(2, '0')
    
    return `${uCode}${pCode}${fCode}-${groupStr}${taskStr}`.toLowerCase()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !selectedUniverse || !selectedPhylum) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    const taskCode = generateTaskCode()

    try {
      // Create the task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          code: taskCode,
          title,
          universe_id: selectedUniverse,
          phylum_id: selectedPhylum,
          family_id: selectedFamily || null,
          group_num: groupNum,
          task_num: taskNum,
          priority,
          status: 'active'
        })
        .select()
        .single()

      if (taskError) throw taskError

      // Add initial task note if provided
      if (taskNote && task) {
        await supabase
          .from('task_notes')
          .insert({
            task_id: task.id,
            type: 'task',
            content: taskNote
          })
      }

      // Redirect to the new task page
      router.push(`/t/${taskCode}`)
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Failed to create task. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create New Task</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-2">
            Task Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            placeholder="Enter task title..."
            required
          />
        </div>

        {/* Universe Selection */}
        <div>
          <label htmlFor="universe" className="block text-sm font-medium mb-2">
            Universe *
          </label>
          <select
            id="universe"
            value={selectedUniverse}
            onChange={(e) => setSelectedUniverse(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            required
          >
            <option value="">Select a universe...</option>
            {universes.map((universe) => (
              <option key={universe.id} value={universe.id}>
                {universe.name} ({universe.code})
              </option>
            ))}
          </select>
        </div>

        {/* Phylum Selection */}
        <div>
          <label htmlFor="phylum" className="block text-sm font-medium mb-2">
            Phylum *
          </label>
          <select
            id="phylum"
            value={selectedPhylum}
            onChange={(e) => setSelectedPhylum(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            required
            disabled={!selectedUniverse}
          >
            <option value="">Select a phylum...</option>
            {phylums.map((phylum) => (
              <option key={phylum.id} value={phylum.id}>
                {phylum.name} ({phylum.code})
              </option>
            ))}
          </select>
        </div>

        {/* Family Selection (Optional) */}
        <div>
          <label htmlFor="family" className="block text-sm font-medium mb-2">
            Family (Optional)
          </label>
          <select
            id="family"
            value={selectedFamily}
            onChange={(e) => setSelectedFamily(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            disabled={!selectedPhylum}
          >
            <option value="">No family selected...</option>
            {families.map((family) => (
              <option key={family.id} value={family.id}>
                {family.name} ({family.code})
              </option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label htmlFor="priority" className="block text-sm font-medium mb-2">
            Priority
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
          >
            <option value={1}>P1 - Urgent</option>
            <option value={2}>P2 - High</option>
            <option value={3}>P3 - Medium</option>
            <option value={4}>P4 - Low</option>
            <option value={5}>P5 - Backlog</option>
          </select>
        </div>

        {/* Group and Task Numbers */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="groupNum" className="block text-sm font-medium mb-2">
              Group Number
            </label>
            <input
              type="number"
              id="groupNum"
              value={groupNum}
              onChange={(e) => setGroupNum(Number(e.target.value))}
              min="0"
              max="99"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label htmlFor="taskNum" className="block text-sm font-medium mb-2">
              Task Number
            </label>
            <input
              type="number"
              id="taskNum"
              value={taskNum}
              onChange={(e) => setTaskNum(Number(e.target.value))}
              min="0"
              max="99"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>

        {/* Task Code Preview */}
        {selectedUniverse && selectedPhylum && (
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
            <p className="text-sm text-gray-600 dark:text-gray-400">Task Code:</p>
            <p className="text-lg font-mono font-bold">{generateTaskCode()}</p>
          </div>
        )}

        {/* Initial Task Note */}
        <div>
          <label htmlFor="taskNote" className="block text-sm font-medium mb-2">
            Initial Task Note (Optional)
          </label>
          <textarea
            id="taskNote"
            value={taskNote}
            onChange={(e) => setTaskNote(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            placeholder="Describe the task..."
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !title || !selectedUniverse || !selectedPhylum}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  )
}
