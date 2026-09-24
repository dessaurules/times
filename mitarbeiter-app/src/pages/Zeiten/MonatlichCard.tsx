import { useState, useEffect } from 'react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  format, parseISO, endOfDay,
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

const MONTH_NAMES = Array.from({ length: 12 }, (_, m) =>
  format(new Date(2000, m, 1), 'MMMM', { locale: de })
)

export default function MonatlichCard({ employeeId, fedState, weeklyHours }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!employeeId) return
    setLoading(true)
    setError(null)
    const from = format(new Date(year, 0, 1), "yyyy-MM-dd HH:mm:ss")
    const to   = format(endOfDay(new Date(year, 11, 31)), "yyyy-MM-dd HH:mm:ss")

    pb.collection('time_entries').getFullList<TimeEntry>({
      filter: `employee = "${employeeId}" && start_time >= "${from}" && start_time <= "${to}"`,
      sort:   'start_time',
      requestKey: null,
    }).then(setEntries)
      .catch(e => setError((e as Error).message || 'Fehler beim Laden der Monatsstunden'))
      .finally(() => setLoading(false))
  }, [employeeId, year])

  const holidays = getHolidayDates(year, fedState)

  const rows = MONTH_NAMES.map((name, m) => {
    const isFuture = year > today.getFullYear() ||
      (year === today.getFullYear() && m > today.getMonth())
    const isCurrent = year === today.getFullYear() && m === today.getMonth()

    if (isFuture) {
      return { name, m, isFuture, isCurrent, ist: null, soll: null, diff: null }
    }

    const monthStart = startOfMonth(new Date(year, m, 1))
    const monthEnd   = endOfMonth(monthStart)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
    const monthEntries = entries.filter(e => {
      const s = parseISO(e.start_time)
      return s >= monthStart && s <= monthEnd
    })
    const ist  = monthEntries.reduce((sum, e) => sum + netMins(e), 0)
    const soll = periodSollMins(weeklyHours, days, holidays)
    return { name, m, isFuture, isCurrent, ist, soll, diff: ist - soll }
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setYear(y => y - 1)}
          className="p-2 rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 text-center">
          <div className="text-base font-bold text-[#111827]">{year}</div>
        </div>
        <button
          onClick={() => setYear(y => y + 1)}
          className="p-2 rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden min-w-[320px] sm:min-w-[480px]">
        <div className="grid grid-cols-2 sm:grid-cols-4 px-4 py-2.5 border-b border-[#E5E7EB] bg-[#F9FAFB]">
          {['Monat', 'Ist', 'Soll', 'Differenz'].map((h, i) => (
            <div key={h} className={`text-xs font-semibold text-[#6B7280] uppercase tracking-wide ${i > 1 ? 'hidden sm:block' : ''}`}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-[#6B7280]">Lade…</div>
        ) : (
          rows.map(row => (
            <div
              key={row.m}
              className={cn(
                'grid grid-cols-2 sm:grid-cols-4 px-4 py-3 border-b border-[#F3F4F6] last:border-0',
                row.isFuture && 'bg-[#F9FAFB]',
                row.isCurrent && 'bg-indigo-50/40'
              )}
            >
              <div className={cn(
                'text-sm font-medium',
                row.isFuture ? 'text-[#D1D5DB]' : row.isCurrent ? 'text-indigo-600' : 'text-[#111827]'
              )}>
                {row.name}
              </div>
              {row.isFuture ? (
                <>
                  <div className="text-sm text-[#D1D5DB] flex items-center">—</div>
                  <div className="text-sm text-[#D1D5DB] flex items-center hidden sm:flex">—</div>
                  <div className="text-sm text-[#D1D5DB] flex items-center hidden sm:flex">—</div>
                </>
              ) : (
                <>
                  <div className="text-sm font-semibold tabular-nums text-[#111827] flex items-center">
                    {fmtDuration(row.ist!)}
                  </div>
                  <div className="text-sm tabular-nums text-[#6B7280] flex items-center hidden sm:flex">
                    {fmtDuration(row.soll!)}
                  </div>
                  <div className={cn(
                    'text-sm font-bold tabular-nums flex items-center hidden sm:flex',
                    row.diff! >= 0 ? 'text-emerald-600' : 'text-red-500'
                  )}>
                    {fmtDuration(row.diff!, true)}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
      </div>
    </div>
  )
}
