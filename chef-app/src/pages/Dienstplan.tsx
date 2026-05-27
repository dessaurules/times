import { useState, useEffect, useMemo } from 'react'
import { addDays, format } from 'date-fns'
import { ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react'
import { pb } from '../lib/pb'
import { useAuthStore } from '../stores/auth'
import type { Department, Employee, Settings, ShiftPlan, ShiftEntry } from '@shared/types'
import { cn } from '@/lib/utils'
import {
  getWeekStart, getWeekDays, getWeekLabel,
  visibleDepts, canEditDept,
  loadRowOrder, saveRowOrder,
} from '@/lib/dienstplanUtils'
import type { WeekDay } from '@/lib/dienstplanUtils'
import WeekGrid from '@/components/Dienstplan/WeekGrid'
import ShiftEditor from '@/components/Dienstplan/ShiftEditor'
import type { ShiftEditorData } from '@/components/Dienstplan/ShiftEditor'
import PublishDialog from '@/components/Dienstplan/PublishDialog'
import { notifyEmployee } from '@/lib/notifications'

export default function Dienstplan() {
  const { user } = useAuthStore()
  const role = user?.role ?? 'mitarbeiter'

  // ── Wochennavigation ──────────────────────────────────────────────
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset])
  const weekStartStr = useMemo(() => format(weekStart, 'yyyy-MM-dd'), [weekStart])

  // ── Stammdaten ────────────────────────────────────────────────────
  const [departments, setDepartments]   = useState<Department[]>([])
  const [employees, setEmployees]       = useState<Employee[]>([])
  const [federalState, setFederalState] = useState('ST')

  useEffect(() => {
    pb.collection('departments').getFullList<Department>({ sort: 'sort_order', requestKey: null })
      .then(setDepartments)
    pb.collection('employees').getFullList<Employee>({ filter: 'active = true', requestKey: null })
      .then(setEmployees)
    pb.collection('settings').getFirstListItem<Settings>('key = "federal_state"', { requestKey: null })
      .then(s => setFederalState(s.value))
      .catch(() => {/* default ST bleibt */})
  }, [])

  // ── Feiertage & Tage ─────────────────────────────────────────────
  const days = useMemo(() => getWeekDays(weekStart, federalState), [weekStart, federalState])
  const weekLabel = useMemo(() => getWeekLabel(weekStart, days), [weekStart, days])

  // ── Berechtigungen ────────────────────────────────────────────────
  const authEmployee = useMemo(
    () => employees.find(e => e.id === user?.employee),
    [employees, user?.employee],
  )
  const allDeptIds = useMemo(() => departments.map(d => d.id), [departments])

  const visibleDeptIds = useMemo(
    () => visibleDepts(role, authEmployee?.planner_departments, allDeptIds),
    [role, authEmployee?.planner_departments, allDeptIds],
  )

  // Abteilungs-Selektor (GF/Admin kann filtern, Planer sieht nur seine)
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const shownDepts = useMemo(() => {
    const filtered = departments.filter(d => visibleDeptIds.includes(d.id))
    if (selectedDept === 'all') return filtered
    return filtered.filter(d => d.id === selectedDept)
  }, [departments, visibleDeptIds, selectedDept])

  const editableDepts = useMemo(
    () => shownDepts.map(d => d.id).filter(id => canEditDept(role, authEmployee?.planner_departments, id)),
    [shownDepts, role, authEmployee?.planner_departments],
  )

  // ── Zeilen-Reihenfolge (localStorage) ────────────────────────────
  const [rowOrder, setRowOrder] = useState<Record<string, string[]>>(() => loadRowOrder(weekStartStr))
  useEffect(() => {
    setRowOrder(loadRowOrder(weekStartStr))
  }, [weekStartStr])

  function handleRowReorder(deptId: string, fromIdx: number, toIdx: number) {
    const deptEmps = employees.filter(e => e.department === deptId)
    const order = rowOrder[deptId] ?? deptEmps.map(e => e.id)
    const sorted = [...deptEmps].sort((a, b) => {
      const ai = order.indexOf(a.id); const bi = order.indexOf(b.id)
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    })
    const item = sorted.splice(fromIdx, 1)[0]
    sorted.splice(toIdx, 0, item)
    const newOrder = { ...rowOrder, [deptId]: sorted.map(e => e.id) }
    setRowOrder(newOrder)
    saveRowOrder(weekStartStr, newOrder)
  }

  // ── Plan + Entries laden ──────────────────────────────────────────
  const [plan, setPlan]       = useState<ShiftPlan | null>(null)
  const [entries, setEntries] = useState<ShiftEntry[]>([])
  const [planLoading, setPlanLoading] = useState(true)

  useEffect(() => {
    setPlanLoading(true)
    pb.collection('shift_plans')
      .getFirstListItem<ShiftPlan>(`week_start = "${weekStartStr}"`, { requestKey: null })
      .then(p => { setPlan(p); return p })
      .catch(async () => {
        const created = await pb.collection('shift_plans').create<ShiftPlan>({
          week_start:  weekStartStr,
          week_end:    format(addDays(weekStart, days.length - 1), 'yyyy-MM-dd'),
          status:      'draft',
          created_by:  (pb.authStore.model?.id ?? '') as string,
        }, { requestKey: null })
        setPlan(created)
        return created
      })
      .then(async p => {
        const ents = await pb.collection('shift_entries').getFullList<ShiftEntry>({
          filter: `plan_id = "${p.id}"`,
          requestKey: null,
        })
        setEntries(ents)
      })
      .finally(() => setPlanLoading(false))
  }, [weekStartStr, weekStart, days.length])

  // ── ShiftEditor-State ─────────────────────────────────────────────
  const [editorOpen,    setEditorOpen]    = useState(false)
  const [editorEmpId,   setEditorEmpId]   = useState('')
  const [editorDate,    setEditorDate]    = useState('')
  const [editorEntry,   setEditorEntry]   = useState<ShiftEntry | undefined>()

  function handleCellClick(empId: string, date: string, existing?: ShiftEntry) {
    setEditorEmpId(empId)
    setEditorDate(date)
    setEditorEntry(existing)
    setEditorOpen(true)
  }

  async function handleEditorSave(data: ShiftEditorData) {
    if (!plan) return
    const payload = {
      plan_id:    plan.id,
      employee:   editorEmpId,
      department: employees.find(e => e.id === editorEmpId)?.department ?? '',
      date:       editorDate,
      status:     'draft',
      ...data,
    }
    if (editorEntry) {
      const updated = await pb.collection('shift_entries').update<ShiftEntry>(editorEntry.id, payload, { requestKey: null })
      setEntries(prev => prev.map(e => e.id === editorEntry.id ? updated : e))
    } else {
      const created = await pb.collection('shift_entries').create<ShiftEntry>(payload, { requestKey: null })
      setEntries(prev => [...prev, created])
    }
    setEditorOpen(false)
  }

  async function handleEditorDelete() {
    if (!editorEntry) return
    await pb.collection('shift_entries').delete(editorEntry.id, { requestKey: null })
    setEntries(prev => prev.filter(e => e.id !== editorEntry.id))
    setEditorOpen(false)
  }

  // ── Shift-DnD ─────────────────────────────────────────────────────
  async function handleShiftDrop(entryId: string, toEmpId: string, toDate: string) {
    const updated = await pb.collection('shift_entries').update<ShiftEntry>(entryId, {
      employee: toEmpId,
      date: toDate,
      department: employees.find(e => e.id === toEmpId)?.department ?? '',
    }, { requestKey: null })
    setEntries(prev => prev.map(e => e.id === entryId ? updated : e))
  }

  // ── Publish ───────────────────────────────────────────────────────
  const [publishOpen, setPublishOpen] = useState(false)

  async function handlePublish(notify: boolean) {
    if (!plan) return
    await pb.collection('shift_plans').update(plan.id, { status: 'published' }, { requestKey: null })
    await Promise.all(
      entries.map(e =>
        pb.collection('shift_entries').update(e.id, { status: 'published' }, { requestKey: null }),
      ),
    )
    if (notify) {
      const affectedEmpIds = [...new Set(entries.map(e => e.employee))]
      await Promise.all(
        affectedEmpIds.map(empId =>
          notifyEmployee(
            empId,
            'shift_published',
            'Dienstplan veröffentlicht',
            `Dein Dienstplan für ${weekLabel} wurde veröffentlicht.`,
          ),
        ),
      )
    }
    setPlan(prev => prev ? { ...prev, status: 'published' } : prev)
    setEntries(prev => prev.map(e => ({ ...e, status: 'published' })))
  }

  // ── Hilfs-Daten für PublishDialog ─────────────────────────────────
  const affectedEmpIds   = useMemo(() => [...new Set(entries.map(e => e.employee))], [entries])
  const affectedDeptIds  = useMemo(() => [...new Set(entries.map(e => e.department))], [entries])

  // ── Editor-Hilfsdaten ─────────────────────────────────────────────
  const editorEmp = employees.find(e => e.id === editorEmpId)
  const editorDay = days.find((d: WeekDay) => d.date === editorDate)
  const editorDayLabel = editorDay ? `${editorDay.dayName} ${editorDay.label}` : ''

  // ── JSX ───────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-4">
      {/* Controls-Leiste */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Wochennavigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            aria-label="Vorherige Woche"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[200px] text-center">
            {weekLabel}
          </span>
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            aria-label="Nächste Woche"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="ml-1 text-xs text-indigo-600 hover:underline"
          >
            Heute
          </button>
        </div>

        {/* Abteilungs-Selektor (nur GF sieht "Alle") */}
        {role === 'gf' && departments.length > 0 && (
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="text-sm border border-[#E5E7EB] rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Alle Abteilungen</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}

        {/* Status-Badge */}
        <div className="ml-auto flex items-center gap-2">
          {plan && (
            <span className={cn(
              'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium',
              plan.status === 'published'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700',
            )}>
              {plan.status === 'published'
                ? <><Check className="w-3 h-3" /> Veröffentlicht</>
                : <><AlertCircle className="w-3 h-3" /> Entwurf</>
              }
            </span>
          )}

          {/* Veröffentlichen-Button */}
          {plan?.status !== 'published' && editableDepts.length > 0 && entries.length > 0 && (
            <button
              onClick={() => setPublishOpen(true)}
              className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 transition-colors font-medium"
            >
              Veröffentlichen
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {planLoading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          Lade Dienstplan…
        </div>
      ) : (
        <WeekGrid
          days={days}
          departments={shownDepts}
          employees={employees}
          entries={entries}
          rowOrder={rowOrder}
          editableDepts={editableDepts}
          onCellClick={handleCellClick}
          onShiftDrop={handleShiftDrop}
          onRowReorder={handleRowReorder}
        />
      )}

      {/* ShiftEditor */}
      <ShiftEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleEditorSave}
        onDelete={editorEntry ? handleEditorDelete : undefined}
        employeeName={editorEmp ? `${editorEmp.first_name} ${editorEmp.last_name}` : ''}
        dayLabel={editorDayLabel}
        initial={editorEntry ? {
          start_time:  editorEntry.start_time,
          end_time:    editorEntry.end_time,
          color:       editorEntry.color,
          start_time2: editorEntry.start_time2,
          end_time2:   editorEntry.end_time2,
          color2:      editorEntry.color2,
          note:        editorEntry.note,
          note2:       editorEntry.note2,
        } : undefined}
        isEdit={!!editorEntry}
      />

      {/* PublishDialog */}
      <PublishDialog
        open={publishOpen}
        weekLabel={weekLabel}
        deptCount={affectedDeptIds.length}
        empCount={affectedEmpIds.length}
        onClose={() => setPublishOpen(false)}
        onPublish={handlePublish}
      />
    </div>
  )
}
