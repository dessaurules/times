import { useState, useEffect, useMemo } from 'react'
import {
  startOfWeek, endOfWeek, addWeeks, subWeeks,
  eachDayOfInterval, format, parseISO, getISOWeek, isToday,
  differenceInMinutes,
} from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Trash2, Save, X } from 'lucide-react'
import { pb } from '../lib/pb'
import { useAuthStore } from '../stores/auth'
import type { Employee, Department, TimeEntry } from '@shared/types'
import { Button } from '../components/ui/button'
import { Input }  from '../components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { loadRowOrder, sortEmployees } from '@/lib/dienstplanUtils'

// ── Pausenregeln ──────────────────────────────────────────────────────────────

export type BreakRule = { minHours: number; breakMins: number }

export const DEFAULT_BREAK_RULES: BreakRule[] = [
  { minHours: 6, breakMins: 30 },
  { minHours: 9, breakMins: 45 },
]

export function calcAutoBreak(startHHMM: string, endHHMM: string, rules: BreakRule[]): number {
  if (!startHHMM || !endHHMM) return 0
  const [sh, sm] = startHHMM.split(':').map(Number)
  const [eh, em] = endHHMM.split(':').map(Number)
  const durationH = ((eh * 60 + em) - (sh * 60 + sm)) / 60
  if (durationH <= 0) return 0
  const sorted = [...rules].sort((a, b) => b.minHours - a.minHours)
  for (const rule of sorted) {
    if (durationH >= rule.minHours) return rule.breakMins
  }
  return 0
}

// ── Helfer ────────────────────────────────────────────────────────────────────

function netMinutes(e: TimeEntry): number {
  if (!e.end_time) return 0
  const ms = new Date(e.end_time).getTime() - new Date(e.start_time).getTime()
  return Math.max(0, Math.round(ms / 60000) - e.break_minutes)
}

