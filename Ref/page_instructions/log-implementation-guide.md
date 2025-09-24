# ATOL Log Page Implementation Guide

## Overview
You are implementing a drag-and-drop time tracking interface for the ATOL task management system. This replaces the existing basic Log page with an advanced calendar that supports dragging tasks from an inventory to schedule them, moving entries between time slots, and resizing entries to adjust duration.

## Current State
- **Existing File**: `app/log/page.tsx` (basic implementation with simple forms)
- **Database**: Already has `calendar_entries` table with proper schema
- **Navigation**: Existing nav structure in place (left sidebar desktop, bottom tabs mobile)
- **Supabase**: Connected and working with existing queries

## Implementation Requirements

### 1. Core Features to Implement

#### Drag-and-Drop Calendar
- **15-minute time slots** from 7:00 AM to 10:00 PM
- **Visual timeline** with hour markers and quarter-hour subdivisions
- **Drag tasks from inventory** → drop on time slot to create entry
- **Drag existing entries** to move them to different times
- **Resize entries** by dragging bottom edge to adjust duration
- **Live time indicator** (red line showing current time)

#### Task Inventory Panel
- **Desktop**: Secondary sidebar that slides out from left (positioned at left: 192px)
- **Mobile**: Bottom drawer with floating action button trigger
- **Search/filter** functionality for tasks
- **Shows current card tasks** at top with priority
- **Color-coded task cards** for visual distinction

#### Entry Management
- **Click to select** entries on calendar
- **Selected entry panel** at bottom with quick actions
- **Status changes** via dropdown (R/P/D/C/X)
- **Delete entries** with single click
- **Automatic duration calculation**

### 2. Database Schema (Already Exists)

```sql
-- Existing calendar_entries table structure
calendar_entries {
  id: UUID
  task_code: string (required, links to task)
  status_code: string (R/P/D/C/X)
  work_description: text
  date: date
  start_time: time
  end_time: time (nullable)
  is_parallel: boolean (for simultaneous tasks)
  track_number: integer (track 1, 2, 3 for parallel)
  created_at: timestamp
}

-- Related tables you'll query
tasks {
  id: UUID
  code: string (e.g., "WDV-11.14")
  name: string
  status: string
  updated_at: timestamp
}

cards {
  id: UUID
  card_number: string (e.g., "ATOL-XVI")
  start_date: date
  end_date: date (nullable)
  status: string
}
```

### 3. Component Structure

```typescript
// Main component structure
export default function LogPage() {
  // State Management
  - currentDate (for navigation)
  - entries (calendar entries for current day)
  - activeTasks (recent/pending tasks for inventory)
  - currentCard (active ATOL card)
  - draggedItem (track what's being dragged)
  - selectedEntry (for editing/deleting)
  - showTaskPanel (toggle inventory visibility)
  
  // Core Functions
  - loadEntries() // Fetch entries for current date
  - loadActiveTasks() // Get recent/pending tasks
  - createEntryAtTime(task, time) // Create new entry
  - updateEntryTime(entryId, newTime) // Move entry
  - updateEntryDuration(entryId, newEndTime) // Resize
  - deleteEntry(entryId) // Remove entry
  
  // Drag Handlers
  - handleTaskDragStart(event, task)
  - handleEntryDragStart(event, entry)  
  - handleTimeSlotDragOver(event, time)
  - handleTimeSlotDrop(event, time)
  
  // Subcomponents
  - Navigation() // Keep existing nav structure
  - TaskPanel() // Inventory sidebar/drawer
  - CalendarGrid() // Main timeline view
}
```

### 4. Visual Design Requirements

#### Color Coding System
```css
/* Task type colors (based on first letter of code) */
W tasks: blue (Work/Web)
A tasks: green (Admin/Analysis)
C tasks: purple (Communication/Coordination)
Default: gray

/* Status colors */
R (Received): blue
P (Pending): yellow
D (Delivered): purple
C (Completed): green
X (Cancelled): red
```

#### Layout Specifications
- **Desktop**: 
  - Left nav: 192px wide (existing)
  - Task panel: 320px wide (slides from left: 192px)
  - Calendar: Remaining space with padding
  
- **Mobile**:
  - Bottom nav: 64px height (existing)
  - Task drawer: 75% screen height from bottom
  - Floating button: 56px diameter, bottom-right

### 5. Key Implementation Details

#### Time Calculations
```typescript
// Convert time string to minutes for calculations
function timeToMinutes(time: string): number {
  const [hour, min] = time.split(':').map(Number)
  return hour * 60 + min
}

// Snap to 15-minute intervals
function snapToQuarter(minutes: number): number {
  return Math.round(minutes / 15) * 15
}

// Calculate entry position on grid
const topOffset = ((startHour - 7) * 64) + ((startMinutes % 60) / 60 * 64) + 8
const height = (duration / 60) * 64 - 4
```

