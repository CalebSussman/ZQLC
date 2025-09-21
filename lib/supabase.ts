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
  display_order?: number
  created_at?: string
  updated_at?: string
}

export interface Phylum {
  id: string
  universe_id: string
  code: string
  name: string
  description?: string
  display_order?: number
  created_at?: string
  updated_at?: string
}

export interface Family {
  id: string
  phylum_id: string
  code: string
  name: string
  description?: string
  display_order?: number
  created_at?: string
  updated_at?: string
}

export interface Group {
  id?: string
  universe_id: string
  phylum_id: string
  family_id?: string | null
  group_num: number
  name?: string | null
  task_count?: number  
  created_at?: string
  updated_at?: string
}

export interface Task {
  id: string
  code: string
  base_code?: string
  universe_id?: string
  phylum_id?: string
  family_id?: string
  group_num: number
  task_num: number
  title: string
  status: 'active' | 'completed' | 'archived'
  priority: number
  task_timestamp?: string
  current_entry_id?: string
  created_at: string
  updated_at: string
  completed_at?: string
  
  // Joined fields from task_details view
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
  note_count?: number
  attachment_count?: number
  entry_count?: number
  display_code?: string
}

export interface TaskEntry {
  id: string
  task_id: string
  status_code: string
  entry_timestamp: string
  full_code: string
  note?: string
  created_by?: string
  created_at: string
  // From view
  status_name?: string
  base_code?: string
  duration_from_previous?: string
  duration_until_next?: string
}

export interface TaskNote {
  id: string
  task_id: string
  type: 'task' | 'step' | 'outcome'
  content: string
  created_at: string
  updated_at?: string
}

export interface TaskAttachment {
  id: string
  task_id: string
  file_url: string
  file_name: string
  file_type?: string
  file_size?: number
  uploaded_at: string
}

export interface Status {
  code: string
  name: string
  description?: string
  display_order?: number
}

export interface CalendarEntry {
  id: string
  task_id?: string
  date: string
  start_time: string
  end_time?: string
  note?: string
  created_at: string
  updated_at?: string
}

export interface DailyLog {
  id: string
  date: string
  content_markdown?: string
  content_json?: any
  tasks_completed?: number
  tasks_worked?: number
  exported_at?: string
  created_at: string
}
