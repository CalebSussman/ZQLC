# ATOL System Complete Implementation Package

## IMPLEMENTATION ANSWER SHEET

### 1. Current Supabase Schema Details

**Connection Info:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://ofiindxmfiptivijhbdi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9maWluZHhtZmlwdGl2aWpoYmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTU4MjEsImV4cCI6MjA3Mzk3MTgyMX0.P9Qmhha1EL7X0uQ8CiUF6LXWqBCQt1pJwg3cmcHkfR0
NEXT_PUBLIC_APP_URL=https://atol.co
```

**Existing Schema includes:**
- `task_details` view: Full task information with categories and current entry
- `groups_with_counts` view: Group task counts
- `task_entry_history` view: All status changes with durations
- `create_task_entry` RPC function: Generates proper formatted entries
- All tables: universes, phyla, families, groups, tasks, task_entries, statuses, etc.

### 2. Card Filing Logic

- **Filing tasks**: CCA-01.16 = "File ATOL-XVI"
- **Process**: Mark CCA-01.16 as [C]ompleted → Archives XVI, creates XVII, generates CCA-01.17
- **Duration**: No fixed duration - manual filing when ready (typically weekly)
- **Carry forward**: Incomplete tasks move to new card automatically

### 3. Summary Generation Rules

**SOA (Daily)**: Tasks worked, status changes, notes by universe - auto-generate every 15 min
**SOWA (Weekly)**: Aggregated daily summaries, metrics - auto-generate hourly  
**SOMA (Monthly)**: Cards filed, universe breakdowns - auto-generate daily

### 4. Environment Variables

See connection info above. Domain: atol.co (production), GitHub repo stays as ZQLC

### 5. Design Clarifications

**Fonts**: IBM Plex Mono (primary), Courier Prime (fallback)
**Dark Mode**: #0A0A0B bg, #E8E6E3 text, #FFA000 highlights
**ASCII**: ═║╔╗╚╝ (borders), ███▓▓▓░░░ (progress), >•[] (markers)

### Question Answers:

1. **Status Format**: `R-2025.09.21_14:30=WDA-12.03` (underscore in time)
2. **URLs**: Keep `/t/wda-12.03` (lowercase base code only)
3. **Search**: Yes, ctrl+K opens command palette overlay
4. **Parallel Tracks**: Stack in same time slot with different fill patterns

---

## 1. NAVIGATION STRUCTURE

### Primary Navigation (Single Letters)
- **[C]** Create (formerly Dashboard) - Task creation interface
- **[I]** Index (formerly Categories) - Hierarchical browser  
- **[T]** To-do - Card-based task list
- **[L]** Log (formerly Calendar) - Time tracking journal
- **[S]** Search (accessible via ctrl/cmd+K globally)

### Navigation Layout
```
Desktop: Vertical left sidebar
Mobile: Bottom tab bar

Navigation items displayed as:
Desktop: Full words with first letter highlighted
Mobile: Single letters only
```

## 2. UI SPECIFICATIONS

### Global Design Principles
- **Font**: Monospace serif (IBM Plex Mono, Courier Prime, or fallback)
- **Colors Light Mode**: 
  - Background: #F8F7F4
  - Text: #1A1A1A
  - Navigation: #4A90E2 → #357ABD gradient
  - Task Creation: #FFF9C4
  - Highlights: #FFEB3B
- **Colors Dark Mode**:
  - Background: #0A0A0B
  - Text: #E8E6E3
  - Navigation: #1E3A5F
  - Task Creation: #3D3A2B
  - Highlights: #FFA000
- **No emojis** - Use ASCII characters only
- **Text-first interface** - Minimal chrome, focus on content

### [C] CREATE PAGE (Dashboard Replacement)

#### Desktop Layout ASCII Sketch
```
┌─────────────┬──────────────────────────────────────────────────────────┐
│   ATOL_     │                                                           │
│             │  CREATE NEW TASK                                         │
│ > Create    │  ═══════════════                                         │
│   Index     │                                                           │
│   To-do     │  [TASK NAME_____________________]                        │
│   Log       │                                                           │
│ ─────────── │  [S-U/P/F]-##.##                                         │
│   Search    │                                                           │
│   [ctrl+k]  │  Status prefix: R-2025.09.21_19:55                      │
│             │  Core code: UFP-##.##                                    │
│             │  Full: R-2025.09.21_19:55=UFP-12.03                     │
│             │                                                           │
│             │  ┌─ Select Status ──────────┐                            │
│             │  │ [R] Received             │                            │
│             │  │ [D] Delivered            │                            │
│             │  │ [F] Filed                │                            │
│             │  │ [C] Completed            │                            │
│             │  └──────────────────────────┘                            │
│             │                                                           │
│             │  Recent Tasks:                                           │
│             │  > APD-02.01 "Meeting agenda"                            │
│             │  > CCA-01.15 "File ATOL XIV"                            │
│             │                                                           │
└─────────────┴──────────────────────────────────────────────────────────┘
```

#### Mobile Layout ASCII Sketch
```
┌────────────────────────────┐
│ ATOL_           [/] [≡]    │
├────────────────────────────┤
│ CREATE NEW                 │
│                            │
│ [TASK NAME_____________]   │
│                            │
│ [S-R/D/F]-                 │
│                            │
│ UFP-##.##                  │
│ ▓▓▓▓▓▓▓▓▓                  │
│                            │
│ Select Status:             │
│ [R] [D] [F] [C] [P] [X]    │
│                            │
│ Recent:                    │
│ > APD-02.01                │
│ > CCA-01.15                │
│                            │
├────────────────────────────┤
│  C    I    T    L    S     │
│  ═                         │
└────────────────────────────┘
```

#### Key Features
- **Core Task Code**: `UFP-##.##` (immutable identifier)
- **Status Prefix**: `S-YYYY.MM.DD_HH:MM` (mandatory for all entries)
- **Full Format**: `S-YYYY.MM.DD_HH:MM=UFP-##.##` (using = as separator)
- **URL Structure**: Always `/t/ufp-##.##` (lowercase, no prefix in URLs)
- **Progressive Panels**: Status → Universe → Phylum → Family → Group → Task
- **Auto-complete**: Type or click to build codes
- **Recent Tasks**: Last 10 tasks with quick access

