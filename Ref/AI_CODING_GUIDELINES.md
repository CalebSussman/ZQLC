# AI Coding Guidelines for ATOL (ZQLC)

## CRITICAL REQUIREMENTS

### 1. Mobile Responsiveness Rules
**ALL UI components MUST be mobile-responsive using these patterns:**

```tsx
// ✅ REQUIRED: Responsive padding
className="p-4 sm:p-6"

// ✅ REQUIRED: Responsive gaps
className="gap-2 sm:gap-4"

// ✅ REQUIRED: Responsive text sizes
className="text-lg sm:text-2xl"

// ✅ REQUIRED: Responsive button padding
className="px-3 py-2 sm:px-4 sm:py-2"

// ✅ REQUIRED: Prevent overflow in flex containers
className="flex-1 min-w-0"  // Add min-w-0 to flex-1 inputs

// ✅ REQUIRED: Prevent button shrinking
className="flex-shrink-0"   // Add to buttons in flex containers
```

**NEVER use fixed sizes without responsive alternatives:**
```tsx
// ❌ FORBIDDEN: Fixed sizes that break mobile
className="p-8"        // Use: p-4 sm:p-8
className="text-3xl"   // Use: text-xl sm:text-3xl
className="gap-6"      // Use: gap-3 sm:gap-6
className="px-6 py-3"  // Use: px-4 py-2 sm:px-6 sm:py-3
```

### 2. React Re-rendering Prevention
**NEVER include console.log in render cycles or event handlers:**
```tsx
// ❌ FORBIDDEN: Breaks typing in inputs
const handleChange = (e) => {
  console.log('value:', e.target.value)  // CAUSES RE-RENDER LOOPS
  setValue(e.target.value)
}

// ✅ REQUIRED: Clean handlers only
const handleChange = (e) => {
  setValue(e.target.value)
}
```

**useEffect dependency rules:**
```tsx
// ❌ FORBIDDEN: Function dependencies cause loops
useEffect(() => {
  loadData()
}, [loadData])  // Function reference changes every render

// ✅ REQUIRED: Primitive dependencies only
useEffect(() => {
  loadData()
}, [])  // Empty array for mount-only effects

useEffect(() => {
  if (selectedId && mounted) {
    loadDetail(selectedId)
  }
}, [selectedId, mounted])  // Only primitive values
```

### 3. Component Architecture Rules

**Form components must be isolated:**
```tsx
// ✅ REQUIRED: Extract forms into separate components
const SimpleCreateForm = ({ onCancel, onCreate }) => {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')

  return (
    <div className="p-4 sm:p-6 space-y-3">
      <div className="flex gap-2 sm:gap-4">
        <input
          className="w-12 sm:w-16 px-2 py-2 sm:px-3 sm:py-2"
          // ... responsive classes required
        />
        <input
          className="flex-1 min-w-0 px-3 py-2 sm:px-4 sm:py-2"
          // ... responsive classes required
        />
      </div>
      <div className="flex gap-2">
        <button className="px-4 py-2 text-sm sm:text-base">Create</button>
        <button className="px-4 py-2 text-sm sm:text-base">Cancel</button>
      </div>
    </div>
  )
}
```

### 4. Input Field Requirements

**All inputs must follow this pattern:**
```tsx
<input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}  // No console.log!
  className="flex-1 min-w-0 text-lg sm:text-xl font-mono bg-transparent border-b-2 focus:outline-none"
  // Always include min-w-0 for flex containers
  // Always use responsive text sizes
  // Always use consistent focus states
/>
```

### 5. Button Guidelines

**All buttons must be responsive:**
```tsx
<button
  onClick={handleClick}  // No console.log in handlers!
  disabled={isDisabled}
  className="flex-shrink-0 px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base font-medium bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
>
  Action
</button>
```

### 6. Layout Container Rules

**Page containers must use responsive padding:**
```tsx
// ✅ REQUIRED: All page containers
<div className="min-h-screen bg-[#F8F7F4] dark:bg-[#0A0A0B] p-4 sm:p-8">
  <div className="max-w-5xl mx-auto">
    // Content with responsive spacing
  </div>
</div>
```

**Card/panel containers:**
```tsx
// ✅ REQUIRED: All cards/panels
<div className="mb-6 sm:mb-8 bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-lg border border-gray-300 dark:border-gray-700">
  // Content
</div>
```

### 7. Grid System Rules

**All grids must be responsive:**
```tsx
// ✅ REQUIRED: Responsive grids
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
  // Grid items
</div>

// ✅ REQUIRED: Mobile-first breakpoints
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
  // Denser grids for small items
</div>
```

### 8. Typography Rules

**Responsive text sizing is mandatory:**
```tsx
// ✅ REQUIRED: Headers
className="text-2xl sm:text-3xl font-mono font-bold"

// ✅ REQUIRED: Body text
className="text-sm sm:text-base"

// ✅ REQUIRED: Small text
className="text-xs sm:text-sm"

// ✅ REQUIRED: Large display text
className="text-lg sm:text-xl md:text-2xl"
```

### 9. Spacing System

**Use consistent responsive spacing:**
```tsx
// ✅ REQUIRED: Margins
className="mb-4 sm:mb-6"    // Small to medium spacing
className="mb-6 sm:mb-8"    // Medium to large spacing
className="mt-2 sm:mt-4"    // Small top margins

// ✅ REQUIRED: Padding
className="p-3 sm:p-4"      // Small containers
className="p-4 sm:p-6"      // Medium containers
className="p-6 sm:p-8"      // Large containers
```

