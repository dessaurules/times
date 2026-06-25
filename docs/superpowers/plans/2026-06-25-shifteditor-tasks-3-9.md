# ShiftEditor Tasks 3-9 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 7 sequential tasks to complete the ShiftEditor feature set: Absences Tab, Header Refactor, Settings Modal Integration, Quick Select Split, Shift2 Expandable, Integration Tests, and Manual E2E.

**Architecture:** 
- **Task 3**: Add AbsencesTab component to ShiftEditorSettings (view-only, queries date range)
- **Task 4**: Refactor ShiftEditor header to show 2-line layout + gear icon placeholder
- **Task 5**: Add state & modal toggle for ShiftEditorSettings in ShiftEditor
- **Task 6**: Split Quick Select into two sections (Frei/Templates + Absences)
- **Task 7**: Implement expandable Shift2 section with UI state
- **Task 8**: Write integration tests covering templates → quick select → save workflow
- **Task 9**: Manual E2E verification in dev server

**Tech Stack:** React 19, TDD (vitest + @testing-library/react), TypeScript, shadcn/ui, PocketBase

## Global Constraints

- All absence colors use `ABSENCE_COLORS` from `@shared/types`
- Absence display shows: Type, Date Range, Status ("Genehmigt" / "Ausstehend")
- Filter: only show absences with status != "rejected"
- Shifts follow `ShiftColor` = 'blue' | 'green' | 'amber' | 'purple' | 'rose'
- Header shows 2 lines: "Schicht eintragen" + "{employeeName} · {dayLabel}"
- Tests require `@testing-library/react` + `vitest`
- Commits follow conventional format with co-author

---

## Task 3: Implement Absences Tab (View-Only)

**Files:**
- Modify: `chef-app/src/components/Dienstplan/ShiftEditorSettings.tsx:216-291`
- Modify: `chef-app/src/components/Dienstplan/__tests__/ShiftEditorSettings.test.tsx` (add AbsencesTab tests)

**Interfaces:**
- Consumes: 
  - `Absence` type from `@shared/types`
  - `ABSENCE_COLORS`, `ABSENCE_LABELS` from `@shared/types`
  - `pb` (PocketBase instance, accessed via hook or context)
- Produces: `AbsencesTab({ employeeId, dateFrom, dateTo })` component that renders absence list

**Context:** AbsencesTab will be rendered when `activeTab === 'absences'` in ShiftEditorSettings. It queries PocketBase for absences in the date range and displays them read-only.

- [ ] **Step 1: Write failing tests for AbsencesTab**

Add new test suite to `__tests__/ShiftEditorSettings.test.tsx` after the TemplatesTab tests (line 208):

```typescript
  // ── Absences Tab Tests ────────────────────────────────────────────────────────
  describe('Absences Tab', () => {
    it('renders absences for the selected date', async () => {
      const mockAbsences = [
        {
          id: 'abs1',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z',
          employee: 'emp1',
          date_from: '2026-06-25',
          date_to: '2026-06-27',
          type: 'U' as const,
          status: 'approved' as const,
          created_by: 'user1',
        },
        {
          id: 'abs2',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z',
          employee: 'emp1',
          date_from: '2026-06-30',
          date_to: '2026-07-05',
          type: 'K' as const,
          status: 'pending' as const,
          created_by: 'user1',
        },
      ]

      // Mock pb.collection
      global.pb = {
        collection: vi.fn(() => ({
          getFullList: vi.fn().mockResolvedValue(mockAbsences),
        })),
      } as any

      const user = userEvent.setup()
      render(
        <ShiftEditorSettings
          open={true}
          onClose={() => {}}
          employeeName="Max Mustermann"
          date="2026-06-25"
          department="dept_1"
        />
      )

      // Click Absences tab
      const absencesTab = screen.getByText('📅 Abwesenheiten')
      await user.click(absencesTab)

      // Wait for absences to render
      await waitFor(() => {
        expect(screen.getByText('Urlaub')).toBeInTheDocument()
        expect(screen.getByText('Krank')).toBeInTheDocument()
      })

      // Check date ranges display
      expect(screen.getByText('2026-06-25 – 2026-06-27')).toBeInTheDocument()
      expect(screen.getByText('2026-06-30 – 2026-07-05')).toBeInTheDocument()

      // Check status display
      expect(screen.getByText('Genehmigt')).toBeInTheDocument()
      expect(screen.getByText('Ausstehend')).toBeInTheDocument()
    })

    it('shows empty state when no absences', async () => {
      global.pb = {
        collection: vi.fn(() => ({
          getFullList: vi.fn().mockResolvedValue([]),
        })),
      } as any

      const user = userEvent.setup()
      render(
        <ShiftEditorSettings
          open={true}
          onClose={() => {}}
          employeeName="Max Mustermann"
          date="2026-06-25"
          department="dept_1"
        />
      )

      // Click Absences tab
      const absencesTab = screen.getByText('📅 Abwesenheiten')
      await user.click(absencesTab)

      // Check empty state
      await waitFor(() => {
        expect(screen.getByText(/Keine Abwesenheiten/)).toBeInTheDocument()
      })
    })

    it('filters out rejected absences', async () => {
      const mockAbsences = [
        {
          id: 'abs1',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z',
          employee: 'emp1',
          date_from: '2026-06-25',
          date_to: '2026-06-27',
          type: 'U' as const,
          status: 'approved' as const,
          created_by: 'user1',
        },
        {
          id: 'abs2',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z',
          employee: 'emp1',
          date_from: '2026-06-30',
          date_to: '2026-07-05',
          type: 'K' as const,
          status: 'rejected' as const,
          created_by: 'user1',
        },
      ]

      global.pb = {
        collection: vi.fn(() => ({
          getFullList: vi.fn().mockResolvedValue(mockAbsences),
        })),
      } as any

      const user = userEvent.setup()
      render(
        <ShiftEditorSettings
          open={true}
          onClose={() => {}}
          employeeName="Max Mustermann"
          date="2026-06-25"
          department="dept_1"
        />
      )

      // Click Absences tab
      const absencesTab = screen.getByText('📅 Abwesenheiten')
      await user.click(absencesTab)

      // Should only show approved (rejected filtered out)
      await waitFor(() => {
        expect(screen.getByText('Urlaub')).toBeInTheDocument()
        expect(screen.queryByText('Krank')).not.toBeInTheDocument()
      })
    })
  })
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/ronnybeckmann/Projects/times/chef-app
npm test -- ShiftEditorSettings.test.tsx --reporter=verbose
```

