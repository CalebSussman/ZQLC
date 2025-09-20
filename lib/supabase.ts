import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for our database
export interface Universe {
  id: string
  code: string
  name: string
  description?: string
  color: string
}

export interface Phylum {
  id: string
  universe_id: string
  code: string
  name: string
  description?: string
}

export interface Family {
  id: string
  phylum_id: string
  code: string
  name: string
  description?: string
}

export interface Task {
  id: string
  code: string
  universe_id?: string
  phylum_id?: string
  family_id?: string
  group_num: number
  task_num: number
  title: string
  status: 'active' | 'completed' | 'archived'
  priority: number
  created_at: string
  updated_at: string
  completed_at?: string
  // Joined fields from view
  universe_name?: string
  universe_color?: string
  phylum_name?: string
  family_name?: string
}

export interface TaskNote {
  id: string
  task_id: string
  type: 'task' | 'step' | 'outcome'
  content: string
  created_at: string
}
