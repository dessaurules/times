import { useState, useEffect, useRef, useMemo } from 'react'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { de } from 'date-fns/locale'
import { Check, XCircle, Plus, X, LogOut, SlidersHorizontal, UserCheck, UserX, Bell, CalendarX, type LucideIcon } from 'lucide-react'
import GridLayout, { WidthProvider } from 'react-grid-layout/legacy'
import type { Layout, LayoutItem } from 'react-grid-layout/legacy'
import { pb } from '../lib/pb'
import { useAuthStore } from '../stores/auth'
import type { Employee, Absence, TimeEntry } from '@shared/types'
import { ABSENCE_COLORS } from '@shared/types'
import { cn } from '@/lib/utils'
import { notifyEmployee } from '../lib/notifications'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

const RGL = WidthProvider(GridLayout)

// ── Widget-Definitionen ────────────────────────────────────────────────────
const WIDGET_IDS = [
  'stat-eingestempelt', 'stat-abwesend', 'stat-genehmigungen', 'stat-resturlaub',
  'antraege', 'abwesend', 'arbeitszeiten',
  'stat-ueberstunden', 'stat-krankmeldungen', 'geburtstage', 'dokumente-ablauf',
] as const
type WidgetId = typeof WIDGET_IDS[number]

const WIDGET_META: Record<WidgetId, { label: string }> = {
  'stat-eingestempelt':  { label: 'Eingestempelt heute' },
  'stat-abwesend':       { label: 'Abwesend heute' },
  'stat-genehmigungen':  { label: 'Offene Genehmigungen' },
  'stat-resturlaub':     { label: 'Resturlaub-Verfall' },
  'antraege':            { label: 'Anträge' },
  'abwesend':            { label: 'Heute abwesend' },
  'arbeitszeiten':       { label: 'Arbeitszeiten heute' },
  'stat-ueberstunden':   { label: 'Überstunden diese Woche' },
  'stat-krankmeldungen': { label: 'Krankmeldungen' },
  'geburtstage':         { label: 'Geburtstage im Monat' },
  'dokumente-ablauf':    { label: 'Ablaufende Verträge' },
}

const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: 'stat-eingestempelt',  x: 0, y: 0, w: 1, h: 1 },
  { i: 'stat-abwesend',       x: 1, y: 0, w: 1, h: 1 },
  { i: 'stat-genehmigungen',  x: 2, y: 0, w: 1, h: 1 },
  { i: 'stat-resturlaub',     x: 3, y: 0, w: 1, h: 1 },
  { i: 'antraege',            x: 0, y: 1, w: 2, h: 2 },
  { i: 'abwesend',            x: 2, y: 1, w: 2, h: 2 },
  { i: 'arbeitszeiten',       x: 0, y: 4, w: 4, h: 2 },
]

const LS_KEY        = 'chef-dashboard-layout-v3'
const LS_MANUAL_KEY = 'chef-dashboard-manual-resize-v2'

const AUTO_RESIZE_IDS = new Set(['antraege', 'abwesend', 'arbeitszeiten'])
const ROW_H = 160, MAR_Y = 16

function pxToRows(px: number, min: number): number {
  return Math.max(min, Math.ceil((px + MAR_Y) / (ROW_H + MAR_Y)))
}

function useGridLayout() {
  const [manualResized, setManualResized] = useState<Set<string>>(() => {
    try {
      const s = localStorage.getItem(LS_MANUAL_KEY)
      return s ? new Set(JSON.parse(s) as string[]) : new Set()
    } catch { return new Set() }
  })

  function markManualResize(id: string) {
    setManualResized(prev => {
      const next = new Set(prev).add(id)
      localStorage.setItem(LS_MANUAL_KEY, JSON.stringify([...next]))
      return next
    })
  }

  const [layout, setLayout] = useState<LayoutItem[]>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as LayoutItem[]
        const valid = parsed.filter(l => (WIDGET_IDS as readonly string[]).includes(l.i))
        const missing = DEFAULT_LAYOUT.filter(d => !valid.some(v => v.i === d.i))
        return [...valid, ...missing]
      }
    } catch {}
    return DEFAULT_LAYOUT
  })

  const visible = layout.map(l => l.i as WidgetId).filter(id => (WIDGET_IDS as readonly string[]).includes(id))
  const hidden = WIDGET_IDS.filter(id => !visible.includes(id))

  function saveLayout(next: LayoutItem[] | Layout) {
    const arr = Array.isArray(next) ? next : [...next]
    setLayout(arr as LayoutItem[])
    localStorage.setItem(LS_KEY, JSON.stringify(arr))
  }

  function removeWidget(id: WidgetId) {
    setLayout(prev => {
      const next = prev.filter(l => l.i !== id)
      localStorage.setItem(LS_KEY, JSON.stringify(next))
      return next
    })
  }

  function addWidget(id: WidgetId) {
    setLayout(prev => {
      const stub: LayoutItem = { i: id, x: 0, y: Infinity, w: 2, h: 2 }
      const next = [...prev, stub]
      localStorage.setItem(LS_KEY, JSON.stringify(next))
      return next
    })
  }

  return { layout, setLayout, visible, hidden, saveLayout, removeWidget, addWidget, manualResized, markManualResize }
}

