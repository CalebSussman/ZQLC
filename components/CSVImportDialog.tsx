'use client'

import { useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  parseCSV,
  validateBusinessLogic,
  calculateChanges,
  findTasksToDelete,
  type ParsedRow,
  type ValidationResult,
  type ValidationError,
  type TaskToDelete
} from '@/lib/csvImport'

interface CSVImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete?: () => void
}

export default function CSVImportDialog({ isOpen, onClose, onImportComplete }: CSVImportDialogProps) {
  // State
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [confirmDeletion, setConfirmDeletion] = useState(false)
  const [showDeletePreview, setShowDeletePreview] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importComplete, setImportComplete] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file')
      return
    }

    setFile(selectedFile)
    setValidationResult(null)
    setConfirmDeletion(false)
    setIsProcessing(true)
    setImportError(null)

    try {
      // Read file content
      const content = await readFileAsText(selectedFile)

      // Parse CSV
      const parsedData = parseCSV(content)

      // Load existing data for comparison
      const existingData = await loadExistingData()

      // Validate business logic
      const validationErrors = validateBusinessLogic(parsedData)

      // Calculate changes
      const changes = calculateChanges(parsedData, existingData)

      // Find tasks to delete
      const tasksToDelete = findTasksToDelete(parsedData, existingData.tasks || [])

      const result: ValidationResult = {
        isValid: validationErrors.filter(e => e.type === 'error').length === 0,
        errors: validationErrors.filter(e => e.type === 'error'),
        warnings: validationErrors.filter(e => e.type === 'warning'),
        changes,
        tasksToDelete,
        parsedData
      }

      setValidationResult(result)

    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to process CSV file')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  // Read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  // Load existing data from database
  const loadExistingData = async () => {
    const [
      { data: universes },
      { data: phyla },
      { data: families },
      { data: groups },
      { data: tasks }
    ] = await Promise.all([
      supabase.from('universes').select('*'),
      supabase.from('phyla').select('*, universe:universes(code, name)'),
      supabase.from('families').select('*, phylum:phyla(code, name, universe:universes(code, name))'),
      supabase.from('groups_with_counts').select('*'),
      supabase.from('task_details').select('*')
    ])

    return { universes, phyla, families, groups, tasks }
  }

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles[0])
    }
  }

  // Handle import execution
  const executeImport = async () => {
    if (!validationResult || !validationResult.isValid) return

    setIsImporting(true)
    setImportProgress(0)
    setImportError(null)

    try {
      // If there are tasks to delete and user hasn't confirmed, require confirmation
      if (validationResult.tasksToDelete.length > 0 && !confirmDeletion) {
        setImportError('Please confirm deletion of existing tasks before proceeding')
        setIsImporting(false)
        return
      }

      // Execute import via database function
      setImportProgress(50)

      const { error } = await supabase.rpc('bulk_import_system_data', {
        import_data: validationResult.parsedData,
        delete_missing_tasks: confirmDeletion
      })

      if (error) {
        throw new Error(error.message)
      }

      setImportProgress(100)
      setImportComplete(true)

      // Wait a moment to show completion, then close
      setTimeout(() => {
        onImportComplete?.()
        onClose()
        resetDialog()
      }, 2000)

    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  // Reset dialog state
  const resetDialog = () => {
    setFile(null)
    setValidationResult(null)
    setConfirmDeletion(false)
    setShowDeletePreview(false)
    setIsImporting(false)
    setImportProgress(0)
    setImportComplete(false)
    setImportError(null)
    setIsProcessing(false)
  }

  // Handle dialog close
  const handleClose = () => {
    if (isImporting) return // Prevent closing during import
    resetDialog()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-black text-green-400 font-mono rounded-lg w-full max-w-4xl max-h-[95vh] flex flex-col border-2 border-green-400">
        {/* Terminal Header */}
        <div className="p-4 border-b border-green-400 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="ml-4 text-green-400">SYSTEM DATA IMPORT - TERMINAL</span>
          </div>
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="text-green-400 hover:text-green-300 disabled:opacity-50"
          >
            [×]
          </button>
        </div>

        {/* Terminal Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* File Upload Section */}
          {!file && (
            <div
              className="border-2 border-dashed border-green-400 p-8 text-center cursor-pointer hover:border-green-300 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-lg mb-2">&gt; DRAG CSV FILE HERE OR [BROWSE FILE]</div>
              <div className="text-sm text-green-300">
                Expected format: ATOL system export CSV
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
            </div>
          )}

          {/* File Processing Status */}
          {file && (
            <div className="space-y-2">
              <div>&gt; FILE LOADED: {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)</div>
              {isProcessing && <div>&gt; PARSING AND VALIDATING...</div>}

              {validationResult && !isProcessing && (
                <div>&gt; PARSING COMPLETE: {validationResult.parsedData.length} RECORDS DETECTED</div>
              )}
            </div>
          )}

          {/* Validation Results */}
          {validationResult && !isProcessing && (
            <div className="border border-green-400 p-4 space-y-2">
              <div className="text-yellow-400">─ VALIDATION RESULTS ─────────────────────────</div>

              <div className="space-y-1">
                <div className="text-green-400">✓ CSV FORMAT: VALID</div>
                <div className="text-green-400">✓ REQUIRED COLUMNS: FOUND</div>

                {validationResult.errors.length > 0 && (
                  <div className="text-red-400">
                    ✗ ERRORS: {validationResult.errors.length} FOUND
                    <div className="ml-4 text-sm space-y-1">
                      {validationResult.errors.slice(0, 5).map((error, i) => (
                        <div key={i}>
                          - Row {error.rowIndex}: {error.message}
                        </div>
                      ))}
                      {validationResult.errors.length > 5 && (
                        <div>- ({validationResult.errors.length - 5} more errors...)</div>
                      )}
                    </div>
                  </div>
                )}

                {validationResult.warnings.length > 0 && (
                  <div className="text-yellow-400">
                    ⚠ WARNINGS: {validationResult.warnings.length} FOUND
                  </div>
                )}
              </div>

              {validationResult.isValid && (
                <div className="mt-4 space-y-1">
                  <div className="text-yellow-400">CHANGES PREVIEW:</div>
                  <div className="ml-2 space-y-1">
                    {validationResult.changes.creates.universes > 0 && (
                      <div>• {validationResult.changes.creates.universes} NEW UNIVERSES</div>
                    )}
                    {validationResult.changes.creates.phyla > 0 && (
                      <div>• {validationResult.changes.creates.phyla} NEW PHYLA</div>
                    )}
                    {validationResult.changes.creates.families > 0 && (
                      <div>• {validationResult.changes.creates.families} NEW FAMILIES</div>
                    )}
                    {validationResult.changes.creates.groups > 0 && (
                      <div>• {validationResult.changes.creates.groups} NEW GROUPS</div>
                    )}
                    {validationResult.changes.creates.tasks > 0 && (
                      <div>• {validationResult.changes.creates.tasks} NEW TASKS</div>
                    )}

                    {validationResult.changes.updates.universes > 0 && (
                      <div>• {validationResult.changes.updates.universes} UPDATED UNIVERSES</div>
                    )}
                    {validationResult.changes.updates.phyla > 0 && (
                      <div>• {validationResult.changes.updates.phyla} UPDATED PHYLA</div>
                    )}
                    {validationResult.changes.updates.families > 0 && (
                      <div>• {validationResult.changes.updates.families} UPDATED FAMILIES</div>
                    )}
                    {validationResult.changes.updates.groups > 0 && (
                      <div>• {validationResult.changes.updates.groups} UPDATED GROUPS</div>
                    )}
                    {validationResult.changes.updates.tasks > 0 && (
                      <div>• {validationResult.changes.updates.tasks} UPDATED TASKS</div>
                    )}
                  </div>

                  {/* Deletion Warning */}
                  {validationResult.tasksToDelete.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="text-red-400">⚠️ DELETION DETECTED:</div>
                      <div className="ml-2">
                        <div className="text-red-400">
                          • {validationResult.tasksToDelete.length} TASKS IN DATABASE NOT IN IMPORT FILE
                        </div>
                        {showDeletePreview ? (
                          <div className="ml-4 text-sm space-y-1 max-h-32 overflow-y-auto">
                            {validationResult.tasksToDelete.map((task, i) => (
                              <div key={i}>
                                - {task.base_code} &quot;{task.title}&quot; ({task.current_status})
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="ml-4 text-sm space-y-1">
                            {validationResult.tasksToDelete.slice(0, 3).map((task, i) => (
                              <div key={i}>
                                - {task.base_code} &quot;{task.title}&quot;
                              </div>
                            ))}
                            {validationResult.tasksToDelete.length > 3 && (
                              <button
                                onClick={() => setShowDeletePreview(true)}
                                className="text-yellow-400 hover:text-yellow-300 underline"
                              >
                                ({validationResult.tasksToDelete.length - 3} more tasks - click to expand)
                              </button>
                            )}
                          </div>
                        )}

                        <div className="mt-2 flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="confirmDelete"
                            checked={confirmDeletion}
                            onChange={(e) => setConfirmDeletion(e.target.checked)}
                            className="rounded"
                          />
                          <label htmlFor="confirmDelete" className="text-red-400">
                            ☐ CONFIRM DELETION OF {validationResult.tasksToDelete.length} TASKS
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Import Progress */}
          {isImporting && (
            <div className="space-y-2">
              <div>&gt; IMPORTING DATA...</div>
              <div className="bg-green-900 w-full h-4 rounded">
                <div
                  className="bg-green-400 h-full rounded transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <div>&gt; PROGRESS: {importProgress}%</div>
            </div>
          )}

          {/* Import Complete */}
          {importComplete && (
            <div className="text-green-400 space-y-1">
              <div>&gt; IMPORT COMPLETE ✓</div>
              <div>&gt; SYSTEM DATA UPDATED SUCCESSFULLY</div>
              <div>&gt; CLOSING TERMINAL...</div>
            </div>
          )}

          {/* Import Error */}
          {importError && (
            <div className="text-red-400">
              <div>&gt; ERROR: {importError}</div>
            </div>
          )}
        </div>

        {/* Terminal Actions */}
        <div className="p-4 border-t border-green-400 flex flex-wrap gap-2 justify-between">
          <div className="text-xs text-green-300">
            ⚠️ WARNING: THIS WILL MODIFY SYSTEM DATA<br/>
            ⚠️ BACKUP RECOMMENDED BEFORE PROCEEDING
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleClose}
              disabled={isImporting}
              className="px-4 py-2 border border-green-400 text-green-400 hover:bg-green-400 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              [CANCEL]
            </button>

            {validationResult?.tasksToDelete.length > 0 && (
              <button
                onClick={() => setShowDeletePreview(!showDeletePreview)}
                className="px-4 py-2 border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black transition-colors"
              >
                [PREVIEW DELETIONS]
              </button>
            )}

            <button
              onClick={executeImport}
              disabled={
                !validationResult?.isValid ||
                isImporting ||
                (validationResult?.tasksToDelete.length > 0 && !confirmDeletion)
              }
              className="px-4 py-2 border border-green-400 text-green-400 hover:bg-green-400 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? '[IMPORTING...]' : '[IMPORT]'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}