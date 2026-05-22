import { useState } from 'react'
import { X, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  startOfMonth, endOfMonth, startOfISOWeek, addDays, addMonths, subMonths,
  format, isWeekend, isSameMonth, isSameDay, getISOWeek,
} from 'date-fns'
import { de } from 'date-fns/locale'
import type { Absence, AbsenceType } from '@shared/types'
import { ABSENCE_COLORS } from '@shared/types'
import { cn } from '@/lib/utils'

type Props = {
  month:        Date
  allAbsences:  Absence[]   // alle Abwesenheiten des Jahres
  holidays:     Map<string, string>
  onClose:      () => void
  onNewAntrag:  (date: string) => void
}

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export default function MonthModal({ month, allAbsences, holidays, onClose, onNewAntrag }: Props) {
  const [currentMonth, setCurrentMonth] = useState(month)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd   = endOfMonth(currentMonth)

  // Nur Abwesenheiten, die in diesen Monat fallen (keine abgelehnten)
  const from = format(monthStart, 'yyyy-MM-dd')
  const to   = format(monthEnd,   'yyyy-MM-dd')
  const absences = allAbsences.filter(
    a => a.status !== 'rejected' && a.date_to >= from && a.date_from <= to
  )

  // Kalenderwochen Mo–So
  let weekStart = startOfISOWeek(monthStart)
  const weeks: Date[][] = []
  while (weekStart <= monthEnd) {
    weeks.push([0, 1, 2, 3, 4, 5, 6].map(i => addDays(weekStart, i)))
    weekStart = addDays(weekStart, 7)
  }

  function absenceForDay(day: Date): Absence | null {
    const ds = format(day, 'yyyy-MM-dd')
    return absences.find(a => ds >= a.date_from && ds <= a.date_to) ?? null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentMonth(m => subMonths(m, 1))}
              className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <h2 className="text-base font-semibold text-[#111827] capitalize w-36 text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: de })}
            </h2>
            <button
              onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNewAntrag(format(currentMonth, 'yyyy-MM-01'))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-medium shadow-sm hover:from-indigo-600 hover:to-violet-700 transition-all"
            >
              <Plus size={13} /> Antrag
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Kalender-Grid */}
        <div className="px-4 py-3">
          {/* Kopfzeile */}
          <div className="grid grid-cols-[32px_repeat(7,1fr)] gap-1 mb-1">
            <div className="text-[10px] font-semibold text-[#D1D5DB] text-center">KW</div>
            {DAY_LABELS.map(d => (
              <div key={d} className={cn(
                'text-[11px] font-semibold text-center',
                d === 'Sa' || d === 'So' ? 'text-[#D1D5DB]' : 'text-[#9CA3AF]'
              )}>{d}</div>
            ))}
          </div>

          {/* Wochenreihen */}
          <div className="space-y-1">
            {weeks.map(weekDays => {
              const kw = getISOWeek(weekDays[0])
              return (
                <div key={kw} className="grid grid-cols-[32px_repeat(7,1fr)] gap-1">
                  <div className="flex items-center justify-center">
                    <span className="text-[10px] text-[#D1D5DB] font-medium">{kw}</span>
                  </div>

                  {weekDays.map(day => {
                    const ds        = format(day, 'yyyy-MM-dd')
                    const inMonth   = isSameMonth(day, currentMonth)
                    const isHoliday = inMonth && holidays.has(ds)
                    const isWE      = isWeekend(day)
                    const absence   = inMonth && !isWE ? absenceForDay(day) : null
                    const isToday   = isSameDay(day, new Date())

                    if (!inMonth) {
                      return <div key={ds} className="min-h-[40px] rounded-lg bg-[#F9FAFB]/50" />
                    }

                    // Wochenende
                    if (isWE) {
                      return (
                        <div key={ds} className="min-h-[40px] rounded-lg bg-[#F9FAFB] flex items-center justify-center">
                          <span className="text-xs text-[#D1D5DB]">{format(day, 'd')}</span>
                        </div>
                      )
                    }

                    // Feiertag
                    if (isHoliday) {
                      return (
                        <div key={ds} title={holidays.get(ds)}
                          className="min-h-[40px] rounded-lg bg-[#F3F4F6] flex flex-col items-center justify-center gap-0.5 cursor-default">
                          <span className="text-xs font-semibold text-[#9CA3AF]">{format(day, 'd')}</span>
                          <span className="text-[10px] text-[#C4B5A0]">★</span>
                        </div>
                      )
                    }

                    // Mit Abwesenheit
                    if (absence) {
                      const colors  = ABSENCE_COLORS[absence.type as AbsenceType]
                      const pending = absence.status === 'pending'
                      return (
                        <div key={ds}
                          className={cn(
                            'min-h-[40px] rounded-lg flex flex-col items-center justify-center gap-0.5',
                            pending && 'opacity-70 ring-1 ring-dashed ring-current'
                          )}
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                          title={pending ? `${absence.type} (ausstehend)` : absence.type}
                        >
                          <span className="text-xs font-semibold">{format(day, 'd')}</span>
                          <span className="text-[10px] font-bold leading-none">
                            {absence.type.length <= 2 ? absence.type : absence.type.slice(0, 1)}
                          </span>
                        </div>
                      )
                    }

                    // Freier Arbeitstag
                    return (
                      <button key={ds}
                        onClick={() => onNewAntrag(ds)}
                        className={cn(
                          'min-h-[40px] rounded-lg flex items-center justify-center text-xs text-[#9CA3AF] hover:bg-indigo-50 hover:text-indigo-500 transition-colors',
                          isToday && 'ring-2 ring-indigo-400 text-indigo-500 font-bold'
                        )}
                        title="Antrag stellen"
                      >
                        {format(day, 'd')}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* Legende */}
        <div className="px-5 py-3 border-t border-[#E5E7EB] flex flex-wrap gap-4 text-xs text-[#6B7280]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#F9FAFB] border border-[#E5E7EB]" /> Wochenende
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#F3F4F6]" /> Feiertag
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded opacity-70 ring-1 ring-dashed ring-amber-400 bg-amber-50" />
            Ausstehend
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full ring-2 ring-indigo-400" /> Heute
          </span>
        </div>
      </div>
    </div>
  )
}
