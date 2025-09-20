'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '@/lib/supabase'
import type { Task, TaskNote } from '@/lib/supabase'

export default function TaskPage() {
  const params = useParams()
  const router = useRouter()
  const taskCode = params.code as string
  
  const [task, setTask] = useState<Task | null>(null)
  const [notes, setNotes] = useState<TaskNote[]>([])
  const [loading, setLoading] = useState(true)
  
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState<'task' | 'step' | 'outcome'>('step')
  const [addingNote, setAddingNote] = useState(false)

  useEffect(() => {
    if (taskCode) {
      fetchTask()
    }
  }, [taskCode])

  useEffect(() => {
    if (task?.id) {
      fetchNotes()
    }
  }, [task])

  async function fetchTask() {
    try {
      const { data, error } = await supabase
        .from('task_details')
        .select('*')
        .eq('code', taskCode)
        .single()

      if (error) throw error
      setTask(data)
    } catch (error) {
      console.error('Error fetching task:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchNotes() {
    if (!task?.id) return
    
    try {
      const { data, error } = await supabase
        .from('task_notes')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotes(data || [])
    } catch (error) {
      console.error('Error fetching notes:', error)
    }
  }

  async function addNote() {
    if (!newNote.trim() || !task) return
    
    setAddingNote(true)
    try {
      const { data, error } = await supabase
        .from('task_notes')
        .insert({
          task_id: task.id,
          type: noteType,
          content: newNote
        })
        .select()
        .single()

      if (error) throw error
      
      setNotes([data, ...notes])
      setNewNote('')
    } catch (error) {
      console.error('Error adding note:', error)
    } finally {
      setAddingNote(false)
    }
  }

  async function toggleTaskStatus() {
    if (!task) return
    
    const newStatus = task.status === 'active' ? 'completed' : 'active'
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          completed_at: completedAt
        })
        .eq('id', task.id)

      if (error) throw error
      
      setTask({ ...task, status: newStatus, completed_at: completedAt })
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  async function deleteTask() {
    if (!task || !confirm('Are you sure you want to delete this task?')) return
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id)

      if (error) throw error
      
      router.push('/')
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading task...</div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Task Not Found</h2>
        <p className="text-gray-500 mb-6">The task code "{taskCode}" doesn't exist.</p>
        <a href="/" className="text-blue-600 hover:text-blue-700">← Back to Dashboard</a>
      </div>
    )
  }

  const taskUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://zq.lc'}/t/${taskCode}`

  return (
    <div className="max-w-4xl mx-auto">
      {/* Task Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">{task.title}</h1>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-sm text-gray-500">Code: {task.code}</span>
              {task.universe_name && (
                <span 
                  className="universe-badge"
                  style={{ backgroundColor: task.universe_color || '#6366f1' }}
                >
                  {task.universe_name}
                </span>
              )}
              {task.phylum_name && (
                <span className="text-sm text-gray-500">→ {task.phylum_name}</span>
              )}
              {task.family_name && (
                <span className="text-sm text-gray-500">→ {task.family_name}</span>
              )}
            </div>
            <div className="flex gap-4">
              <span className={`px-3 py-1 rounded-full text-sm ${
                task.status === 'completed' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {task.status === 'completed' ? '✓ Completed' : '⚡ Active'}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                task.priority <= 2 ? 'bg-red-100 text-red-800' :
                task.priority === 3 ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                Priority {task.priority}
              </span>
            </div>
          </div>
          
          {/* QR Code */}
          <div className="ml-6 text-center">
            <QRCodeSVG 
              value={taskUrl}
              size={120}
              level="M"
              includeMargin={true}
            />
            <p className="text-xs text-gray-500 mt-2">Scan to open</p>
          </div>
        </div>

        {/* Task Actions */}
        <div className="flex gap-3 mt-6 pt-4 border-t dark:border-gray-700">
          <button
            onClick={toggleTaskStatus}
            className={`px-4 py-2 rounded-md ${
              task.status === 'active'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            {task.status === 'active' ? 'Mark Complete' : 'Mark Active'}
          </button>
          <button
            onClick={deleteTask}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Delete Task
          </button>
        </div>
      </div>

      {/* Add Note Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Add Note</h2>
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setNoteType('task')}
              className={`px-3 py-1 rounded ${
                noteType === 'task' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              Task Note
            </button>
            <button
              onClick={() => setNoteType('step')}
              className={`px-3 py-1 rounded ${
                noteType === 'step' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              Step Note
            </button>
            <button
              onClick={() => setNoteType('outcome')}
              className={`px-3 py-1 rounded ${
                noteType === 'outcome' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              Outcome Note
            </button>
          </div>
          
          <div className="flex gap-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder={`Add a ${noteType} note...`}
              rows={3}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            />
            <button
              onClick={addNote}
              disabled={!newNote.trim() || addingNote}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {addingNote ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      </div>

      {/* Notes History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Notes History</h2>
        {notes.length === 0 ? (
          <p className="text-gray-500">No notes yet. Add your first note above!</p>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="border-l-4 pl-4 py-2 ${
                note.type === 'task' ? 'border-blue-500' :
                note.type === 'step' ? 'border-yellow-500' :
                'border-green-500'
              }">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-1 rounded ${
                    note.type === 'task' ? 'bg-blue-100 text-blue-800' :
                    note.type === 'step' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {note.type.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(note.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300">{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