Example formats:
- Core code: `WDA-12.03`
- With prefix: `R-2025.09.21_14:30=WDA-12.03`
- In URL: `/t/wda-12.03`

### [I] INDEX PAGE (Categories Replacement)

#### Desktop - 5 Column View ASCII Sketch
```
┌─────────────┬──────────────────────────────────────────────────────────┐
│   ATOL_     │ UNIVERSE    PHYLUM      FAMILY       GROUP        TASK   │
│             │ ─────────   ─────────   ─────────    ─────────    ────── │
│   Create    │                                                           │
│ > Index     │ A (ARES)    N (New)     A (Analysis) 02 - Admin   01 ... │
│   To-do     │             P (Product) B (Beta)     03 - Legal   02 ... │
│   Log       │ ▓▓▓▓▓▓▓▓▓▓  Q (Quest)   C (Crowd)   04 - Dev     03 ... │
│ ─────────── │ B (BED)     R (Rest)    + CREATE    05 - TBD            │
│   Search    │             + CREATE                + CREATE     + CREATE│
│   [ctrl+k]  │ C (COW)                                                  │
│             │                                                           │
│             │ D (DESK)                                                 │
│             │                                                           │
│             │ F (FREE)                                                 │
│             │                                                           │
│             │ •                                                        │
│             │ •                                                        │
│             │ Z (ZEBRA)                                                │
│             │                                                           │
│             │ + CREATE                                                 │
└─────────────┴──────────────────────────────────────────────────────────┘
```

#### Mobile - Tab View ASCII Sketch
```
┌────────────────────────────┐
│ ATOL_           [/] [≡]    │
├────────────────────────────┤
│ UNI  PHY  FAM  GRP  TSK    │
│ ===                        │
├────────────────────────────┤
│                            │
│ A  ARES                    │
│    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓         │
│                            │
│ B  BED                     │
│                            │
│ C  COW                     │
│                            │
│ D  DESK                    │
│                            │
│ F  FREE                    │
│                            │
│ •  •  •                    │
│                            │
│ Z  ZEBRA                   │
│                            │
│ +  CREATE NEW              │
│                            │
├────────────────────────────┤
│  C    I    T    L    S     │
│       ═                    │
└────────────────────────────┘
```

### [T] TO-DO PAGE (Card System)

#### Desktop Layout ASCII Sketch
```
┌─────────────┬──────────────────────────────────────────────────────────┐
│   ATOL_     │                                                           │
│             │  ATOL-XVI                        STARTED 2025.09.15      │
│   Create    │  ═══════════════════════════════════════════════════     │
│             │                                                           │
│   Index     │  □ [R] APD-02.01  "Meeting agenda for Q4"               │
│ > To-do     │  □ [P] WDV-11.14  "Deploy new feature branch"           │
│   Log       │  ■ [D] CCA-01.15  "File ATOL XIV" (completed)          │
│ ─────────── │  □ [F] BRM-05.02  "Quarterly tax documents"             │
│   Search    │  ■ [C] APR-11.14  "Create new presentation"            │
│   [ctrl+k]  │  □ [R] DPR-08.11  "Review pull requests"                │
│             │                                                           │
│             │  ─────────────────────────────────────                   │
│             │  7 TASKS | 2 COMPLETE | 5 PENDING                        │
│             │  ─────────────────────────────────────                   │
│             │                                                           │
│             │  ╔═══════════════════════════════════════════════════╗   │
│             │  ║  CCA-01.16: FILE ATOL-XVI → XVII                  ║   │
│             │  ║  [COMPLETE FILING]                                ║   │
│             │  ╚═══════════════════════════════════════════════════╝   │
│             │                                                           │
│             │  [<] ATOL-XV                                   [ARCHIVES] │
│             │                                                           │
└─────────────┴──────────────────────────────────────────────────────────┘
```

#### Mobile Layout ASCII Sketch
```
┌────────────────────────────┐
│ ATOL_           [/] [≡]    │
├────────────────────────────┤
│ ATOL-XVI | DAY 6           │
│ ─────────────────────────  │
│                            │
│ □ [R] APD-02.01            │
│   "Meeting agenda"         │
│                            │
│ □ [P] WDV-11.14            │
│   "Deploy feature"         │
│                            │
│ ■ [D] CCA-01.15            │
│   "File ATOL XIV"          │
│                            │
│ □ [F] BRM-05.02            │
│   "Tax documents"          │
│                            │
│ 2/7 COMPLETE               │
│                            │
│ ╔════════════════════════╗ │
│ ║ CCA-01.16: FILE CARD  ║ │
│ ║ [COMPLETE]            ║ │
│ ╚════════════════════════╝ │
│                            │
├────────────────────────────┤
│  C    I    T    L    S     │
│            ═               │
└────────────────────────────┘
```

### [L] LOG PAGE (Calendar Replacement)

