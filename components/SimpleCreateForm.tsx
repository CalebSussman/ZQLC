'use client'

import { useState, useRef, useEffect } from 'react'

interface SimpleCreateFormProps {
  onCancel: () => void
  onCreate: (code: string, name: string) => Promise<void>
  placeholder?: string
  codeMaxLength?: number
  codeType?: 'alpha' | 'numeric'
  codePlaceholder?: string
}

export default function SimpleCreateForm({
  onCancel,
  onCreate,
  placeholder = "Name",
  codeMaxLength = 1,
  codeType = 'alpha',
  codePlaceholder = 'C'
}: SimpleCreateFormProps) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Focus on name input when component mounts
    if (nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [])

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (codeType === 'numeric') {
      // Only allow digits for numeric codes
      const numericValue = value.replace(/\D/g, '')
      setCode(numericValue.slice(0, codeMaxLength))
    } else {
      // Allow letters for alpha codes, convert to uppercase
      const alphaValue = value.toUpperCase()
      setCode(alphaValue.slice(0, codeMaxLength))
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
  }

  const handleCreate = async () => {
    if (!code.trim() || !name.trim()) {
      alert('Please enter both code and name')
      return
    }

    setIsCreating(true)
    try {
      await onCreate(code.trim(), name.trim())
      // Reset form
      setCode('')
      setName('')
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setIsCreating(false)
    }
  }

  const handleCancel = () => {
    setCode('')
    setName('')
    onCancel()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCreate()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
      <div className="space-y-3">
        <div className="flex gap-3">
          <input
            type="text"
            value={code}
            onChange={handleCodeChange}
            onKeyDown={handleKeyDown}
            className={`${codeType === 'numeric' ? 'w-16' : 'w-12'} px-2 py-2 font-mono bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500`}
            maxLength={codeMaxLength}
            placeholder={codePlaceholder}
            disabled={isCreating}
          />
          <input
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={handleNameChange}
            onKeyDown={handleKeyDown}
            className="flex-1 px-3 py-2 font-mono bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={placeholder}
            disabled={isCreating}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCreate}
            disabled={isCreating || !code.trim() || !name.trim()}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded text-sm font-medium transition-colors"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isCreating}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white rounded text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>

        {code.trim() && name.trim() && (
          <div className="text-xs text-gray-500 font-mono">
            Preview: {code.toUpperCase()} - {name}
          </div>
        )}
      </div>
    </div>
  )
}