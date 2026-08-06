import { useState, useEffect } from 'react'
import {
  startOfWeek, endOfWeek, eachDayOfInterval, subWeeks,
  format, parseISO, getISOWeek, endOfDay,
} from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pb } from '../../lib/pb'
import { getHolidayDates } from '../../lib/holidays'
import type { TimeEntry } from '@shared/types'
import { cn } from '@/lib/utils'
import { netMins, fmtDuration, periodSollMins } from '../../lib/zeitenCalc'

interface Props {
  employeeId: string
  fedState: string
  weeklyHours: number
}

const BLOCK_SIZE = 7

export default function WoechentlichCard({ employeeId, fedState, weeklyHours }: Props) {
  const [blockOffset, setBlockOffset] = useState(0)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now] = useState(() => new Date())

  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const anchor = subWeeks(currentWeekStart, blockOffset * BLOCK_SIZE)
  const weeks = Array.from({ length: BLOCK_SIZE }, (_, i) => subWeeks(anchor, i))
  const oldestWeekStart = weeks[weeks.length - 1]
  const newestWeekEnd   = endOfWeek(anchor, { weekStartsOn: 1 })

  useEffect(() => {
    if (!employeeId) return
    setLoading(true)
    setError(null)
    const from = format(oldestWeekStart, "yyyy-MM-dd HH:mm:ss")
    const to   = format(endOfDay(newestWeekEnd), "yyyy-MM-dd HH:mm:ss")

    pb.collection('time_entries').getFullList<TimeEntry>({
      filter: `employee = "${employeeId}" && start_time >= "${from}" && start_time <= "${to}"`,
      sort:   'start_time',
      requestKey: null,
    }).then(setEntries)
      .catch(e => setError((e as Error).message || 'Fehler beim Laden der Wochenzeiten'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, blockOffset])

  const years = Array.from(new Set(weeks.flatMap(w => [
    w.getFullYear(),
    endOfWeek(w, { weekStartsOn: 1 }).getFullYear(),
  ])))
  const holidays = new Set<string>()
  years.forEach(y => getHolidayDates(y, fedState).forEach(d => holidays.add(d)))

  const rows = weeks.map(weekStart => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
    const weekEntries = entries.filter(e => {
      const s = parseISO(e.start_time)
      return s >= weekStart && s <= weekEnd
    })
    const ist  = weekEntries.reduce((sum, e) => sum + netMins(e, now), 0)
    const soll = periodSollMins(weeklyHours, days, holidays)
    return {
      weekStart, weekEnd, ist, soll,
      diff: ist - soll,
      kw: getISOWeek(weekStart),
      isCurrent: format(weekStart, 'yyyy-MM-dd') === format(currentWeekStart, 'yyyy-MM-dd'),
    }
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setBlockOffset(o => o + 1)}
          className="p-2 rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 text-center">
          <div className="text-base font-bold text-[#111827]">
            KW {getISOWeek(oldestWeekStart)} – KW {getISOWeek(anchor)}
          </div>
          <div className="text-xs text-[#6B7280]">
            {format(oldestWeekStart, 'd. MMM', { locale: de })} – {format(newestWeekEnd, 'd. MMM yyyy', { locale: de })}
          </div>
        </div>
        <button
          onClick={() => setBlockOffset(o => Math.max(0, o - 1))}
          disabled={blockOffset === 0}
          className="p-2 rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] transition-colors disabled:opacity-30 disabled:pointer-events-none"
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
        <div className="grid grid-cols-2 sm:grid-cols-4 px-4 py-2.5 border-b border-[#E5E7EB] bg-[#F9FAFB]">
          {['Woche', 'Ist', 'Soll', 'Differenz'].map((h, i) => (
            <div key={h} className={`text-xs font-semibold text-[#6B7280] uppercase tracking-wide ${i > 1 ? 'hidden sm:block' : ''}`}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-[#6B7280]">Lade…</div>
        ) : (
          rows.map(row => (
            <div
              key={`${row.kw}-${row.weekStart.getFullYear()}`}
              className={cn(
                'grid grid-cols-2 sm:grid-cols-4 px-4 py-3 border-b border-[#F3F4F6] last:border-0',
                row.isCurrent && 'bg-indigo-50/40'
              )}
            >
              <div className={cn('text-sm font-medium', row.isCurrent ? 'text-indigo-600' : 'text-[#111827]')}>
                <div>KW {row.kw}</div>
                <div className="text-xs text-[#6B7280]">
                  {format(row.weekStart, 'd. MMM', { locale: de })} – {format(row.weekEnd, 'd. MMM', { locale: de })}
                </div>
              </div>
              <div className="text-sm font-semibold tabular-nums text-[#111827] flex items-center">
                {fmtDuration(row.ist)}
              </div>
              <div className="text-sm tabular-nums text-[#6B7280] flex items-center hidden sm:flex">
                {fmtDuration(row.soll)}
              </div>
              <div className={cn(
                'text-sm font-bold tabular-nums flex items-center hidden sm:flex',
                row.diff >= 0 ? 'text-emerald-600' : 'text-red-500'
              )}>
                {fmtDuration(row.diff, true)}
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </div>
  )
}