#### Daily View ASCII Sketch
```
┌─────────────┬──────────────────────────────────────────────────────────┐
│   ATOL_     │  2025.09.21 SATURDAY              [<] TODAY [>] [SOA]   │
│             │  ═══════════════════════════════════════════════════     │
│   Create    │                                                           │
│   Index     │  08:00 ═════════════════════════════════════════════     │
│   To-do     │  08:15 ─────────────────────────────────────────         │
│ > Log       │  08:30 ──•08:23 APD-02.01 [R] Meeting agenda            │
│ ─────────── │  08:45 ──•08:51 WDV-11.14 [R→D]                         │
│   Search    │  09:00 ═════════════════════════════════════════════     │
│   [ctrl+k]  │  09:15 ███ WDV-11.14 [P]: Fixed deployment bug          │
│             │  09:30 ███ WDV-11.14 [P]: Updated staging               │
│             │        ▓▓▓ APR-11.14 [P]: Draft presentation           │
│             │  09:45 ███ WDV-11.14 [P]: Tests passing                 │
│             │        ▓▓▓ APR-11.14 [P]: Added Q4 slides              │
│             │  10:00 ═════════════════════════════════════════════     │
│             │  10:15 ███ WDV-11.14 [P]: Deployed production           │
│             │  10:30 ──•10:31 WDV-11.14 [D→C]                         │
│             │                                                           │
│             │  [+ ADD ENTRY] [WEEK VIEW] [MONTH VIEW]                  │
└─────────────┴──────────────────────────────────────────────────────────┘
```

#### Week View ASCII Sketch
```
┌─────────────┬──────────────────────────────────────────────────────────┐
│   ATOL_     │  WEEK 38: SEP 15-21, 2025             [<] [>] [SOWA]    │
│             │  ═══════════════════════════════════════════════════     │
│   Create    │                                                           │
│   Index     │      MON   TUE   WED   THU   FRI   SAT   SUN           │
│   To-do     │      15]  [16    17    18    19    20    21            │
│ > Log       │      XV   ← ATOL-XVI Active →                           │
│ ─────────── │  ───────────────────────────────────────────            │
│   Search    │  08  ▓▓▓   ▓▓▓   ▓▓▓   ▓▓▓   ▓▓▓   ▓▓▓   ░░░          │
│   [ctrl+k]  │  09  ███   ███   ███   ███   ███   ███   ░░░          │
│             │  10  ███   ███   ███   ███   ███   ███   ░░░          │
│             │  11  ███   ███   ███   ███   ███   ▓▓▓   ░░░          │
│             │  12  ░░░   ░░░   ░░░   ░░░   ░░░   ░░░   ░░░          │
│             │  13  ███   ███   ███   ███   ███   ▓▓▓   ░░░          │
│             │  14  ███   ███   ███   ███   ▓▓▓   ░░░   ░░░          │
│             │                                                           │
│             │  Click hour block for details                            │
└─────────────┴──────────────────────────────────────────────────────────┘
```

#### Month View ASCII Sketch (with bracket notation)
```
┌─────────────┬──────────────────────────────────────────────────────────┐
│   ATOL_     │  SEPTEMBER 2025                        [<] [>] [SOMA]   │
│             │  ═══════════════════════════════════════════════════     │
│   Create    │                                                           │
│   Index     │  SUN  MON  TUE  WED  THU  FRI  SAT                       │
│   To-do     │                                                           │
│ > Log       │   1    2    3    4    5    6    7                        │
│ ─────────── │  ░░░  ███  ███  ███  ███  ███  ▓▓▓]  ATOL-XIV          │
│   Search    │                                       Filed              │
│   [ctrl+k]  │                                                           │
│             │   8   [9   10   11   12   13   14                        │
│             │  ░░░  ███  ███  ███  ███  ███  ▓▓▓]  ATOL-XV           │
│             │                                       Filed              │
│             │                                                           │
│             │  15  [16   17   18   19   20   21                        │
│             │  ░░░  ███  ███  ███  ███  ▓▓▓  ▓▓▓   ATOL-XVI          │
│             │                                       Active             │
│             │                                                           │
│             │  22   23   24   25   26   27   28                        │
│             │  ░░░  ???  ???  ???  ???  ???  ???                        │
│             │                                                           │
│             │  29   30                                                  │
│             │  ???  ???                                                 │
│             │                                                           │
│             │  [ = Start   ] = Filed   ███ = High   ░░░ = Low         │
└─────────────┴──────────────────────────────────────────────────────────┘
```

#### Mobile Daily View ASCII Sketch
```
┌────────────────────────────┐
│ ATOL_           [/] [≡]    │
├────────────────────────────┤
│ SAT 09.21   [<] [CAL] [>]  │
├────────────────────────────┤
│ 08:00 ═══════════════      │
│ 08:15 ───────────          │
│ 08:30 • APD created        │
│ 08:45 • WDV R→D            │
│ 09:00 ═══════════════      │
│ 09:15 WDV: Fixed bug       │
│ 09:30 WDV: Updated staging │
│       APR: Draft started   │
│ 09:45 WDV: Tests passing   │
│       APR: Added slides    │
│ 10:00 ═══════════════      │
│ 10:15 WDV: Deployed prod   │
│ 10:30 • WDV completed      │
│                            │
│ [+ LOG] [EXPORT]           │
├────────────────────────────┤
│  C    I    T    L    S     │
│              ═             │
└────────────────────────────┘
```

## 3. SQL SCHEMA UPDATES NEEDED

### Current Schema Already Includes:
- **Complete category structure** (Universes, Phyla, Families with single-letter codes)
- **Groups table** for named groups (e.g., "04 - Development")  
- **Tasks table** with `base_code` field storing `UFP-##.##`
- **Task Entries system** tracking status changes with `full_code` like `R-2025.09.21_19:55=UFP-12.03`
- **Statuses table** with R/D/F/C/P/X definitions
- **All supporting tables** (task_notes, task_attachments, calendar_entries, daily_logs)
- **Views**: task_details, category_hierarchy, task_entry_history, groups_with_counts

### New Tables Required for Redesign:

