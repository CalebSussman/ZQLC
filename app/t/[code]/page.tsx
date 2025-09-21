'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '@/lib/supabase'

interface TaskDetail {
  id: string
  code: string
  base_code: string
  title: string
  universe_id: string
  phylum_id: string
  family_id?: string
  group_num: number
  task_num: number
  status: string
  priority: number
  created_at: string
  updated_at: string
  completed_at?: string
  // From view joins
  universe_name?: string
  universe_code?: string
  universe_color?: string
  phylum_name?: string
  phylum_code?: string
  family_name?: string
  family_code?: string
  group_name?: string
  current_status?: string
  current_status_name?: string
  current_entry_time?: string
  time_outstanding?: string
  entry_count?: number
  note_count?: number
}

interface TaskEntry {
  id: string
  task_id: string
  status_code: string
  status_name?: string
  entry_timestamp: string
  full_code: string
  note?: string
  created_at: string
  duration_from_previous?: string
  duration_until_next?: string
}

interface TaskNote {
  id: string
  task_id: string
  type: 'task' | 'step' | 'outcome'
  content: string
  created_at: string
}

interface Status {
  code: string
  name: string
  description?: string
}

const STATUSES: Status[] = [
  { code: 'R', name: 'Received', description: 'Task has been received and acknowledged' },
  { code: 'D', name: 'Delivered', description: 'Task has been delivered or presented' },
  { code: 'F', name: 'Filed', description: 'Task has been filed for future reference' },
  { code: 'C', name: 'Completed', description: 'Task has been fully completed' },
  { code: 'P', name: 'Pending', description: 'Task is pending external action' },
  { code: 'X', name: 'Cancelled', description: 'Task has been cancelled' }
]

