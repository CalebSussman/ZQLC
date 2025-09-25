// CSV Import utilities for ATOL system
// Handles parsing, validation, and import processing

export interface ParsedRow {
  type: 'universe' | 'phylum' | 'family' | 'group' | 'task'
  universe_code: string
  universe_name: string
  phylum_code: string
  phylum_name: string
  family_code: string
  family_name: string
  group_num: number | string
  group_name: string
  task_num: number | string
  task_title: string
  task_status: string
  task_priority: number | string
  base_code: string
  id: string
  display_order: number | string
  _rowIndex?: number // For error reporting
}

export interface ValidationError {
  type: 'error' | 'warning'
  message: string
  rowIndex?: number
  field?: string
}

export interface ImportChanges {
  creates: {
    universes: number
    phyla: number
    families: number
    groups: number
    tasks: number
  }
  updates: {
    universes: number
    phyla: number
    families: number
    groups: number
    tasks: number
  }
  deletes: {
    universes: number
    phyla: number
    families: number
    groups: number
    tasks: number
  }
}

export interface TaskToDelete {
  id: string
  base_code: string
  title: string
  current_status: string
  universe_name: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  changes: ImportChanges
  tasksToDelete: TaskToDelete[]
  parsedData: ParsedRow[]
}

// Parse CSV content into structured data
export function parseCSV(csvContent: string): ParsedRow[] {
  const lines = csvContent.split('\n').filter(line => line.trim())
  if (lines.length === 0) {
    throw new Error('CSV file is empty')
  }

  // Parse header
  const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const expectedHeaders = [
    'type', 'universe_code', 'universe_name', 'phylum_code', 'phylum_name',
    'family_code', 'family_name', 'group_num', 'group_name', 'task_num',
    'task_title', 'task_status', 'task_priority', 'base_code', 'id', 'display_order'
  ]

  // Validate headers
  const missingHeaders = expectedHeaders.filter(h => !header.includes(h))
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`)
  }

  // Parse data rows
  const parsedData: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    try {
      const values = parseCSVLine(line)
      if (values.length !== header.length) {
        throw new Error(`Row ${i + 1}: Expected ${header.length} columns, got ${values.length}`)
      }

      const row: any = { _rowIndex: i + 1 }
      header.forEach((col, index) => {
        let value = values[index]

        // Convert numeric fields
        if (['group_num', 'task_num', 'task_priority', 'display_order'].includes(col)) {
          const numValue = parseInt(value)
          row[col] = isNaN(numValue) ? value : numValue
        } else {
          row[col] = value
        }
      })

      // Validate required type field
      if (!['universe', 'phylum', 'family', 'group', 'task'].includes(row.type)) {
        throw new Error(`Row ${i + 1}: Invalid type '${row.type}'`)
      }

      parsedData.push(row as ParsedRow)
    } catch (error) {
      throw new Error(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`)
    }
  }

  return parsedData
}

// Parse a single CSV line handling quotes and commas
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let currentValue = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        currentValue += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of value
      values.push(currentValue.trim())
      currentValue = ''
    } else {
      currentValue += char
    }
  }

  // Add final value
  values.push(currentValue.trim())
  return values
}

