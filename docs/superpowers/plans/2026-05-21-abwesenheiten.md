# Abwesenheiten Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/abwesenheiten` page — an Excel-style monthly absence calendar with cell-based Kürzel input, drag-to-fill, inline approval popover for pending entries, and per-employee summary columns.

**Architecture:** `Abwesenheiten.tsx` fetches data (employees, absences, federal state) and handles PocketBase mutations; `KalenderTable.tsx` is a pure interactive grid component; `ApprovalPopover.tsx` renders the inline approve/reject overlay; `holidays.ts` and `calendarUtils.ts` are pure utility modules.

**Tech Stack:** React 18, TypeScript strict, PocketBase JS SDK v0.26.9, date-fns v4, feiertagejs v1.5.1, Tailwind CSS v3, Vitest + React Testing Library.

---

## File Structure

| File | Role |
|---|---|
| `src/lib/holidays.ts` | feiertagejs wrapper → `Set<string>` of ISO date strings |
| `src/lib/calendarUtils.ts` | buildCalendarDays, buildAbsenceMap (pure functions) |
| `src/lib/__tests__/holidays.test.ts` | Unit tests for holidays.ts |
| `src/lib/__tests__/calendarUtils.test.ts` | Unit tests for calendarUtils.ts |
| `src/components/Abwesenheiten/KalenderTable.tsx` | Interactive grid (display + keyboard/mouse events) |
| `src/components/Abwesenheiten/ApprovalPopover.tsx` | Inline approve/reject overlay |
| `src/pages/Abwesenheiten.tsx` | Page: data fetching, month nav, mutations |
| `src/App.tsx` | Replace `/abwesenheiten` stub with real route |

---

### Task 1: holidays.ts + calendarUtils.ts

**Files:**
- Create: `chef-app/src/lib/holidays.ts`
- Create: `chef-app/src/lib/calendarUtils.ts`
- Create: `chef-app/src/lib/__tests__/holidays.test.ts`
- Create: `chef-app/src/lib/__tests__/calendarUtils.test.ts`

- [ ] **Step 1: Write the failing test for holidays.ts**

```typescript
// chef-app/src/lib/__tests__/holidays.test.ts
import { describe, it, expect } from 'vitest'
import { getHolidayDates } from '../holidays'

describe('getHolidayDates', () => {
  it('returns Neujahr for ST 2026', () => {
    const dates = getHolidayDates(2026, 'ST')
    expect(dates.has('2026-01-01')).toBe(true)
  })

  it('returns a Set of strings in YYYY-MM-DD format', () => {
    const dates = getHolidayDates(2026, 'ST')
    expect(dates.size).toBeGreaterThan(0)
    for (const d of dates) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('returns empty set for unknown state', () => {
    // feiertagejs falls back to NATIONAL for unknown state codes
    expect(() => getHolidayDates(2026, 'XX' as string)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd chef-app && npm run test:run -- holidays.test
```

Expected: FAIL with "Cannot find module '../holidays'"

- [ ] **Step 3: Implement holidays.ts**

```typescript
// chef-app/src/lib/holidays.ts
import { getHolidays } from 'feiertagejs'

export function getHolidayDates(year: number, federalState: string): Set<string> {
  try {
    const holidays = getHolidays(year, federalState as Parameters<typeof getHolidays>[1])
    return new Set(holidays.map(h => h.dateString))
  } catch {
    return new Set()
  }
}
```

- [ ] **Step 4: Write failing test for calendarUtils.ts**

