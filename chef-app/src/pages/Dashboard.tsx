import { useState, useEffect, useMemo } from 'react'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { de } from 'date-fns/locale'
import { Check, XCircle, Plus, X, LogOut, SlidersHorizontal } from 'lucide-react'
import GridLayout, { WidthProvider } from 'react-grid-layout/legacy'
import type { Layout, LayoutItem } from 'react-grid-layout/legacy'
import { pb } from '../lib/pb'
import { useAuthStore } from '../stores/auth'
import type { Employee, Absence, TimeEntry } from '@shared/types'
import { ABSENCE_COLORS } from '@shared/types'
import { cn } from '@/lib/utils'
import { notifyEmployee } from '../lib/notifications'

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
  { i: 'antraege',            x: 0, y: 1, w: 2, h: 3 },
  { i: 'abwesend',            x: 2, y: 1, w: 2, h: 2 },
  { i: 'arbeitszeiten',       x: 0, y: 4, w: 4, h: 3 },
]

const LS_KEY = 'chef-dashboard-layout-v2'

function useGridLayout() {
  const [layout, setLayout] = useState<LayoutItem[]>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as LayoutItem[]
        // Nur bekannte Widget-IDs behalten
        const valid = parsed.filter(l => (WIDGET_IDS as readonly string[]).includes(l.i))
        // Fehlende Default-Widgets ans Ende anhängen
        const missing = DEFAULT_LAYOUT.filter(d => !valid.some(v => v.i === d.i))
        return [...valid, ...missing]
      }
    } catch {}
    return DEFAULT_LAYOUT
  })

  // Direkt aus layout abgeleitet – kein separater State
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

  return { layout, visible, hidden, saveLayout, removeWidget, addWidget }
}

// ── Hilfstypen ─────────────────────────────────────────────────────────────
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