#### Drag-and-Drop Logic
```typescript
// When dragging from inventory (creates new)
if (draggedItem.type === 'task') {
  // Create new entry at drop position
  createEntryAtTime(draggedItem.task, dropTime)
}

// When dragging existing entry (moves)
if (draggedItem.type === 'entry') {
  // Update entry with new start time
  updateEntryTime(draggedItem.entry.id, dropTime)
}
```

#### Responsive Behavior
```typescript
// Detect mobile/desktop
const [isMobile, setIsMobile] = useState(false)
useEffect(() => {
  const checkMobile = () => setIsMobile(window.innerWidth < 768)
  checkMobile()
  window.addEventListener('resize', checkMobile)
  return () => window.removeEventListener('resize', checkMobile)
}, [])
```

### 6. Supabase Queries

```typescript
// Load entries for a specific date
const { data } = await supabase
  .from('calendar_entries')
  .select('*')
  .eq('date', currentDate.toISOString().split('T')[0])
  .order('start_time')

// Load active tasks for inventory
const { data: tasks } = await supabase
  .from('tasks')
  .select('*')
  .in('status', ['R', 'P', 'D'])
  .order('updated_at', { ascending: false })
  .limit(30)

// Create new entry
await supabase
  .from('calendar_entries')
  .insert({
    task_code: task.code,
    status_code: 'P',
    work_description: task.name,
    date: currentDate.toISOString().split('T')[0],
    start_time: time,
    end_time: endTime,
    is_parallel: false,
    track_number: 1
  })

// Update entry time
await supabase
  .from('calendar_entries')
  .update({ 
    start_time: newStartTime,
    end_time: newEndTime 
  })
  .eq('id', entryId)
```

### 7. Critical Implementation Notes

#### Performance Optimization
- **Keep Navigation lightweight**: Don't load task data in nav component
- **Lazy load task inventory**: Only fetch when panel opens
- **Debounce resize events**: Prevent excessive updates during drag
- **Use CSS transforms**: For smooth panel animations

#### User Experience
- **Visual feedback**: Highlight drop zones during drag
- **Snap to grid**: Always align to 15-minute intervals
- **Prevent overlaps**: Check for conflicts before creating entries
- **Auto-save**: No explicit save button, all changes immediate

#### Edge Cases to Handle
- **Dragging past day boundaries**: Cap at 23:45
- **Minimum duration**: Enforce at least 15 minutes
- **Parallel tasks**: Support multiple tracks (future feature)
- **Timezone handling**: Use local time consistently

### 8. Testing Checklist

- [ ] Drag task from inventory creates entry at correct time
- [ ] Drag entry to new time updates database
- [ ] Resize entry updates duration correctly
- [ ] Delete entry removes from database
- [ ] Current time indicator updates live
- [ ] Mobile drawer opens/closes smoothly
- [ ] Desktop panel doesn't affect nav performance
- [ ] Search filters tasks correctly
- [ ] Status changes persist
- [ ] Navigation between days loads correct entries
- [ ] Color coding displays correctly
- [ ] Selected entry shows details panel
- [ ] All times snap to 15-minute intervals
- [ ] Visual feedback during drag operations

### 9. File Structure

```
app/
  log/
    page.tsx          # Main component (replace existing)
  
lib/
  supabase.ts         # Existing Supabase client
  
(No new files needed - this is a complete replacement of the existing log/page.tsx)
```

### 10. Migration from Existing Code

1. **Backup existing** `app/log/page.tsx`
2. **Replace entire file** with new implementation
3. **No database changes needed** (schema already supports all features)
4. **Test thoroughly** before deploying

## Implementation Order

1. **Set up basic structure** with state and loading functions
2. **Create calendar grid** with time slots
3. **Add entry rendering** on the grid
4. **Implement drag-from-inventory** to create entries
5. **Add drag-to-move** for existing entries
6. **Implement resize functionality**
7. **Add task inventory panel** (desktop sidebar)
8. **Add mobile drawer** and floating button
9. **Add selection and detail panel**
10. **Polish animations and transitions**

## Success Criteria

The implementation is complete when:
- Users can drag tasks from inventory to schedule them
- Entries can be moved by dragging to new times
- Entries can be resized by dragging edges
- Task inventory is accessible but doesn't slow navigation
- Mobile experience is smooth with drawer pattern
- All changes persist to database immediately
- Visual feedback makes interactions clear
- Performance remains snappy even with many entries