// Validate business logic for parsed data
export function validateBusinessLogic(data: ParsedRow[]): ValidationError[] {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // Group data by type
  const universes = data.filter(r => r.type === 'universe')
  const phyla = data.filter(r => r.type === 'phylum')
  const families = data.filter(r => r.type === 'family')
  const groups = data.filter(r => r.type === 'group')
  const tasks = data.filter(r => r.type === 'task')

  // Validate universe codes are unique and single character
  const universeCodes = new Set<string>()
  universes.forEach(row => {
    if (!row.universe_code || row.universe_code.length !== 1) {
      errors.push({
        type: 'error',
        message: `Universe code must be single character: "${row.universe_code}"`,
        rowIndex: row._rowIndex,
        field: 'universe_code'
      })
    }

    if (universeCodes.has(row.universe_code)) {
      errors.push({
        type: 'error',
        message: `Duplicate universe code: "${row.universe_code}"`,
        rowIndex: row._rowIndex,
        field: 'universe_code'
      })
    } else {
      universeCodes.add(row.universe_code)
    }

    if (!row.universe_name?.trim()) {
      errors.push({
        type: 'error',
        message: 'Universe name is required',
        rowIndex: row._rowIndex,
        field: 'universe_name'
      })
    }
  })

  // Validate phylum codes and relationships
  phyla.forEach(row => {
    if (!row.phylum_code || row.phylum_code.length !== 1) {
      errors.push({
        type: 'error',
        message: `Phylum code must be single character: "${row.phylum_code}"`,
        rowIndex: row._rowIndex,
        field: 'phylum_code'
      })
    }

    if (!universeCodes.has(row.universe_code)) {
      errors.push({
        type: 'error',
        message: `Phylum references non-existent universe: "${row.universe_code}"`,
        rowIndex: row._rowIndex,
        field: 'universe_code'
      })
    }

    if (!row.phylum_name?.trim()) {
      errors.push({
        type: 'error',
        message: 'Phylum name is required',
        rowIndex: row._rowIndex,
        field: 'phylum_name'
      })
    }
  })

  // Validate family codes and relationships
  const phylumKeys = new Set(phyla.map(p => `${p.universe_code}-${p.phylum_code}`))
  families.forEach(row => {
    if (!row.family_code || row.family_code.length !== 1) {
      errors.push({
        type: 'error',
        message: `Family code must be single character: "${row.family_code}"`,
        rowIndex: row._rowIndex,
        field: 'family_code'
      })
    }

    const phylumKey = `${row.universe_code}-${row.phylum_code}`
    if (!phylumKeys.has(phylumKey)) {
      errors.push({
        type: 'error',
        message: `Family references non-existent phylum: "${row.universe_code}/${row.phylum_code}"`,
        rowIndex: row._rowIndex,
        field: 'phylum_code'
      })
    }

    if (!row.family_name?.trim()) {
      errors.push({
        type: 'error',
        message: 'Family name is required',
        rowIndex: row._rowIndex,
        field: 'family_name'
      })
    }
  })

  // Validate group relationships and numbers
  groups.forEach(row => {
    const groupNum = typeof row.group_num === 'string' ? parseInt(row.group_num) : row.group_num
    if (isNaN(groupNum) || groupNum < 1 || groupNum > 99) {
      errors.push({
        type: 'error',
        message: `Group number must be between 1-99: "${row.group_num}"`,
        rowIndex: row._rowIndex,
        field: 'group_num'
      })
    }

    if (!row.group_name?.trim()) {
      errors.push({
        type: 'error',
        message: 'Group name is required',
        rowIndex: row._rowIndex,
        field: 'group_name'
      })
    }
  })

  // Validate task relationships and format
  tasks.forEach(row => {
    const taskNum = typeof row.task_num === 'string' ? parseInt(row.task_num) : row.task_num
    if (isNaN(taskNum) || taskNum < 1 || taskNum > 99) {
      errors.push({
        type: 'error',
        message: `Task number must be between 1-99: "${row.task_num}"`,
        rowIndex: row._rowIndex,
        field: 'task_num'
      })
    }

    if (!row.task_title?.trim()) {
      errors.push({
        type: 'error',
        message: 'Task title is required',
        rowIndex: row._rowIndex,
        field: 'task_title'
      })
    }

    if (!['R', 'P', 'D', 'F', 'C', 'X'].includes(row.task_status)) {
      errors.push({
        type: 'error',
        message: `Invalid task status: "${row.task_status}". Must be R/P/D/F/C/X`,
        rowIndex: row._rowIndex,
        field: 'task_status'
      })
    }

    const priority = typeof row.task_priority === 'string' ? parseInt(row.task_priority) : row.task_priority
    if (isNaN(priority) || priority < 1 || priority > 5) {
      errors.push({
        type: 'error',
        message: `Task priority must be between 1-5: "${row.task_priority}"`,
        rowIndex: row._rowIndex,
        field: 'task_priority'
      })
    }

    // Validate base_code format
    if (!row.base_code?.match(/^[A-Z]{2,3}-\d{2}\.\d{2}$/)) {
      errors.push({
        type: 'error',
        message: `Invalid base_code format: "${row.base_code}". Expected: ABC-01.01`,
        rowIndex: row._rowIndex,
        field: 'base_code'
      })
    }
  })

  return [...errors, ...warnings]
}

