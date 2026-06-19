import { format, parseISO, isWeekend, isToday, differenceInMinutes } from 'date-fns'
import { de } from 'date-fns/locale'
import { Clock } from 'lucide-react'
import type { TimeEntry } from '@shared/types'
import { cn } from '@/lib/utils'

export interface DayTimeCardProps {
  day: Date
  dayEntries: TimeEntry[]
  sollPerDay: number
  isHoliday: boolean
  now: Date
}

function fmtHHMM(iso: string): string {
  return format(parseISO(iso), 'HH:mm')
}

function netMins(entry: TimeEntry, now = new Date()): number {
  const end = entry.end_time ? parseISO(entry.end_time) : now
  const gross = differenceInMinutes(end, parseISO(entry.start_time))
  return Math.max(0, gross - (entry.break_minutes ?? 0))
}

function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}:${String(m).padStart(2, '0')} h`
}

export default function DayTimeCard({ day, dayEntries, sollPerDay, isHoliday, now }: DayTimeCardProps) {
  const isWE = isWeekend(day)
  const isCurrent = isToday(day)
  const runningE = dayEntries.find(e => !e.end_time)
  const istMins = dayEntries.reduce((s, e) => s + netMins(e, now), 0)
  const ds = format(day, 'yyyy-MM-dd')

  if (dayEntries.length === 0) {
    return (
      <div className={cn(
        'p-4 rounded-xl border',
        (isWE || isHoliday) ? 'bg-[#F9FAFB] border-[#E5E7EB]' : 'bg-white border-[#E5E7EB]'
      )}>
        <div className="text-sm font-medium text-[#111827] mb-3">
          <div>{format(day, 'EEE', { locale: de })}</div>
          <div className="text-xs text-[#6B7280]">{format(day, 'd. MMM', { locale: de })}</div>
        </div>
        <div className="text-sm text-[#D1D5DB]">Keine Einträge</div>
      </div>
    )
  }

  return (
    <div className={cn(
      'p-4 rounded-xl border space-y-2',
      isCurrent && !isWE ? 'bg-indigo-50/40 border-indigo-200' : 'bg-white border-[#E5E7EB]'
    )}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm font-medium text-[#111827]">
            {format(day, 'EEE', { locale: de })}
          </div>
          <div className="text-xs text-[#6B7280]">
            {format(day, 'd. MMM', { locale: de })}
          </div>
        </div>
        <div className="text-right">
          {isWE || isHoliday ? (
            <span className="text-xs text-[#D1D5DB] font-medium">WE</span>
          ) : runningE ? (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium whitespace-nowrap">
              <Clock size={11} className="animate-pulse" /> läuft
            </span>
          ) : istMins >= sollPerDay - 5 ? (
            <span className="text-xs text-emerald-600 font-bold">✓</span>
          ) : (
            <span className="text-xs text-amber-600 font-bold">~</span>
          )}
        </div>
      </div>

      {/* Times */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-[#9CA3AF] block text-[10px]">Kommt</span>
          <span className="font-medium text-[#111827]">{fmtHHMM(dayEntries[0].start_time)}</span>
        </div>
        <div>
          <span className="text-[#9CA3AF] block text-[10px]">Geht</span>
          <span className={cn('font-medium', runningE ? 'text-emerald-600' : 'text-[#111827]')}>
            {runningE ? 'läuft…' : fmtHHMM(dayEntries[dayEntries.length - 1].end_time!)}
          </span>
        </div>
        <div>
          <span className="text-[#9CA3AF] block text-[10px]">Pause</span>
          <span className="font-medium text-[#111827]">
            {dayEntries[0].break_minutes ? `${dayEntries[0].break_minutes}m` : '—'}
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="border-t border-[#F3F4F6] pt-2 flex justify-between items-center">
        <span className="text-[#9CA3AF] text-xs">Ist</span>
        <span className={cn('font-bold text-sm tabular-nums', runningE ? 'text-emerald-600' : 'text-[#111827]')}>
          {fmtDuration(istMins)}
        </span>
      </div>
    </div>
  )
}
