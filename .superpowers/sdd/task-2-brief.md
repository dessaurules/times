# Task 2: Responsive Design für Zeiten-Seite

**Goal:** Zeiten-Seite responsive für iPhone machen mit neuer Card-Komponente für mobil + Tabelle für Desktop

**Project Context:** 
- Zeiten-Seite zeigt wöchentliche Zeiteinträge
- Desktop: Tabelle mit 6 Spalten, min-w-[480px] → zu eng auf iPhone
- Mobile (<768px): Soll neue Card-Liste-Ansicht sein
- Desktop (≥768px): Behalte bestehende Tabelle

**Files to create/modify:**
1. **Create:** `mitarbeiter-app/src/pages/Zeiten/DayTimeCard.tsx` (neue mobile-Komponente)
2. **Modify:** `mitarbeiter-app/src/pages/Zeiten/Zeiten.tsx` (Layout mit hidden/md:block)

**Interfaces:**
- Consumes: `TimeEntry` type, date-fns functions (format, parseISO, etc.)
- Produces: 
  - `DayTimeCard` component (exported interface + default function)
  - Updated `Zeiten` component with responsive layout

**Key Requirements:**

1. **DayTimeCard.tsx** - Neue Komponente für mobile Card-Ansicht
   - Props: `day: Date`, `dayEntries: TimeEntry[]`, `sollPerDay: number`, `isHoliday: boolean`, `now: Date`
   - Shows: Tag, Kommt/Geht/Pause/Ist in Grid
   - Status-Indikator: läuft, ✓, ~
   - Style: Rounded cards, border, clean grid layout

2. **Zeiten.tsx** - Update Layout
   - Add import: `import DayTimeCard from './DayTimeCard'`
   - Mobile (<md): Map weekDays mit DayTimeCard, `<div className="md:hidden space-y-3">`
   - Desktop (≥md): Behalte bestehende Tabelle, `<div className="hidden md:block overflow-x-auto">`
   - Update Zeilen 153–335 (return statement)

**Implementation Steps:**

### Step 1: Create DayTimeCard.tsx
Use the exact code from brief (see code block below)
- Import statements: date-fns, lucide-react, @shared/types, @/lib/utils
- Helper functions: fmtHHMM, netMins, fmtDuration
- Main component: DayTimeCard (default export)
- Handle empty entries case (return "Keine Einträge" card)
- Handle running entry case (show "läuft…" instead of end time)

### Step 2: Update Zeiten.tsx imports
Add: `import DayTimeCard from './DayTimeCard'`

### Step 3: Update Zeiten.tsx render
Replace lines 153–335 (return JSX) with:
- Header section (unchanged)
- Wochen-Navigation (unchanged)
- **NEW:** Mobile card-list section:
  ```tsx
  <div className="md:hidden space-y-3">
    {loading ? (
      <div className="py-8 text-center text-sm text-[#6B7280]">Lade…</div>
    ) : (
      weekDays.map(day => (
        <DayTimeCard
          key={format(day, 'yyyy-MM-dd')}
          day={day}
          dayEntries={entriesForDay(day)}
          sollPerDay={sollPerDay}
          isHoliday={holidays.has(format(day, 'yyyy-MM-dd'))}
          now={now}
        />
      ))
    )}
  </div>
  ```
- **EXISTING:** Desktop table section, wrapped in `<div className="hidden md:block overflow-x-auto">`
  - Keep all existing table code
  - Just wrap with `<div className="hidden md:block overflow-x-auto">...</div>`

### Step 4: Manual Test
- **Mobile (375px):** Load Zeiten, see card-list (not table)
- **Tablet/Desktop (≥768px):** Load Zeiten, see table (not cards)
- **Transition at 768px:** Verify no jumping/overlap

### Step 5: Commit
When done, commit with message like:
`feat: responsive zeiten-seite mit card-liste auf mobile`

**Global Constraints:**
- Tailwind breakpoints: `md:768px` (hidden/block toggle point)
- Use existing helpers from Zeiten.tsx (fmtHHMM, fmtDuration, netMins)
- No breaking changes to existing Zeiten component
- TypeScript strict mode

**Acceptance:**
- ✅ DayTimeCard.tsx created with all required props/logic
- ✅ Zeiten.tsx updated with hidden/md:block layout
- ✅ Import added
- ✅ Mobile (375px) shows cards, not table
- ✅ Desktop (≥768px) shows table, not cards
- ✅ 2 commits or 1 commit with both files
- ✅ No TypeScript errors
- ✅ All tests passing (if any exist for Zeiten)