export default function TaskPage() {
  const params = useParams()
  const router = useRouter()
  const taskCode = params.code as string
  
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [entries, setEntries] = useState<TaskEntry[]>([])
  const [notes, setNotes] = useState<TaskNote[]>([])
  const [loading, setLoading] = useState(true)
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editPriority, setEditPriority] = useState(3)
  
  // New entry state
  const [showNewEntry, setShowNewEntry] = useState(false)
  const [newStatus, setNewStatus] = useState<Status>(STATUSES[0])
  const [newEntryNote, setNewEntryNote] = useState('')
  
  // Notes state
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState<'task' | 'step' | 'outcome'>('step')
  const [addingNote, setAddingNote] = useState(false)

  useEffect(() => {
    if (taskCode) {
      fetchTask()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskCode])

  useEffect(() => {
    if (task?.id) {
      fetchEntries()
      fetchNotes()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task])

  async function fetchTask() {
    try {
      // Try to find by base_code first (for category navigation)
      let { data, error } = await supabase
        .from('task_details')
        .select('*')
        .eq('base_code', taskCode.toUpperCase())
        .single()

      // If not found, try by full code
      if (!data) {
        const result = await supabase
          .from('task_details')
          .select('*')
          .eq('code', taskCode.toUpperCase())
          .single()
        data = result.data
        error = result.error
      }

      if (error) throw error
      
      setTask(data)
      setEditTitle(data.title)
      setEditPriority(data.priority)
    } catch (error) {
      console.error('Error fetching task:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchEntries() {
    if (!task?.id) return
    
    try {
      const { data, error } = await supabase
        .from('task_entry_history')
        .select('*')
        .eq('task_id', task.id)
        .order('entry_timestamp', { ascending: false })

      if (error) throw error
      setEntries(data || [])
    } catch (error) {
      console.error('Error fetching entries:', error)
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

  async function updateTask() {
    if (!task) return
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: editTitle,
          priority: editPriority
        })
        .eq('id', task.id)

      if (error) throw error
      
      setTask({ ...task, title: editTitle, priority: editPriority })
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  async function createEntry() {
    if (!task) return
    
    try {
      const { data, error } = await supabase
        .rpc('create_task_entry', {
          p_task_id: task.id,
          p_status_code: newStatus.code,
          p_note: newEntryNote || null,
          p_entry_timestamp: new Date().toISOString()
        })

      if (error) throw error
      
      // Refresh task and entries
      await fetchTask()
      await fetchEntries()
      
      setShowNewEntry(false)
      setNewEntryNote('')
    } catch (error) {
      console.error('Error creating entry:', error)
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

  async function deleteTask() {
    if (!task || !confirm('Are you sure you want to delete this task? This action cannot be undone.')) return
    
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

  function formatDuration(duration: string | null | undefined): string {
    if (!duration) return '-'
    
    // Parse PostgreSQL interval format
    const match = duration.match(/(\d+) days? (\d+):(\d+):(\d+)/)
    if (match) {
      const [_, days, hours, minutes] = match
      return `${days}d ${hours}h ${minutes}m`
    }
    
    // Try simpler format
    const simpleMatch = duration.match(/(\d+):(\d+):(\d+)/)
    if (simpleMatch) {
      const [_, hours, minutes] = simpleMatch
      return `${hours}h ${minutes}m`
    }
    
    return duration
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
        <p className="text-gray-500 mb-6">The task code &quot;{taskCode}&quot; doesn&apos;t exist.</p>
        <a href="/" className="text-blue-600 hover:text-blue-700">← Back to Dashboard</a>
      </div>
    )
  }

  const taskUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://zq.lc'}/t/${task.base_code}`

  return (
    <div className="max-w-5xl mx-auto">
      {/* Task Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-2xl font-bold w-full px-3 py-2 border rounded"
                />
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(Number(e.target.value))}
                  className="px-3 py-2 border rounded"
                >
                  <option value={1}>P1 - Urgent</option>
                  <option value={2}>P2 - High</option>
                  <option value={3}>P3 - Medium</option>
                  <option value={4}>P4 - Low</option>
                  <option value={5}>P5 - Backlog</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={updateTask}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setEditTitle(task.title)
                      setEditPriority(task.priority)
                    }}
                    className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold mb-2">{task.title}</h1>
                <div className="text-sm text-gray-600 space-y-1 mb-3">
                  <div>Current Code: <span className="font-mono">{task.code}</span></div>
                  <div>Base Code: <span className="font-mono">{task.base_code}</span></div>
                  <div>Path: {task.universe_name} → {task.phylum_name} {task.family_name && `→ ${task.family_name}`}</div>
                  {task.group_name && <div>Group: {task.group_num} - {task.group_name}</div>}
                </div>
                <div className="flex gap-4">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    task.current_status === 'C' || task.current_status === 'X'
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {task.current_status_name || 'No Status'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    task.priority <= 2 ? 'bg-red-100 text-red-800' :
                    task.priority === 3 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    Priority {task.priority}
                  </span>
                  {task.time_outstanding && (
                    <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                      Outstanding: {formatDuration(task.time_outstanding)}
                    </span>
                  )}
                </div>
              </>
            )}
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
            onClick={() => setShowNewEntry(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            + New Entry
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Edit Task
          </button>
          <button
            onClick={deleteTask}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Delete Task
          </button>
        </div>
      </div>

      {/* New Entry Form */}
      {showNewEntry && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create New Entry</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <div className="grid grid-cols-3 gap-2">
                {STATUSES.map((status) => (
                  <button
                    key={status.code}
                    onClick={() => setNewStatus(status)}
                    className={`p-3 rounded border ${
                      newStatus.code === status.code
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-300'
                    }`}
                  >
                    <div className="font-bold">{status.code} - {status.name}</div>
                    <div className="text-xs text-gray-500">{status.description}</div>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Entry Note (Optional)</label>
              <textarea
                value={newEntryNote}
                onChange={(e) => setNewEntryNote(e.target.value)}
                placeholder="What happened with this status change?"
                rows={3}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={createEntry}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Create Entry
              </button>
              <button
                onClick={() => {
                  setShowNewEntry(false)
                  setNewEntryNote('')
                }}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entry History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Entry History ({entries.length})</h2>
        {entries.length === 0 ? (
          <p className="text-gray-500">No entries yet. Create your first entry above!</p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, index) => (
              <div key={entry.id} className="border-l-4 border-purple-500 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-mono text-sm mb-1">{entry.full_code}</div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-semibold">{entry.status_name}</span>
                      <span className="text-gray-500">
                        {new Date(entry.entry_timestamp).toLocaleString()}
                      </span>
                      {index === 0 && <span className="text-xs bg-green-100 px-2 py-1 rounded">Current</span>}
                    </div>
                    {entry.note && (
                      <p className="text-sm text-gray-600 mt-1">{entry.note}</p>
                    )}
                    {entry.duration_from_previous && index < entries.length - 1 && (
                      <div className="text-xs text-gray-500 mt-1">
                        Duration from previous: {formatDuration(entry.duration_from_previous)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
        <h2 className="text-lg font-semibold mb-4">Notes ({notes.length})</h2>
        {notes.length === 0 ? (
          <p className="text-gray-500">No notes yet.</p>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className={`border-l-4 pl-4 py-2 ${
                note.type === 'task' ? 'border-blue-500' :
                note.type === 'step' ? 'border-yellow-500' :
                'border-green-500'
              }`}>
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
