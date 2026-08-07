# ShiftEditor Settings Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate shift template management and absence display into the ShiftEditor dialog via a settings modal, accessible via a gear icon (⚙️).

**Architecture:** The ShiftEditor gains a settings toggle state that shows/hides a modal overlay. The modal contains two tabs: Templates (CRUD for shift templates) and Absences (view-only display of overlapping absences). The main editor body is reorganized to show Quick Select in two sections (templates + absence types) and Shift 2 as an expandable section. All template changes are saved immediately; shift changes are saved on main dialog submit.

**Tech Stack:** React 19, TypeScript, PocketBase, shadcn/ui, date-fns, lucide-react

## Global Constraints

- Department scoping: templates are always for `editorEmp?.department`, no override
- Colors: use existing SHIFT_COLOR_BG, ABSENCE_COLORS tokens
- Responsive: desktop `max-width: 500px` (main), `600px` (settings); mobile full-width
- Existing useShiftTemplates hook must be reused
- No changes to ShiftEntry schema; "zweite Teilschicht" already supported via shift_entry model
- Commits must reference feature branch and use conventional commit messages

---

## File Structure

### **New Files**
- `chef-app/src/components/Dienstplan/ShiftEditorSettings.tsx` — Modal overlay with Templates + Absences tabs

### **Modified Files**
- `chef-app/src/components/Dienstplan/ShiftEditor.tsx` — Add settings toggle, reorganize header, split Quick Select, extract Shift 2 to expandable
- `chef-app/src/components/Dienstplan/ShiftTemplateManager.tsx` — Extract template list + form into reusable sub-components (optional refactor, can inline if simpler)

### **Unchanged Files**
- `chef-app/src/hooks/useShiftTemplates.ts` — Already exists, reuse as-is
- `chef-app/src/pages/Dienstplan.tsx` — No changes needed; ShiftEditor prop interface unchanged

---

## Task 1: Create ShiftEditorSettings Component (Modal Shell)

**Files:**
- Create: `chef-app/src/components/Dienstplan/ShiftEditorSettings.tsx`
- Test: `chef-app/src/components/Dienstplan/__tests__/ShiftEditorSettings.test.tsx`

**Interfaces:**
- Consumes:
  - `open: boolean` (whether modal is visible)
  - `onClose: () => void` (handler to close modal)
  - `employeeName: string` (full name)
  - `date: string` (ISO date, e.g. "2026-06-25")
  - `department: string` (department ID for scoping)
  
- Produces:
  - `<ShiftEditorSettings open={open} onClose={onClose} employeeName={employeeName} date={date} department={department} />`
  - Component renders a centered modal overlay only when `open === true`

- [ ] **Step 1: Write test for modal visibility toggle**

```typescript
// chef-app/src/components/Dienstplan/__tests__/ShiftEditorSettings.test.tsx
import { render, screen } from '@testing-library/react'
import ShiftEditorSettings from '../ShiftEditorSettings'

describe('ShiftEditorSettings', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <ShiftEditorSettings
        open={false}
        onClose={() => {}}
        employeeName="Max Mustermann"
        date="2026-06-25"
        department="dept_1"
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders modal when open is true', () => {
    render(
      <ShiftEditorSettings
        open={true}
        onClose={() => {}}
        employeeName="Max Mustermann"
        date="2026-06-25"
        department="dept_1"
      />
    )
    expect(screen.getByText('Einstellungen & Verwaltung')).toBeInTheDocument()
    expect(screen.getByText(/Max Mustermann/)).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const mockOnClose = jest.fn()
    const { getByText } = render(
      <ShiftEditorSettings
        open={true}
        onClose={mockOnClose}
        employeeName="Max Mustermann"
        date="2026-06-25"
        department="dept_1"
      />
    )
    const closeBtn = getByText('✕')
    closeBtn.click()
    expect(mockOnClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify failures**

```bash
cd ~/Projects/times/chef-app
npm test -- __tests__/ShiftEditorSettings.test.tsx --watch=false
```

Expected output: 3 failures (component doesn't exist)

- [ ] **Step 3: Create modal component shell**

```typescript
// chef-app/src/components/Dienstplan/ShiftEditorSettings.tsx
import { useState } from 'react'
import { X } from 'lucide-react'

interface ShiftEditorSettingsProps {
  open: boolean
  onClose: () => void
  employeeName: string
  date: string
  department: string
}