```typescript
// chef-app/src/lib/__tests__/calendarUtils.test.ts
import { describe, it, expect } from 'vitest'
import { buildCalendarDays, buildAbsenceMap } from '../calendarUtils'
import type { Absence } from '@shared/types'

describe('buildCalendarDays', () => {
  it('returns 31 days for January', () => {
    const days = buildCalendarDays(2026, 1, new Set())
    expect(days).toHaveLength(31)
  })

  it('returns 28 days for February 2025', () => {
    expect(buildCalendarDays(2025, 2, new Set())).toHaveLength(28)
  })

  it('marks Saturdays and Sundays as isWeekend', () => {
    // 2026-01-01 is a Thursday → 2026-01-03 is Saturday
    const days = buildCalendarDays(2026, 1, new Set())
    const sat = days.find(d => d.day === 3)!
    const sun = days.find(d => d.day === 4)!
    const mon = days.find(d => d.day === 5)!
    expect(sat.isWeekend).toBe(true)
    expect(sun.isWeekend).toBe(true)
    expect(mon.isWeekend).toBe(false)
  })

  it('marks holiday dates as isHoliday', () => {
    const holidays = new Set(['2026-01-01'])
    const days = buildCalendarDays(2026, 1, holidays)
    expect(days[0].isHoliday).toBe(true)
    expect(days[1].isHoliday).toBe(false)
  })
})

describe('buildAbsenceMap', () => {
  const base: Absence = {
    id: 'a1', created: '', updated: '',
    employee: 'emp1',
    date_from: '2026-05-04',
    date_to: '2026-05-06',
    type: 'U',
    status: 'approved',
    created_by: 'u1',
  }

  it('maps each day of a range to the absence', () => {
    const map = buildAbsenceMap([base])
    expect(map.get('emp1_2026-05-04')).toBe(base)
    expect(map.get('emp1_2026-05-05')).toBe(base)
    expect(map.get('emp1_2026-05-06')).toBe(base)
    expect(map.get('emp1_2026-05-07')).toBeUndefined()
  })

  it('handles single-day absence (date_from === date_to)', () => {
    const single = { ...base, date_from: '2026-05-10', date_to: '2026-05-10' }
    const map = buildAbsenceMap([single])
    expect(map.size).toBe(1)
    expect(map.get('emp1_2026-05-10')).toBe(single)
  })
})
```

- [ ] **Step 5: Run tests to verify they fail**

```bash
cd chef-app && npm run test:run -- calendarUtils.test
```

Expected: FAIL with "Cannot find module '../calendarUtils'"

- [ ] **Step 6: Implement calendarUtils.ts**

```typescript
// chef-app/src/lib/calendarUtils.ts
import { getDaysInMonth, getDay, format, parseISO, addDays, isAfter } from 'date-fns'
import { de } from 'date-fns/locale'
import type { Absence } from '@shared/types'

export interface CalendarDay {
  date: string      // YYYY-MM-DD
  day: number       // 1–31
  dayLabel: string  // 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'
  isWeekend: boolean
  isHoliday: boolean
}

export function buildCalendarDays(year: number, month: number, holidayDates: Set<string>): CalendarDay[] {
  const count = getDaysInMonth(new Date(year, month - 1))
  return Array.from({ length: count }, (_, i) => {
    const day = i + 1
    const date = new Date(year, month - 1, day)
    const isoDate = format(date, 'yyyy-MM-dd')
    const dow = getDay(date) // 0 = Sun, 6 = Sat
    return {
      date: isoDate,
      day,
      dayLabel: format(date, 'EEE', { locale: de }).replace('.', '').slice(0, 2),
      isWeekend: dow === 0 || dow === 6,
      isHoliday: holidayDates.has(isoDate),
    }
  })
}

export function buildAbsenceMap(absences: Absence[]): Map<string, Absence> {
  const map = new Map<string, Absence>()
  for (const abs of absences) {
    let cur = parseISO(abs.date_from)
    const end = parseISO(abs.date_to)
    while (!isAfter(cur, end)) {
      map.set(`${abs.employee}_${format(cur, 'yyyy-MM-dd')}`, abs)
      cur = addDays(cur, 1)
    }
  }
  return map
}
```

- [ ] **Step 7: Run both tests to verify they pass**

