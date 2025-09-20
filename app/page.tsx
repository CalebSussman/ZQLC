'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/lib/supabase'

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasks()
  }, [])

  async function fetchTasks() {
    try {
      const { data, error } = await supabase
        .from('task_details')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'phylum', name: 'Phylum View', icon: '🌳' },
    { id: 'todo', name: 'To-Do List', icon: '✅' },
    { id: 'calendar', name: 'Calendar', icon: '📅' },
    { id: 'templates', name: 'Templates', icon: '📋' },
  ]

  const completedToday = tasks.filter(t => {
    if (!t.completed_at) return false
    const completedDate = new Date(t.completed_at).toDateString()
    const today = new Date().toDateString()
    return completedDate === today
  }).length

  return (
    <div>
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : (
        <>
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-2">Active Tasks</h3>
                  <p className="text-3xl font-bold text-blue-600">{tasks.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-2">Completed Today</h3>
                  <p className="text-3xl font-bold text-green-600">{completedToday}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
                  <a href="/new" className="text-blue-600 hover:text-blue-700">+ Create Task</a>
                </div>
              </div>

              <h2 className="text-xl font-semibold mb-4">Recent Tasks</h2>
              <div className="space-y-3">
                {tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="task-card">
                    <div className="flex justify-between items-start">
                      <div>
                        <a href={`/t/${task.code}`} className="text-lg font-medium hover:text-blue-600">
                          {task.title}
                        </a>
                        <div className="mt-1">
                          <span className="text-sm text-gray-500 mr-3">
                            Code: {task.code}
                          </span>
                          {task.universe_name && (
                            <span 
                              className="universe-badge"
                              style={{ backgroundColor: task.universe_color || '#6366f1' }}
                            >
                              {task.universe_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        task.priority <= 2 ? 'bg-red-100 text-red-800' :
                        task.priority === 3 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        P{task.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phylum View Tab */}
          {activeTab === 'phylum' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Tasks by Universe → Phylum</h2>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="text-gray-500">Phylum view coming soon...</p>
              </div>
            </div>
          )}

          {/* To-Do List Tab */}
          {activeTab === 'todo' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Active Tasks</h2>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="task-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                          onChange={() => {
                            // TODO: Mark task complete
                          }}
                        />
                        <div>
                          <a href={`/t/${task.code}`} className="font-medium hover:text-blue-600">
                            {task.title}
                          </a>
                          <div className="text-sm text-gray-500">
                            {task.code} • {task.universe_name}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Calendar Tab */}
          {activeTab === 'calendar' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Calendar View</h2>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="text-gray-500">Calendar integration coming soon...</p>
              </div>
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Task Templates</h2>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="text-gray-500">Templates coming soon...</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