// Calculate what changes would be made by import
export function calculateChanges(data: ParsedRow[], existingData: any): ImportChanges {
  const changes: ImportChanges = {
    creates: { universes: 0, phyla: 0, families: 0, groups: 0, tasks: 0 },
    updates: { universes: 0, phyla: 0, families: 0, groups: 0, tasks: 0 },
    deletes: { universes: 0, phyla: 0, families: 0, groups: 0, tasks: 0 }
  }

  // Group import data by type
  const importUniverses = data.filter(r => r.type === 'universe')
  const importPhyla = data.filter(r => r.type === 'phylum')
  const importFamilies = data.filter(r => r.type === 'family')
  const importGroups = data.filter(r => r.type === 'group')
  const importTasks = data.filter(r => r.type === 'task')

  // Calculate universe changes
  importUniverses.forEach(row => {
    const existing = existingData.universes?.find((u: any) => u.code === row.universe_code)
    if (existing) {
      if (existing.name !== row.universe_name) {
        changes.updates.universes++
      }
    } else {
      changes.creates.universes++
    }
  })

  // Calculate phyla changes
  importPhyla.forEach(row => {
    const existing = existingData.phyla?.find((p: any) =>
      p.universe_code === row.universe_code && p.code === row.phylum_code
    )
    if (existing) {
      if (existing.name !== row.phylum_name) {
        changes.updates.phyla++
      }
    } else {
      changes.creates.phyla++
    }
  })

  // Calculate family changes
  importFamilies.forEach(row => {
    const existing = existingData.families?.find((f: any) =>
      f.universe_code === row.universe_code &&
      f.phylum_code === row.phylum_code &&
      f.code === row.family_code
    )
    if (existing) {
      if (existing.name !== row.family_name) {
        changes.updates.families++
      }
    } else {
      changes.creates.families++
    }
  })

  // Calculate group changes
  importGroups.forEach(row => {
    const existing = existingData.groups?.find((g: any) =>
      g.universe_code === row.universe_code &&
      g.phylum_code === row.phylum_code &&
      g.family_code === row.family_code &&
      g.group_num === row.group_num
    )
    if (existing) {
      if (existing.name !== row.group_name) {
        changes.updates.groups++
      }
    } else {
      changes.creates.groups++
    }
  })

  // Calculate task changes
  importTasks.forEach(row => {
    const existing = existingData.tasks?.find((t: any) => t.base_code === row.base_code)
    if (existing) {
      if (existing.title !== row.task_title ||
          existing.current_status !== row.task_status ||
          existing.priority !== row.task_priority) {
        changes.updates.tasks++
      }
    } else {
      changes.creates.tasks++
    }
  })

  return changes
}

// Find tasks that exist in database but not in import file
export function findTasksToDelete(importData: ParsedRow[], existingTasks: any[]): TaskToDelete[] {
  const importTaskCodes = new Set(
    importData
      .filter(r => r.type === 'task')
      .map(r => r.base_code)
  )

  return existingTasks
    .filter(task => !importTaskCodes.has(task.base_code))
    .map(task => ({
      id: task.id,
      base_code: task.base_code,
      title: task.title,
      current_status: task.current_status || task.status,
      universe_name: task.universe_name || 'Unknown'
    }))
}