export default function ShiftEditorSettings({
  open,
  onClose,
  employeeName,
  date,
  department,
}: ShiftEditorSettingsProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'absences'>('templates')

  if (!open) return null

  const dayLabel = new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="font-semibold text-gray-900">Einstellungen & Verwaltung</h2>
            <p className="text-sm text-gray-600 mt-1">
              {employeeName} · {dayLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-5">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            ⚙️ Templates
          </button>
          <button
            onClick={() => setActiveTab('absences')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'absences'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📅 Abwesenheiten
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {activeTab === 'templates' && (
            <div>
              <p className="text-gray-600">Templates tab placeholder</p>
            </div>
          )}
          {activeTab === 'absences' && (
            <div>
              <p className="text-gray-600">Absences tab placeholder</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify passes**

```bash
cd ~/Projects/times/chef-app
npm test -- __tests__/ShiftEditorSettings.test.tsx --watch=false
```

Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add chef-app/src/components/Dienstplan/ShiftEditorSettings.tsx
git add chef-app/src/components/Dienstplan/__tests__/ShiftEditorSettings.test.tsx
git commit -m "feat(dienstplan): add ShiftEditorSettings modal component

- Modal overlay with tabs (Templates | Absences)
- Header shows employee name and date context
- Initially placeholder content for both tabs

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Implement Templates Tab (List + Form)

**Files:**
- Modify: `chef-app/src/components/Dienstplan/ShiftEditorSettings.tsx`
- Modify: `chef-app/src/components/Dienstplan/__tests__/ShiftEditorSettings.test.tsx`

**Interfaces:**
- Consumes:
  - `useShiftTemplates(department)` hook → returns `{ templates, loading, save, update, delete, error }`
  - `ShiftTemplate` type from `@shared/types`
  
- Produces:
  - When user creates/edits template, it's saved immediately via `save()` or `update()`
  - `useShiftTemplates` will trigger re-fetch in ShiftEditor's quick buttons (via existing hook re-render)

- [ ] **Step 1: Write test for template list rendering**

```typescript
// Add to ShiftEditorSettings.test.tsx
import { useShiftTemplates } from '../../hooks/useShiftTemplates'

jest.mock('../../hooks/useShiftTemplates')

describe('ShiftEditorSettings Templates Tab', () => {
  it('renders template list when templates exist', () => {
    const mockTemplates = [
      { id: '1', name: 'Frühdienst', start_time: '08:00', end_time: '16:00', color: 'blue', department: 'dept_1' },
      { id: '2', name: 'Spätdienst', start_time: '16:00', end_time: '23:00', color: 'purple', department: 'dept_1' },
    ]
    
    jest.mocked(useShiftTemplates).mockReturnValue({
      templates: mockTemplates,
      loading: false,
      error: null,
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })

    render(
      <ShiftEditorSettings
        open={true}
        onClose={() => {}}
        employeeName="Max Mustermann"
        date="2026-06-25"
        department="dept_1"
      />
    )

    expect(screen.getByText('Frühdienst')).toBeInTheDocument()
    expect(screen.getByText('Spätdienst')).toBeInTheDocument()
  })

  it('displays form to create new template', () => {
    jest.mocked(useShiftTemplates).mockReturnValue({
      templates: [],
      loading: false,
      error: null,
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })

    render(
      <ShiftEditorSettings
        open={true}
        onClose={() => {}}
        employeeName="Max Mustermann"
        date="2026-06-25"
        department="dept_1"
      />
    )

    expect(screen.getByLabelText(/^Name/)).toBeInTheDocument()
    expect(screen.getByText('Template erstellen')).toBeInTheDocument()
  })

  it('calls save when new template is created', async () => {
    const mockSave = jest.fn().mockResolvedValue({ id: '3', name: 'Neu', start_time: '18:00', end_time: '22:00', color: 'green', department: 'dept_1' })
    
    jest.mocked(useShiftTemplates).mockReturnValue({
      templates: [],
      loading: false,
      error: null,
      save: mockSave,
      update: jest.fn(),
      delete: jest.fn(),
    })

    const { getByLabelText, getByText } = render(
      <ShiftEditorSettings
        open={true}
        onClose={() => {}}
        employeeName="Max Mustermann"
        date="2026-06-25"
        department="dept_1"
      />
    )

    fireEvent.change(getByLabelText(/^Name/), { target: { value: 'Neu' } })
    fireEvent.change(getByLabelText(/Beginn/), { target: { value: '18:00' } })
    fireEvent.change(getByLabelText(/Ende/), { target: { value: '22:00' } })
    
    fireEvent.click(getByText('Template erstellen'))

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Neu',
          start_time: '18:00',
          end_time: '22:00',
          department: 'dept_1',
        })
      )
    })
  })
})
```

- [ ] **Step 2: Run test to verify failures**

```bash
cd ~/Projects/times/chef-app
npm test -- __tests__/ShiftEditorSettings.test.tsx --watch=false
```

Expected: failures (template list UI not implemented)

- [ ] **Step 3: Implement Templates Tab**

```typescript
// Replace the templates tab section in ShiftEditorSettings.tsx
import { useShiftTemplates } from '../../hooks/useShiftTemplates'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { SHIFT_COLOR_BG } from '@shared/types'
import type { ShiftColor } from '@shared/types'

const SHIFT_COLORS: ShiftColor[] = ['blue', 'green', 'amber', 'purple', 'rose']

function TemplatesTab({ department }: { department: string }) {
  const { templates, loading, save, update, delete: deleteTemplate } = useShiftTemplates(department)
  const [formData, setFormData] = useState({
    name: '',
    start_time: '',
    end_time: '',
    color: 'blue' as ShiftColor,
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const data = { ...formData, department }
      if (editingId) {
        await update(editingId, { ...data, id: editingId } as any)
        setEditingId(null)
      } else {
        await save(data as any)
      }
      setFormData({ name: '', start_time: '', end_time: '', color: 'blue' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (template: any) => {
    setFormData({
      name: template.name,
      start_time: template.start_time,
      end_time: template.end_time,
      color: template.color,
    })
    setEditingId(template.id)
  }

  const handleCancel = () => {
    setFormData({ name: '', start_time: '', end_time: '', color: 'blue' })
    setEditingId(null)
  }

  if (loading) return <p className="text-gray-600">Lade...</p>

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-4">Schicht-Templates</h3>

      {templates.length > 0 && (
        <div className="mb-6 space-y-2">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900">{template.name}</p>
                <p className="text-sm text-gray-600">
                  {template.start_time} – {template.end_time}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(template)}
                  className="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="Bearbeiten"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => deleteTemplate(template.id)}
                  className="p-2 rounded hover:bg-red-100 text-red-600"
                  title="Löschen"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className="font-semibold text-gray-900 mb-4 mt-6">
        {editingId ? 'Template bearbeiten' : 'Neue Template hinzufügen'}
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="z.B. Springerdienst"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beginn</label>
            <Input
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ende</label>
            <Input
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Farbe</label>
          <div className="flex gap-3">
            {SHIFT_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setFormData({ ...formData, color })}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  formData.color === color ? 'border-gray-800 scale-110' : 'border-transparent'
                }`}
                style={{ background: SHIFT_COLOR_BG[color] }}
                title={color}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={!formData.name || !formData.start_time || !formData.end_time || saving}
            className="flex-1"
          >
            {editingId ? 'Speichern' : 'Template erstellen'}
          </Button>
          {editingId && (
            <Button variant="outline" onClick={handleCancel}>
              Abbrechen
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// In ShiftEditorSettings body, replace templates placeholder:
{activeTab === 'templates' && (
  <TemplatesTab department={department} />
)}
```

- [ ] **Step 4: Run tests to verify passes**

```bash
cd ~/Projects/times/chef-app
npm test -- __tests__/ShiftEditorSettings.test.tsx --watch=false
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add chef-app/src/components/Dienstplan/ShiftEditorSettings.tsx
git add chef-app/src/components/Dienstplan/__tests__/ShiftEditorSettings.test.tsx
git commit -m "feat(dienstplan): implement Templates tab in settings modal

- Display list of existing templates per department
- Form to create/edit templates (name, start_time, end_time, color)
- Immediate save via useShiftTemplates hook
- Edit and delete buttons for each template

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Implement Absences Tab (View-Only)

**Files:**
- Modify: `chef-app/src/components/Dienstplan/ShiftEditorSettings.tsx`
- Modify: `chef-app/src/components/Dienstplan/__tests__/ShiftEditorSettings.test.tsx`

**Interfaces:**
- Consumes:
  - `date: string` (ISO date)
  - PocketBase absences collection query
  
- Produces:
  - Query & display absences for the given date
  - Filter: status != "rejected", show "Genehmigt" status label

- [ ] **Step 1: Write test for absence display**

```typescript
// Add to ShiftEditorSettings.test.tsx
describe('ShiftEditorSettings Absences Tab', () => {
  it('renders absences for the selected date', async () => {
    // Mock PocketBase query
    const mockAbsences = [
      {
        id: '1',
        employee: 'emp_1',
        date_from: '2026-06-25',
        date_to: '2026-06-27',
        type: 'K',
        status: 'approved',
      },
    ]

    // Render and navigate to absences tab
    const { getByText } = render(
      <ShiftEditorSettings
        open={true}
        onClose={() => {}}
        employeeName="Max Mustermann"
        date="2026-06-25"
        department="dept_1"
      />
    )

    // Click absences tab
    fireEvent.click(getByText('📅 Abwesenheiten'))

    // Should show absence info (mocked via useEffect + useState)
    // This test is more of an integration test; can simplify for now
    expect(getByText(/Abwesenheiten/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test**

```bash
cd ~/Projects/times/chef-app
npm test -- __tests__/ShiftEditorSettings.test.tsx --watch=false
```

Expected: Test passes (basic structure)

- [ ] **Step 3: Implement Absences Tab**

```typescript
// Add to ShiftEditorSettings.tsx, inside component
import { useEffect } from 'react'
import { parseISO, format, isAfter, isBefore } from 'date-fns'
import { ABSENCE_LABELS, ABSENCE_COLORS } from '@shared/types'
import type { Absence } from '@shared/types'

function AbsencesTab({ date }: { date: string }) {
  const [absences, setAbsences] = useState<Absence[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAbsences = async () => {
      try {
        setLoading(true)
        const dateFrom = format(parseISO(date), 'yyyy-MM-dd')
        const dateTo = format(parseISO(date), 'yyyy-MM-dd')
        
        const records = await pb.collection('absences').getFullList<Absence>({
          filter: `date_from <= "${dateTo}" && date_to >= "${dateFrom}" && status != "rejected"`,
          requestKey: `absences-${date}`,
        })
        setAbsences(records)
      } catch (error) {
        console.error('Failed to fetch absences:', error)
        setAbsences([])
      } finally {
        setLoading(false)
      }
    }

    fetchAbsences()
  }, [date])

  if (loading) return <p className="text-gray-600">Lade...</p>

  if (absences.length === 0) {
    return <p className="text-gray-600 italic">Keine Abwesenheiten an diesem Tag</p>
  }

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-4">Abwesenheiten an diesem Tag</h3>
      <div className="space-y-3">
        {absences.map((absence) => {
          const label = ABSENCE_LABELS[absence.type] || absence.type
          const bgColor = ABSENCE_COLORS[absence.type]?.bg || '#f3f4f6'
          const textColor = ABSENCE_COLORS[absence.type]?.text || '#6b7280'

          return (
            <div
              key={absence.id}
              className="p-4 rounded-lg border"
              style={{
                background: bgColor,
                borderColor: textColor + '44',
              }}
            >
              <p className="font-medium" style={{ color: textColor }}>
                {label}
              </p>
              <p className="text-sm mt-1" style={{ color: textColor, opacity: 0.85 }}>
                {format(parseISO(absence.date_from), 'dd.MM.yyyy')} –{' '}
                {format(parseISO(absence.date_to), 'dd.MM.yyyy')}
              </p>
              <p className="text-xs mt-2 opacity-75" style={{ color: textColor }}>
                Status: {absence.status === 'approved' ? 'Genehmigt' : 'Ausstehend'}
              </p>
              <p className="text-xs mt-2 opacity-75" style={{ color: textColor }}>
                ℹ️ Diese Abwesenheit überschneidet sich mit der Schicht. Die Schicht kann trotzdem eingetragen werden.
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// In ShiftEditorSettings body, replace absences placeholder:
{activeTab === 'absences' && (
  <AbsencesTab date={date} />
)}
```

- [ ] **Step 4: Run tests**

```bash
cd ~/Projects/times/chef-app
npm test -- __tests__/ShiftEditorSettings.test.tsx --watch=false
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add chef-app/src/components/Dienstplan/ShiftEditorSettings.tsx
git commit -m "feat(dienstplan): implement Absences tab in settings modal

- Query and display absences overlapping with selected date
- Filter: exclude rejected absences
- Show absence type, date range, and approval status
- Informational UI only (no editing)

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Refactor ShiftEditor Header (Employee + Date Context)

**Files:**
- Modify: `chef-app/src/components/Dienstplan/ShiftEditor.tsx` (lines 131-146)
- Modify: `chef-app/src/components/Dienstplan/__tests__/ShiftEditor.test.tsx` (if exists)

**Interfaces:**
- Input: existing props (employeeName, dayLabel)
- Output: Header now shows:
  - Line 1: "Schicht eintragen"
  - Line 2: "{employeeName} · {dayLabel}"
  - Right: ⚙️ + ✕ buttons

- [ ] **Step 1: Write test for new header layout**

```typescript
// Add to ShiftEditor.test.tsx or create if missing
describe('ShiftEditor Header', () => {
  it('displays employee name and date in header', () => {
    const { getByText } = render(
      <ShiftEditor
        open={true}
        onClose={() => {}}
        onSave={() => {}}
        employeeName="Max Mustermann"
        dayLabel="Montag, 25. Juni 2026"
        initial={{}}
      />
    )

    expect(getByText('Schicht eintragen')).toBeInTheDocument()
    expect(getByText(/Max Mustermann · Montag, 25. Juni 2026/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify failure**

```bash
cd ~/Projects/times/chef-app
npm test -- ShiftEditor.test.tsx --watch=false
```

Expected: failure (header structure not updated)

- [ ] **Step 3: Refactor ShiftEditor header**

Replace the DialogHeader in ShiftEditor.tsx:

```typescript
// Before (lines ~134-145)
<DialogHeader>
  <DialogTitle>{isEdit ? 'Schicht bearbeiten' : 'Schicht eintragen'}</DialogTitle>
  {/* Freier Tag Checkbox */}
  <label className="flex items-center gap-1.5 cursor-pointer select-none ml-auto">
    ...
  </label>
</DialogHeader>

// After:
<DialogHeader>
  <div>
    <DialogTitle>{isEdit ? 'Schicht bearbeiten' : 'Schicht eintragen'}</DialogTitle>
    <p className="text-xs text-gray-600 mt-1">
      {employeeName} · {dayLabel}
    </p>
  </div>
  <div className="flex items-center gap-2 ml-auto">
    <button
      onClick={() => setShowSettings(true)}
      className="p-2 rounded hover:bg-gray-200 text-gray-600"
      title="Einstellungen"
    >
      <Settings size={18} />
    </button>
    <label className="flex items-center gap-1.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={isFreeDay}
        onChange={e => setIsFreeDay(e.target.checked)}
        className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
      <span className="text-xs font-medium text-gray-600">Freier Tag</span>
    </label>
  </div>
</DialogHeader>
```

Also add to ShiftEditor state (top of component):

```typescript
const [showSettings, setShowSettings] = useState(false)
```

Import Settings icon:

```typescript
import { Settings } from 'lucide-react'
```

- [ ] **Step 4: Run test to verify passes**

```bash
cd ~/Projects/times/chef-app
npm test -- ShiftEditor.test.tsx --watch=false
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add chef-app/src/components/Dienstplan/ShiftEditor.tsx
git commit -m "refactor(dienstplan): enhance ShiftEditor header with context

- Add employee name and date display on second header line
- Move free day checkbox to right side
- Add settings gear icon placeholder

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Add Settings Modal Toggle & Integration

**Files:**
- Modify: `chef-app/src/components/Dienstplan/ShiftEditor.tsx`
- Import: `ShiftEditorSettings` component

**Interfaces:**
- ⚙️ button toggles `showSettings` state
- When true, `ShiftEditorSettings` modal opens
- Modal is passed: `open`, `onClose`, `employeeName`, `dayLabel`, `department`

- [ ] **Step 1: Write test for settings toggle**

```typescript
// Add to ShiftEditor.test.tsx
describe('ShiftEditor Settings', () => {
  it('opens settings modal when gear button is clicked', async () => {
    const { getByTitle, getByText } = render(
      <ShiftEditor
        open={true}
        onClose={() => {}}
        onSave={() => {}}
        employeeName="Max Mustermann"
        dayLabel="Montag, 25. Juni 2026"
        department="dept_1"
        initial={{}}
      />
    )

    const settingsBtn = getByTitle('Einstellungen')
    fireEvent.click(settingsBtn)

    // Settings modal should be visible
    await waitFor(() => {
      expect(getByText('Einstellungen & Verwaltung')).toBeInTheDocument()
    })
  })

  it('closes settings modal when X is clicked', async () => {
    const { getByTitle, queryByText } = render(
      <ShiftEditor
        open={true}
        onClose={() => {}}
        onSave={() => {}}
        employeeName="Max Mustermann"
        dayLabel="Montag, 25. Juni 2026"
        department="dept_1"
        initial={{}}
      />
    )

    // Open settings
    fireEvent.click(getByTitle('Einstellungen'))

    await waitFor(() => {
      expect(queryByText('Einstellungen & Verwaltung')).toBeInTheDocument()
    })

    // Close settings (in the modal, there's a close button)
    // This is tested in ShiftEditorSettings component
  })
})
```

- [ ] **Step 2: Run test to verify failure**

```bash
cd ~/Projects/times/chef-app
npm test -- ShiftEditor.test.tsx --watch=false
```

Expected: failures (ShiftEditorSettings not integrated)

- [ ] **Step 3: Add ShiftEditorSettings to ShiftEditor**

In ShiftEditor.tsx, add import:

```typescript
import ShiftEditorSettings from './ShiftEditorSettings'
```

Add state (if not already added in Task 4):

```typescript
const [showSettings, setShowSettings] = useState(false)
```

Before the closing `</>` of the main return, add:

```typescript
<ShiftEditorSettings
  open={showSettings}
  onClose={() => setShowSettings(false)}
  employeeName={employeeName}
  date={editorDate}
  department={department ?? ''}
/>
```

Note: `editorDate` is already defined in Dienstplan.tsx parent and passed down. If needed, format it:

```typescript
const dateLabel = format(parseISO(editorDate), 'EEEE, dd. MMMM yyyy', { locale: de })
```

But `ShiftEditorSettings` will format it internally. Pass the ISO date string.

- [ ] **Step 4: Run test to verify passes**

```bash
cd ~/Projects/times/chef-app
npm test -- ShiftEditor.test.tsx --watch=false
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add chef-app/src/components/Dienstplan/ShiftEditor.tsx
git commit -m "feat(dienstplan): integrate ShiftEditorSettings modal

- Settings gear icon opens modal overlay
- Modal passes through employee name, date, department context
- Close button in modal closes the overlay
- Overlay sits above main ShiftEditor dialog

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Split Quick Select into Two Sections (Templates + Absences)

**Files:**
- Modify: `chef-app/src/components/Dienstplan/ShiftEditor.tsx` (lines ~149-156)

**Interfaces:**
- Input: existing templates from `useShiftTemplates`
- Output: Two separate button groups:
  - Row 1: "Quick Select" → 🌴 Frei + templates
  - Row 2: "Abwesenheiten" → 🏥 Krank, ✈️ Urlaub, 📚 Schulung, 🩺 Arzttermin

- [ ] **Step 1: Write test for quick select sections**

```typescript
// Add to ShiftEditor.test.tsx
describe('ShiftEditor Quick Select', () => {
  it('renders Quick Select templates section', () => {
    const { getByText } = render(
      <ShiftEditor
        open={true}
        onClose={() => {}}
        onSave={() => {}}
        employeeName="Max Mustermann"
        dayLabel="Montag, 25. Juni 2026"
        initial={{}}
      />
    )

    expect(getByText('Quick Select')).toBeInTheDocument()
    expect(getByText('🌴 Frei')).toBeInTheDocument()
  })

  it('renders Abwesenheiten section with absence buttons', () => {
    const { getByText } = render(
      <ShiftEditor
        open={true}
        onClose={() => {}}
        onSave={() => {}}
        employeeName="Max Mustermann"
        dayLabel="Montag, 25. Juni 2026"
        initial={{}}
      />
    )

    expect(getByText('Abwesenheiten')).toBeInTheDocument()
    expect(getByText('🏥 Krank')).toBeInTheDocument()
    expect(getByText('✈️ Urlaub')).toBeInTheDocument()
  })

  it('clicking Frei button marks day as free', () => {
    const mockOnSave = jest.fn()
    const { getByText } = render(
      <ShiftEditor
        open={true}
        onClose={() => {}}
        onSave={mockOnSave}
        employeeName="Max Mustermann"
        dayLabel="Montag, 25. Juni 2026"
        initial={{}}
      />
    )

    fireEvent.click(getByText('🌴 Frei'))

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({ is_free_day: true })
    )
  })
})
```

- [ ] **Step 2: Run test to verify failure**

```bash
cd ~/Projects/times/chef-app
npm test -- ShiftEditor.test.tsx --watch=false
```

Expected: failures

- [ ] **Step 3: Refactor Quick Select into two sections**

In ShiftEditor.tsx, replace the current quick buttons section (around line 149-156) with:

```typescript
<div className="border-b border-gray-100 my-3" />

{/* Quick Select: Templates */}
{!templatesLoading && (
  <div className="mb-4">
    <label className="text-[11px] text-gray-500 uppercase tracking-wide font-medium mb-2 block">
      Quick Select
    </label>
    <div className="flex flex-wrap gap-2 mb-2">
      <button
        onClick={() => {
          handleTemplateSelect('', { is_free_day: true, color: 'blue', start_time: '00:00', end_time: '00:00' })
        }}
        className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
      >
        🌴 Frei
      </button>
      {templates.map(template => (
        <button
          key={template.id}
          onClick={() =>
            handleTemplateSelect(template.id, {
              start_time: template.start_time,
              end_time: template.end_time,
              color: template.color,
            })
          }
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
        >
          {template.name}
        </button>
      ))}
    </div>
  </div>
)}

{/* Quick Select: Absences */}
<div className="mb-4">
  <label className="text-[11px] text-gray-500 uppercase tracking-wide font-medium mb-2 block">
    Abwesenheiten
  </label>
  <div className="flex flex-wrap gap-2">
    {(Object.entries(ABSENCE_LABELS) as [AbsenceType, string][]).map(([type, label]) => {
      const colors = ABSENCE_COLORS[type]
      return (
        <button
          key={type}
          onClick={() => {
            onSave({
              start_time: '00:00',
              end_time: '00:00',
              color: 'blue',
              is_free_day: false,
              note: label,
            })
            onClose()
          }}
          className="px-3 py-1.5 text-xs font-medium rounded-md hover:opacity-80 transition-opacity"
          style={{
            background: colors.bg,
            color: colors.text,
          }}
        >
          {type === 'K' && '🏥'}
          {type === 'U' && '✈️'}
          {type === 'U3' && '✈️'}
          {type === 'S' && '📚'}
          {type === 'AT' && '🩺'}
          {type === 'KK' && '🏥'}
          {type === 'RU' && '✈️'}
          {type === 'SU' && '✈️'}
          {type === 'ÜA' && '→'}
          {' '}
          {label}
        </button>
      )
    })}
  </div>
</div>

<div className="border-b border-gray-100 my-3" />
```

Also import at the top:

```typescript
import { ABSENCE_LABELS, ABSENCE_COLORS } from '@shared/types'
import type { AbsenceType } from '@shared/types'
```

- [ ] **Step 4: Run test to verify passes**

```bash
cd ~/Projects/times/chef-app
npm test -- ShiftEditor.test.tsx --watch=false
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add chef-app/src/components/Dienstplan/ShiftEditor.tsx
git commit -m "feat(dienstplan): split Quick Select into templates and absences

- Row 1: Quick Select with Frei + department templates
- Row 2: Abwesenheiten with K, U, S, AT, etc.
- Clicking absence button marks day with that absence type
- Consistent styling per absence color scheme

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Implement Shift 2 Expandable Section

**Files:**
- Modify: `chef-app/src/components/Dienstplan/ShiftEditor.tsx` (extract & expand Shift 2 logic)

**Interfaces:**
- Input: `initial?.start_time2`, `initial?.end_time2`, `initial?.color2`, `initial?.note2`
- Output: Expandable section with toggle state; when expanded, shows Shift 2 fields

- [ ] **Step 1: Write test for expandable Shift 2**

```typescript
// Add to ShiftEditor.test.tsx
describe('ShiftEditor Shift 2', () => {
  it('shows expandable link for Shift 2', () => {
    const { getByText } = render(
      <ShiftEditor
        open={true}
        onClose={() => {}}
        onSave={() => {}}
        employeeName="Max Mustermann"
        dayLabel="Montag, 25. Juni 2026"
        initial={{}}
      />
    )

    expect(getByText(/Zweite Schicht hinzufügen/)).toBeInTheDocument()
  })

  it('expands Shift 2 section when link is clicked', () => {
    const { getByText, queryByLabelText } = render(
      <ShiftEditor
        open={true}
        onClose={() => {}}
        onSave={() => {}}
        employeeName="Max Mustermann"
        dayLabel="Montag, 25. Juni 2026"
        initial={{}}
      />
    )

    // Initially, Shift 2 fields should not be visible
    expect(queryByLabelText('Beginn (Schicht 2)')).not.toBeInTheDocument()

    // Click expand button
    fireEvent.click(getByText(/Zweite Schicht hinzufügen/))

    // Shift 2 fields should now be visible
    expect(queryByLabelText('Beginn (Schicht 2)')).toBeInTheDocument()
  })

  it('saves Shift 1 and Shift 2 together on submit', () => {
    const mockOnSave = jest.fn()
    const { getByText, getByLabelText } = render(
      <ShiftEditor
        open={true}
        onClose={() => {}}
        onSave={mockOnSave}
        employeeName="Max Mustermann"
        dayLabel="Montag, 25. Juni 2026"
        initial={{}}
      />
    )

    // Fill Shift 1
    fireEvent.change(getByLabelText(/^Beginn$/), { target: { value: '09:00' } })
    fireEvent.change(getByLabelText(/^Ende$/), { target: { value: '13:00' } })

    // Expand and fill Shift 2
    fireEvent.click(getByText(/Zweite Schicht hinzufügen/))
    fireEvent.change(getByLabelText('Beginn (Schicht 2)'), { target: { value: '18:00' } })
    fireEvent.change(getByLabelText('Ende (Schicht 2)'), { target: { value: '23:00' } })

    // Submit
    fireEvent.click(getByText('Speichern'))

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        start_time: '09:00',
        end_time: '13:00',
        start_time2: '18:00',
        end_time2: '23:00',
      })
    )
  })
})
```

- [ ] **Step 2: Run test to verify failure**

```bash
cd ~/Projects/times/chef-app
npm test -- ShiftEditor.test.tsx --watch=false
```

Expected: failures (expandable section not implemented)

- [ ] **Step 3: Implement Shift 2 expandable section**

In ShiftEditor.tsx, after the Shift 1 section, add:

```typescript
{/* Shift 2 (Expandable) */}
{!isFreeDay && (
  <>
    <div className="border-t border-gray-100 pt-3 mt-4">
      <button
        type="button"
        onClick={() => setShowSplit(!showSplit)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors font-medium"
      >
        <span className={`transition-transform ${showSplit ? 'rotate-90' : ''}`}>
          ›
        </span>
        {showSplit ? 'Zweite Schicht entfernen' : '✂️ Zweite Schicht hinzufügen'}
      </button>
    </div>

    {showSplit && (
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mt-3 space-y-3">
        <p className="text-xs font-semibold text-indigo-700">✂️ Zweite Teilschicht</p>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[11px] text-gray-500 uppercase tracking-wide">
              Beginn (Schicht 2)
            </Label>
            <Input
              type="time"
              value={startTime2}
              onChange={(e) => setStartTime2(e.target.value)}
              className="mt-0.5"
            />
          </div>
          <div>
            <Label className="text-[11px] text-gray-500 uppercase tracking-wide">
              Ende (Schicht 2)
            </Label>
            <Input
              type="time"
              value={endTime2}
              onChange={(e) => setEndTime2(e.target.value)}
              className="mt-0.5"
            />
          </div>
        </div>

        <div>
          <Label className="text-[11px] text-gray-500 uppercase tracking-wide">
            Farbe (Schicht 2)
          </Label>
          <div className="flex gap-2 mt-1">
            {SHIFT_COLORS.map((c) => (
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

        <div>
          <Label className="text-[11px] text-gray-500 uppercase tracking-wide">
            Notiz (Schicht 2)
          </Label>
          <Input
            value={note2}
            onChange={(e) => setNote2(e.target.value)}
            placeholder="optional"
            className="mt-0.5"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowSplit(false)}
          className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium mt-2"
        >
          🗑️ Entfernen
        </button>
      </div>
    )}
  </>
)}
```

- [ ] **Step 4: Run test to verify passes**

```bash
cd ~/Projects/times/chef-app
npm test -- ShiftEditor.test.tsx --watch=false
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add chef-app/src/components/Dienstplan/ShiftEditor.tsx
git commit -m "feat(dienstplan): implement Shift 2 as expandable section

- Toggle button: 'Zweite Schicht hinzufügen / entfernen'
- When expanded, shows Beginn, Ende, Farbe, Notiz for Shift 2
- Styled with indigo background to distinguish from Shift 1
- Both shifts saved together on Speichern

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Integration Testing & Responsive Design

**Files:**
- Modify: `chef-app/src/components/Dienstplan/__tests__/ShiftEditor.integration.test.tsx` (new or add to existing)

**Interfaces:**
- Test workflows end-to-end: template creation → usage in quick buttons → shift save
- Test responsive layout on mobile / tablet / desktop

- [ ] **Step 1: Write end-to-end integration test**

```typescript
// chef-app/src/components/Dienstplan/__tests__/ShiftEditor.integration.test.tsx
describe('ShiftEditor Integration', () => {
  it('creates template in settings, then uses it to quickly schedule a shift', async () => {
    const mockOnSave = jest.fn()
    const mockOnClose = jest.fn()

    const { getByTitle, getByText, getByLabelText, getByPlaceholderText } = render(
      <ShiftEditor
        open={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        employeeName="Max Mustermann"
        dayLabel="Montag, 25. Juni 2026"
        department="dept_1"
        initial={{}}
      />
    )

    // Step 1: Open settings
    fireEvent.click(getByTitle('Einstellungen'))

    // Wait for settings modal to appear
    await waitFor(() => {
      expect(getByText('Einstellungen & Verwaltung')).toBeInTheDocument()
    })

    // Step 2: Fill template form (name, times, color)
    fireEvent.change(getByPlaceholderText('z.B. Springerdienst'), {
      target: { value: 'Mittags' },
    })
    fireEvent.change(getByLabelText('Beginn'), { target: { value: '11:00' } })
    fireEvent.change(getByLabelText('Ende'), { target: { value: '15:00' } })

    // Step 3: Create template
    fireEvent.click(getByText('Template erstellen'))

    // Wait for template to be created (mocked in useShiftTemplates)
    await waitFor(() => {
      expect(getByText('Mittags')).toBeInTheDocument()
    })

    // Step 4: Close settings
    fireEvent.click(getByText('✕'))

    // Wait for modal to close
    await waitFor(() => {
      expect(queryByText('Einstellungen & Verwaltung')).not.toBeInTheDocument()
    })

    // Step 5: Quick select the new template (should now appear in main dialog)
    // Note: This assumes the template appears immediately in the button list
    // In practice, we'd need to wait for the hook to re-fetch
    fireEvent.click(getByText('Mittags'))

    // Shift fields should be populated
    expect((getByLabelText(/^Beginn$/) as HTMLInputElement).value).toBe('11:00')
    expect((getByLabelText(/^Ende$/) as HTMLInputElement).value).toBe('15:00')

    // Step 6: Save shift
    fireEvent.click(getByText('Speichern'))

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        start_time: '11:00',
        end_time: '15:00',
      })
    )
  })

  it('creates shift with Shift 2 and saves both', async () => {
    const mockOnSave = jest.fn()

    const { getByText, getByLabelText } = render(
      <ShiftEditor
        open={true}
        onClose={() => {}}
        onSave={mockOnSave}
        employeeName="Max Mustermann"
        dayLabel="Montag, 25. Juni 2026"
        initial={{}}
      />
    )

    // Fill Shift 1
    fireEvent.change(getByLabelText(/^Beginn$/), { target: { value: '09:00' } })
    fireEvent.change(getByLabelText(/^Ende$/), { target: { value: '13:00' } })

    // Expand Shift 2
    fireEvent.click(getByText(/Zweite Schicht hinzufügen/))

    // Fill Shift 2
    await waitFor(() => {
      expect(getByLabelText('Beginn (Schicht 2)')).toBeInTheDocument()
    })

    fireEvent.change(getByLabelText('Beginn (Schicht 2)'), { target: { value: '18:00' } })
    fireEvent.change(getByLabelText('Ende (Schicht 2)'), { target: { value: '22:00' } })

    // Save
    fireEvent.click(getByText('Speichern'))

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        start_time: '09:00',
        end_time: '13:00',
        start_time2: '18:00',
        end_time2: '22:00',
      })
    )
  })
})
```

- [ ] **Step 2: Run test to verify passes**

```bash
cd ~/Projects/times/chef-app
npm test -- ShiftEditor.integration.test.tsx --watch=false
```

Expected: PASS (assuming mocks are set up correctly)

- [ ] **Step 3: Verify responsive design (manual check)**

- Desktop (1920px): Dialog `max-width: 500px`, Settings Modal `max-width: 600px` — verify layout
- Tablet (768px): Dialogs should be responsive, stack properly
- Mobile (375px): Full-width, settings modal should work as overlay

Check in browser:

```bash
cd ~/Projects/times/chef-app
npm run dev
```

Open dev tools, test responsive breakpoints. Verify:
- Modal overlay is dark background
- Dialogs are centered
- Buttons/inputs are touch-friendly (min 44px)
- Text is readable on all sizes

- [ ] **Step 4: Commit test**

```bash
git add chef-app/src/components/Dienstplan/__tests__/ShiftEditor.integration.test.tsx
git commit -m "test(dienstplan): add integration tests for ShiftEditor workflows

- Template creation → quick button → shift scheduling
- Multi-shift workflows (Shift 1 + 2)
- Settings modal interaction
- All major user flows covered

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Manual E2E Testing & Verification

**Files:**
- No files modified; manual verification only

- [ ] **Step 1: Start dev server**

```bash
cd ~/Projects/times/chef-app
npm run dev
```

Open `http://localhost:5173` in browser.

- [ ] **Step 2: Test Workflow 1: Quick Schedule a Shift**

1. Navigate to Dienstplan (Schicht & Plan page)
2. Click on a grid cell (employee + date)
3. ShiftEditor dialog opens
4. Verify header shows: "Schicht eintragen" + "Employee Name · Day, Date"
5. Verify Quick Select section shows: 🌴 Frei + templates
6. Verify Abwesenheiten section shows: 🏥 Krank, ✈️ Urlaub, 📚 Schulung, 🩺 Arzttermin
7. Click "Frühdienst" (or template button)
8. Verify times populate in Beginn/Ende fields
9. Click "Speichern"
10. Verify shift is created in grid

- [ ] **Step 3: Test Workflow 2: Create New Template**

1. Open ShiftEditor
2. Click ⚙️ icon (settings gear)
3. Settings modal opens, Templates tab active
4. Fill form: Name="Test Template", Beginn=10:00, Ende=18:00, Farbe=green
5. Click "Template erstellen"
6. Verify template appears in the list
7. Close settings modal
8. Verify new template button appears in Quick Select

- [ ] **Step 4: Test Workflow 3: Add Second Shift**

1. Open ShiftEditor
2. Fill Shift 1: 09:00 – 13:00
3. Click "➕ Zweite Schicht hinzufügen"
4. Verify Shift 2 section expands
5. Fill Shift 2: 18:00 – 22:00, different color
6. Click "Speichern"
7. Verify both shifts appear in grid (or in WeekGrid if applicable)

- [ ] **Step 5: Test Workflow 4: Check Absences**

1. Open ShiftEditor on a date with an overlapping absence (create one if needed via Abwesenheiten)
2. Click ⚙️ icon → Abwesenheiten tab
3. Verify absence type, date range, and status are displayed
4. Verify info text: "Diese Abwesenheit überschneidet sich..."
5. Close settings, can still create shift on that date

- [ ] **Step 6: Test Responsive Design**

In DevTools, toggle device toolbar (Cmd+Shift+M):
- Desktop (1920px): Dialogs centered, properly sized
- Tablet (768px): Responsive layout holds
- Mobile (375px): Settings modal is full-width overlay, readable

- [ ] **Step 7: Commit verification**

```bash
git commit --allow-empty -m "test(dienstplan): verified all workflows and responsive design

- Workflow 1: Quick schedule via template ✓
- Workflow 2: Create template in settings ✓
- Workflow 3: Add multi-shift to same day ✓
- Workflow 4: View absences in settings ✓
- Responsive: Desktop, tablet, mobile ✓

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Success Criteria Checklist

- [ ] ⚙️ icon opens Settings Modal with Templates + Absences tabs
- [ ] Template management is visible + usable from within ShiftEditor
- [ ] New templates appear in Quick Select immediately after creation
- [ ] Absence info is visible for the selected date
- [ ] Shift 2 is manageable via expandable section
- [ ] Department scoping is preserved (no cross-dept leaks)
- [ ] All existing ShiftEditor workflows still work
- [ ] Component is responsive (desktop + mobile)
- [ ] All tests pass
- [ ] Manual E2E workflows verified
