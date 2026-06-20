import { useState, useEffect, useRef } from 'react'
import {
  startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks,
  format, parseISO, differenceInMinutes, isWeekend, getISOWeek, isToday,
  startOfYear, endOfDay,
} from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { pb } from '../../lib/pb'
import { useAuthStore } from '../../stores/auth'
import { getHolidayDates, getHolidayMap } from '../../lib/holidays'
import type { TimeEntry, Employee } from '@shared/types'
import { cn } from '@/lib/utils'

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

function fmtHHMM(iso: string): string {
  return format(parseISO(iso), 'HH:mm')
}

function fmtDuration(mins: number, signed = false): string {
  const neg    = mins < 0
  const abs    = Math.abs(Math.round(mins))
  const h      = Math.floor(abs / 60)
  const m      = abs % 60
  const str    = `${h}:${String(m).padStart(2, '0')} h`
  if (!signed) return str
  return neg ? `−${str}` : `+${str}`
}

function netMins(entry: TimeEntry, now = new Date()): number {
  const end   = entry.end_time ? parseISO(entry.end_time) : now
  const gross = differenceInMinutes(end, parseISO(entry.start_time))
  return Math.max(0, gross - (entry.break_minutes ?? 0))
}

function dailySoll(weeklyHours: number): number {
  return (weeklyHours / 5) * 60   // Minuten
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────

export default function Zeiten() {
  const user       = useAuthStore(s => s.user)
  const employeeId = user?.employee ?? ''

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [entries,   setEntries]   = useState<TimeEntry[]>([])
  const [allEntries, setAllEntries] = useState<TimeEntry[]>([])  // für Überstunden
  const [employee,  setEmployee]  = useState<Employee | null>(null)
  const [fedState,  setFedState]  = useState('ST')
  const [loading,   setLoading]   = useState(true)
  const [now,       setNow]       = useState(new Date())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Live-Timer für laufende Session
  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 10_000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  // Bundesland laden
  useEffect(() => {
    pb.collection('settings')
      .getFirstListItem<{ value: string }>('key = "federal_state"', { requestKey: null })
      .then(s => setFedState(s.value))
      .catch(() => {})
  }, [])

  // Mitarbeiter-Stammdaten laden
  useEffect(() => {
    if (!employeeId) return
    pb.collection('employees').getOne<Employee>(employeeId, { requestKey: null })
      .then(setEmployee)
      .catch(console.error)
  }, [employeeId])

  // Wochendaten laden
  useEffect(() => {
    if (!employeeId) return
    setLoading(true)
    const from = format(weekStart, "yyyy-MM-dd HH:mm:ss")
    const to   = format(endOfDay(endOfWeek(weekStart, { weekStartsOn: 1 })), "yyyy-MM-dd HH:mm:ss")

    pb.collection('time_entries').getFullList<TimeEntry>({
      filter: `employee = "${employeeId}" && start_time >= "${from}" && start_time <= "${to}"`,
      sort:   'start_time',
      requestKey: null,
    }).then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [employeeId, weekStart])

  // Alle Einträge des aktuellen Jahres für Überstundenkonto
  useEffect(() => {
    if (!employeeId) return
    const from = format(startOfYear(new Date()), "yyyy-MM-dd HH:mm:ss")
    const to   = format(endOfDay(new Date()), "yyyy-MM-dd HH:mm:ss")
    pb.collection('time_entries').getFullList<TimeEntry>({
      filter: `employee = "${employeeId}" && start_time >= "${from}" && start_time <= "${to}" && end_time != ""`,
      sort:   'start_time',
      requestKey: 'zeiten-all',
    }).then(setAllEntries)
      .catch(console.error)
  }, [employeeId])

  const weekDays     = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) })
  const holidays     = getHolidayMap(weekStart.getFullYear(), fedState)
  const weeklyHours  = employee?.weekly_hours ?? 40
  const sollPerDay   = dailySoll(weeklyHours)

  // Pro Tag: Einträge suchen
  function entriesForDay(day: Date): TimeEntry[] {
    const ds = format(day, 'yyyy-MM-dd')
    return entries.filter(e => e.start_time.startsWith(ds))
  }

  // Wochen-Soll: Arbeitstage × Soll/Tag
  const weekSollMins = weekDays.reduce((sum, day) => {
    const ds = format(day, 'yyyy-MM-dd')
    if (isWeekend(day) || holidays.has(ds)) return sum
    return sum + sollPerDay
  }, 0)

  // Wochen-Ist inkl. laufender Session
  const weekIstMins = entries.reduce((sum, e) => sum + netMins(e, now), 0)

  // Überstunden (Jahr): Ist − Soll aller abgeschlossenen Arbeitstage
  const holidaysYear = getHolidayDates(new Date().getFullYear(), fedState)
  const overtimeMins = (() => {
    // Gruppiere abgeschlossene Einträge nach Tag
    const dayMap = new Map<string, number>()
    for (const e of allEntries) {
      if (!e.end_time) continue
      const ds = e.start_time.slice(0, 10)
      dayMap.set(ds, (dayMap.get(ds) ?? 0) + netMins(e))
    }
    let total = 0
    for (const [ds, mins] of dayMap) {
      const d = parseISO(ds)
      if (!isWeekend(d) && !holidaysYear.has(ds)) {
        total += mins - sollPerDay
      }
    }
    return total
  })()

  const kw = getISOWeek(weekStart)

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-y-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-[#111827]">Meine Zeiten</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Deine Arbeitszeitnachweise</p>
        </div>

        {/* Überstunden-Kachel */}
        {!loading && (
          <div className={cn(
            'px-4 py-2.5 rounded-xl text-right border',
            overtimeMins >= 0
              ? 'bg-emerald-50 border-emerald-100'
              : 'bg-red-50 border-red-100'
          )}>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] mb-0.5">
              Überstunden {new Date().getFullYear()}
            </div>
            <div className={cn(
              'text-lg font-bold tabular-nums',
              overtimeMins >= 0 ? 'text-emerald-700' : 'text-red-600'
            )}>
              {fmtDuration(overtimeMins, true)}
            </div>
          </div>
        )}
      </div>

      {/* Wochen-Navigation */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setWeekStart(w => subWeeks(w, 1))}
          className="p-2 rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 text-center">
          <div className="text-base font-bold text-[#111827]">KW {kw}</div>
          <div className="text-xs text-[#6B7280]">
            {format(weekStart, 'd. MMM', { locale: de })} – {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'd. MMM yyyy', { locale: de })}
          </div>
        </div>
        <button
          onClick={() => setWeekStart(w => addWeeks(w, 1))}
          className="p-2 rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Wochen-Tabelle */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden min-w-[480px]">
        {/* Tabellen-Header */}
        <div className="grid grid-cols-[80px_1fr_1fr_80px_80px_90px] px-4 py-2.5 border-b border-[#E5E7EB] bg-[#F9FAFB]">
          {['Tag', 'Kommt', 'Geht', 'Pause', 'Ist', 'Status'].map(h => (
            <div key={h} className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">{h}</div>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-[#6B7280]">Lade…</div>
        ) : (
          <>
            {weekDays.map(day => {
              const ds        = format(day, 'yyyy-MM-dd')
              const isWE      = isWeekend(day)
              const isHoliday = holidays.has(ds)
              const isCurrent = isToday(day)
              const dayEntries = entriesForDay(day)
              const runningE  = dayEntries.find(e => !e.end_time)
              const istMins   = dayEntries.reduce((s, e) => s + netMins(e, now), 0)
              const hasSoll   = !isWE && !isHoliday

              return (
                <div
                  key={ds}
                  className={cn(
                    'grid grid-cols-[80px_1fr_1fr_80px_80px_90px] px-4 py-3 border-b border-[#F3F4F6] last:border-0',
                    (isWE || isHoliday) && 'bg-[#F9FAFB]',
                    isCurrent && !isWE && 'bg-indigo-50/40'
                  )}
                >
                  {/* Tag */}
                  <div className={cn(
                    'text-sm font-medium',
                    (isWE || isHoliday) ? 'text-[#9CA3AF]' : isCurrent ? 'text-indigo-600' : 'text-[#111827]'
                  )}>
                    <div>{format(day, 'EEE', { locale: de })}</div>
                    <div className="text-xs text-[#6B7280]">{format(day, 'd. MMM', { locale: de })}</div>
                    {isHoliday && (
                      <div className="text-[10px] text-[#9CA3AF] leading-tight mt-0.5 truncate" title={holidays.get(ds)}>
                        {holidays.get(ds)}
                      </div>
                    )}
                  </div>

                  {/* Kommt / Geht / Pause / Ist */}
                  {dayEntries.length === 0 ? (
                    <>
                      <Cell muted>—</Cell>
                      <Cell muted>—</Cell>
                      <Cell muted>—</Cell>
                      <Cell muted>—</Cell>
                    </>
                  ) : (
                    <>
                      <Cell>{fmtHHMM(dayEntries[0].start_time)}</Cell>
                      <Cell>
                        {runningE
                          ? <span className="text-emerald-600 text-xs font-medium">läuft…</span>
                          : fmtHHMM(dayEntries[dayEntries.length - 1].end_time!)
                        }
                      </Cell>
                      <Cell>
                        {dayEntries[0].break_minutes
                          ? `${dayEntries[0].break_minutes} min`
                          : '—'
                        }
                      </Cell>
                      <Cell>
                        <span className={cn(
                          'font-semibold tabular-nums text-sm',
                          runningE ? 'text-emerald-600' : 'text-[#111827]'
                        )}>
                          {fmtDuration(istMins)}
                        </span>
                      </Cell>
                    </>
                  )}

                  {/* Status */}
                  <div className="flex items-center">
                    {isWE || isHoliday ? (
                      <span className="text-xs text-[#D1D5DB]">WE</span>
                    ) : runningE ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <Clock size={11} className="animate-pulse" /> läuft
                      </span>
                    ) : dayEntries.length > 0 ? (
                      <span className="flex items-center gap-1 text-xs text-[#6B7280]">
                        {hasSoll && istMins >= sollPerDay - 5
                          ? <span className="text-emerald-500 font-bold">✓</span>
                          : <span className="text-amber-500 font-bold">~</span>
                        }
                        {hasSoll && <span className={istMins >= sollPerDay ? 'text-emerald-600' : 'text-amber-600'}>
                          {fmtDuration(istMins - sollPerDay, true)}
                        </span>}
                      </span>
                    ) : hasSoll ? (
                      <span className="text-xs text-[#D1D5DB]">—</span>
                    ) : null}
                  </div>
                </div>
              )
            })}

            {/* Footer: Soll / Ist / Diff */}
            <div className="grid grid-cols-[80px_1fr_1fr_80px_80px_90px] px-4 py-3 bg-[#F9FAFB] border-t-2 border-[#E5E7EB]">
              <div className="text-xs font-semibold text-[#6B7280] col-span-4">Woche gesamt</div>
              <div className="text-sm font-bold text-[#111827] tabular-nums">
                {fmtDuration(weekIstMins)}
              </div>
              <div className={cn(
                'text-sm font-bold tabular-nums',
                weekIstMins - weekSollMins >= 0 ? 'text-emerald-600' : 'text-red-500'
              )}>
                {fmtDuration(weekIstMins - weekSollMins, true)}
              </div>
            </div>

            {/* Soll-Zeile */}
            <div className="px-4 py-2 border-t border-[#F3F4F6] bg-[#F9FAFB]">
              <span className="text-xs text-[#9CA3AF]">
                Soll {fmtDuration(weekSollMins)} · {weeklyHours} h/Woche Vertrag
              </span>
            </div>
          </>
        )}
      </div>
      </div>

      {/* Hinweis */}
      <p className="mt-4 text-xs text-[#9CA3AF] text-center">
        Korrekturen werden vom Betrieb vorgenommen.
      </p>
    </div>
  )
}

function Cell({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div className={cn('text-sm flex items-center', muted ? 'text-[#D1D5DB]' : 'text-[#374151]')}>
      {children}
    </div>
  )
}