// ── Dashboard ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const user       = useAuthStore(s => s.user)
  const canApprove = user?.role === 'gf'
  const today      = format(new Date(), 'yyyy-MM-dd')

  const { layout, visible, hidden, saveLayout, removeWidget, addWidget } = useGridLayout()
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

  // ── Abgeleitete Werte ─────────────────────────────────────────────────────
  const presentToday    = stempel.length
  const absentBreakdown = data.absentToday.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1; return acc
  }, {} as Record<string, number>)
  const absentSub = Object.entries(absentBreakdown).map(([t, n]) => `${t}: ${n}`).join(' · ') || '–'

  const verlaufEmployees = [...new Map(
    verlauf.map(a => a.expand?.employee).filter((e): e is Employee => !!e).map(e => [e.id, e])
  ).values()]
  const filteredVerlauf = verlaufFilter ? verlauf.filter(a => a.employee === verlaufFilter) : verlauf

  // ── Widget-Render-Funktionen ───────────────────────────────────────────────
  function renderAntraege() {
    return (
      <div className="h-full bg-white border border-[#EDE7DC] rounded-lg overflow-hidden">
        <div className="flex border-b border-[#EDE7DC]">
          <button
            onClick={() => setAntragTab('pending')}
            className={cn(
              'flex-1 py-3 text-[11px] font-semibold uppercase tracking-wider transition-colors',
              antragTab === 'pending'
                ? 'text-[#BA7517] border-b-2 border-[#BA7517] bg-[#FFF9F0]'
                : 'text-[#706D6A] hover:bg-[#FAF7F2]'
            )}
          >
            Ausstehend{data.pending.length > 0 ? ` (${data.pending.length})` : ''}
          </button>
          <button
            onClick={() => setAntragTab('verlauf')}
            className={cn(
              'flex-1 py-3 text-[11px] font-semibold uppercase tracking-wider transition-colors',
              antragTab === 'verlauf'
                ? 'text-[#BA7517] border-b-2 border-[#BA7517] bg-[#FFF9F0]'
                : 'text-[#706D6A] hover:bg-[#FAF7F2]'
            )}
          >
            Verlauf
          </button>
        </div>
        <div className="p-5">
          {antragTab === 'pending' ? (
            <>
              {data.pending.length === 0 ? (
                <p className="text-sm text-[#706D6A]">Keine offenen Genehmigungen.</p>
              ) : data.pending.map(abs => {
                const emp    = abs.expand?.employee
                const colors = ABSENCE_COLORS[abs.type]
                const days   = calcDays(abs.date_from, abs.date_to)
                const dateLabel = abs.date_from === abs.date_to
                  ? format(parseISO(abs.date_from), 'dd.MM.yyyy', { locale: de })
                  : `${format(parseISO(abs.date_from), 'dd.MM.', { locale: de })}–${format(parseISO(abs.date_to), 'dd.MM.yyyy', { locale: de })}`
                return (
                  <div key={abs.id} className="flex items-center gap-2 py-2.5 border-b border-[#EDE7DC] last:border-0 text-sm">
                    <span className="font-semibold text-[#1A1917] min-w-[130px] truncate">
                      {emp ? `${emp.last_name}, ${emp.first_name}` : '—'}
                    </span>
                    <span className="text-[#706D6A] flex-1 text-xs whitespace-nowrap">
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
                <p className="text-sm text-[#706D6A]">Lade…</p>
              ) : (
                <>
                  {verlaufEmployees.length > 1 && (
                    <div className="mb-3">
                      <select
                        value={verlaufFilter}
                        onChange={e => setVerlaufFilter(e.target.value)}
                        className="text-xs border border-[#EDE7DC] rounded px-2 py-1.5 text-[#706D6A] outline-none focus:border-[#BA7517] bg-white"
                      >
                        <option value="">Alle Mitarbeiter</option>
                        {verlaufEmployees.map(e => (
                          <option key={e.id} value={e.id}>{e.last_name}, {e.first_name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {filteredVerlauf.length === 0 ? (
                    <p className="text-sm text-[#706D6A]">Kein Verlauf vorhanden.</p>
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
                          <div key={abs.id} className="flex items-center gap-2 py-2 border-b border-[#F5F0EA] last:border-0">
                            <span className="font-medium text-[#1A1917] text-xs min-w-[100px] truncate">
                              {emp ? `${emp.last_name}, ${emp.first_name}` : '—'}
                            </span>
                            <span className="text-[#706D6A] flex-1 text-xs whitespace-nowrap">{dateLabel}</span>
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
        </div>
      </div>
    )
  }

  function renderAbwesend() {
    return (
      <div className="h-full bg-white border border-[#EDE7DC] rounded-lg p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#706D6A] mb-4">
          Heute abwesend · {format(new Date(), 'dd.MM.yyyy')}
        </h2>
        {data.absentToday.length === 0 ? (
          <p className="text-sm text-[#706D6A]">Alle Mitarbeiter anwesend.</p>
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
      </div>
    )
  }

  function renderArbeitszeiten() {
    return (
      <div className="h-full bg-white border border-[#EDE7DC] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[#EDE7DC] bg-[#FAF7F2] flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#706D6A]">
            Arbeitszeiten heute · {format(new Date(), 'dd.MM.yyyy')}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-[#1A1917]">{stempel.filter(r => r.isActive).length}</span>
              <span className="text-xs text-[#706D6A]">eingestempelt</span>
            </div>
            <button
              onClick={() => { setShowClockInForm(v => !v); setClockInEmpId('') }}
              className={cn(
                'p-1 rounded transition-colors',
                showClockInForm ? 'bg-[#EDE7DC] text-[#1A1917]' : 'text-[#706D6A] hover:bg-[#EDE7DC]'
              )}
              title="Mitarbeiter einstempeln"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>

        {showClockInForm && (
          <div className="px-5 py-3 border-b border-[#EDE7DC] bg-white flex items-center gap-2">
            <select
              value={clockInEmpId}
              onChange={e => setClockInEmpId(e.target.value)}
              className="flex-1 text-sm border border-[#EDE7DC] rounded px-2 py-1.5 text-[#1A1917] outline-none focus:border-[#BA7517] bg-white"
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
              className="p-1.5 rounded text-[#706D6A] hover:bg-[#EDE7DC] transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {stempel.length === 0 ? (
          <p className="px-5 py-4 text-sm text-[#706D6A]">Heute noch keine Buchungen.</p>
        ) : (
          <div className="divide-y divide-[#F5F0EA]">
            {stempel.map((row, i) => {
              const prevWasActive = i > 0 && stempel[i - 1].isActive
              const showSeparator = !row.isActive && prevWasActive
              return (
                <div key={row.employee.id}>
                  {showSeparator && (
                    <div className="px-5 py-1.5 bg-[#FAF7F2]">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#B0A898]">
                        Ausgestempelt
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 px-5 py-2.5">
                    <span className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      row.isActive ? 'bg-green-500' : 'bg-[#D1D5DB]'
                    )} />
                    <span className="text-sm font-semibold text-[#1A1917] flex-1">
                      {row.employee.last_name}, {row.employee.first_name}
                    </span>
                    <span className="text-xs text-[#706D6A]">{row.sinceLabel}</span>
                    {row.isActive ? (
                      <span className="text-xs font-bold tabular-nums w-16 text-right text-green-700">
                        {Math.floor(row.totalMins / 60)}
                        <span className="blink">:</span>
                        {String(row.totalMins % 60).padStart(2, '0')} h
                      </span>
                    ) : (
                      <span className="text-xs font-bold tabular-nums w-16 text-right text-[#706D6A]">
                        {fmtMins(row.totalMins)}
                      </span>
                    )}
                    <button
                      onClick={() => row.isActive && row.openEntryId ? handleClockOut(row.openEntryId) : undefined}
                      className={cn(
                        'flex items-center gap-1 text-xs px-2 py-1 rounded border border-[#EDE7DC] text-[#706D6A] hover:bg-[#EDE7DC] transition-colors shrink-0',
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
      </div>
    )
  }

  const year = new Date().getFullYear()

  function renderWidget(id: WidgetId) {
    switch (id) {
      case 'stat-eingestempelt':
        return <StatCard label="Eingestempelt heute" value={presentToday}            sub={`von ${data.activeTotal} aktiven MA`}     color="green"  />
      case 'stat-abwesend':
        return <StatCard label="Abwesend heute"       value={data.absentToday.length} sub={absentSub}                                color={data.absentToday.length > 0 ? 'amber' : 'default'} />
      case 'stat-genehmigungen':
        return <StatCard label="Offene Genehmigungen" value={data.pending.length}     sub="Warten auf Freigabe"                      color={data.pending.length > 0 ? 'red' : 'default'} />
      case 'stat-resturlaub':
        return <StatCard label="Resturlaub-Verfall"   value={data.carryOverCount}     sub={`Resturlaub ${year}`}                     color={data.carryOverCount > 0 ? 'amber' : 'default'} />
      case 'antraege':      return renderAntraege()
      case 'abwesend':      return renderAbwesend()
      case 'arbeitszeiten': return renderArbeitszeiten()
      case 'stat-ueberstunden':
        return <StatCard label="Überstunden diese Woche" value={0} sub="Demnächst verfügbar" color="default" />
      case 'stat-krankmeldungen':
        return <StatCard label="Krankmeldungen" value={data.absentToday.filter(a => a.type === 'K' || a.type === 'KK').length} sub="Aktuelle K/KK-Einträge" color={data.absentToday.some(a => a.type === 'K' || a.type === 'KK') ? 'red' : 'default'} />
      case 'geburtstage':
        return <WidgetStub label="Geburtstage im Monat" />
      case 'dokumente-ablauf':
        return <WidgetStub label="Ablaufende Verträge" />
    }
  }

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1917]">Dashboard</h1>
          <p className="text-sm text-[#706D6A] capitalize">
            {format(new Date(), 'EEEE, dd. MMMM yyyy', { locale: de })}
          </p>
        </div>
        {editMode ? (
          <button
            onClick={() => setEditMode(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#BA7517] text-white text-sm font-medium hover:bg-[#9E6312] transition-colors"
          >
            Fertig
          </button>
        ) : (
          <button
            onClick={() => setEditMode(true)}
            className="p-2 rounded-lg border border-[#EDE7DC] text-[#706D6A] hover:bg-[#F5F2EE] hover:text-[#1A1917] transition-colors"
            title="Layout anpassen"
          >
            <SlidersHorizontal size={16} />
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-[#706D6A]">Lade…</p>
      ) : (
        <>
          <RGL
            layout={layout}
            cols={4}
            rowHeight={160}
            isDraggable={editMode}
            isResizable={editMode}
            onLayoutChange={saveLayout}
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
            <div className="mt-4 flex flex-wrap gap-2 p-4 border border-dashed border-[#EDE7DC] rounded-xl bg-[#FAF7F2]">
              <p className="text-xs text-[#706D6A] w-full mb-1 font-medium">Widget hinzufügen:</p>
              {hidden.map(id => (
                <button
                  key={id}
                  onClick={() => addWidget(id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#EDE7DC] text-sm text-[#706D6A] hover:border-[#BA7517] hover:text-[#BA7517] transition-colors"
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

// ── Hilfsfunktionen ────────────────────────────────────────────────────────
function calcDays(from: string, to: string): number {
  return Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 86_400_000) + 1
}

function StatCard({ label, value, sub, color }: {
  label: string; value: number; sub: string; color: 'green' | 'amber' | 'red' | 'default'
}) {
  const cls = { green: 'text-green-600', amber: 'text-[#BA7517]', red: 'text-red-600', default: 'text-[#1A1917]' }[color]
  return (
    <div className="h-full bg-white border border-[#EDE7DC] rounded-lg p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#706D6A] mb-2">{label}</div>
      <div className={`text-3xl font-bold mb-1 ${cls}`}>{value}</div>
      <div className="text-xs text-[#706D6A]">{sub}</div>
    </div>
  )
}

function WidgetStub({ label }: { label: string }) {
  return (
    <div className="h-full bg-white border border-[#EDE7DC] rounded-lg p-5 flex items-center justify-center">
      <span className="text-sm text-[#B0A898]">{label} – demnächst verfügbar</span>
    </div>
  )
}