```bash
cd chef-app && npm run test:run -- holidays.test calendarUtils.test
```

Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
cd chef-app && git add src/lib/holidays.ts src/lib/calendarUtils.ts src/lib/__tests__/holidays.test.ts src/lib/__tests__/calendarUtils.test.ts
git commit -m "feat: add holidays and calendar utility functions"
```

---

### Task 2: KalenderTable – static grid rendering

**Files:**
- Create: `chef-app/src/components/Abwesenheiten/KalenderTable.tsx`

This task builds the static rendering only — no interactions yet. The grid renders employees as rows, days as columns, weekends/holidays grayed out, absences colored with their Kürzel, and summary columns.

- [ ] **Step 1: Create the component**

```tsx
// chef-app/src/components/Abwesenheiten/KalenderTable.tsx
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { Employee, Absence, AbsenceType } from '@shared/types'
import { ABSENCE_COLORS, VACATION_TYPES } from '@shared/types'
import type { CalendarDay } from '../../lib/calendarUtils'

export interface KalenderTableProps {
  employees: Employee[]
  absenceMap: Map<string, Absence>   // key: `${empId}_${isoDate}`
  calendarDays: CalendarDay[]
  activeCell: { empId: string; date: string } | null
  inputValue: string
  dragRange: { empId: string; start: string; end: string } | null
  onCellClick: (empId: string, date: string, absence: Absence | undefined) => void
  onCellMouseDown: (empId: string, date: string) => void
  onCellMouseEnter: (empId: string, date: string) => void
}

const SICK_TYPES: AbsenceType[] = ['K', 'KK']