Expected: Tests fail with "AbsencesTab not defined" or similar.

- [ ] **Step 3: Implement AbsencesTab component**

Add to `ShiftEditorSettings.tsx` before the `export default` function (after line 214):

```typescript
// ── AbsencesTab ──────────────────────────────────────────────────────────

function AbsencesTab({ employeeId, dateFrom }: { employeeId: string; dateFrom: string }) {
  const [absences, setAbsences] = useState<Absence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadAbsences() {
      try {
        setLoading(true)
        // Query absences for date range (3 months window)
        const dateFromObj = new Date(dateFrom)
        const dateToObj = new Date(dateFromObj)
        dateToObj.setMonth(dateToObj.getMonth() + 3)

        const isoFrom = dateFromObj.toISOString().split('T')[0]
        const isoTo = dateToObj.toISOString().split('T')[0]

        const allAbsences = await pb.collection('absences').getFullList<Absence>({
          filter: `employee = "${employeeId}" && status != "rejected" && (date_from >= "${isoFrom}" || date_to <= "${isoTo}")`,
          sort: 'date_from',
        })

        setAbsences(allAbsences)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load absences')
        setAbsences([])
      } finally {
        setLoading(false)
      }
    }

    loadAbsences()
  }, [employeeId, dateFrom])

  if (loading) {
    return <div className="text-center text-sm text-gray-600 py-4">Laden...</div>
  }

  if (error) {
    return <div className="text-center text-sm text-red-600 py-4">{error}</div>
  }

  if (absences.length === 0) {
    return <div className="text-center text-sm text-gray-600 py-4">Keine Abwesenheiten</div>
  }

  return (
    <div className="space-y-3">
      {absences.map((absence) => {
        const colors = ABSENCE_COLORS[absence.type]
        const statusLabel = absence.status === 'approved' ? 'Genehmigt' : 'Ausstehend'

        return (
          <div
            key={absence.id}
            className="p-3 rounded-lg border"
            style={{
              background: colors.bg,
              borderColor: colors.text + '44',
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium text-sm" style={{ color: colors.text }}>
                  {ABSENCE_LABELS[absence.type]}
                </p>
                <p className="text-xs mt-1" style={{ color: colors.text }}>
                  {absence.date_from} – {absence.date_to}
                </p>
                {absence.note && (
                  <p className="text-xs mt-1 opacity-75" style={{ color: colors.text }}>
                    {absence.note}
                  </p>
                )}
              </div>
              <div className="ml-3">
                <span
                  className="inline-block px-2 py-1 text-xs font-medium rounded"
                  style={{
                    background: colors.text + '22',
                    color: colors.text,
                  }}
                >
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

Add import at top of file (after line 1):

```typescript
import { useState, useEffect } from 'react'
import type { Absence } from '@shared/types'
import { ABSENCE_COLORS, ABSENCE_LABELS } from '@shared/types'
```

Update the JSX body in ShiftEditorSettings (replace line 282-286):

```typescript
          {activeTab === 'absences' && (
            <AbsencesTab employeeId={/* extract from props */} dateFrom={date} />
          )}
```

Wait, we need to extract employeeId from props. Add to ShiftEditorSettingsProps interface (line 10-16):

```typescript
interface ShiftEditorSettingsProps {
  open: boolean
  onClose: () => void
  employeeName: string
  date: string
  department: string
  employeeId?: string  // Add this
}
```

Update JSX (line 282-286):

```typescript
          {activeTab === 'absences' && employeeId && (
            <AbsencesTab employeeId={employeeId} dateFrom={date} />
          )}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- ShiftEditorSettings.test.tsx --reporter=verbose
```

Expected: All 3 AbsencesTab tests pass (✓ renders absences, ✓ empty state, ✓ filters rejected).

- [ ] **Step 5: Commit**

```bash
git add chef-app/src/components/Dienstplan/ShiftEditorSettings.tsx
git add chef-app/src/components/Dienstplan/__tests__/ShiftEditorSettings.test.tsx
git commit -m "feat: add view-only AbsencesTab with date range filtering

- Query absences for selected employee within 3-month window
- Display absence type, date range, and status (Genehmigt/Ausstehend)
- Filter out rejected absences from display
- Show empty state when no active absences
- Use ABSENCE_COLORS for consistent styling

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Refactor ShiftEditor Header

**Files:**
- Modify: `chef-app/src/components/Dienstplan/ShiftEditor.tsx:131-146`
- Modify: `chef-app/src/components/Dienstplan/__tests__/ShiftEditor.test.tsx` (add header tests if needed, or inline in existing)

**Interfaces:**
- Consumes: props `employeeName`, `dayLabel` (already passed)
- Produces: DialogHeader with 2-line layout

**Context:** The current header shows only "Schicht eintragen" as title. New header should show:
- Line 1: "Schicht eintragen"
- Line 2: "{employeeName} · {dayLabel}"
- Gear icon placeholder on the right (for Task 5)

- [ ] **Step 1: Write failing test for header layout**

If ShiftEditor.test.tsx doesn't exist, create it:

```bash
cat > /Users/ronnybeckmann/Projects/times/chef-app/src/components/Dienstplan/__tests__/ShiftEditor.test.tsx << 'EOF'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import ShiftEditor from '../ShiftEditor'

describe('ShiftEditor Header', () => {
  it('renders header with two lines: title and employee/day info', () => {
    render(
      <ShiftEditor
        open={true}
        onClose={() => {}}
        onSave={() => {}}
        employeeName="Max Mustermann"
        dayLabel="Mi, 25.06.2026"
        department="dept_1"
      />
    )

    expect(screen.getByText('Schicht eintragen')).toBeInTheDocument()
    expect(screen.getByText(/Max Mustermann · Mi, 25.06.2026/)).toBeInTheDocument()
  })

  it('renders gear icon button', () => {
    render(
      <ShiftEditor
        open={true}
        onClose={() => {}}
        onSave={() => {}}
        employeeName="Max Mustermann"
        dayLabel="Mi, 25.06.2026"
        department="dept_1"
      />
    )

    const gearButton = screen.getByRole('button', { name: /settings|gear/i })
    expect(gearButton).toBeInTheDocument()
  })
})
EOF
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- ShiftEditor.test.tsx --reporter=verbose
```

Expected: Fails because header doesn't have the 2-line layout yet.

- [ ] **Step 3: Implement 2-line header with gear icon**

Replace DialogHeader section in ShiftEditor.tsx (lines 134-146):

```typescript
      <DialogHeader>
        <div className="flex items-start justify-between w-full">
          <div>
            <DialogTitle>Schicht eintragen</DialogTitle>
            <p className="text-xs text-gray-600 mt-1 font-medium">
              {employeeName} · {dayLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {/* Task 5: will implement */}}
            className="p-2 rounded hover:bg-gray-100 text-gray-600 transition-colors"
            title="Einstellungen"
            aria-label="Einstellungen"
          >
            ⚙️
          </button>
        </div>
      </DialogHeader>
```

Also keep the "Freier Tag" checkbox but move it outside the header buttons (we'll handle layout in Task 5). For now, move the checkbox just below the header:

Actually, re-reading the spec: "Gear Icon Placeholder" means the gear icon should be in the header. Let me re-structure:

Replace lines 134-146 with:

```typescript
      <DialogHeader>
        <div className="flex items-start justify-between w-full">
          <div>
            <DialogTitle>Schicht eintragen</DialogTitle>
            <p className="text-xs text-gray-600 mt-1 font-medium">
              {employeeName} · {dayLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Gear icon for Task 5 */}
            <button
              type="button"
              onClick={() => {/* Task 5: setShowSettings(true) */}}
              className="p-2 rounded hover:bg-gray-100 text-gray-600 transition-colors flex-shrink-0"
              title="Einstellungen"
              aria-label="Einstellungen"
            >
              ⚙️
            </button>
            {/* Freier Tag Checkbox */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none flex-shrink-0">
              <input
                type="checkbox"
                checked={isFreeDay}
                onChange={e => setIsFreeDay(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-medium text-gray-600">Freier Tag</span>
            </label>
          </div>
        </div>
      </DialogHeader>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- ShiftEditor.test.tsx --reporter=verbose
```

Expected: Header tests pass. Both lines render correctly.

- [ ] **Step 5: Commit**

```bash
git add chef-app/src/components/Dienstplan/ShiftEditor.tsx
git add chef-app/src/components/Dienstplan/__tests__/ShiftEditor.test.tsx
git commit -m "refactor: split header into 2-line layout with gear icon

- Line 1: 'Schicht eintragen' title
- Line 2: 'employee_name · day_label' subtitle
- Add gear icon button placeholder (for settings modal)
- Move 'Freier Tag' checkbox to header right side
- Improve visual hierarchy with smaller subtitle text

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Add Settings Modal Toggle

**Files:**
- Modify: `chef-app/src/components/Dienstplan/ShiftEditor.tsx:42-60, 131-146, 374-376`

**Interfaces:**
- Consumes: `ShiftEditorSettings` component (already exists from Task 3)
- Produces: state `showSettings` + onClick handler on gear button

**Context:** Wire up the gear icon button from Task 4 to open ShiftEditorSettings modal.

- [ ] **Step 1: Write failing test for modal toggle**

Add to ShiftEditor.test.tsx (after header tests):

```typescript
  describe('Settings Modal', () => {
    it('opens settings modal when gear button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ShiftEditor
          open={true}
          onClose={() => {}}
          onSave={() => {}}
          employeeName="Max Mustermann"
          dayLabel="Mi, 25.06.2026"
          department="dept_1"
          employeeId="emp_123"
        />
      )

      const gearButton = screen.getByRole('button', { name: /einstellungen/i })
      await user.click(gearButton)

      // Settings modal should render
      await waitFor(() => {
        expect(screen.getByText('Einstellungen & Verwaltung')).toBeInTheDocument()
      })
    })

    it('closes settings modal when close button is clicked', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <ShiftEditor
          open={true}
          onClose={() => {}}
          onSave={() => {}}
          employeeName="Max Mustermann"
          dayLabel="Mi, 25.06.2026"
          department="dept_1"
          employeeId="emp_123"
        />
      )

      // Open modal
      const gearButton = screen.getByRole('button', { name: /einstellungen/i })
      await user.click(gearButton)

      // Close modal
      const closeBtn = screen.getByRole('button', { name: '' }) // X button in modal header
      await user.click(closeBtn)

      // Modal should be hidden
      await waitFor(() => {
        expect(screen.queryByText('Einstellungen & Verwaltung')).not.toBeInTheDocument()
      })
    })
  })
```

Add import for userEvent and waitFor:

```typescript
import userEvent from '@testing-library/user-event'
import { waitFor } from '@testing-library/react'
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- ShiftEditor.test.tsx --reporter=verbose
```

Expected: Tests fail because showSettings state doesn't exist.

- [ ] **Step 3: Add state and wire up modal**

In ShiftEditor.tsx, add state after line 58:

```typescript
  const [showSettings, setShowSettings] = useState(false)
```

Update the gear button onClick (in header, modify from placeholder):

```typescript
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="p-2 rounded hover:bg-gray-100 text-gray-600 transition-colors flex-shrink-0"
              title="Einstellungen"
              aria-label="Einstellungen"
            >
              ⚙️
            </button>
```

Add ShiftEditorSettings component before the closing fragment (before line 374):

```typescript
    {showSettings && (
      <ShiftEditorSettings
        open={true}
        onClose={() => setShowSettings(false)}
        employeeName={employeeName}
        date={date} // Need to extract from props or use current day
        department={department ?? 'dept_default'}
        employeeId={/* Extract from Employee context or pass as prop */}
      />
    )}