type AbsenceExp   = Absence   & { expand?: { employee?: Employee } }
type TimeEntryExp = TimeEntry & { expand?: { employee?: Employee } }

interface StempelRow {
  employee:    Employee
  sinceLabel:  string
  totalMins:   number
  isActive:    boolean
  openEntryId: string | undefined
}

interface DashData {
  activeTotal:    number
  absentToday:    AbsenceExp[]
  pending:        AbsenceExp[]
  carryOverCount: number
}

function fmtMins(mins: number) {
  const h = Math.floor(Math.abs(mins) / 60)
  const m = Math.abs(mins) % 60
  return `${h}:${String(m).padStart(2, '0')} h`
}

export default function Dashboard() {
  const user       = useAuthStore(s => s.user)
  const canApprove = user?.role === 'gf'
  const today      = format(new Date(), 'yyyy-MM-dd')

  const { layout, setLayout, visible, hidden, saveLayout, removeWidget, addWidget, manualResized, markManualResize } = useGridLayout()
  const [editMode,  setEditMode]  = useState(false)

  const [data,    setData]    = useState<DashData>({ activeTotal: 0, absentToday: [], pending: [], carryOverCount: 0 })
  const [loading, setLoading] = useState(true)
  const [timeEntries,  setTimeEntries]  = useState<TimeEntryExp[]>([])
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [now,          setNow]          = useState(new Date())

  const [showClockInForm, setShowClockInForm] = useState(false)
  const [clockInEmpId,    setClockInEmpId]    = useState('')
  const [clockInBusy,     setClockInBusy]     = useState(false)

  const [antragTab,      setAntragTab]      = useState<'pending' | 'verlauf'>('pending')
  const [verlauf,        setVerlauf]        = useState<AbsenceExp[]>([])
  const [verlaufFilter,  setVerlaufFilter]  = useState('')
  const [verlaufLoading, setVerlaufLoading] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const from = `${today} 00:00:00`
        const to   = `${today} 23:59:59`
        const [empList, absentList, pendingList, carryList, timeList, empFullList] = await Promise.all([
          pb.collection('employees').getList(1, 1, { filter: 'active = true', requestKey: null }),
          pb.collection('absences').getFullList<AbsenceExp>({
            filter: `date_from <= "${today}" && date_to >= "${today}" && status = "approved"`,
            expand: 'employee', requestKey: null,
          }),
          pb.collection('absences').getFullList<AbsenceExp>({
            filter: 'status = "pending"', sort: 'date_from', expand: 'employee', requestKey: null,
          }),
          pb.collection('vacation_accounts').getList(1, 1, {
            filter: `year = ${new Date().getFullYear()} && carry_over > 0`, requestKey: null,
          }).catch(() => ({ totalItems: 0 })),
          pb.collection('time_entries').getFullList<TimeEntryExp>({
            filter: `start_time >= "${from}" && start_time <= "${to}"`,
            sort: 'employee,start_time', expand: 'employee', requestKey: null,
          }),
          pb.collection('employees').getFullList<Employee>({
            filter: 'active = true', sort: 'last_name,first_name', requestKey: null,
          }),
        ])
        setData({
          activeTotal:    empList.totalItems,
          absentToday:    absentList,
          pending:        pendingList,
          carryOverCount: carryList.totalItems,
        })
        setTimeEntries(timeList)
        setAllEmployees(empFullList)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [today])

  const unsubTimeRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    pb.collection('time_entries').subscribe<TimeEntryExp>('*', (e) => {
      const entryDate = e.record.start_time.slice(0, 10)
      if (e.action === 'create') {
        if (entryDate !== today) return
        pb.collection('time_entries').getOne<TimeEntryExp>(e.record.id, {
          expand: 'employee', requestKey: null,
        }).then(full => setTimeEntries(prev => [...prev, full])).catch(() => {
          setTimeEntries(prev => [...prev, e.record])
        })
      } else if (e.action === 'update') {
        setTimeEntries(prev => prev.map(t =>
          t.id === e.record.id ? { ...e.record, expand: t.expand } : t
        ))
      } else if (e.action === 'delete') {
        setTimeEntries(prev => prev.filter(t => t.id !== e.record.id))
      }
    }, { requestKey: null }).then(fn => { unsubTimeRef.current = fn })
    return () => { unsubTimeRef.current?.(); pb.collection('time_entries').unsubscribe('*') }
  }, [today])

  useEffect(() => {
    if (antragTab !== 'verlauf') return
    setVerlaufLoading(true)
    pb.collection('absences').getList<AbsenceExp>(1, 50, {
      filter: 'status = "approved" || status = "rejected"',
      sort: '-updated', expand: 'employee', requestKey: null,
    }).then(r => setVerlauf(r.items))
      .catch(console.error)
      .finally(() => setVerlaufLoading(false))
  }, [antragTab])

  const stempel = useMemo(() => {
    const byEmp = new Map<string, { emp: Employee; entries: TimeEntryExp[] }>()
    for (const e of timeEntries) {
      const emp = e.expand?.employee
      if (!emp) continue
      if (!byEmp.has(e.employee)) byEmp.set(e.employee, { emp, entries: [] })
      byEmp.get(e.employee)!.entries.push(e)
    }
    const rows: StempelRow[] = []
    for (const { emp, entries } of byEmp.values()) {
      const open  = entries.find(e => !e.end_time)
      const first = entries[0]
      const last  = entries[entries.length - 1]
      const total = entries.reduce((sum, e) => {
        const end   = e.end_time ? parseISO(e.end_time) : now
        const gross = differenceInMinutes(end, parseISO(e.start_time))
        return sum + Math.max(0, gross - (e.break_minutes ?? 0))
      }, 0)
      rows.push({
        employee:    emp,
        sinceLabel:  open
          ? `seit ${format(parseISO(open.start_time), 'HH:mm')} Uhr`
          : `${format(parseISO(first.start_time), 'HH:mm')} – ${format(parseISO(last.end_time!), 'HH:mm')} Uhr`,
        totalMins:   total,
        isActive:    !!open,
        openEntryId: open?.id,
      })
    }
    rows.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      return a.employee.last_name.localeCompare(b.employee.last_name)
    })
    return rows
  }, [timeEntries, now])

  useEffect(() => {
    if (loading) return
    const ideal: Record<string, number> = {
      antraege:      pxToRows(42 + 40 + Math.max(38, data.pending.length * 38), 1),
      abwesend:      pxToRows(42 + 40 + Math.max(30, Math.ceil(data.absentToday.length / 3) * 30), 1),
      arbeitszeiten: pxToRows(42 + Math.max(38, stempel.length * 38), 1),
    }
    setLayout(prev => {
      let changed = false
      const next = prev.map(l => {
        if (!AUTO_RESIZE_IDS.has(l.i) || manualResized.has(l.i)) return l
        const h = ideal[l.i]
        if (h === undefined || h === l.h) return l
        changed = true
        return { ...l, h }
      })
      if (!changed) return prev
      localStorage.setItem(LS_KEY, JSON.stringify(next))
      return next
    })
  }, [loading, data.pending.length, data.absentToday.length, stempel.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function absDateLabel(abs: Absence) {
    return abs.date_from === abs.date_to
      ? format(parseISO(abs.date_from), 'dd.MM.yyyy', { locale: de })
      : `${format(parseISO(abs.date_from), 'dd.MM.', { locale: de })} – ${format(parseISO(abs.date_to), 'dd.MM.yyyy', { locale: de })}`
  }

  async function handleApprove(absenceId: string) {
    const abs = data.pending.find(a => a.id === absenceId)
    await pb.collection('absences').update(absenceId, {
      status: 'approved', approved_by: user!.id, approved_at: new Date().toISOString(),
    })
    setData(prev => {
      const a          = prev.pending.find(x => x.id === absenceId)
      const newPending = prev.pending.filter(x => x.id !== absenceId)
      const isToday    = a && a.date_from <= today && a.date_to >= today
      return {
        ...prev,
        pending:     newPending,
        absentToday: isToday && a ? [...prev.absentToday, { ...a, status: 'approved' }] : prev.absentToday,
      }
    })
    if (abs) {
      notifyEmployee(abs.employee, 'absence_approved', 'Antrag genehmigt',
        `Dein ${abs.type}-Antrag (${absDateLabel(abs)}) wurde genehmigt.`, abs.id)
    }
  }

  async function handleReject(absenceId: string) {
    const abs = data.pending.find(a => a.id === absenceId)
    await pb.collection('absences').update(absenceId, { status: 'rejected' })
    setData(prev => ({ ...prev, pending: prev.pending.filter(a => a.id !== absenceId) }))
    if (abs) {
      notifyEmployee(abs.employee, 'absence_rejected', 'Antrag abgelehnt',
        `Dein ${abs.type}-Antrag (${absDateLabel(abs)}) wurde leider abgelehnt.`, abs.id)
    }
  }

  async function handleClockOut(entryId: string) {
    const endTime = new Date().toISOString()
    await pb.collection('time_entries').update(entryId, { end_time: endTime })
    setTimeEntries(prev => prev.map(e => e.id === entryId ? { ...e, end_time: endTime } : e))
  }

  async function handleClockIn(employeeId: string) {
    setClockInBusy(true)
    try {
      const created = await pb.collection('time_entries').create<TimeEntryExp>({
        employee: employeeId, start_time: new Date().toISOString(),
      }, { expand: 'employee', requestKey: null })
      setTimeEntries(prev => [...prev, created])
      setShowClockInForm(false)
      setClockInEmpId('')
    } finally {
      setClockInBusy(false)
    }
  }

  const presentToday    = stempel.length
  const absentBreakdown = data.absentToday.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1; return acc
  }, {} as Record<string, number>)
  const absentSub = Object.entries(absentBreakdown).map(([t, n]) => `${t}: ${n}`).join(' · ') || '–'

  const verlaufEmployees = [...new Map(
    verlauf.map(a => a.expand?.employee).filter((e): e is Employee => !!e).map(e => [e.id, e])
  ).values()]
  const filteredVerlauf = verlaufFilter ? verlauf.filter(a => a.employee === verlaufFilter) : verlauf

  function renderAntraege() {
    return (
      <Card className="h-full">
        <CardHeader className="p-0 border-b-0">
          <div className="flex w-full">
            <button
              onClick={() => setAntragTab('pending')}
              className={cn(
                'flex-1 py-3 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                antragTab === 'pending'
                  ? 'text-[#4F46E5] border-b-2 border-[#4F46E5] bg-[#EEF2FF]'
                  : 'text-[#6B7280] hover:bg-[#F9FAFB]'
              )}
            >
              Ausstehend{data.pending.length > 0 ? ` (${data.pending.length})` : ''}
            </button>
            <button
              onClick={() => setAntragTab('verlauf')}
              className={cn(
                'flex-1 py-3 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                antragTab === 'verlauf'
                  ? 'text-[#4F46E5] border-b-2 border-[#4F46E5] bg-[#EEF2FF]'
                  : 'text-[#6B7280] hover:bg-[#F9FAFB]'
              )}
            >
              Verlauf
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {antragTab === 'pending' ? (
            <>
              {data.pending.length === 0 ? (
                <p className="text-sm text-[#6B7280]">Keine offenen Genehmigungen.</p>
              ) : data.pending.map(abs => {
                const emp    = abs.expand?.employee
                const colors = ABSENCE_COLORS[abs.type]
                const days   = calcDays(abs.date_from, abs.date_to)
                const dateLabel = abs.date_from === abs.date_to
                  ? format(parseISO(abs.date_from), 'dd.MM.yyyy', { locale: de })
                  : `${format(parseISO(abs.date_from), 'dd.MM.', { locale: de })}–${format(parseISO(abs.date_to), 'dd.MM.yyyy', { locale: de })}`
                return (
                  <div key={abs.id} className="flex items-center gap-2 py-2.5 border-b border-[#E5E7EB] last:border-0 text-sm">
                    <span className="font-semibold text-[#111827] min-w-[130px] truncate">
                      {emp ? `${emp.last_name}, ${emp.first_name}` : '—'}
                    </span>
                    <span className="text-[#6B7280] flex-1 text-xs whitespace-nowrap">
                      {dateLabel} · {days} T
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded shrink-0"
                      style={{ backgroundColor: colors.bg, color: colors.text }}>
                      {abs.type}
                    </span>
                    {canApprove && (
                      <>
                        <button onClick={() => handleApprove(abs.id)} title="Genehmigen"
                          className="p-1 rounded text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 shrink-0">
                          <Check size={13} />
                        </button>
                        <button onClick={() => handleReject(abs.id)} title="Ablehnen"
                          className="p-1 rounded text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 shrink-0">
                          <XCircle size={13} />
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
            </>
          ) : (
            <>
              {verlaufLoading ? (
                <p className="text-sm text-[#6B7280]">Lade…</p>
              ) : (
                <>
                  {verlaufEmployees.length > 1 && (
                    <div className="mb-3">
                      <select
                        value={verlaufFilter}
                        onChange={e => setVerlaufFilter(e.target.value)}
                        className="text-xs border border-[#E5E7EB] rounded px-2 py-1.5 text-[#6B7280] outline-none focus:border-[#4F46E5] bg-white"
                      >
                        <option value="">Alle Mitarbeiter</option>
                        {verlaufEmployees.map(e => (
                          <option key={e.id} value={e.id}>{e.last_name}, {e.first_name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {filteredVerlauf.length === 0 ? (
                    <p className="text-sm text-[#6B7280]">Kein Verlauf vorhanden.</p>
                  ) : (
                    <div>
                      {filteredVerlauf.map(abs => {
                        const emp      = abs.expand?.employee
                        const colors   = ABSENCE_COLORS[abs.type]
                        const approved = abs.status === 'approved'
                        const dateLabel = abs.date_from === abs.date_to
                          ? format(parseISO(abs.date_from), 'dd.MM.yyyy', { locale: de })
                          : `${format(parseISO(abs.date_from), 'dd.MM.', { locale: de })}–${format(parseISO(abs.date_to), 'dd.MM.yyyy', { locale: de })}`
                        return (
                          <div key={abs.id} className="flex items-center gap-2 py-2 border-b border-[#F3F4F6] last:border-0">
                            <span className="font-medium text-[#111827] text-xs min-w-[100px] truncate">
                              {emp ? `${emp.last_name}, ${emp.first_name}` : '—'}
                            </span>
                            <span className="text-[#6B7280] flex-1 text-xs whitespace-nowrap">{dateLabel}</span>
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0"
                              style={{ backgroundColor: colors.bg, color: colors.text }}>
                              {abs.type}
                            </span>
                            <span className={cn(
                              'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                              approved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            )}>
                              {approved ? '✓ Genehmigt' : '✕ Abgelehnt'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  function renderAbwesend() {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Heute abwesend · {format(new Date(), 'dd.MM.yyyy')}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.absentToday.length === 0 ? (
            <p className="text-sm text-[#6B7280]">Alle Mitarbeiter anwesend.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.absentToday.map(abs => {
                const emp    = abs.expand?.employee
                const colors = ABSENCE_COLORS[abs.type]
                return (
                  <span key={abs.id}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: colors.bg, color: colors.text }}>
                    {emp ? `${emp.first_name} ${emp.last_name}` : '—'} · {abs.type}
                  </span>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  function renderArbeitszeiten() {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Arbeitszeiten heute · {format(new Date(), 'dd.MM.yyyy')}</CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-[#111827]">{stempel.filter(r => r.isActive).length}</span>
              <span className="text-xs text-[#6B7280]">eingestempelt</span>
            </div>
            <button
              onClick={() => { setShowClockInForm(v => !v); setClockInEmpId('') }}
              className={cn(
                'p-1 rounded transition-colors',
                showClockInForm ? 'bg-[#E5E7EB] text-[#111827]' : 'text-[#6B7280] hover:bg-[#E5E7EB]'
              )}
              title="Mitarbeiter einstempeln"
            >
              <Plus size={15} />
            </button>
          </div>
        </CardHeader>

        {showClockInForm && (
          <div className="px-5 py-3 border-b border-[#E5E7EB] bg-white flex items-center gap-2">
            <select
              value={clockInEmpId}
              onChange={e => setClockInEmpId(e.target.value)}
              className="flex-1 text-sm border border-[#E5E7EB] rounded px-2 py-1.5 text-[#111827] outline-none focus:border-[#4F46E5] bg-white"
            >
              <option value="">Mitarbeiter wählen…</option>
              {allEmployees.map(e => (
                <option key={e.id} value={e.id}>{e.last_name}, {e.first_name}</option>
              ))}
            </select>
            <button
              disabled={!clockInEmpId || clockInBusy}
              onClick={() => handleClockIn(clockInEmpId)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Plus size={12} />{clockInBusy ? 'Bitte warten…' : 'Einstempeln'}
            </button>
            <button
              onClick={() => setShowClockInForm(false)}
              className="p-1.5 rounded text-[#6B7280] hover:bg-[#E5E7EB] transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <CardContent className="p-0">
          {stempel.length === 0 ? (
            <p className="px-5 py-4 text-sm text-[#6B7280]">Heute noch keine Buchungen.</p>
          ) : (
            <div className="divide-y divide-[#F3F4F6]">
              {stempel.map((row, i) => {
                const prevWasActive = i > 0 && stempel[i - 1].isActive
                const showSeparator = !row.isActive && prevWasActive
                return (
                  <div key={row.employee.id}>
                    {showSeparator && (
                      <div className="px-5 py-1.5 bg-[#F9FAFB]">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                          Ausgestempelt
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 px-5 py-2.5">
                      <span className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        row.isActive ? 'bg-green-500' : 'bg-[#D1D5DB]'
                      )} />
                      <span className="text-sm font-semibold text-[#111827] flex-1">
                        {row.employee.last_name}, {row.employee.first_name}
                      </span>
                      <span className="text-xs text-[#6B7280]">{row.sinceLabel}</span>
                      {row.isActive ? (
                        <span className="text-xs font-bold tabular-nums w-16 text-right text-green-700">
                          {Math.floor(row.totalMins / 60)}
                          <span className="blink">:</span>
                          {String(row.totalMins % 60).padStart(2, '0')} h
                        </span>
                      ) : (
                        <span className="text-xs font-bold tabular-nums w-16 text-right text-[#6B7280]">
                          {fmtMins(row.totalMins)}
                        </span>
                      )}
                      <button
                        onClick={() => row.isActive && row.openEntryId ? handleClockOut(row.openEntryId) : undefined}
                        className={cn(
                          'flex items-center gap-1 text-xs px-2 py-1 rounded border border-[#E5E7EB] text-[#6B7280] hover:bg-[#E5E7EB] transition-colors shrink-0',
                          (!row.isActive || !row.openEntryId) && 'invisible pointer-events-none'
                        )}
                        title="Ausstempeln"
                      >
                        <LogOut size={11} /> Ausstempeln
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const year = new Date().getFullYear()

  function renderWidget(id: WidgetId) {
    switch (id) {
      case 'stat-eingestempelt':
        return <StatCard label="Eingestempelt heute" value={presentToday}            sub={`von ${data.activeTotal} aktiven MA`}     color="green"                                             icon={UserCheck} />
      case 'stat-abwesend':
        return <StatCard label="Abwesend heute"       value={data.absentToday.length} sub={absentSub}                                color={data.absentToday.length > 0 ? 'amber' : 'default'} icon={UserX}     />
      case 'stat-genehmigungen':
        return <StatCard label="Offene Genehmigungen" value={data.pending.length}     sub="Warten auf Freigabe"                      color={data.pending.length > 0 ? 'red' : 'default'}       icon={Bell}      />
      case 'stat-resturlaub':
        return <StatCard label="Resturlaub-Verfall"   value={data.carryOverCount}     sub={`Resturlaub ${year}`}                     color={data.carryOverCount > 0 ? 'amber' : 'default'}     icon={CalendarX} />
      case 'antraege':      return renderAntraege()
      case 'abwesend':      return renderAbwesend()
      case 'arbeitszeiten': return renderArbeitszeiten()
      case 'stat-ueberstunden':
        return <StatCard label="Überstunden diese Woche" value={0} sub="Demnächst verfügbar" color="default" icon={Bell} />
      case 'stat-krankmeldungen':
        return <StatCard label="Krankmeldungen" value={data.absentToday.filter(a => a.type === 'K' || a.type === 'KK').length} sub="Aktuelle K/KK-Einträge" color={data.absentToday.some(a => a.type === 'K' || a.type === 'KK') ? 'red' : 'default'} icon={UserX} />
      case 'geburtstage':
        return <WidgetStub label="Geburtstage im Monat" />
      case 'dokumente-ablauf':
        return <WidgetStub label="Ablaufende Verträge" />
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Dashboard</h1>
          <p className="text-sm capitalize text-[#6B7280]">
            {format(new Date(), 'EEEE, dd. MMMM yyyy', { locale: de })}
          </p>
        </div>
        {editMode ? (
          <button
            onClick={() => setEditMode(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-[#4338CA] transition-colors"
          >
            Fertig
          </button>
        ) : (
          <button
            onClick={() => setEditMode(true)}
            className="p-2 rounded-lg transition-colors border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
            title="Layout anpassen"
          >
            <SlidersHorizontal size={16} />
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-[#6B7280]">Lade…</p>
      ) : (
        <>
          <RGL
            measureBeforeMount
            layout={layout}
            cols={4}
            rowHeight={160}
            isDraggable={editMode}
            isResizable={editMode}
            onLayoutChange={saveLayout}
            onResizeStop={(_l, _old, newItem) => markManualResize(newItem.i)}
            margin={[16, 16]}
            containerPadding={[0, 0]}
            draggableCancel=".widget-no-drag"
          >
            {visible.map(id => (
              <div key={id} className="relative">
                {editMode && (
                  <button
                    onClick={() => removeWidget(id)}
                    className="widget-no-drag absolute top-2 right-2 z-10 w-5 h-5 flex items-center justify-center rounded-full bg-black/20 hover:bg-red-500 text-white transition-colors"
                    title="Widget entfernen"
                  >
                    <X size={12} />
                  </button>
                )}
                {renderWidget(id)}
              </div>
            ))}
          </RGL>

          {editMode && hidden.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 p-4 border border-dashed border-[#E5E7EB] rounded-xl bg-[#F9FAFB]">
              <p className="text-xs text-[#6B7280] w-full mb-1 font-medium">Widget hinzufügen:</p>
              {hidden.map(id => (
                <button
                  key={id}
                  onClick={() => addWidget(id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] text-sm text-[#6B7280] hover:border-[#4F46E5] hover:text-[#4F46E5] transition-colors"
                >
                  <Plus size={13} /> {WIDGET_META[id].label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function calcDays(from: string, to: string): number {
  return Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 86_400_000) + 1
}

function StatCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: number; sub: string; color: 'green' | 'amber' | 'red' | 'default'; icon: LucideIcon
}) {
  const colorMap = {
    green:   { accent: 'bg-green-500',  iconBg: 'bg-green-50',  iconColor: 'text-green-600',  numColor: 'text-green-600'  },
    amber:   { accent: 'bg-amber-500',  iconBg: 'bg-amber-50',  iconColor: 'text-amber-600',  numColor: 'text-amber-600'  },
    red:     { accent: 'bg-red-500',    iconBg: 'bg-red-50',    iconColor: 'text-red-600',    numColor: 'text-red-600'    },
    default: { accent: 'bg-[#4F46E5]', iconBg: 'bg-[#EEF2FF]', iconColor: 'text-[#4F46E5]', numColor: 'text-[#111827]' },
  }[color]
  return (
    <Card className="h-full flex flex-col">
      <div className={`h-1 w-full flex-none ${colorMap.accent}`} />
      <CardContent className="flex-1 flex items-start justify-between gap-3 py-4 px-5">
        <div className="min-w-0">
          <CardTitle className="mb-2 leading-snug">{label}</CardTitle>
          <div className={`text-4xl font-bold leading-none mb-1.5 tabular-nums ${colorMap.numColor}`}>{value}</div>
          <CardDescription className="leading-snug">{sub}</CardDescription>
        </div>
        <div className={`flex-none w-12 h-12 rounded-xl flex items-center justify-center ${colorMap.iconBg}`}>
          <Icon size={22} className={colorMap.iconColor} strokeWidth={1.75} />
        </div>
      </CardContent>
    </Card>
  )
}

function WidgetStub({ label }: { label: string }) {
  return (
    <Card className="h-full">
      <CardContent className="flex items-center justify-center h-full">
        <CardDescription>{label} – demnächst verfügbar</CardDescription>
      </CardContent>
    </Card>
  )
}
