import { useState, useEffect, useRef } from 'react'
import {
  startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks,
  format, isWeekend, getISOWeek, isToday, endOfDay,
} from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { pb } from '../../lib/pb'
import { getHolidayMap } from '../../lib/holidays'
import type { TimeEntry } from '@shared/types'
import { cn } from '@/lib/utils'
import { netMins, fmtDuration, fmtHHMM, dailySollMins, periodSollMins } from '../../lib/zeitenCalc'

interface Props {
  employeeId: string
  fedState: string
  weeklyHours: number
}

export default function TaeglichCard({ employeeId, fedState, weeklyHours }: Props) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading]  = useState(true)
  const [error, setError]      = useState<string | null>(null)
  const [now, setNow]          = useState(new Date())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 10_000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  useEffect(() => {
    if (!employeeId) return
    setLoading(true)
    setError(null)
    const from = format(weekStart, "yyyy-MM-dd HH:mm:ss")
    const to   = format(endOfDay(endOfWeek(weekStart, { weekStartsOn: 1 })), "yyyy-MM-dd HH:mm:ss")

    pb.collection('time_entries').getFullList<TimeEntry>({
      filter: `employee = "${employeeId}" && start_time >= "${from}" && start_time <= "${to}"`,
      sort:   'start_time',
      requestKey: null,
    }).then(setEntries)
      .catch(e => setError((e as Error).message || 'Fehler beim Laden der Zeiteinträge'))
      .finally(() => setLoading(false))
  }, [employeeId, weekStart])

  const weekDays   = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) })
  const holidays   = getHolidayMap(weekStart.getFullYear(), fedState)
  const sollPerDay = dailySollMins(weeklyHours)

  function entriesForDay(day: Date): TimeEntry[] {
    const ds = format(day, 'yyyy-MM-dd')
    return entries.filter(e => e.start_time.startsWith(ds))
  }

  const weekSollMins = periodSollMins(weeklyHours, weekDays, new Set(holidays.keys()))
  const weekIstMins  = entries.reduce((sum, e) => sum + netMins(e, now), 0)

  const kw = getISOWeek(weekStart)

  return (
    <div>
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

      {error && (
        <div className="mb-4 px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
          {error}
        </div>
      )}

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden min-w-[320px] sm:min-w-[480px]">
        <div className="grid grid-cols-3 sm:grid-cols-6 px-4 py-2.5 border-b border-[#E5E7EB] bg-[#F9FAFB]">
          {['Tag', 'Kommt', 'Geht', 'Pause', 'Ist', 'Status'].map((h, i) => (
            <div key={h} className={`text-xs font-semibold text-[#6B7280] uppercase tracking-wide ${i > 0 && i < 4 ? 'hidden sm:block' : ''}`}>{h}</div>
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
                    'grid grid-cols-3 sm:grid-cols-6 px-4 py-3 border-b border-[#F3F4F6] last:border-0',
                    (isWE || isHoliday) && 'bg-[#F9FAFB]',
                    isCurrent && !isWE && 'bg-indigo-50/40'
                  )}
                >
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

                  {dayEntries.length === 0 ? (
                    <>
                      <Cell muted>—</Cell>
                      <Cell muted className="hidden sm:block">—</Cell>
                      <Cell muted className="hidden sm:block">—</Cell>
                      <Cell muted>—</Cell>
                    </>
                  ) : (
                    <>
                      <Cell>{fmtHHMM(dayEntries[0].start_time)}</Cell>
                      <Cell className="hidden sm:block">
                        {runningE
                          ? <span className="text-emerald-600 text-xs font-medium">läuft…</span>
                          : fmtHHMM(dayEntries[dayEntries.length - 1].end_time!)
                        }
                      </Cell>
                      <Cell className="hidden sm:block">
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

                  <div className="flex items-center hidden sm:flex">
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

            <div className="grid grid-cols-3 sm:grid-cols-6 px-4 py-3 bg-[#F9FAFB] border-t-2 border-[#E5E7EB]">
              <div className="text-xs font-semibold text-[#6B7280] col-span-2 sm:col-span-4">Woche gesamt</div>
              <div className="text-sm font-bold text-[#111827] tabular-nums">
                {fmtDuration(weekIstMins)}
              </div>
              <div className={cn(
                'text-sm font-bold tabular-nums hidden sm:block',
                weekIstMins - weekSollMins >= 0 ? 'text-emerald-600' : 'text-red-500'
              )}>
                {fmtDuration(weekIstMins - weekSollMins, true)}
              </div>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  )
}

function Cell({ children, muted, className }: { children: React.ReactNode; muted?: boolean; className?: string }) {
  return (
    <div className={cn('text-sm flex items-center', muted ? 'text-[#D1D5DB]' : 'text-[#374151]', className)}>
      {children}
    </div>
  )
}