### 10. Touch Target Requirements

**All interactive elements must meet touch target minimums:**
```tsx
// ✅ REQUIRED: Minimum touch targets (44x44px)
<button className="min-h-[44px] min-w-[44px] p-2 sm:p-3">
  // Icon or small button content
</button>

// ✅ REQUIRED: Adequate spacing between touch targets
<div className="flex gap-2 sm:gap-3">
  <button>Action 1</button>
  <button>Action 2</button>
</div>
```

## DEBUGGING PROCEDURES

### When React Inputs Only Allow One Character:
1. **Remove ALL console.log from onChange handlers**
2. **Remove ALL console.log from render functions**
3. **Fix useEffect dependencies (no function references)**
4. **Extract form into isolated component if needed**
5. **Restart dev server to clear Fast Refresh cache**

### When Layout Breaks on Mobile:
1. **Audit all fixed padding/margins for responsive alternatives**
2. **Check text sizes have sm: breakpoint versions**
3. **Ensure flex containers have min-w-0 on growing children**
4. **Verify buttons have flex-shrink-0 in containers**
5. **Test on actual mobile device or browser dev tools**

## SUPABASE PATTERNS

### Database Operations
```tsx
// ✅ REQUIRED: Error handling pattern
try {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('field', value)

  if (error) throw error
  return data
} catch (error) {
  console.error('Database operation failed:', error)
  throw error  // Re-throw for caller to handle
}
```

### Real-time Updates
```tsx
// ✅ REQUIRED: Cleanup subscriptions
useEffect(() => {
  const subscription = supabase
    .channel('table_changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'tasks' },
      (payload) => {
        // Handle change without console.log
        handleDataChange(payload)
      }
    )
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}, [])
```

## COMPONENT EXAMPLES

### Responsive Create Form
```tsx
const ResponsiveCreateForm = ({ onCancel, onCreate, placeholder = "Name" }) => {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = async () => {
    if (!code.trim() || !name.trim()) return

    setIsCreating(true)
    try {
      await onCreate(code.trim(), name.trim())
      setCode('')
      setName('')
    } catch (error) {
      // Error handling without console.log
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3 sm:space-y-4">
      <div className="flex items-center gap-2 sm:gap-4">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="w-12 sm:w-16 px-2 py-2 sm:px-3 sm:py-2 font-mono text-center bg-white dark:bg-gray-700 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={1}
          placeholder="C"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 sm:px-4 sm:py-2 font-mono bg-white dark:bg-gray-700 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={placeholder}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={isCreating || !code.trim() || !name.trim()}
          className="flex-shrink-0 px-4 py-2 text-sm sm:text-base font-medium bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded transition-colors"
        >
          {isCreating ? 'Creating...' : 'Create'}
        </button>
        <button
          onClick={onCancel}
          disabled={isCreating}
          className="flex-shrink-0 px-4 py-2 text-sm sm:text-base font-medium bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
```

### Responsive Modal/Overlay
```tsx
const ResponsiveModal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-16 sm:pt-32"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg w-full max-w-2xl shadow-2xl max-h-96 flex flex-col mx-4 sm:mx-0"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
```

## FILE ORGANIZATION RULES

### Page Structure
```
app/
├── page.tsx                 # Home/Create page
├── browse/page.tsx         # Browse hierarchies
├── todo/page.tsx           # Current card tasks
├── log/page.tsx            # Time tracking
└── t/[code]/page.tsx       # Individual task view
```

### Component Structure
```
components/
├── Navigation.tsx          # Main navigation with search
├── SimpleCreateForm.tsx    # Reusable create form
└── ui/                     # Future UI components
```

### Reference Structure
```
Ref/
├── AI_CODING_GUIDELINES.md # This file
└── [other reference docs]
```

## TESTING REQUIREMENTS

### Mobile Testing Checklist
- [ ] All text is readable at 320px width (iPhone SE)
- [ ] All buttons are touchable (minimum 44x44px)
- [ ] No horizontal scrolling required
- [ ] Forms work without input focus issues
- [ ] Modals/overlays are dismissible via tap
- [ ] Navigation works on mobile

### React Performance Checklist
- [ ] No console.log in render cycles
- [ ] No console.log in event handlers
- [ ] useEffect dependencies are primitive values only
- [ ] Form inputs allow multi-character typing
- [ ] No unnecessary re-renders during typing

### Database Integration Checklist
- [ ] All queries have proper error handling
- [ ] Real-time subscriptions are cleaned up
- [ ] Loading states are managed properly
- [ ] Optimistic updates where appropriate

## DEPLOYMENT CHECKLIST

Before each commit:
1. **Remove all console.log statements**
2. **Test mobile responsiveness**
3. **Verify typing works in all inputs**
4. **Check button accessibility on touch**
5. **Test search functionality**
6. **Verify database operations**
7. **Test navigation on mobile**

## COMMON PATTERNS

### Create Workflow
1. Form validation
2. Optimistic UI update
3. Database operation
4. Error handling
5. Navigation to created resource

### Edit Workflow
1. Load current data
2. Show edit form with populated values
3. Handle changes without re-render issues
4. Save with optimistic update
5. Refresh data view

### Delete Workflow
1. Confirmation dialog
2. Optimistic removal from UI
3. Database cascade delete
4. Error handling with rollback
5. Toast notification

Remember: Mobile-first, React-safe, accessible, performant.