```

Wait, we need to get the date for the settings modal. Add `date` prop to ShiftEditor Props interface if not already there. Actually, looking at the current code, it doesn't have a `date` prop. Let's use the context from the Dienstplan view. For now, assume we'll pass it:

Actually looking back at the props, there's no date. But we can construct it. Let me check what props are available...

Looking at the interface (line 29-40), there's no date. We'll need to add it or derive it. For this task, let's add it:

```typescript
interface Props {
  open:          boolean
  onClose:       () => void
  onSave:        (data: ShiftEditorData) => void
  onDelete?:     () => void
  employeeName:  string
  dayLabel:      string
  initial?:      Partial<ShiftEditorData>
  isEdit?:       boolean
  absence?:      Absence
  department?:   string
  date?:         string        // Add this: ISO date like "2026-06-25"
  employeeId?:   string        // Add this: Employee ID for settings modal
}
```

Then use:

```typescript
    {showSettings && date && employeeId && (
      <ShiftEditorSettings
        open={true}
        onClose={() => setShowSettings(false)}
        employeeName={employeeName}
        date={date}
        department={department ?? 'dept_default'}
        employeeId={employeeId}
      />
    )}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- ShiftEditor.test.tsx --reporter=verbose
```

Expected: Both modal tests pass.

- [ ] **Step 5: Commit**

```bash
git add chef-app/src/components/Dienstplan/ShiftEditor.tsx
git add chef-app/src/components/Dienstplan/__tests__/ShiftEditor.test.tsx
git commit -m "feat: integrate settings modal into ShiftEditor

- Add showSettings state for modal visibility
- Wire gear icon button to open/close modal
- Pass required props to ShiftEditorSettings (date, employeeId)
- Add date and employeeId to component Props interface

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Split Quick Select into Two Sections

**Files:**
- Modify: `chef-app/src/components/Dienstplan/ShiftEditor.tsx:149-157`
- Create: `chef-app/src/components/Dienstplan/QuickSelectSections.tsx` (new component)
- Modify: `chef-app/src/components/Dienstplan/__tests__/ShiftEditor.test.tsx` (add tests)

**Interfaces:**
- Consumes: `templates` from `useShiftTemplates`, `onSelect` callback
- Produces: Two-section UI: Section 1 "Quick Select" (Frei + templates), Section 2 "Abwesenheiten" (K, U, S, AT buttons)

**Context:** Replace the current ShiftTemplateQuickButtons with a new 2-section layout:
- Section 1: "Quick Select" with 🌴 Frei button + template buttons
- Section 2: "Abwesenheiten" with 4 absence type buttons (styled per ABSENCE_COLORS)

- [ ] **Step 1: Write failing tests**

Add to ShiftEditor.test.tsx (new describe block):

```typescript
  describe('Quick Select Sections', () => {
    it('renders Quick Select section with Frei button and templates', () => {
      const mockTemplates = [
        {
          id: 'tmpl1',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z',
          department: 'dept_1',
          name: 'Frühschicht',
          start_time: '06:00',
          end_time: '14:00',
          color: 'blue',
        },
      ]

      // Mock useShiftTemplates
      vi.mocked(useShiftTemplates).mockReturnValue({
        templates: mockTemplates,
        loading: false,
        error: null,
        refetch: vi.fn(),
        save: vi.fn(),
        update: vi.fn(),
        deleteTemplate: vi.fn(),
      })

      render(
        <ShiftEditor
          open={true}
          onClose={() => {}}
          onSave={() => {}}
          employeeName="Max Mustermann"
          dayLabel="Mi, 25.06.2026"
          department="dept_1"
        />
      )

      // Check Quick Select section
      expect(screen.getByText('Quick Select')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /frei/i })).toBeInTheDocument()
      expect(screen.getByText('Frühschicht')).toBeInTheDocument()
    })

    it('renders Abwesenheiten section with 4 absence types', () => {
      vi.mocked(useShiftTemplates).mockReturnValue({
        templates: [],
        loading: false,
        error: null,
        refetch: vi.fn(),
        save: vi.fn(),
        update: vi.fn(),
        deleteTemplate: vi.fn(),
      })

      render(
        <ShiftEditor
          open={true}
          onClose={() => {}}
          onSave={() => {}}
          employeeName="Max Mustermann"
          dayLabel="Mi, 25.06.2026"
          department="dept_1"
        />
      )

      expect(screen.getByText('Abwesenheiten')).toBeInTheDocument()
      expect(screen.getByText(/🏥/)).toBeInTheDocument()  // Krank
      expect(screen.getByText(/✈️/)).toBeInTheDocument()  // Urlaub
      expect(screen.getByText(/📚/)).toBeInTheDocument()  // Schulung
      expect(screen.getByText(/🩺/)).toBeInTheDocument()  // Arzttermin
    })

    it('calls onSave with correct data when absence button is clicked', async () => {
      const user = userEvent.setup()
      const mockOnSave = vi.fn()

      vi.mocked(useShiftTemplates).mockReturnValue({
        templates: [],
        loading: false,
        error: null,
        refetch: vi.fn(),
        save: vi.fn(),
        update: vi.fn(),
        deleteTemplate: vi.fn(),
      })

      render(
        <ShiftEditor
          open={true}
          onClose={() => {}}
          onSave={mockOnSave}
          employeeName="Max Mustermann"
          dayLabel="Mi, 25.06.2026"
          department="dept_1"
        />
      )

      // Click Krank button
      const krankButton = screen.getByRole('button', { name: /🏥 Krank/ })
      await user.click(krankButton)

      // Should call onSave with absence type K
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          note: expect.stringMatching(/Krank/)
        })
      )
    })
  })
```

Add import for useShiftTemplates mock:

```typescript
vi.mock('../../../hooks/useShiftTemplates', () => ({
  useShiftTemplates: vi.fn(),
}))
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- ShiftEditor.test.tsx --reporter=verbose
```