```sql
-- Cards table for ATOL-XVI style tracking
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_number VARCHAR(10) NOT NULL UNIQUE, -- 'XVI', 'XVII', etc.
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'filed')),
    filing_task_id UUID REFERENCES tasks(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Task-to-card association
CREATE TABLE task_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    added_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, card_id)
);

-- Activity summaries for SOA/SOWA/SOMA
CREATE TABLE activity_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    summary_type VARCHAR(10) NOT NULL CHECK (summary_type IN ('SOA', 'SOWA', 'SOMA')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    content_json JSONB NOT NULL,
    content_markdown TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(summary_type, period_start, period_end)
);

-- Update calendar_entries for new requirements
ALTER TABLE calendar_entries 
ADD COLUMN IF NOT EXISTS task_code VARCHAR(20) NOT NULL,
ADD COLUMN IF NOT EXISTS status_code CHAR(1) NOT NULL,
ADD COLUMN IF NOT EXISTS work_description TEXT,
ADD COLUMN IF NOT EXISTS is_parallel BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS track_number INTEGER DEFAULT 1;

-- Add indexes
CREATE INDEX idx_cards_status ON cards(status);
CREATE INDEX idx_cards_number ON cards(card_number);
CREATE INDEX idx_task_cards_task ON task_cards(task_id);
CREATE INDEX idx_task_cards_card ON task_cards(card_id);
CREATE INDEX idx_summaries_type_period ON activity_summaries(summary_type, period_start, period_end);
```

## 4. DEPRECATED COMPONENTS

### To Remove Completely
- **Top navigation bar** (blue header with "+ New Task" button)
- **Entire /new page** (separate task creation page)
- **"Dashboard" naming** → Replace with "Create"
- **"Categories" naming** → Replace with "Index"
- **"Calendar" naming** → Replace with "Log"
- **Any emoji usage** in the interface
- **Time duration tracking** → Focus on content/status instead

### To Modify
- **Navigation** → Single letter system
- **Task creation** → Integrated into Create page
- **Calendar** → Becomes activity log with code requirements

## 5. IMPLEMENTATION PROMPT FOR CLAUDE

### Recommended Setup
- **Model**: Claude 3.5 Opus 4.1 (most powerful for complex code generation)
- **Mode**: Use Projects feature for context persistence
- **Artifacts**: Enable for code generation

### Master Implementation Prompt

```
You are implementing a complete redesign of the ATOL task management system. ATOL is a "semantic ledger" that tracks tasks with structured codes and maintains detailed activity logs.

CONTEXT:
- Current system uses Next.js 14, Tailwind CSS, Supabase, TypeScript
- Final domain will be atol.co (currently on zq.lc for testing)
- GitHub repo: github.com/CalebSussman/ZQLC (keeping ZQLC as codename)

DESIGN PHILOSOPHY:
- Retro terminal aesthetic with monospace fonts
- Text-first interface, no emojis
- ASCII characters for visual elements
- Everything requires a task code - no anonymous work
- Single-letter navigation: C(reate), I(ndex), T(odo), L(og)

YOUR TASK:
Review the attached current codebase and implement a complete redesign following the ASCII sketches and specifications provided. Each page has detailed ASCII mockups showing exact layout and functionality.

1. NAVIGATION OVERHAUL
- Replace top bar with left sidebar (desktop) / bottom tabs (mobile)
- Single letter navigation system
- Remove all separate creation pages

2. CREATE PAGE [C] - Replaces Dashboard
[See ASCII sketches above for exact layout]
- Large task code builder with progressive panels
- Status selection appears first, then builds down
- Recent tasks at bottom

3. INDEX PAGE [I] - Replaces Categories  
[See ASCII sketches above for exact layout]
- 5 column view on desktop
- Tab view on mobile
- Independent scrolling per column

4. TO-DO PAGE [T] - Card System
[See ASCII sketches above for exact layout]
- Card display with filing box at bottom
- Manual filing via CCA tasks
- Status cycling on click

5. LOG PAGE [L] - Replaces Calendar
[See ASCII sketches above for exact layout]
- Daily: 15-minute intervals, parallel tracks
- Week: Heat map grid
- Month: Bracket notation for card periods
- Every entry requires task code

6. DATABASE UPDATES
[Schema changes detailed above]

CRITICAL REQUIREMENTS:
- Follow ASCII sketches exactly for layout
- Core task codes: `UFP-##.##` (immutable, used in URLs as `/t/ufp-12.03`)
- Status prefix: `S-YYYY.MM.DD_HH:MM` (mandatory for all entries)
- Full format: `S-YYYY.MM.DD_HH:MM=UFP-##.##` (underscore in time, equals as separator)
- Every calendar entry must have a task code
- Status codes: [R]eceived [P]ending [D]elivered [F]iled [C]ompleted [X]cancelled
- Cards are manually filed via filing tasks (CCA-01.XX)
- Month view shows card periods with bracket notation [ ]
- All summaries (SOA/SOWA/SOMA) auto-generate
- No emojis anywhere - use ASCII only

IMPLEMENTATION ORDER:
1. Update navigation structure globally
2. Implement Create page with progressive panels
3. Build Index page with 5-column/tab view
4. Create To-do card system with filing mechanism
5. Build Log with calendar views and code requirements
6. Add summary generation (SOA/SOWA/SOMA)
7. Update database schema
8. Remove deprecated components

Please generate complete, production-ready code for each component. Ensure TypeScript types are correct, Tailwind classes are valid, and Supabase queries are optimized.

USE MODEL: Claude 3.5 Opus 4.1 (most powerful for complex code generation)
```

### Additional Context to Provide
```
Attach to the chat:
1. Current GitHub repository archive
2. This implementation package document  
3. Current Supabase schema (provided in document - see section 3)
4. Answer sheet with environment variables and clarifications

