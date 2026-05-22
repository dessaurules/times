import { useState, useEffect } from 'react'
import {
  startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks,
  format, isWeekend, getISOWeek, isToday,
} from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { pb } from '../lib/pb'
import { useAuthStore } from '../stores/auth'
import { getHolidayDates } from '../lib/holidays'
import { cn } from '@/lib/utils'
import type { PBRecord, Department } from '@shared/types'

interface ShiftPlan extends PBRecord {
  status: 'draft' | 'published'
}

interface ShiftEntry extends PBRecord {
  plan_id: string
  employee: string | null
  department: string
  date: string
  start_time: string
  end_time: string
  is_open: boolean
  note: string
  expand?: { plan_id?: ShiftPlan; department?: Department }
}

export default function Dienstplan() {
  const user       = useAuthStore(s => s.user)
  const employeeId = user?.employee ?? ''

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [entries,  setEntries]  = useState<ShiftEntry[]>([])
  const [fedState, setFedState] = useState('ST')
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    pb.collection('settings')
      .getFirstListItem<{ value: string }>('key = "federal_state"', { requestKey: null })
      .then(s => setFedState(s.value))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!employeeId) return
    setLoading(true)
    const from = format(weekStart, 'yyyy-MM-dd')
    const to   = format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd')

    pb.collection('shift_entries').getFullList<ShiftEntry>({
      filter: `employee = "${employeeId}" && date >= "${from}" && date <= "${to}" && plan_id.status = "published"`,
      expand: 'plan_id,department',
      sort:   'date',
      requestKey: null,
    })
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [employeeId, weekStart])

  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) })
  const holidays = getHolidayDates(weekStart.getFullYear(), fedState)
  const kw       = getISOWeek(weekStart)

  const totalMins = entries.reduce((sum, e) => {
    if (!e.start_time || !e.end_time) return sum
    const [sh, sm] = e.start_time.split(':').map(Number)
    const [eh, em] = e.end_time.split(':').map(Number)
    return sum + ((eh * 60 + em) - (sh * 60 + sm))
  }, 0)

  function fmtHours(mins: number) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}:${String(m).padStart(2, '0')} h`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Mein Dienstplan</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Dein persönlicher Schichtplan</p>
        </div>
      </div>

      {/* Wochen-Navigation */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setWeekStart(w => subWeeks(w, 1))}
          className="p-2 rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center flex-1">
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

      {/* Tabelle */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden min-w-[400px]">
          <div className="grid grid-cols-[80px_1fr_1fr_1fr_80px] px-4 py-2.5 border-b border-[#E5E7EB] bg-[#F9FAFB]">
            {['Tag', 'Kommt', 'Geht', 'Bereich', 'Std.'].map(h => (
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
                const entry     = entries.find(e => e.date === ds)
                const entryMins = entry?.start_time && entry?.end_time
                  ? (() => {
                      const [sh, sm] = entry.start_time.split(':').map(Number)
                      const [eh, em] = entry.end_time.split(':').map(Number)
                      return (eh * 60 + em) - (sh * 60 + sm)
                    })()
                  : 0

                return (
                  <div
                    key={ds}
                    className={cn(
                      'grid grid-cols-[80px_1fr_1fr_1fr_80px] px-4 py-3 border-b border-[#F3F4F6] last:border-0',
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
                        <div className="text-[10px] text-[#9CA3AF] leading-tight mt-0.5 truncate">
                          {holidays.get(ds)}
                        </div>
                      )}
                    </div>

                    {/* Kommt */}
                    <div className="flex items-center text-sm text-[#374151]">
                      {entry ? entry.start_time : <span className="text-[#D1D5DB]">—</span>}
                    </div>

                    {/* Geht */}
                    <div className="flex items-center text-sm text-[#374151]">
                      {entry?.end_time ? entry.end_time : <span className="text-[#D1D5DB]">—</span>}
                    </div>

                    {/* Bereich */}
                    <div className="flex items-center text-sm text-[#6B7280]">
                      {entry?.expand?.department?.name
                        ? entry.expand.department.name
                        : entry
                          ? <span className="text-[#D1D5DB]">—</span>
                          : <span className="text-[#D1D5DB]">Frei</span>
                      }
                    </div>

                    {/* Stunden */}
                    <div className={cn(
                      'flex items-center text-sm tabular-nums',
                      entryMins > 0 ? 'font-semibold text-[#111827]' : 'text-[#D1D5DB]'
                    )}>
                      {entryMins > 0 ? fmtHours(entryMins) : '—'}
                    </div>
                  </div>
                )
              })}

              {/* Footer */}
              <div className="grid grid-cols-[80px_1fr_1fr_1fr_80px] px-4 py-3 bg-[#F9FAFB] border-t-2 border-[#E5E7EB]">
                <div className="text-xs font-semibold text-[#6B7280] col-span-4">Woche gesamt</div>
                <div className="text-sm font-bold text-indigo-600 tabular-nums">
                  {totalMins > 0 ? fmtHours(totalMins) : '—'}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {!loading && entries.length === 0 && (
        <div className="mt-4 flex flex-col items-center py-8 text-center">
          <CalendarDays size={32} className="text-[#D1D5DB] mb-3" />
          <p className="text-sm text-[#6B7280]">Keine Schichten in dieser Woche</p>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Veröffentlichte Dienstpläne erscheinen hier automatisch
          </p>
        </div>
      )}
    </div>
  )
}