Expected: Tests fail because "Quick Select" section doesn't exist.

- [ ] **Step 3: Create QuickSelectSections component**

Create new file `chef-app/src/components/Dienstplan/QuickSelectSections.tsx`:

```typescript
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ABSENCE_COLORS, ABSENCE_LABELS, type ShiftTemplate, type ShiftColor } from '@shared/types'

interface QuickSelectSectionsProps {
  templates: ShiftTemplate[]
  onSelectTemplate: (id: string, data: { start_time: string; end_time: string; color: ShiftColor; is_free_day?: boolean }) => void
  onSelectAbsence: (absence_type: string) => void
}

const ABSENCE_QUICK_SELECT = [
  { type: 'K', emoji: '🏥', label: 'Krank' },
  { type: 'U', emoji: '✈️', label: 'Urlaub' },
  { type: 'S', emoji: '📚', label: 'Schulung' },
  { type: 'AT', emoji: '🩺', label: 'Arzttermin' },
]

export default function QuickSelectSections({
  templates,
  onSelectTemplate,
  onSelectAbsence,
}: QuickSelectSectionsProps) {
  return (
    <div className="space-y-4">
      {/* Section 1: Quick Select */}
      <div>
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
          Quick Select
        </h3>
        <div className="flex flex-wrap gap-2">
          {/* Frei Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSelectTemplate('free', { start_time: '00:00', end_time: '00:00', color: 'blue', is_free_day: true })}
            className="text-sm"
          >
            🌴 Frei
          </Button>

          {/* Template Buttons */}
          {templates.map((template) => (
            <Button
              key={template.id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSelectTemplate(template.id, { start_time: template.start_time, end_time: template.end_time, color: template.color })}
              className="text-sm"
              title={`${template.start_time} - ${template.end_time}`}
            >
              {template.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Section 2: Abwesenheiten */}
      <div>
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
          Abwesenheiten
        </h3>
        <div className="flex flex-wrap gap-2">
          {ABSENCE_QUICK_SELECT.map(({ type, emoji, label }) => {
            const colors = ABSENCE_COLORS[type as keyof typeof ABSENCE_COLORS]
            return (
              <button
                key={type}
                type="button"
                onClick={() => onSelectAbsence(type)}
                className="px-3 py-1.5 rounded text-sm font-medium transition-all hover:shadow-sm border"
                style={{
                  background: colors.bg,
                  color: colors.text,
                  borderColor: colors.text + '44',
                }}
                title={label}
              >
                {emoji} {label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update ShiftEditor to use QuickSelectSections**

In ShiftEditor.tsx, replace the ShiftTemplateQuickButtons section (lines 150-156):

First, update imports (add at top):

```typescript
import QuickSelectSections from './QuickSelectSections'
```

Then replace the QuickButtons component call:

```typescript
        {/* Quick-Buttons: Templates + Absences */}
        {!templatesLoading && (
          <QuickSelectSections
            templates={templates}
            onSelectTemplate={(id, data) => {
              if (data.is_free_day) {
                onSave({ start_time: '00:00', end_time: '00:00', color: 'blue', is_free_day: true })
              } else {
                onSave({ start_time: data.start_time, end_time: data.end_time, color: data.color, is_free_day: false })
              }
              onClose()
            }}
            onSelectAbsence={(absence_type) => {
              const label = ABSENCE_LABELS[absence_type as AbsenceType] ?? absence_type
              onSave({ start_time: '00:00', end_time: '00:00', color: 'blue', is_free_day: false, note: label })
              onClose()
            }}
          />
        )}
```

Remove the old ShiftTemplateQuickButtons component if not used elsewhere.

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- ShiftEditor.test.tsx --reporter=verbose
```

Expected: All Quick Select section tests pass.

- [ ] **Step 6: Commit**