The current Supabase schema already includes the complete ATOL database structure with:
- Single-letter category codes (Universe/Phylum/Family)
- Groups table for named groups
- Task entries system for status tracking
- All necessary views and functions

Specific instructions:
- Generate each page as a complete file
- Include all TypeScript interfaces matching the existing schema
- Create migration scripts only for new tables (cards, activity_summaries)
- Provide clear component hierarchy
- Include mobile responsive layouts
- Add keyboard navigation support
- Ensure dark mode compatibility
```

## 6. TESTING CHECKLIST

After implementation, verify:

### Navigation
- [ ] Single letter system works
- [ ] Keyboard shortcuts functional (ctrl+K for search)
- [ ] Mobile bottom tabs responsive

### Create Page
- [ ] Progressive panels appear correctly
- [ ] Task codes build properly
- [ ] Both typing and clicking work

### Index Page
- [ ] All 5 columns display and scroll
- [ ] Create buttons work at each level
- [ ] Mobile tabs swipe correctly

### To-do Page
- [ ] Cards display with correct numbering
- [ ] Filing task appears in box
- [ ] Status cycling works on click
- [ ] Archive accessible

### Log Page
- [ ] 15-minute intervals display correctly
- [ ] Code required for all entries
- [ ] Parallel tracks work
- [ ] Month view shows bracket notation for cards
- [ ] Summaries auto-generate

### Database
- [ ] All new tables created
- [ ] Migrations successful
- [ ] No data loss from existing system

## 7. SUCCESS CRITERIA

The implementation is successful when:
1. All deprecated components are removed
2. Single-letter navigation is functional
3. Every work entry has a task code
4. Cards can be filed manually
5. Calendar shows precise minute-level tracking
6. Summaries generate automatically
7. Month view displays card periods with brackets
8. System maintains retro aesthetic throughout
9. No emojis appear anywhere
10. Dark mode works consistently

---

## COMPLETE ENVIRONMENT SETUP

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ofiindxmfiptivijhbdi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9maWluZHhtZmlwdGl2aWpoYmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTU4MjEsImV4cCI6MjA3Mzk3MTgyMX0.P9Qmhha1EL7X0uQ8CiUF6LXWqBCQt1pJwg3cmcHkfR0

# App
NEXT_PUBLIC_APP_URL=https://atol.co  # production
# NEXT_PUBLIC_APP_URL=http://localhost:3000  # development
```

---

## 8. CURRENT ATOL DATABASE SCHEMA (COMPLETE)