**Exact Code for DayTimeCard.tsx:**

See the code below — copy it exactly, no changes:

```tsx
import { format, parseISO, isWeekend, isToday } from 'date-fns'
import { de } from 'date-fns/locale'
import { Clock } from 'lucide-react'
import type { TimeEntry } from '@shared/types'
import { cn } from '@/lib/utils'

export interface DayTimeCardProps {
  day: Date
  dayEntries: TimeEntry[]
  sollPerDay: number
  isHoliday: boolean
  now: Date
}

function fmtHHMM(iso: string): string {
  return format(parseISO(iso), 'HH:mm')
}

function netMins(entry: TimeEntry, now = new Date()): number {
  const { differenceInMinutes, parseISO } = require('date-fns')
  const end = entry.end_time ? parseISO(entry.end_time) : now
  const gross = differenceInMinutes(end, parseISO(entry.start_time))
  return Math.max(0, gross - (entry.break_minutes ?? 0))
}

function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}:${String(m).padStart(2, '0')} h`
}

export default function DayTimeCard({ day, dayEntries, sollPerDay, isHoliday, now }: DayTimeCardProps) {
  const isWE = isWeekend(day)
  const isCurrent = isToday(day)
  const runningE = dayEntries.find(e => !e.end_time)
  const istMins = dayEntries.reduce((s, e) => s + netMins(e, now), 0)
  const ds = format(day, 'yyyy-MM-dd')

  if (dayEntries.length === 0) {
    return (
      <div className={cn(
        'p-4 rounded-xl border',
        (isWE || isHoliday) ? 'bg-[#F9FAFB] border-[#E5E7EB]' : 'bg-white border-[#E5E7EB]'
      )}>
        <div className="text-sm font-medium text-[#111827] mb-3">
          <div>{format(day, 'EEE', { locale: de })}</div>
          <div className="text-xs text-[#6B7280]">{format(day, 'd. MMM', { locale: de })}</div>
        </div>
        <div className="text-sm text-[#D1D5DB]">Keine Einträge</div>
      </div>
    )
  }

  return (
    <div className={cn(
      'p-4 rounded-xl border space-y-2',
      isCurrent && !isWE ? 'bg-indigo-50/40 border-indigo-200' : 'bg-white border-[#E5E7EB]'
    )}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm font-medium text-[#111827]">
            {format(day, 'EEE', { locale: de })}
          </div>
          <div className="text-xs text-[#6B7280]">
            {format(day, 'd. MMM', { locale: de })}
          </div>
        </div>
        <div className="text-right">
          {isWE || isHoliday ? (
            <span className="text-xs text-[#D1D5DB] font-medium">WE</span>
          ) : runningE ? (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium whitespace-nowrap">
              <Clock size={11} className="animate-pulse" /> läuft
            </span>
          ) : istMins >= sollPerDay - 5 ? (
            <span className="text-xs text-emerald-600 font-bold">✓</span>
          ) : (
            <span className="text-xs text-amber-600 font-bold">~</span>
          )}
        </div>
      </div>

      {/* Times */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-[#9CA3AF] block text-[10px]">Kommt</span>
          <span className="font-medium text-[#111827]">{fmtHHMM(dayEntries[0].start_time)}</span>
        </div>
        <div>
          <span className="text-[#9CA3AF] block text-[10px]">Geht</span>
          <span className={cn('font-medium', runningE ? 'text-emerald-600' : 'text-[#111827]')}>
            {runningE ? 'läuft…' : fmtHHMM(dayEntries[dayEntries.length - 1].end_time!)}
          </span>
        </div>
        <div>
          <span className="text-[#9CA3AF] block text-[10px]">Pause</span>
          <span className="font-medium text-[#111827]">
            {dayEntries[0].break_minutes ? `${dayEntries[0].break_minutes}m` : '—'}
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="border-t border-[#F3F4F6] pt-2 flex justify-between items-center">
        <span className="text-[#9CA3AF] text-xs">Ist</span>
        <span className={cn('font-bold text-sm tabular-nums', runningE ? 'text-emerald-600' : 'text-[#111827]')}>
          {fmtDuration(istMins)}
        </span>
      </div>
    </div>
  )
}
```