```bash
git add chef-app/src/components/Dienstplan/ShiftEditor.tsx
git add chef-app/src/components/Dienstplan/QuickSelectSections.tsx
git add chef-app/src/components/Dienstplan/__tests__/ShiftEditor.test.tsx
git commit -m "feat: split quick select into two sections

- Section 1: Quick Select (🌴 Frei + shift templates)
- Section 2: Abwesenheiten (🏥 K, ✈️ U, 📚 S, 🩺 AT)
- Each absence button styled with ABSENCE_COLORS
- Clicking buttons triggers onSave with correct data types

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Shift 2 Expandable Section

**Files:**
- Modify: `chef-app/src/components/Dienstplan/ShiftEditor.tsx:273-329`
- Modify: `chef-app/src/components/Dienstplan/__tests__/ShiftEditor.test.tsx` (add expand/collapse tests)

**Interfaces:**
- Consumes: existing `showSplit` state + fields (startTime2, endTime2, color2, note2)
- Produces: expanded UI with indigo-50 background, Delete button for shift 2

**Context:** The Task 7 is about making the UI more polished. The backend state already exists (showSplit, startTime2, etc.). We need to improve the expand/collapse button styling and ensure delete button works.

- [ ] **Step 1: Write failing tests for expand/collapse**

Add to ShiftEditor.test.tsx:

```typescript
  describe('Shift 2 Expandable Section', () => {
    it('shows expand button initially', () => {
      render(
        <ShiftEditor
          open={true}
          onClose={() => {}}
          onSave={() => {}}
          employeeName="Max Mustermann"
          dayLabel="Mi, 25.06.2026"
          department="dept_1"
        />
      )

      expect(screen.getByText(/Zweite Teilschicht hinzufügen/)).toBeInTheDocument()
    })

    it('expands shift 2 section when button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ShiftEditor
          open={true}
          onClose={() => {}}
          onSave={() => {}}
          employeeName="Max Mustermann"
          dayLabel="Mi, 25.06.2026"
          department="dept_1"
        />
      )

      const expandBtn = screen.getByText(/Zweite Teilschicht hinzufügen/)
      await user.click(expandBtn)

      // Should show shift 2 fields
      await waitFor(() => {
        expect(screen.getByText(/Zweite Teilschicht entfernen/)).toBeInTheDocument()
      })

      // Should have Beginn2 and Ende2 inputs
      const inputs = screen.getAllByRole('textbox', { hidden: true })
      expect(inputs.length).toBeGreaterThanOrEqual(4) // start, end, start2, end2
    })

    it('collapses shift 2 section when button is clicked again', async () => {
      const user = userEvent.setup()
      render(
        <ShiftEditor
          open={true}
          onClose={() => {}}
          onSave={() => {}}
          employeeName="Max Mustermann"
          dayLabel="Mi, 25.06.2026"
          initial={{ start_time: '08:00', end_time: '16:00', color: 'blue', start_time2: '18:00', end_time2: '23:00', color2: 'purple' }}
        />
      )

      const collapseBtn = screen.getByText(/Zweite Teilschicht entfernen/)
      await user.click(collapseBtn)

      // Should show expand button again
      expect(screen.getByText(/Zweite Teilschicht hinzufügen/)).toBeInTheDocument()
    })

    it('saves both shifts when Shift 2 is active', async () => {
      const user = userEvent.setup()
      const mockOnSave = vi.fn()

      render(
        <ShiftEditor
          open={true}
          onClose={() => {}}
          onSave={mockOnSave}
          employeeName="Max Mustermann"
          dayLabel="Mi, 25.06.2026"
          department="dept_1"
          initial={{ start_time: '08:00', end_time: '16:00', color: 'blue', start_time2: '18:00', end_time2: '23:00', color2: 'purple' }}
        />
      )

      const saveBtn = screen.getByRole('button', { name: /Speichern/ })
      await user.click(saveBtn)

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          start_time: '08:00',
          end_time: '16:00',
          start_time2: '18:00',
          end_time2: '23:00',
          color2: 'purple',
        })
      )
    })
  })
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- ShiftEditor.test.tsx --reporter=verbose
```

Expected: Tests fail because expand/collapse button text doesn't match or section isn't styled correctly.

- [ ] **Step 3: Improve expand/collapse button and styling**

Update the split-schicht toggle section (lines 273-283) to have better styling and emojis:

```typescript
              {/* Split-Schicht Toggle */}
              <div className="border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSplit(v => !v)}
                  className={cn(
                    'flex items-center gap-2 text-sm font-medium transition-all',
                    showSplit 
                      ? 'text-indigo-600 hover:text-indigo-700' 
                      : 'text-gray-600 hover:text-indigo-600'
                  )}
                >
                  <span className={cn('transition-transform text-lg', showSplit ? 'rotate-90' : '')}>
                    {showSplit ? '➖' : '➕'}
                  </span>
                  {showSplit ? 'Zweite Schicht entfernen' : '➕ Zweite Schicht hinzufügen'}
                </button>
              </div>
