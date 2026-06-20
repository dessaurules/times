import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { SHIFT_COLOR_BG, SHIFT_COLOR_TEXT } from '@shared/types'

interface ShiftEntry {
  id?: string
  date: string
  start_time: string
  end_time: string
  start_time2?: string
  end_time2?: string
  color: string
  color2?: string
  note?: string
  is_free_day?: boolean
  is_open?: boolean
  expand?: { department?: { name: string } }
}

export interface DayCardData {
  date: string
  day: Date
  isWeekend: boolean
  isHoliday: boolean
  holidayName?: string
  isToday: boolean
  entry: ShiftEntry | null
}

function calcHours(startTime: string, endTime: string): string | null {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) return null
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}:${String(m).padStart(2, '0')} h`
}

function ShiftChip({ startTime, endTime, color }: {
  startTime: string
  endTime: string
  color: string
}) {
  const bg = (SHIFT_COLOR_BG as Record<string, string>)[color] ?? '#F3F4F6'
  const txt = (SHIFT_COLOR_TEXT as Record<string, string>)[color] ?? '#374151'
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold shrink-0"
      style={{ backgroundColor: bg, color: txt }}
    >
      {startTime}–{endTime}
    </span>
  )
}

export default function DienstplanMobileCard({ days }: { days: DayCardData[] }) {
  return (
    <div className="space-y-2">
      {days.map(({ date, day, isWeekend, isHoliday, holidayName, isToday: today, entry }) => (
        <div
          key={date}
          className={cn(
            'bg-white rounded-xl border px-4 py-3 flex items-center gap-3',
            today && !isWeekend && !isHoliday
              ? 'border-indigo-200 bg-indigo-50/30'
              : 'border-[#E5E7EB]',
            (isWeekend || isHoliday) && 'bg-[#F9FAFB]'
          )}
        >
          {/* Datum-Block */}
          <div className="w-10 shrink-0 text-center">
            <div className={cn(
              'text-[10px] font-semibold uppercase tracking-wide',
              today && !isWeekend && !isHoliday ? 'text-indigo-500' : 'text-[#9CA3AF]'
            )}>
              {format(day, 'EEE', { locale: de })}
            </div>
            <div className={cn(
              'text-xl font-bold leading-tight',
              isWeekend || isHoliday
                ? 'text-[#D1D5DB]'
                : today
                  ? 'text-indigo-600'
                  : 'text-[#111827]'
            )}>
              {format(day, 'd')}
            </div>
          </div>

          {/* Trennlinie */}
          <div className="w-px self-stretch bg-[#F3F4F6] shrink-0" />

          {/* Inhalt */}
          <div className="flex-1 min-w-0">
            {isHoliday ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#9CA3AF]">Feiertag</span>
                {holidayName && (
                  <span className="text-xs text-[#C4B5A0] truncate">{holidayName}</span>
                )}
              </div>
            ) : isWeekend ? (
              <span className="text-xs text-[#D1D5DB]">Wochenende</span>
            ) : entry ? (
              entry.is_free_day ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-[#F0FDF4] text-[#16A34A]">
                  Frei
                </span>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  {entry.start_time && entry.end_time && (
                    <ShiftChip
                      startTime={entry.start_time}
                      endTime={entry.end_time}
                      color={entry.color}
                    />
                  )}
                  {entry.start_time2 && entry.end_time2 && (
                    <>
                      <span className="text-[#D1D5DB] text-xs shrink-0">+</span>
                      <ShiftChip
                        startTime={entry.start_time2}
                        endTime={entry.end_time2}
                        color={entry.color2 ?? entry.color}
                      />
                    </>
                  )}
                  {entry.expand?.department?.name && (
                    <span className="text-xs text-[#6B7280] truncate">
                      {entry.expand.department.name}
                    </span>
                  )}
                  {entry.note && (
                    <span className="text-xs text-[#9CA3AF] italic truncate w-full">
                      {entry.note}
                    </span>
                  )}
                </div>
              )
            ) : (
              <span className="text-xs text-[#D1D5DB]">–</span>
            )}
          </div>

          {/* Stunden rechts */}
          {entry && !isWeekend && !isHoliday && !entry.is_free_day &&
           entry.start_time && entry.end_time && (() => {
            const h1 = calcHours(entry.start_time, entry.end_time)
            const h2 = entry.start_time2 && entry.end_time2
              ? calcHours(entry.start_time2, entry.end_time2)
              : null
            return h1 ? (
              <div className="shrink-0 text-right">
                <div className="text-xs font-semibold tabular-nums text-[#374151]">{h1}</div>
                {h2 && <div className="text-[10px] tabular-nums text-[#9CA3AF]">{h2}</div>}
              </div>
            ) : null
          })()}
        </div>
      ))}
    </div>
  )
}