function fmtH(mins: number): string {
  if (mins <= 0) return '0 h'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h} h` : `${h}:${String(m).padStart(2, '0')} h`
}

function toLocalHHMM(iso: string): string {
  return format(new Date(iso), 'HH:mm')
}

function toUTC(date: string, hhmm: string): string {
  return new Date(`${date}T${hhmm}:00`).toISOString()
}

function dateKey(iso: string): string {
  return format(new Date(iso), 'yyyy-MM-dd')
}

type EmployeeRow = Employee & { expand?: { department?: Department } }
type ActiveCell  = { empId: string; date: string }

// ── Hauptkomponente ───────────────────────────────────────────────────────────

export default function Zeiterfassung() {
  const user = useAuthStore(s => s.user)

  const [weekStart,   setWeekStart]   = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [employees,   setEmployees]   = useState<EmployeeRow[]>([])
  const [entries,     setEntries]     = useState<TimeEntry[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filterDept,  setFilterDept]  = useState('')
  const [departments, setDepts]       = useState<Department[]>([])
  const [activeCell,  setActiveCell]  = useState<ActiveCell | null>(null)
  const [breakRules,  setBreakRules]  = useState<BreakRule[]>(DEFAULT_BREAK_RULES)
  const [now,         setNow]         = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const rowOrder = useMemo(() => loadRowOrder(format(weekStart, 'yyyy-MM-dd')), [weekStart])

  const weekEnd  = endOfWeek(weekStart, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const kw       = getISOWeek(weekStart)

  // Pausenregeln aus settings laden
  useEffect(() => {
    pb.collection('settings').getFirstListItem<{ value: string }>('key = "break_rules"')
      .then(s => setBreakRules(JSON.parse(s.value)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    pb.collection('departments')
      .getFullList<Department>({ sort: 'sort_order,name' })
      .then(setDepts)
      .catch(console.error)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setActiveCell(null)

    const from = format(weekStart, 'yyyy-MM-dd')
    const to   = format(weekEnd,   'yyyy-MM-dd')
    const empFilter = filterDept
      ? `active = true && department = "${filterDept}"`
      : 'active = true'

    Promise.all([
      pb.collection('employees').getFullList<EmployeeRow>({
        filter: empFilter, expand: 'department', sort: 'last_name,first_name', requestKey: 'zt-emps',
      }),
      pb.collection('time_entries').getFullList<TimeEntry>({
        filter: `start_time >= "${from} 00:00:00" && start_time <= "${to} 23:59:59"`,
        sort: 'start_time', requestKey: 'zt-entries',
      }),
    ]).then(([emps, ents]) => {
      if (cancelled) return
      setEmployees(emps)
      setEntries(ents)
    }).catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [weekStart, filterDept])

  function toggleCell(empId: string, date: string) {
    setActiveCell(prev => prev?.empId === empId && prev?.date === date ? null : { empId, date })
  }

  function addEntry(e: TimeEntry)     { setEntries(prev => [...prev, e]) }
  function updateEntry(e: TimeEntry)  { setEntries(prev => prev.map(x => x.id === e.id ? e : x)) }
  function removeEntry(id: string)    { setEntries(prev => prev.filter(x => x.id !== id)) }

  function weekTotal(empId: string): number {
    return entries.filter(e => e.employee === empId).reduce((s, e) => s + netMinutes(e), 0)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Zeiterfassung</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="h-9 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
          >
            <option value="">Alle Abteilungen</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-md px-1">
            <button onClick={() => setWeekStart(w => subWeeks(w, 1))} className="p-1.5 rounded hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827]">
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
              className="px-3 py-1 text-xs text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded min-w-[200px] text-center"
              title="Zur aktuellen Woche"
            >
              KW {kw} · {format(weekStart, 'dd.MM.', { locale: de })}–{format(weekEnd, 'dd.MM.yyyy', { locale: de })}
            </button>
            <button onClick={() => setWeekStart(w => addWeeks(w, 1))} className="p-1.5 rounded hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827]">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[#6B7280]">Lade…</p>
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[130px] text-left py-1.5">Mitarbeiter</TableHead>
                {weekDays.map(day => (
                  <TableHead key={day.toISOString()} className={cn(
                    'w-[72px] text-center py-1.5',
                    (day.getDay() === 0 || day.getDay() === 6) && 'text-[#6B7280]',
                    isToday(day) && 'text-[#4F46E5]',
                  )}>
                    <div>{format(day, 'EEE', { locale: de })}</div>
                    <div className="font-normal text-[11px] text-[#6B7280]">{format(day, 'dd.MM.', { locale: de })}</div>
                  </TableHead>
                ))}
                <TableHead className="w-[80px] text-right py-1.5 text-[#6B7280] pr-3">Σ Woche</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={weekDays.length + 2} className="text-center py-10 text-[#6B7280]">
                    Keine Mitarbeiter gefunden.
                  </TableCell>
                </TableRow>
              ) : (() => {
                // Mitarbeiter nach Abteilung gruppieren
                const grouped = new Map<string, { deptName: string; deptId: string; emps: EmployeeRow[] }>()
                for (const emp of employees) {
                  const key      = emp.department || '__none__'
                  const deptName = emp.expand?.department?.name ?? 'Ohne Abteilung'
                  if (!grouped.has(key)) grouped.set(key, { deptName, deptId: emp.department, emps: [] })
                  grouped.get(key)!.emps.push(emp)
                }
                return [...grouped.values()].flatMap(({ deptName, deptId, emps }) => {
                  // Reihenfolge wie im Dienstplan (rowOrder aus localStorage)
                  const sortedEmps = sortEmployees(emps, deptId, rowOrder)
                  return [
                  // Abteilungs-Header
                  <TableRow key={`dept-${deptName}`}>
                    <TableCell
                      colSpan={weekDays.length + 2}
                      className="bg-indigo-50 py-1 px-3 text-[11px] font-bold uppercase tracking-wide text-indigo-700 border-y border-indigo-100"
                    >
                      {deptName}
                    </TableCell>
                  </TableRow>,
                  // Mitarbeiter-Zeilen (in Dienstplan-Reihenfolge)
                  ...sortedEmps.flatMap(emp => {
                    const wTotal = weekTotal(emp.id)
                    return [
                      <TableRow key={emp.id}>
                        <TableCell className="w-[130px] py-1.5">
                          <div className="font-medium text-[#111827] text-[13px]">{emp.last_name}, {emp.first_name}</div>
                        </TableCell>
                        {weekDays.map(day => {
                          const dk         = format(day, 'yyyy-MM-dd')
                          const dayEntries = entries.filter(e => e.employee === emp.id && dateKey(e.start_time) === dk)
                          const dayMins    = dayEntries.reduce((s, e) => s + netMinutes(e), 0)
                          const isOpen     = dayEntries.some(e => !e.end_time)
                          const isActive   = activeCell?.empId === emp.id && activeCell?.date === dk
                          const isWeekend  = day.getDay() === 0 || day.getDay() === 6

                          return (
                            <TableCell key={dk} onClick={() => toggleCell(emp.id, dk)} className={cn(
                              'w-[72px] text-center cursor-pointer transition-colors py-1.5',
                              isWeekend && 'bg-[#F9F8F6]',
                              !isWeekend && !isActive && 'hover:bg-[#F3F4F6]',
                              isActive && 'bg-[#EEF2FF]',
                            )}>
                              {isOpen ? (() => {
                                const openEntry = dayEntries.find(e => !e.end_time)!
                                const mins = Math.max(0,
                                  differenceInMinutes(now, parseISO(openEntry.start_time))
                                  - (openEntry.break_minutes ?? 0)
                                )
                                const h  = Math.floor(mins / 60)
                                const mm = String(mins % 60).padStart(2, '0')
                                return (
                                  <span className="text-xs font-bold tabular-nums text-green-700">
                                    {h}<span className="blink">:</span>{mm} h
                                  </span>
                                )
                              })() : dayEntries.length > 0 ? (
                                <span className="text-xs font-semibold text-[#111827]">
                                  {fmtH(dayMins)}
                                </span>
                              ) : (
                                <span className="text-xs text-[#E5E7EB]">—</span>
                              )}
                            </TableCell>
                          )
                        })}
                        <TableCell className="w-[80px] text-right py-1.5 pr-3">
                          <span className="text-xs font-semibold tabular-nums text-[#111827] whitespace-nowrap">
                            {wTotal > 0 ? fmtH(wTotal) : '—'}
                            {emp.weekly_hours > 0 && (
                              <span className="text-[#9CA3AF] font-normal"> / {emp.weekly_hours} h</span>
                            )}
                          </span>
                        </TableCell>
                      </TableRow>,
                      activeCell?.empId === emp.id ? (
                        <TableRow key={`${emp.id}-detail`}>
                          <TableCell colSpan={weekDays.length + 2} className="bg-[#F9FAFB] px-4 py-3">
                          <DayDetailPanel
                              emp={emp}
                              date={activeCell.date}
                              entries={entries.filter(e => e.employee === emp.id && dateKey(e.start_time) === activeCell.date)}
                              breakRules={breakRules}
                              currentUserId={user?.id ?? ''}
                              onAdd={addEntry}
                              onUpdate={updateEntry}
                              onDelete={removeEntry}
                              onClose={() => setActiveCell(null)}
                            />
                          </TableCell>
                        </TableRow>
                      ) : null,
                    ]
                  })
                  ]
                })
              })()}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ── Detail-Panel ──────────────────────────────────────────────────────────────

function DayDetailPanel({ emp, date, entries, breakRules, currentUserId, onAdd, onUpdate, onDelete, onClose }: {
  emp:           EmployeeRow
  date:          string
  entries:       TimeEntry[]
  breakRules:    BreakRule[]
  currentUserId: string
  onAdd:         (e: TimeEntry) => void
  onUpdate:      (e: TimeEntry) => void
  onDelete:      (id: string) => void
  onClose:       () => void
}) {
  const [showNew, setShowNew] = useState(entries.length === 0)
  const dateLabel = format(parseISO(date), 'EEEE, dd. MMMM yyyy', { locale: de })

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-sm font-semibold text-[#111827]">{emp.last_name}, {emp.first_name}</span>
          <span className="text-xs text-[#6B7280] ml-2 capitalize">{dateLabel}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-[#F3F4F6] text-[#6B7280]">
          <X size={15} />
        </button>
      </div>

      {entries.length > 0 && (
        <div className="mb-3 space-y-1">
          {entries.map(entry => (
            <EntryRow key={entry.id} entry={entry} date={date} breakRules={breakRules}
              currentUserId={currentUserId} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </div>
      )}

      {showNew ? (
        <NewEntryForm
          empId={emp.id} date={date} breakRules={breakRules} currentUserId={currentUserId}
          onSave={e => { onAdd(e); setShowNew(false) }}
          onCancel={() => setShowNew(false)}
          canCancel={entries.length > 0}
        />
      ) : (
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 text-sm text-[#4F46E5] hover:text-[#4338CA] font-medium mt-1">
          <Plus size={15} /> Eintrag hinzufügen
        </button>
      )}
    </div>
  )
}

// ── Eintrag-Zeile ─────────────────────────────────────────────────────────────

function EntryRow({ entry, date, breakRules, currentUserId, onUpdate, onDelete }: {
  entry:         TimeEntry
  date:          string
  breakRules:    BreakRule[]
  currentUserId: string
  onUpdate:      (e: TimeEntry) => void
  onDelete:      (id: string) => void
}) {
  const [editing,    setEditing]    = useState(false)
  const [start,      setStart]      = useState(toLocalHHMM(entry.start_time))
  const [end,        setEnd]        = useState(entry.end_time ? toLocalHHMM(entry.end_time) : '')
  const [pause,      setPause]      = useState(String(entry.break_minutes))
  const [pauseManual, setPauseManual] = useState(false)
  const [note,       setNote]       = useState(entry.note ?? '')
  const [saving,     setSaving]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  // Auto-Pause beim Bearbeiten
  useEffect(() => {
    if (!editing || pauseManual) return
    if (start && end) {
      setPause(String(calcAutoBreak(start, end, breakRules)))
    }
  }, [start, end, breakRules, editing, pauseManual])

  const netto = netMinutes(entry)

  async function handleSave() {
    setSaving(true)
    try {
      const data: Record<string, unknown> = {
        start_time:    toUTC(date, start),
        break_minutes: parseInt(pause) || 0,
        note:          note || '',
        corrected_by:  currentUserId,
      }
      if (end) data.end_time = toUTC(date, end)
      const updated = await pb.collection('time_entries').update<TimeEntry>(entry.id, data)
      onUpdate(updated)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    await pb.collection('time_entries').delete(entry.id)
    onDelete(entry.id)
  }

  if (confirmDel) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm">
        <span className="text-red-700 flex-1">Eintrag löschen?</span>
        <Button size="sm" variant="destructive" onClick={handleDelete}>Ja</Button>
        <Button size="sm" variant="outline" onClick={() => setConfirmDel(false)}>Nein</Button>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#4F46E5]/30 rounded-md">
        <TimeInput label="Von" value={start} onChange={v => { setStart(v); setPauseManual(false) }} />
        <TimeInput label="Bis" value={end}   onChange={v => { setEnd(v);   setPauseManual(false) }} />
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[10px] text-[#6B7280]">Pause (min)</span>
            {!pauseManual && <span className="text-[10px] text-[#4F46E5]">auto</span>}
          </div>
          <Input type="number" min={0} max={120} step={5} value={pause}
            onChange={e => { setPause(e.target.value); setPauseManual(true) }}
            className="h-7 w-16 text-xs px-2" />
        </div>
        <div className="flex-1">
          <div className="text-[10px] text-[#6B7280] mb-0.5">Notiz</div>
          <Input value={note} onChange={e => setNote(e.target.value)} className="h-7 text-xs" placeholder="optional" />
        </div>
        <div className="flex gap-1 mt-4">
          <button onClick={handleSave} disabled={saving} className="p-1.5 rounded bg-[#4F46E5] hover:bg-[#4338CA] text-white">
            <Save size={13} />
          </button>
          <button onClick={() => setEditing(false)} className="p-1.5 rounded hover:bg-[#F3F4F6] text-[#6B7280]">
            <X size={13} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-white border border-[#E5E7EB] rounded-md group">
      <span className="text-sm text-[#111827] font-medium tabular-nums w-24">
        {toLocalHHMM(entry.start_time)} – {entry.end_time ? toLocalHHMM(entry.end_time) : <span className="text-[#4F46E5]">läuft</span>}
      </span>
      <span className="text-xs text-[#6B7280] w-20">
        {entry.break_minutes > 0 ? `${entry.break_minutes} min Pause` : 'keine Pause'}
      </span>
      <span className="text-sm font-semibold text-[#111827] w-12 tabular-nums">
        {netto > 0 ? fmtH(netto) : '—'}
      </span>
      {entry.note && <span className="text-xs text-[#6B7280] flex-1 truncate">{entry.note}</span>}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
        <button onClick={() => { setEditing(true); setPauseManual(false) }}
          className="p-1 rounded hover:bg-[#F3F4F6] text-[#6B7280] text-xs">
          Bearbeiten
        </button>
        <button onClick={() => setConfirmDel(true)} className="p-1 rounded hover:bg-red-50 text-[#6B7280] hover:text-red-600">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Neuer Eintrag ─────────────────────────────────────────────────────────────

function NewEntryForm({ empId, date, breakRules, currentUserId, onSave, onCancel, canCancel }: {
  empId:         string
  date:          string
  breakRules:    BreakRule[]
  currentUserId: string
  onSave:        (e: TimeEntry) => void
  onCancel:      () => void
  canCancel:     boolean
}) {
  const [start,       setStart]       = useState('08:00')
  const [end,         setEnd]         = useState('')
  const [pause,       setPause]       = useState('0')
  const [pauseManual, setPauseManual] = useState(false)
  const [note,        setNote]        = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  // Auto-Pause wenn Von+Bis gesetzt
  useEffect(() => {
    if (pauseManual) return
    if (start && end) {
      setPause(String(calcAutoBreak(start, end, breakRules)))
    } else {
      setPause('0')
    }
  }, [start, end, breakRules, pauseManual])

  async function handleSave() {
    if (!start) return
    setSaving(true)
    setError(null)
    try {
      const data: Record<string, unknown> = {
        employee:      empId,
        start_time:    toUTC(date, start),
        break_minutes: parseInt(pause) || 0,
        note:          note || '',
        created_by:    currentUserId,
      }
      if (end) data.end_time = toUTC(date, end)
      const created = await pb.collection('time_entries').create<TimeEntry>(data)
      onSave(created)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-dashed border-[#4F46E5]/40 rounded-md p-3 bg-[#EEF2FF]">
      <div className="text-xs font-medium text-[#4F46E5] mb-2">Neuer Eintrag</div>
      {error && <div className="mb-2 text-xs text-red-600">{error}</div>}
      <div className="flex items-end gap-2 flex-wrap">
        <TimeInput label="Von *" value={start} onChange={v => { setStart(v); setPauseManual(false) }} />
        <TimeInput label="Bis"   value={end}   onChange={v => { setEnd(v);   setPauseManual(false) }} />
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[10px] text-[#6B7280]">Pause (min)</span>
            {!pauseManual && end && <span className="text-[10px] text-[#4F46E5]">auto</span>}
          </div>
          <Input type="number" min={0} max={120} step={5} value={pause}
            onChange={e => { setPause(e.target.value); setPauseManual(true) }}
            className="h-7 w-16 text-xs px-2" />
        </div>
        <div className="flex-1 min-w-[120px]">
          <div className="text-[10px] text-[#6B7280] mb-0.5">Notiz</div>
          <Input value={note} onChange={e => setNote(e.target.value)} className="h-7 text-xs" placeholder="optional" />
        </div>
        <div className="flex gap-1">
          <Button size="sm" onClick={handleSave} disabled={saving || !start}>
            <Save size={13} /> {saving ? 'Speichere…' : 'Speichern'}
          </Button>
          {canCancel && <Button size="sm" variant="outline" onClick={onCancel}>Abbrechen</Button>}
        </div>
      </div>
    </div>
  )
}

// ── Zeiteingabe ───────────────────────────────────────────────────────────────

function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-[10px] text-[#6B7280] mb-0.5">{label}</div>
      <Input type="time" value={value} onChange={e => onChange(e.target.value)} className="h-7 w-24 text-xs px-2" />
    </div>
  )
}