```

Update the Shift 2 section (lines 288-329) to improve styling:

```typescript
          {/* Schicht 2 */}
          {!isFreeDay && showSplit && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-3 mt-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-indigo-700">✂️ Zweite Teilschicht</p>
                <button
                  type="button"
                  onClick={() => setShowSplit(false)}
                  className="p-1 rounded hover:bg-indigo-200 text-indigo-600 transition-colors text-sm"
                  title="Löschen"
                >
                  Entfernen
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-gray-500 uppercase tracking-wide">Beginn2</Label>
                  <Input type="time" value={startTime2} onChange={e => setStartTime2(e.target.value)} className="mt-0.5" />
                </div>
                <div>
                  <Label className="text-[11px] text-gray-500 uppercase tracking-wide">Ende2</Label>
                  <Input type="time" value={endTime2} onChange={e => setEndTime2(e.target.value)} className="mt-0.5" />
                </div>
              </div>
              <div>
                <Label className="text-[11px] text-gray-500 uppercase tracking-wide">Hinweis2</Label>
                <Input
                  value={note2}
                  onChange={e => setNote2(e.target.value)}
                  placeholder="Abenddienst…"
                  className="mt-0.5"
                />
              </div>
              <div>
                <Label className="text-[11px] text-gray-500 uppercase tracking-wide">Farbe2</Label>
                <div className="flex gap-2 mt-1">
                  {SHIFT_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor2(c)}
                      className={cn(
                        'w-6 h-6 rounded-full border-2 transition-transform',
                        color2 === c ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105',
                      )}
                      style={{ background: SHIFT_COLOR_BG[c] }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- ShiftEditor.test.tsx --reporter=verbose
```

Expected: All expand/collapse tests pass.

- [ ] **Step 5: Commit**

```bash
git add chef-app/src/components/Dienstplan/ShiftEditor.tsx
git add chef-app/src/components/Dienstplan/__tests__/ShiftEditor.test.tsx
git commit -m "feat: improve shift 2 expandable section styling

- Use emoji toggles (➕/➖) for expand/collapse button
- Style button with indigo theme for active state
- Add 'Entfernen' button in shift 2 header
- Improve indigo-50 background and border styling
- Add consistent field labels (Beginn2, Ende2, Hinweis2, Farbe2)

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Integration Testing

**Files:**
- Create: `chef-app/src/components/Dienstplan/__tests__/ShiftEditor.integration.test.tsx`

**Interfaces:**
- Consumes: Full ShiftEditor component + mocked hooks
- Produces: 3 integration tests covering key workflows

**Context:** Integration tests verify end-to-end workflows that span multiple components or features.

- [ ] **Step 1: Write integration tests**

Create `chef-app/src/components/Dienstplan/__tests__/ShiftEditor.integration.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { ShiftTemplate, Absence } from '@shared/types'
import ShiftEditor from '../ShiftEditor'

// Mock hooks
vi.mock('../../../hooks/useShiftTemplates', () => ({
  useShiftTemplates: vi.fn(),
}))

import { useShiftTemplates } from '../../../hooks/useShiftTemplates'

describe('ShiftEditor Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock pb global
    global.pb = {
      collection: vi.fn(() => ({
        getFullList: vi.fn().mockResolvedValue([]),
      })),
    } as any
  })

  // ── Integration Test 1: Template → Quick Select → Save Workflow ────────────

  it('creates template in settings modal, then uses it to schedule a shift', async () => {
    const user = userEvent.setup()
    const mockOnSave = vi.fn()
    const mockTemplates: ShiftTemplate[] = []

    let savedTemplates = [...mockTemplates]
    const mockSaveTemplate = vi.fn(async (data) => {
      savedTemplates.push({
        id: `tmpl_${Date.now()}`,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        ...data,
      } as ShiftTemplate)
    })

    vi.mocked(useShiftTemplates).mockReturnValue({
      templates: savedTemplates,
      loading: false,
      error: null,
      refetch: vi.fn(),
      save: mockSaveTemplate,
      update: vi.fn(),
      deleteTemplate: vi.fn(),
    })

    const { rerender } = render(
      <ShiftEditor
        open={true}
        onClose={() => {}}
        onSave={mockOnSave}
        employeeName="Max Mustermann"
        dayLabel="Mi, 25.06.2026"
        department="dept_1"
        employeeId="emp_123"
        date="2026-06-25"
      />
    )

    // 1. Open settings modal
    const gearButton = screen.getByRole('button', { name: /einstellungen/i })
    await user.click(gearButton)

    // 2. Switch to Templates tab (should already be active)
    expect(screen.getByText('⚙️ Templates')).toBeInTheDocument()

    // 3. Create a new template
    const nameInput = screen.getByLabelText('Name')
    const startInput = screen.getByLabelText('Beginn (HH:mm)')
    const endInput = screen.getByLabelText('Ende (HH:mm)')

    await user.type(nameInput, 'Frühschicht')
    await user.type(startInput, '06:00')
    await user.type(endInput, '14:00')

    const submitBtn = screen.getByText('Template erstellen')
    await user.click(submitBtn)

    // Wait for template to be saved
    await waitFor(() => {
      expect(mockSaveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Frühschicht',
          start_time: '06:00',
          end_time: '14:00',
        })
      )
    })

    // 4. Close settings modal
    const closeBtn = screen.getByRole('button', { name: '' }) // X button
    await user.click(closeBtn)

    // 5. Rerender to pick up new templates
    vi.mocked(useShiftTemplates).mockReturnValue({
      templates: savedTemplates,
      loading: false,
      error: null,
      refetch: vi.fn(),
      save: mockSaveTemplate,
      update: vi.fn(),
      deleteTemplate: vi.fn(),
    })

    rerender(
      <ShiftEditor
        open={true}
        onClose={() => {}}
        onSave={mockOnSave}
        employeeName="Max Mustermann"
        dayLabel="Mi, 25.06.2026"
        department="dept_1"
        employeeId="emp_123"
        date="2026-06-25"
      />
    )

    // 6. Template should now appear in Quick Select
    await waitFor(() => {
      expect(screen.getByText('Frühschicht')).toBeInTheDocument()
    })

    // 7. Click template to schedule
    const frühschichtBtn = screen.getByText('Frühschicht')
    await user.click(frühschichtBtn)

    // 8. Should call onSave with template data
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        start_time: '06:00',
        end_time: '14:00',
        is_free_day: false,
      })
    )
  })

  // ── Integration Test 2: Multi-Shift Workflow ──────────────────────────────

  it('schedules both shifts (Schicht 1 + 2) and saves them together', async () => {
    const user = userEvent.setup()
    const mockOnSave = vi.fn()

    vi.mocked(useShiftTemplates).mockReturnValue({
      templates: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      deleteTemplate: vi.fn(),
    })

    render(
      <ShiftEditor
        open={true}
        onClose={() => {}}
        onSave={mockOnSave}
        employeeName="Max Mustermann"
        dayLabel="Mi, 25.06.2026"
        department="dept_1"
      />
    )

    // 1. Ensure Freier Tag is NOT checked (so shift fields show)
    const freierTagCheckbox = screen.getByRole('checkbox', { name: /Freier Tag/i })
    if (freierTagCheckbox.checked) {
      await user.click(freierTagCheckbox)
    }

    // 2. Set Shift 1 times
    const startInputs = screen.getAllByDisplayValue('08:00')
    const endInputs = screen.getAllByDisplayValue('16:00')

    // Shift 1
    await user.clear(startInputs[0])
    await user.type(startInputs[0], '08:30')

    await user.clear(endInputs[0])
    await user.type(endInputs[0], '15:30')

    // 3. Expand Shift 2
    const expandBtn = screen.getByText(/Zweite Schicht hinzufügen/)
    await user.click(expandBtn)

    // 4. Set Shift 2 times (Beginn2, Ende2)
    await waitFor(() => {
      expect(screen.getByText(/Zweite Schicht entfernen/)).toBeInTheDocument()
    })

    const startInputs2 = screen.getAllByDisplayValue('18:00')
    const endInputs2 = screen.getAllByDisplayValue('23:00')

    await user.clear(startInputs2[0])
    await user.type(startInputs2[0], '17:00')

    await user.clear(endInputs2[0])
    await user.type(endInputs2[0], '22:00')

    // 5. Save
    const saveBtn = screen.getByRole('button', { name: /Speichern/ })
    await user.click(saveBtn)

    // 6. Verify both shifts are in save data
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        start_time: '08:30',
        end_time: '15:30',
        start_time2: '17:00',
        end_time2: '22:00',
      })
    )
  })

  // ── Integration Test 3: Settings Modal Interaction ──────────────────────────

  it('opens settings modal, views absences tab, and closes without affecting shift data', async () => {
    const user = userEvent.setup()
    const mockOnSave = vi.fn()

    const mockAbsences = [
      {
        id: 'abs1',
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z',
        employee: 'emp_123',
        date_from: '2026-06-25',
        date_to: '2026-06-27',
        type: 'U' as const,
        status: 'approved' as const,
        created_by: 'user1',
      },
    ]

    // Mock pb
    global.pb = {
      collection: vi.fn((name) => {
        if (name === 'absences') {
          return {
            getFullList: vi.fn().mockResolvedValue(mockAbsences),
          }
        }
        return { getFullList: vi.fn().mockResolvedValue([]) }
      }),
    } as any

    vi.mocked(useShiftTemplates).mockReturnValue({
      templates: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      deleteTemplate: vi.fn(),
    })

    render(
      <ShiftEditor
        open={true}
        onClose={() => {}}
        onSave={mockOnSave}
        employeeName="Max Mustermann"
        dayLabel="Mi, 25.06.2026"
        department="dept_1"
        employeeId="emp_123"
        date="2026-06-25"
      />
    )

    // 1. Open settings
    const gearBtn = screen.getByRole('button', { name: /einstellungen/i })
    await user.click(gearBtn)

    // 2. Switch to Absences tab
    const absencesTab = screen.getByText('📅 Abwesenheiten')
    await user.click(absencesTab)

    // 3. Verify absence is displayed
    await waitFor(() => {
      expect(screen.getByText('Urlaub')).toBeInTheDocument()
    })

    // 4. Close settings
    const closeBtn = screen.getByRole('button', { name: '' })
    await user.click(closeBtn)

    // 5. Verify shift editor is still open and ready to save
    expect(screen.getByRole('button', { name: /Speichern/ })).toBeInTheDocument()

    // 6. Modify and save shift
    const startInputs = screen.getAllByDisplayValue('08:00')
    await user.clear(startInputs[0])
    await user.type(startInputs[0], '10:00')

    const saveBtn = screen.getByRole('button', { name: /Speichern/ })
    await user.click(saveBtn)

    // 7. onSave should be called with updated shift
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        start_time: '10:00',
      })
    )
  })
})
```

- [ ] **Step 2: Run integration tests to verify they pass**

```bash
npm test -- ShiftEditor.integration.test.tsx --reporter=verbose
```

Expected: All 3 integration tests pass.

- [ ] **Step 3: Commit**

```bash
git add chef-app/src/components/Dienstplan/__tests__/ShiftEditor.integration.test.tsx
git commit -m "test: add integration tests for ShiftEditor workflows

- Test 1: Create template in settings → use in quick select → save shift
- Test 2: Schedule multi-shift (Shift 1 + 2) and save together
- Test 3: Open settings, view absences, close, modify shift, save

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Manual E2E Verification

**Files:**
- None (verification task)

**Workflow:** Start dev server, test 4 key workflows manually, verify responsive design.

- [ ] **Step 1: Start dev server**

```bash
cd /Users/ronnybeckmann/Projects/times/chef-app
npm run dev
```

Expected: Dev server starts on `http://localhost:5173` (or similar port).

- [ ] **Step 2: Test Workflow 1 - Quick Select + Frei**

1. Navigate to Dienstplan
2. Click on a day to open ShiftEditor
3. Click "🌴 Frei" button
4. Verify: Dialog closes, day is marked as free day (with "F" visual)

- [ ] **Step 3: Test Workflow 2 - Quick Select + Absence**

1. Click another day to open ShiftEditor
2. Click "🏥 Krank" button
3. Verify: Dialog closes, shift shows "Krank" in note with red styling (ABSENCE_COLORS[K])

- [ ] **Step 4: Test Workflow 3 - Create Template + Use It**

1. Open ShiftEditor
2. Click gear icon (⚙️) to open settings modal
3. Switch to "⚙️ Templates" tab
4. Create new template: "Mittag" (12:00 - 18:00, green)
5. Click "Template erstellen"
6. Switch to "📅 Abwesenheiten" tab, verify absences load
7. Close modal
8. Verify "Mittag" button appears in Quick Select
9. Click "Mittag" button
10. Verify: Shift saved with 12:00-18:00, green color

- [ ] **Step 5: Test Workflow 4 - Multi-Shift**

1. Open ShiftEditor
2. Set Schicht 1: 06:00 - 14:00 (blue)
3. Click "➕ Zweite Schicht hinzufügen"
4. Set Schicht 2: 18:00 - 23:00 (purple)
5. Click "Speichern"
6. Verify: Day shows both shifts stacked

- [ ] **Step 6: Test Responsive Design**

1. Resize browser to mobile width (375px)
2. Open ShiftEditor
3. Verify: Quick Select buttons wrap properly
4. Verify: Header still shows 2 lines (title + employee info)
5. Verify: Shift inputs remain usable
6. Verify: Settings modal is full-width with proper padding

- [ ] **Step 7: Commit (empty commit with verification note)**

```bash
git commit --allow-empty -m "test: manual E2E verification complete

- Workflow 1: Quick Select Frei button works ✓
- Workflow 2: Quick Select Absence buttons work ✓
- Workflow 3: Create template, view absences, use template ✓
- Workflow 4: Multi-shift scheduling works ✓
- Responsive design verified on mobile ✓

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Stop dev server**

Press `Ctrl+C` to stop the dev server.

---

## Summary Checklist

- [ ] Task 3: AbsencesTab component with tests ✓
- [ ] Task 4: Header refactor (2 lines + gear icon) ✓
- [ ] Task 5: Settings modal toggle integration ✓
- [ ] Task 6: Quick Select split into 2 sections ✓
- [ ] Task 7: Shift 2 expandable with improved styling ✓
- [ ] Task 8: Integration tests (3 workflows) ✓
- [ ] Task 9: Manual E2E verification ✓
- [ ] All tests passing (unit + integration)
- [ ] All commits created with conventional format

---

## Notes for Implementation

1. **Test Imports:** Each test file needs proper mocks for `useShiftTemplates` and `pb` global.
2. **Absence Colors:** Always reference `ABSENCE_COLORS` and `ABSENCE_LABELS` from `@shared/types`.
3. **Shift Colors:** Always use `SHIFT_COLOR_BG` and `ShiftColor` type from shared types.
4. **Styling:** Use Tailwind CSS with shadcn/ui components; follow existing indigo theme (#4F46E5).
5. **Error Handling:** Absences API can fail; catch and display error state in AbsencesTab.
6. **Modal Responsive:** Ensure ShiftEditorSettings modal scales down gracefully on mobile.
7. **Date Format:** ISO dates (YYYY-MM-DD) for API; use Intl.DateTimeFormat for display (German locale).