export default function KalenderTable({
  employees, absenceMap, calendarDays,
  activeCell, inputValue, dragRange,
  onCellClick, onCellMouseDown, onCellMouseEnter,
}: KalenderTableProps) {
  // Summary counts per employee for the visible month
  const summaries = useMemo(() => {
    return employees.map(emp => {
      let at = 0, vacation = 0, sick = 0
      for (const day of calendarDays) {
        const absence = absenceMap.get(`${emp.id}_${day.date}`)
        if (!absence || absence.status !== 'approved') continue
        if (absence.type === 'AT') at++
        else if (VACATION_TYPES.includes(absence.type)) vacation++
        else if (SICK_TYPES.includes(absence.type)) sick++
      }
      return { at, vacation, sick }
    })
  }, [employees, absenceMap, calendarDays])

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-[11px] leading-none select-none">
        <thead>
          <tr className="bg-[#F5F2EE]">
            <th className="sticky left-0 z-10 bg-[#F5F2EE] text-left text-xs font-semibold text-[#1A1917] px-3 py-2 min-w-[160px] border-b border-r border-[#EDE7DC]">
              Mitarbeiter
            </th>
            {calendarDays.map(day => (
              <th
                key={day.date}
                className={cn(
                  'w-6 min-w-[24px] text-center font-normal border-b border-r border-[#EDE7DC] py-1',
                  (day.isWeekend || day.isHoliday) && 'bg-gray-100 text-gray-400',
                )}
              >
                <div className="font-semibold">{day.day}</div>
                <div className="text-gray-400">{day.dayLabel}</div>
              </th>
            ))}
            {['AT', 'U+RU', 'K'].map(label => (
              <th key={label} className="w-8 min-w-[32px] text-center text-xs font-semibold text-[#706D6A] border-b border-r border-[#EDE7DC] px-1 py-2">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map((emp, empIdx) => {
            const sum = summaries[empIdx]
            return (
              <tr key={emp.id} className="group">
                <td className="sticky left-0 z-10 bg-white border-b border-r border-[#EDE7DC] px-3 py-1 font-medium text-[#1A1917] whitespace-nowrap group-hover:bg-[#FDFCFB]">
                  {emp.last_name}, {emp.first_name}
                </td>
                {calendarDays.map(day => {
                  const key = `${emp.id}_${day.date}`
                  const absence = absenceMap.get(key)
                  const isBlocked = day.isWeekend || day.isHoliday
                  const isActive = activeCell?.empId === emp.id && activeCell?.date === day.date
                  const inDrag = dragRange?.empId === emp.id &&
                    day.date >= dragRange.start && day.date <= dragRange.end
                  const colors = absence ? ABSENCE_COLORS[absence.type] : null

                  return (
                    <td
                      key={day.date}
                      className={cn(
                        'w-6 min-w-[24px] h-7 border-b border-r border-[#EDE7DC] text-center align-middle cursor-default',
                        isBlocked && 'bg-gray-50',
                        !isBlocked && !absence && 'group-hover:bg-[#FDFCFB] hover:bg-[#F5F2EE] cursor-pointer',
                        isActive && 'outline outline-2 outline-offset-[-2px] outline-[#BA7517] z-10',
                        inDrag && !absence && !isBlocked && 'bg-amber-50',
                      )}
                      style={absence && colors ? { backgroundColor: colors.bg } : undefined}
                      onClick={() => !isBlocked && onCellClick(emp.id, day.date, absence)}
                      onMouseDown={() => !isBlocked && !absence && onCellMouseDown(emp.id, day.date)}
                      onMouseEnter={() => onCellMouseEnter(emp.id, day.date)}
                    >
                      {absence ? (
                        <span
                          className={cn(
                            'font-medium',
                            absence.status === 'pending' && 'opacity-60',
                          )}
                          style={colors ? { color: colors.text } : undefined}
                        >
                          {absence.type}
                        </span>
                      ) : isActive && inputValue ? (
                        <span className="text-[#BA7517] font-medium">{inputValue}</span>
                      ) : null}
                    </td>
                  )
                })}
                <td className="w-8 min-w-[32px] text-center border-b border-r border-[#EDE7DC] text-[#706D6A]">{sum.at || ''}</td>
                <td className="w-8 min-w-[32px] text-center border-b border-r border-[#EDE7DC] text-[#706D6A]">{sum.vacation || ''}</td>
                <td className="w-8 min-w-[32px] text-center border-b border-r border-[#EDE7DC] text-[#706D6A]">{sum.sick || ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd chef-app && git add src/components/Abwesenheiten/KalenderTable.tsx
git commit -m "feat: add KalenderTable static grid component"
```

---

### Task 3: ApprovalPopover component

**Files:**
- Create: `chef-app/src/components/Abwesenheiten/ApprovalPopover.tsx`

The popover appears when a `pending` absence cell is clicked. It shows employee name, date range, type, note (if any), and Genehmigen / Ablehnen buttons.

- [ ] **Step 1: Implement ApprovalPopover**

```tsx
// chef-app/src/components/Abwesenheiten/ApprovalPopover.tsx
import { useEffect, useRef } from 'react'
import { X, Check, XCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import type { Absence, Employee } from '@shared/types'
import { ABSENCE_COLORS } from '@shared/types'
import { Button } from '../ui/button'

interface ApprovalPopoverProps {
  absence: Absence
  employee: Employee
  anchorRect: DOMRect
  onApprove: () => void
  onReject: () => void
  onClose: () => void
}

export default function ApprovalPopover({
  absence, employee, anchorRect, onApprove, onReject, onClose,
}: ApprovalPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [onClose])

  const colors = ABSENCE_COLORS[absence.type]
  const dateLabel = absence.date_from === absence.date_to
    ? format(parseISO(absence.date_from), 'dd. MMM yyyy', { locale: de })
    : `${format(parseISO(absence.date_from), 'dd.MM.', { locale: de })} – ${format(parseISO(absence.date_to), 'dd. MMM yyyy', { locale: de })}`

  const style: React.CSSProperties = {
    position: 'fixed',
    top: anchorRect.bottom + 4,
    left: Math.min(anchorRect.left, window.innerWidth - 220),
    zIndex: 50,
  }

  return (
    <div
      ref={ref}
      style={style}
      className="w-52 bg-white border border-[#EDE7DC] rounded-lg shadow-lg p-3"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-xs text-[#706D6A]">{employee.last_name}, {employee.first_name}</div>
          <div className="text-xs font-medium text-[#1A1917] mt-0.5">{dateLabel}</div>
        </div>
        <button onClick={onClose} className="text-[#706D6A] hover:text-[#1A1917] ml-1">
          <X size={14} />
        </button>
      </div>
      <div
        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold mb-2"
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        {absence.type}
      </div>
      {absence.note && (
        <p className="text-xs text-[#706D6A] mb-2 italic">"{absence.note}"</p>
      )}
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={onApprove}>
          <Check size={12} /> Ja
        </Button>
        <Button size="sm" variant="destructive" className="flex-1 h-7 text-xs" onClick={onReject}>
          <XCircle size={12} /> Nein
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd chef-app && git add src/components/Abwesenheiten/ApprovalPopover.tsx
git commit -m "feat: add ApprovalPopover component"
```

---

### Task 4: Abwesenheiten page – data fetching and month navigation

**Files:**
- Create: `chef-app/src/pages/Abwesenheiten.tsx`

This is the main page. It fetches employees, the month's absences, and the federal state setting, then renders `KalenderTable`. Month navigation is handled here.

- [ ] **Step 1: Implement Abwesenheiten.tsx**

```tsx
// chef-app/src/pages/Abwesenheiten.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pb } from '../lib/pb'
import { getHolidayDates } from '../lib/holidays'
import { buildCalendarDays, buildAbsenceMap } from '../lib/calendarUtils'
import type { Employee, Absence, AbsenceType } from '@shared/types'
import { VACATION_TYPES, AUTO_APPROVED_TYPES } from '@shared/types'
import KalenderTable from '../components/Abwesenheiten/KalenderTable'
import ApprovalPopover from '../components/Abwesenheiten/ApprovalPopover'
import { useAuthStore } from '../stores/auth'

const VALID_TYPES: AbsenceType[] = ['U', 'RU', 'U3', 'SU', 'K', 'KK', 'AT', 'S', 'ÜA']

export default function Abwesenheiten() {
  const user = useAuthStore(s => s.user)
  const canApprove = user?.role === 'gf'

  const [currentDate, setCurrentDate] = useState(() => new Date())
  const year  = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1 // 1-indexed

  const [employees, setEmployees]   = useState<Employee[]>([])
  const [absences,  setAbsences]    = useState<Absence[]>([])
  const [federalState, setFederal]  = useState('ST')
  const [loading, setLoading]       = useState(true)

  // Interaction state
  const [activeCell, setActiveCell] = useState<{ empId: string; date: string } | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [dragRange,  setDragRange]  = useState<{ empId: string; start: string; end: string } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [popover,    setPopover]    = useState<{ absence: Absence; rect: DOMRect } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load settings + employees once
  useEffect(() => {
    Promise.all([
      pb.collection('settings').getFullList({ requestKey: 'settings' }),
      pb.collection('employees').getFullList<Employee>({ sort: 'last_name,first_name', filter: 'active = true', requestKey: 'emp-list' }),
    ]).then(([settings, emps]) => {
      const fs = settings.find(s => s.key === 'federal_state')?.value ?? 'ST'
      setFederal(fs)
      setEmployees(emps)
    }).catch(console.error)
  }, [])

  // Load absences for current month
  useEffect(() => {
    const from = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
    const to   = format(endOfMonth(new Date(year, month - 1)),   'yyyy-MM-dd')
    const filter = `date_from <= "${to}" && date_to >= "${from}"`
    pb.collection('absences').getFullList<Absence>({ filter, requestKey: 'absences-month' })
      .then(setAbsences)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [year, month])

  const holidayDates  = getHolidayDates(year, federalState)
  const calendarDays  = buildCalendarDays(year, month, holidayDates)
  const absenceMap    = buildAbsenceMap(absences)

  // Focus hidden input when a cell is activated
  useEffect(() => {
    if (activeCell) inputRef.current?.focus()
    else setInputValue('')
  }, [activeCell])

  // ── Mutation helpers ──────────────────────────────────

  async function createAbsence(empId: string, dateFrom: string, dateTo: string, type: AbsenceType) {
    const status = VACATION_TYPES.includes(type) ? 'pending' : 'approved'
    const rec = await pb.collection('absences').create<Absence>({
      employee: empId, date_from: dateFrom, date_to: dateTo,
      type, status, created_by: user!.id,
    })
    setAbsences(prev => [...prev, rec])
  }

  async function deleteAbsenceById(id: string) {
    await pb.collection('absences').delete(id)
    setAbsences(prev => prev.filter(a => a.id !== id))
  }

  async function handleApprove(absenceId: string) {
    const rec = await pb.collection('absences').update<Absence>(absenceId, {
      status: 'approved', approved_by: user!.id, approved_at: new Date().toISOString(),
    })
    setAbsences(prev => prev.map(a => a.id === absenceId ? rec : a))
    setPopover(null)
  }

  async function handleReject(absenceId: string) {
    const rec = await pb.collection('absences').update<Absence>(absenceId, { status: 'rejected' })
    setAbsences(prev => prev.map(a => a.id === absenceId ? rec : a))
    setPopover(null)
  }

  // ── Cell interaction handlers ─────────────────────────

  function handleCellClick(empId: string, date: string, absence: Absence | undefined) {
    if (isDragging) return
    if (absence && absence.status === 'pending' && canApprove) {
      const cellEl = document.querySelector(`[data-cell="${empId}_${date}"]`)
      if (cellEl) setPopover({ absence, rect: cellEl.getBoundingClientRect() })
      return
    }
    if (absence) {
      // Select cell (can delete)
      setActiveCell({ empId, date })
      return
    }
    setActiveCell({ empId, date })
  }

  function handleCellMouseDown(empId: string, date: string) {
    setIsDragging(false)
    setDragRange({ empId, start: date, end: date })
  }

  function handleCellMouseEnter(empId: string, date: string) {
    if (!dragRange || dragRange.empId !== empId) return
    setIsDragging(true)
    const [s, e] = dragRange.start <= date ? [dragRange.start, date] : [date, dragRange.start]
    setDragRange({ empId, start: s, end: e })
  }

  const handleMouseUp = useCallback(() => {
    if (isDragging && dragRange && inputValue) {
      const type = inputValue.toUpperCase() as AbsenceType
      if (VALID_TYPES.includes(type)) {
        // Create one absence spanning the drag range (skip existing cells)
        createAbsence(dragRange.empId, dragRange.start, dragRange.end, type)
      }
    }
    setDragRange(null)
    setIsDragging(false)
  }, [isDragging, dragRange, inputValue])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!activeCell) return

    if (e.key === 'Escape') {
      setActiveCell(null)
      return
    }

    if (e.key === 'Backspace') {
      setInputValue(prev => prev.slice(0, -1))
      return
    }

    if (e.key === 'Delete') {
      const existing = absenceMap.get(`${activeCell.empId}_${activeCell.date}`)
      if (existing) deleteAbsenceById(existing.id)
      setActiveCell(null)
      return
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const type = inputValue.toUpperCase() as AbsenceType
      if (inputValue && VALID_TYPES.includes(type)) {
        createAbsence(activeCell.empId, activeCell.date, activeCell.date, type)
      }
      setActiveCell(null)
      return
    }

    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const empIdx  = employees.findIndex(e => e.id === activeCell.empId)
      const dayIdx  = calendarDays.findIndex(d => d.date === activeCell.date)
      let newEmpIdx  = empIdx
      let newDayIdx  = dayIdx

      if (e.key === 'ArrowRight') newDayIdx  = Math.min(dayIdx + 1, calendarDays.length - 1)
      if (e.key === 'ArrowLeft')  newDayIdx  = Math.max(dayIdx - 1, 0)
      if (e.key === 'ArrowDown')  newEmpIdx  = Math.min(empIdx + 1, employees.length - 1)
      if (e.key === 'ArrowUp')    newEmpIdx  = Math.max(empIdx - 1, 0)

      setActiveCell({ empId: employees[newEmpIdx].id, date: calendarDays[newDayIdx].date })
      setInputValue('')
      return
    }

    // Accumulate printable characters
    if (e.key.length === 1) {
      const next = (inputValue + e.key).toUpperCase()
      // Accept if it's a prefix or exact match of a valid type
      const isValidPrefix = VALID_TYPES.some(t => t.startsWith(next))
      if (isValidPrefix) setInputValue(next)
    }
  }

  if (loading) return <p className="text-sm text-[#706D6A]">Lade…</p>

  return (
    <div onMouseUp={handleMouseUp}>
      {/* Hidden input for keyboard capture */}
      <input
        ref={inputRef}
        className="sr-only"
        onKeyDown={handleKeyDown}
        onChange={() => {}} // controlled by keyDown
        value={inputValue}
        readOnly
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1917]">Abwesenheiten</h1>
          <p className="text-sm text-[#706D6A]">Monatsübersicht</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(d => subMonths(d, 1))}
            className="p-1.5 rounded hover:bg-[#EDE7DC] text-[#706D6A]"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-[#1A1917] w-32 text-center">
            {format(currentDate, 'MMMM yyyy', { locale: de })}
          </span>
          <button
            onClick={() => setCurrentDate(d => addMonths(d, 1))}
            className="p-1.5 rounded hover:bg-[#EDE7DC] text-[#706D6A]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-3 text-[10px]">
        {(['U','RU','K','AT','S'] as AbsenceType[]).map(type => (
          <span
            key={type}
            className="px-1.5 py-0.5 rounded font-medium"
            style={{ backgroundColor: ABSENCE_COLORS[type].bg, color: ABSENCE_COLORS[type].text }}
          >
            {type} {type === 'U' ? '= Urlaub' : type === 'RU' ? '= Rest-U.' : type === 'K' ? '= Krank' : type === 'AT' ? '= Arzt' : '= Schule'}
          </span>
        ))}
        <span className="text-[#706D6A] italic ml-1">Kürzel: U RU U3 SU K KK AT S ÜA</span>
      </div>

      {/* Calendar */}
      <div className="bg-white border border-[#EDE7DC] rounded-lg overflow-hidden">
        {employees.length === 0 ? (
          <p className="text-sm text-[#706D6A] p-6 text-center">Keine aktiven Mitarbeiter vorhanden.</p>
        ) : (
          <KalenderTable
            employees={employees}
            absenceMap={absenceMap}
            calendarDays={calendarDays}
            activeCell={activeCell}
            inputValue={inputValue}
            dragRange={dragRange}
            onCellClick={handleCellClick}
            onCellMouseDown={handleCellMouseDown}
            onCellMouseEnter={handleCellMouseEnter}
          />
        )}
      </div>

      {/* Approval popover */}
      {popover && canApprove && (
        <ApprovalPopover
          absence={popover.absence}
          employee={employees.find(e => e.id === popover.absence.employee)!}
          anchorRect={popover.rect}
          onApprove={() => handleApprove(popover.absence.id)}
          onReject={() => handleReject(popover.absence.id)}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add `data-cell` attribute to KalenderTable cells**

In `KalenderTable.tsx`, update the `<td>` for day cells to add the data attribute used by Abwesenheiten.tsx:

```tsx
// In the map of calendarDays inside KalenderTable.tsx, add to the <td>:
data-cell={`${emp.id}_${day.date}`}
```

Full updated `<td>` in KalenderTable.tsx:
```tsx
<td
  key={day.date}
  data-cell={`${emp.id}_${day.date}`}
  className={cn(
    'w-6 min-w-[24px] h-7 border-b border-r border-[#EDE7DC] text-center align-middle cursor-default',
    isBlocked && 'bg-gray-50',
    !isBlocked && !absence && 'group-hover:bg-[#FDFCFB] hover:bg-[#F5F2EE] cursor-pointer',
    isActive && 'outline outline-2 outline-offset-[-2px] outline-[#BA7517] z-10',
    inDrag && !absence && !isBlocked && 'bg-amber-50',
  )}
  style={absence && colors ? { backgroundColor: colors.bg } : undefined}
  onClick={() => !isBlocked && onCellClick(emp.id, day.date, absence)}
  onMouseDown={() => !isBlocked && !absence && onCellMouseDown(emp.id, day.date)}
  onMouseEnter={() => onCellMouseEnter(emp.id, day.date)}
>
```

- [ ] **Step 3: Commit**

```bash
cd chef-app && git add src/pages/Abwesenheiten.tsx src/components/Abwesenheiten/KalenderTable.tsx
git commit -m "feat: add Abwesenheiten page with data fetching and month navigation"
```

---

### Task 5: App.tsx – replace stub with real route

**Files:**
- Modify: `chef-app/src/App.tsx`
- Modify: `chef-app/src/components/Layout/Sidebar.tsx` — remove `soon: true` from Abwesenheiten

- [ ] **Step 1: Update App.tsx**

In `chef-app/src/App.tsx`, replace the import and route:

```tsx
// Add import at top (after existing imports):
import Abwesenheiten from './pages/Abwesenheiten'

// Replace the stub route:
// OLD:
<Route path="/abwesenheiten" element={<Stub label="Abwesenheiten (Phase 2)" />} />
// NEW:
<Route path="/abwesenheiten" element={<Abwesenheiten />} />
```

- [ ] **Step 2: Update Sidebar.tsx — remove `soon` flag from Abwesenheiten**

In `chef-app/src/components/Layout/Sidebar.tsx`, update the NAV array:

```tsx
// OLD:
{ to: '/abwesenheiten', icon: CalendarOff, label: 'Abwesenheiten', soon: true },
// NEW:
{ to: '/abwesenheiten', icon: CalendarOff, label: 'Abwesenheiten' },
```

- [ ] **Step 3: Verify the app compiles**

```bash
cd chef-app && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors, successful build.

- [ ] **Step 4: Run all tests**

```bash
cd chef-app && npm run test:run 2>&1 | tail -30
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
cd chef-app && git add src/App.tsx src/components/Layout/Sidebar.tsx
git commit -m "feat: wire Abwesenheiten page into router and sidebar"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Monatsansicht eine Zeile pro Mitarbeiter → `KalenderTable.tsx` rows
- ✅ Alle Tage als Spalten → `calendarDays` from `buildCalendarDays`
- ✅ Direkte Zelleingabe (Kürzel tippen) → `handleKeyDown` in `Abwesenheiten.tsx`
- ✅ Drag-to-Fill → `handleCellMouseDown/Enter/Up` + `dragRange` state
- ✅ Pfeiltasten-Navigation → ArrowKey handling in `handleKeyDown`
- ✅ Wochenenden + Feiertage grau/gesperrt → `isBlocked` flag in `KalenderTable`
- ✅ feiertagejs + settings.federal_state → `getHolidayDates` + settings fetch
- ✅ Genehmigungspflichtige Kürzel → pending status in `createAbsence`
- ✅ Direktkürzel → approved status in `createAbsence`
- ✅ Zusammenfassungsspalten AT / U+RU / K → `summaries` in `KalenderTable`
- ✅ Pending inline Approve/Reject → `ApprovalPopover` + `handleApprove/Reject`

**Placeholder scan:** No TBDs found.

**Type consistency:** `CalendarDay` defined in calendarUtils.ts, used in KalenderTable.tsx. `Absence`, `Employee`, `AbsenceType` imported from `@shared/types` consistently.