```sql
-- ATOL Database Schema - CORRECTED VERSION
-- Single-letter codes for Universe/Phylum/Family
-- Task format: [S]-[YYYY.MM.DD.HH.MM]-[U][P][F]-[##].[##]

-- ============================================
-- SETUP: Enable extensions and clean slate
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables for clean setup
DROP TABLE IF EXISTS daily_logs CASCADE;
DROP TABLE IF EXISTS task_templates CASCADE;
DROP TABLE IF EXISTS calendar_entries CASCADE;
DROP TABLE IF EXISTS task_attachments CASCADE;
DROP TABLE IF EXISTS task_notes CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS families CASCADE;
DROP TABLE IF EXISTS phyla CASCADE;
DROP TABLE IF EXISTS universes CASCADE;

-- ============================================
-- CATEGORY DEFINITIONS (Organizational Structure)
-- ============================================

-- Universes table (single letter code)
CREATE TABLE universes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code CHAR(1) UNIQUE NOT NULL,  -- Single letter: W, P, H, etc.
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Phyla table (single letter code per universe)
CREATE TABLE phyla (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    universe_id UUID NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
    code CHAR(1) NOT NULL,  -- Single letter: D, M, L, etc.
    name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(universe_id, code)  -- Each universe can have its own set of single-letter phyla
);

-- Families table (single letter code per phylum)
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phylum_id UUID NOT NULL REFERENCES phyla(id) ON DELETE CASCADE,
    code CHAR(1) NOT NULL,  -- Single letter: A, B, C, etc.
    name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(phylum_id, code)  -- Each phylum can have its own set of single-letter families
);

-- ============================================
-- TASK MANAGEMENT
-- ============================================

-- Task templates for recurring tasks
CREATE TABLE task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    universe_id UUID REFERENCES universes(id) ON DELETE SET NULL,
    phylum_id UUID REFERENCES phyla(id) ON DELETE SET NULL,
    family_id UUID REFERENCES families(id) ON DELETE SET NULL,
    default_title VARCHAR(200),
    default_notes JSONB DEFAULT '[]'::jsonb,
    recurrence_rule VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table with full semantic code structure
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Full semantic code: S-YYYY.MM.DD.HH.MM-UPF-##.##
    code VARCHAR(40) UNIQUE NOT NULL,
    
    -- Timestamp components (parsed from code or set on creation)
    task_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Category references
    universe_id UUID REFERENCES universes(id) ON DELETE SET NULL,
    phylum_id UUID REFERENCES phyla(id) ON DELETE SET NULL,
    family_id UUID REFERENCES families(id) ON DELETE SET NULL,  -- Optional
    
    -- Group and task numbers
    group_num INTEGER NOT NULL CHECK (group_num >= 0 AND group_num <= 99),
    task_num INTEGER NOT NULL CHECK (task_num >= 0 AND task_num <= 99),
    
    -- Task details
    title VARCHAR(200) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
    
    -- Optional template reference
    template_id UUID REFERENCES task_templates(id) ON DELETE SET NULL,
    
    -- Search and metadata
    search_vector tsvector,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Ensure unique group/task combination per universe-phylum-family
    CONSTRAINT unique_task_position UNIQUE(universe_id, phylum_id, family_id, group_num, task_num)
);

-- Task notes (three types as per semantic ledger concept)
CREATE TABLE task_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('task', 'step', 'outcome')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Task attachments
CREATE TABLE task_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Calendar entries for time tracking
CREATE TABLE calendar_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Daily logs for export functionality
CREATE TABLE daily_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE UNIQUE NOT NULL,
    content_markdown TEXT,
    content_json JSONB DEFAULT '{}'::jsonb,
    tasks_completed INTEGER DEFAULT 0,
    tasks_worked INTEGER DEFAULT 0,
    exported_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_tasks_code ON tasks(code);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_universe ON tasks(universe_id);
CREATE INDEX idx_tasks_phylum ON tasks(phylum_id);
CREATE INDEX idx_tasks_family ON tasks(family_id);
CREATE INDEX idx_tasks_group_task ON tasks(group_num, task_num);
CREATE INDEX idx_tasks_timestamp ON tasks(task_timestamp);
CREATE INDEX idx_tasks_search ON tasks USING GIN(search_vector);
CREATE INDEX idx_calendar_date ON calendar_entries(date);
CREATE INDEX idx_calendar_task ON calendar_entries(task_id);
CREATE INDEX idx_task_notes_task ON task_notes(task_id);
CREATE INDEX idx_task_notes_type ON task_notes(type);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to generate task code from components
CREATE OR REPLACE FUNCTION generate_task_code(
    p_universe_code CHAR(1),
    p_phylum_code CHAR(1),
    p_family_code CHAR(1),
    p_group_num INTEGER,
    p_task_num INTEGER,
    p_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
RETURNS VARCHAR AS $
BEGIN
    RETURN LOWER(
        'S-' || 
        TO_CHAR(p_timestamp, 'YYYY.MM.DD.HH24.MI') || '-' ||
        p_universe_code || 
        p_phylum_code || 
        COALESCE(p_family_code, '') || '-' ||
        LPAD(p_group_num::TEXT, 2, '0') || '.' ||
        LPAD(p_task_num::TEXT, 2, '0')
    );
END;
$ LANGUAGE plpgsql;

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_task_search_vector()
RETURNS TRIGGER AS $
BEGIN
    NEW.search_vector := to_tsvector('english', 
        COALESCE(NEW.title, '') || ' ' || 
        COALESCE(NEW.code, '')
    );
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Trigger for search vector
CREATE TRIGGER update_task_search
BEFORE INSERT OR UPDATE OF title, code ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_task_search_vector();

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_universes_updated_at BEFORE UPDATE ON universes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phyla_updated_at BEFORE UPDATE ON phyla
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON families
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_notes_updated_at BEFORE UPDATE ON task_notes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CRITICAL VIEW FOR APPLICATION
-- ============================================

-- Main view for querying tasks with all details
CREATE OR REPLACE VIEW task_details AS
SELECT 
    t.*,
    -- Category names
    u.name as universe_name,
    u.code as universe_code,
    u.color as universe_color,
    p.name as phylum_name,
    p.code as phylum_code,
    f.name as family_name,
    f.code as family_code,
    -- Computed fields
    (SELECT COUNT(*) FROM task_notes WHERE task_id = t.id) as note_count,
    (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count,
    -- Formatted display code
    u.code || p.code || COALESCE(f.code, '') || '-' || 
    LPAD(t.group_num::TEXT, 2, '0') || '.' || 
    LPAD(t.task_num::TEXT, 2, '0') as display_code
FROM tasks t
LEFT JOIN universes u ON t.universe_id = u.id
LEFT JOIN phyla p ON t.phylum_id = p.id
LEFT JOIN families f ON t.family_id = f.id;

-- View for category hierarchy
CREATE OR REPLACE VIEW category_hierarchy AS
SELECT 
    u.id as universe_id,
    u.code as universe_code,
    u.name as universe_name,
    p.id as phylum_id,
    p.code as phylum_code,
    p.name as phylum_name,
    f.id as family_id,
    f.code as family_code,
    f.name as family_name,
    u.code || p.code || COALESCE(f.code, '') as full_code
FROM universes u
LEFT JOIN phyla p ON p.universe_id = u.id
LEFT JOIN families f ON f.phylum_id = p.id
ORDER BY u.display_order, u.code, p.display_order, p.code, f.display_order, f.code;

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Sample universes (single letters)
INSERT INTO universes (code, name, description, color, display_order) VALUES
    ('W', 'Work', 'Professional tasks and projects', '#3b82f6', 1),
    ('P', 'Personal', 'Personal goals and activities', '#10b981', 2),
    ('H', 'Home', 'Household tasks and maintenance', '#f59e0b', 3);

-- Sample phyla for Work universe
INSERT INTO phyla (universe_id, code, name, description, display_order)
SELECT id, 'D', 'Development', 'Software development tasks', 1
FROM universes WHERE code = 'W';

INSERT INTO phyla (universe_id, code, name, description, display_order)
SELECT id, 'M', 'Management', 'Management and administrative tasks', 2
FROM universes WHERE code = 'W';

-- Sample phyla for Personal universe
INSERT INTO phyla (universe_id, code, name, description, display_order)
SELECT id, 'H', 'Health', 'Health and fitness goals', 1
FROM universes WHERE code = 'P';

INSERT INTO phyla (universe_id, code, name, description, display_order)
SELECT id, 'L', 'Learning', 'Educational and skill development', 2
FROM universes WHERE code = 'P';

-- Sample phyla for Home universe
INSERT INTO phyla (universe_id, code, name, description, display_order)
SELECT id, 'M', 'Maintenance', 'Regular maintenance tasks', 1
FROM universes WHERE code = 'H';

INSERT INTO phyla (universe_id, code, name, description, display_order)
SELECT id, 'P', 'Projects', 'Home improvement projects', 2
FROM universes WHERE code = 'H';

-- ============================================
-- PERMISSIONS
-- ============================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $
BEGIN
    RAISE NOTICE '✅ ATOL database schema created successfully!';
    RAISE NOTICE '📊 Structure: Single-letter codes for categories';
    RAISE NOTICE '🎯 Format: S-YYYY.MM.DD.HH.MM-UPF-##.##';
    RAISE NOTICE '🚀 Your semantic ledger is ready!';
END $;

-- ATOL Schema Update: Add Groups Table and Task Entries System
-- Run this AFTER your existing schema

-- ============================================
-- GROUPS TABLE (for named groups)
-- ============================================

CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    universe_id UUID NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
    phylum_id UUID NOT NULL REFERENCES phyla(id) ON DELETE CASCADE,
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    group_num INTEGER NOT NULL CHECK (group_num >= 0 AND group_num <= 99),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_group_position UNIQUE(universe_id, phylum_id, family_id, group_num)
);

-- ============================================
-- TASK ENTRIES SYSTEM
-- ============================================

-- Statuses table for reference
CREATE TABLE statuses (
    code CHAR(1) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0
);

-- Insert standard statuses
INSERT INTO statuses (code, name, description, display_order) VALUES
    ('R', 'Received', 'Task has been received and acknowledged', 1),
    ('D', 'Delivered', 'Task has been delivered or presented', 2),
    ('F', 'Filed', 'Task has been filed for future reference', 3),
    ('C', 'Completed', 'Task has been fully completed', 4),
    ('P', 'Pending', 'Task is pending external action', 5),
    ('X', 'Cancelled', 'Task has been cancelled', 6);

-- Task Entries table (each status change creates a new entry)
CREATE TABLE task_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    status_code CHAR(1) NOT NULL REFERENCES statuses(code),
    entry_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    full_code VARCHAR(50) NOT NULL, -- e.g., "R-2025.09.18.22.11-WDA-0101"
    note TEXT,
    created_by VARCHAR(100), -- Optional: track who made the entry
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Update tasks table to track current entry
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS current_entry_id UUID REFERENCES task_entries(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS base_code VARCHAR(20); -- e.g., "WDA-0101"

-- Function to extract base code from full code
CREATE OR REPLACE FUNCTION extract_base_code(full_code VARCHAR)
RETURNS VARCHAR AS $
BEGIN
    -- Extract everything after the timestamp part (UPF-##.##)
    RETURN REGEXP_REPLACE(full_code, '^[A-Z]-\d{4}\.\d{2}\.\d{2}\.\d{2}\.\d{2}-', '');
END;
$ LANGUAGE plpgsql;

-- Function to create a new task entry
CREATE OR REPLACE FUNCTION create_task_entry(
    p_task_id UUID,
    p_status_code CHAR(1),
    p_note TEXT DEFAULT NULL,
    p_entry_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
RETURNS UUID AS $
DECLARE
    v_entry_id UUID;
    v_base_code VARCHAR;
    v_full_code VARCHAR;
    v_universe_code CHAR(1);
    v_phylum_code CHAR(1);
    v_family_code CHAR(1);
    v_group_num INTEGER;
    v_task_num INTEGER;
BEGIN
    -- Get task details
    SELECT 
        t.base_code,
        u.code, p.code, f.code,
        t.group_num, t.task_num
    INTO 
        v_base_code,
        v_universe_code, v_phylum_code, v_family_code,
        v_group_num, v_task_num
    FROM tasks t
    LEFT JOIN universes u ON t.universe_id = u.id
    LEFT JOIN phyla p ON t.phylum_id = p.id
    LEFT JOIN families f ON t.family_id = f.id
    WHERE t.id = p_task_id;

    -- Generate full code
    v_full_code := p_status_code || '-' || 
                   TO_CHAR(p_entry_timestamp, 'YYYY.MM.DD.HH24.MI') || '-' ||
                   COALESCE(v_base_code, 
                           v_universe_code || v_phylum_code || COALESCE(v_family_code, '') || '-' ||
                           LPAD(v_group_num::TEXT, 2, '0') || '.' ||
                           LPAD(v_task_num::TEXT, 2, '0'));

    -- Insert new entry
    INSERT INTO task_entries (task_id, status_code, entry_timestamp, full_code, note)
    VALUES (p_task_id, p_status_code, p_entry_timestamp, v_full_code, p_note)
    RETURNING id INTO v_entry_id;

    -- Update task with current entry
    UPDATE tasks 
    SET current_entry_id = v_entry_id,
        code = v_full_code,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_task_id;

    RETURN v_entry_id;
END;
$ LANGUAGE plpgsql;

-- View for task entry history with duration calculations
CREATE OR REPLACE VIEW task_entry_history AS
WITH entry_durations AS (
    SELECT 
        te.*,
        s.name as status_name,
        t.base_code,
        LAG(te.entry_timestamp) OVER (PARTITION BY te.task_id ORDER BY te.entry_timestamp) as prev_timestamp,
        LEAD(te.entry_timestamp) OVER (PARTITION BY te.task_id ORDER BY te.entry_timestamp) as next_timestamp
    FROM task_entries te
    JOIN tasks t ON te.task_id = t.id
    JOIN statuses s ON te.status_code = s.code
)
SELECT 
    *,
    CASE 
        WHEN prev_timestamp IS NOT NULL 
        THEN AGE(entry_timestamp, prev_timestamp)
        ELSE NULL
    END as duration_from_previous,
    CASE 
        WHEN next_timestamp IS NOT NULL 
        THEN AGE(next_timestamp, entry_timestamp)
        ELSE AGE(CURRENT_TIMESTAMP, entry_timestamp)
    END as duration_until_next
FROM entry_durations;

-- Enhanced task_details view with entry information
DROP VIEW IF EXISTS task_details CASCADE;
CREATE OR REPLACE VIEW task_details AS
SELECT 
    t.*,
    -- Category information
    u.name as universe_name,
    u.code as universe_code,
    u.color as universe_color,
    p.name as phylum_name,
    p.code as phylum_code,
    f.name as family_name,
    f.code as family_code,
    -- Group information
    g.name as group_name,
    -- Current entry information
    ce.status_code as current_status,
    ce.entry_timestamp as current_entry_time,
    s.name as current_status_name,
    -- Calculate time outstanding
    CASE 
        WHEN s.code IN ('C', 'X') THEN 
            AGE(ce.entry_timestamp, t.created_at)
        ELSE 
            AGE(CURRENT_TIMESTAMP, t.created_at)
    END as time_outstanding,
    -- Counts
    (SELECT COUNT(*) FROM task_notes WHERE task_id = t.id) as note_count,
    (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count,
    (SELECT COUNT(*) FROM task_entries WHERE task_id = t.id) as entry_count,
    -- Display code (base code for categories view)
    t.base_code as display_code
FROM tasks t
LEFT JOIN universes u ON t.universe_id = u.id
LEFT JOIN phyla p ON t.phylum_id = p.id
LEFT JOIN families f ON t.family_id = f.id
LEFT JOIN groups g ON (
    g.universe_id = t.universe_id AND 
    g.phylum_id = t.phylum_id AND 
    COALESCE(g.family_id, '00000000-0000-0000-0000-000000000000'::UUID) = COALESCE(t.family_id, '00000000-0000-0000-0000-000000000000'::UUID) AND
    g.group_num = t.group_num
)
LEFT JOIN task_entries ce ON t.current_entry_id = ce.id
LEFT JOIN statuses s ON ce.status_code = s.code;

-- Indexes for performance
CREATE INDEX idx_groups_universe ON groups(universe_id);
CREATE INDEX idx_groups_phylum ON groups(phylum_id);
CREATE INDEX idx_groups_family ON groups(family_id);
CREATE INDEX idx_groups_num ON groups(group_num);
CREATE INDEX idx_task_entries_task ON task_entries(task_id);
CREATE INDEX idx_task_entries_timestamp ON task_entries(entry_timestamp);
CREATE INDEX idx_tasks_current_entry ON tasks(current_entry_id);

-- Update trigger for groups
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION: Update existing tasks with base codes
-- ============================================

-- Set base codes for existing tasks
UPDATE tasks 
SET base_code = 
    (SELECT u.code FROM universes u WHERE u.id = tasks.universe_id) ||
    (SELECT p.code FROM phyla p WHERE p.id = tasks.phylum_id) ||
    COALESCE((SELECT f.code FROM families f WHERE f.id = tasks.family_id), '') ||
    '-' || LPAD(tasks.group_num::TEXT, 2, '0') || '.' || LPAD(tasks.task_num::TEXT, 2, '0')
WHERE base_code IS NULL;

-- Create initial entries for existing tasks (all as Received)
INSERT INTO task_entries (task_id, status_code, entry_timestamp, full_code, note)
SELECT 
    t.id,
    'R',
    COALESCE(t.task_timestamp, t.created_at),
    t.code,
    'Initial entry (migrated)'
FROM tasks t
WHERE NOT EXISTS (
    SELECT 1 FROM task_entries te WHERE te.task_id = t.id
);

-- Update tasks with their current entry
UPDATE tasks t
SET current_entry_id = (
    SELECT id FROM task_entries te 
    WHERE te.task_id = t.id 
    ORDER BY entry_timestamp DESC 
    LIMIT 1
)
WHERE current_entry_id IS NULL;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $
BEGIN
    RAISE NOTICE '✅ Groups and Task Entries system created successfully!';
    RAISE NOTICE '📊 New features:';
    RAISE NOTICE '   - Groups table for named groups';
    RAISE NOTICE '   - Task entries for status history';
    RAISE NOTICE '   - Duration tracking between entries';
    RAISE NOTICE '   - Enhanced views with entry information';
    RAISE NOTICE '🚀 Your task tracking system is ready!';
END $;

-- Create a view that includes task counts for each group
CREATE OR REPLACE VIEW groups_with_counts AS
SELECT
 g.*,
 COUNT(DISTINCT t.id) as task_count
FROM groups g
LEFT JOIN tasks t ON
 g.universe_id = t.universe_id
AND g.phylum_id = t.phylum_id
AND g.group_num = t.group_num
AND (g.family_id = t.family_id OR (g.family_id IS NULL AND t.family_id IS NULL))
GROUP BY g.id, g.universe_id, g.phylum_id, g.family_id, g.group_num, g.name, g.created_at, g.updated_at, g.description;

-- Grant permissions for the view
GRANT SELECT ON groups_with_counts TO anon, authenticated;
```

## 9. GROUPS WITH COUNTS VIEW (ADDITIONAL)

```sql
-- Create a view that includes task counts for each group
CREATE OR REPLACE VIEW groups_with_counts AS
SELECT
 g.*,
 COUNT(DISTINCT t.id) as task_count
FROM groups g
LEFT JOIN tasks t ON
 g.universe_id = t.universe_id
AND g.phylum_id = t.phylum_id
AND g.group_num = t.group_num
AND (g.family_id = t.family_id OR (g.family_id IS NULL AND t.family_id IS NULL))
GROUP BY g.id, g.universe_id, g.phylum_id, g.family_id, g.group_num, g.name, g.created_at, g.updated_at;
-- Grant permissions for the view
GRANT SELECT ON groups_with_counts TO anon, authenticated;
```

---

This complete package contains everything needed for implementing the ATOL redesign, including the full current database schema.