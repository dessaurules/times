import { cn } from '@/lib/utils'
import type { Employee, Absence, AbsenceType } from '@shared/types'
import { ABSENCE_COLORS } from '@shared/types'
import type { CalendarDay } from '../../lib/calendarUtils'

export interface KalenderTableProps {
  employees: Employee[]
  absenceMap: Map<string, Absence>
  calendarDays: CalendarDay[]
  summaries: Map<string, { at: number; vacation: number; sick: number }>
  activeCell: { empId: string; date: string } | null
  inputValue: string
  dragRange: { empId: string; start: string; end: string } | null
  onCellClick: (empId: string, date: string, absence: Absence | undefined) => void
  onCellMouseDown: (empId: string, date: string, kuerzel: AbsenceType) => void
  onCellMouseEnter: (empId: string, date: string) => void
  animatingCells?: Map<string, 'filled' | 'cleared'>
}

export default function KalenderTable({
  employees, absenceMap, calendarDays, summaries,
  activeCell, inputValue, dragRange,
  onCellClick, onCellMouseDown, onCellMouseEnter,
  animatingCells = new Map(),
}: KalenderTableProps) {

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-[11px] leading-none select-none">
        <thead>
          <tr className="bg-[#F3F4F6]">
            <th className="sticky left-0 z-10 bg-[#F3F4F6] text-left text-xs font-semibold text-[#111827] px-3 py-2 min-w-[160px] border-b border-r border-[#E5E7EB]">
              Mitarbeiter
            </th>
            {calendarDays.map(day => (
              <th
                key={day.date}
                className={cn(
                  'w-6 min-w-[24px] text-center font-normal border-b border-r border-[#E5E7EB] py-1',
                  (day.isWeekend || day.isHoliday) && 'bg-gray-100 text-gray-400',
                )}
              >
                <div className="font-semibold">{day.day}</div>
                <div className="text-gray-400">{day.dayLabel}</div>
              </th>
            ))}
            <th className="sticky right-[64px] z-20 w-8 min-w-[32px] text-center text-xs font-semibold text-[#6B7280] border-b border-r border-l-2 border-[#E5E7EB] border-l-[#D1D5DB] bg-[#F3F4F6] px-1 py-2">AT</th>
            <th className="sticky right-[32px] z-20 w-8 min-w-[32px] text-center text-xs font-semibold text-[#6B7280] border-b border-r border-[#E5E7EB] bg-[#F3F4F6] px-1 py-2">U</th>
            <th className="sticky right-0     z-20 w-8 min-w-[32px] text-center text-xs font-semibold text-[#6B7280] border-b border-r border-[#E5E7EB] bg-[#F3F4F6] px-1 py-2">K</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => {
            const sum = summaries.get(emp.id) ?? { at: 0, vacation: 0, sick: 0 }
            return (
              <tr key={emp.id} className="group">
                <td className="sticky left-0 z-10 bg-white border-b border-r border-[#E5E7EB] px-3 py-1 font-medium text-[#111827] whitespace-nowrap group-hover:bg-[#F9FAFB]">
                  {emp.last_name}, {emp.first_name}
                </td>
                {calendarDays.map(day => {
                  const key      = `${emp.id}_${day.date}`
                  const absence  = absenceMap.get(key)
                  const isBlocked = day.isWeekend || day.isHoliday
                  const isActive  = activeCell?.empId === emp.id && activeCell?.date === day.date
                  // Frage 5C: Quell-Zelle gestrichelt
                  const isSource  = dragRange !== null &&
                    dragRange.empId === emp.id && day.date === dragRange.start
                  // Frage 3A: Drag-Over Indigo — Quell-Zelle ausgenommen
                  const inDrag    = !!dragRange && dragRange.empId === emp.id &&
                    day.date > dragRange.start && day.date <= dragRange.end
                  const colors    = absence ? ABSENCE_COLORS[absence.type] : null
                  const animState = animatingCells.get(key)

                  return (
                    <td
                      key={day.date}
                      data-cell={key}
                      className={cn(
                        'w-6 min-w-[24px] h-7 border-b border-r border-[#E5E7EB] text-center align-middle cursor-default',
                        isBlocked && 'bg-gray-50',
                        !isBlocked && !absence && 'group-hover:bg-[#F9FAFB] hover:bg-[#F3F4F6] cursor-pointer',
                        !isBlocked && absence && 'cursor-grab',
                        isActive && 'z-20',
                        inDrag   && !isBlocked && 'bg-[#EEF2FF] drag-over-anim',
                        isSource && !isBlocked && 'drag-src',
                        animState === 'filled'  && 'just-filled',
                        animState === 'cleared' && 'just-cleared',
                      )}
                      style={{
                        ...(absence && colors ? { backgroundColor: colors.bg } : {}),
                        ...(isActive ? {
                          outline: '2px solid #4F46E5',
                          outlineOffset: '-2px',
                          boxShadow: 'inset 0 0 0 3px white',
                        } : {}),
                      }}
                      onClick={() => !isBlocked && onCellClick(emp.id, day.date, absence)}
                      onMouseDown={e => { e.preventDefault(); if (!isBlocked && absence) onCellMouseDown(emp.id, day.date, absence.type) }}
                      onMouseEnter={() => onCellMouseEnter(emp.id, day.date)}
                    >
                      {absence ? (
                        <span
                          className={cn('font-medium pointer-events-none', absence.status === 'pending' && 'opacity-60')}
                          style={colors ? { color: colors.text } : undefined}
                        >
                          {absence.type}
                        </span>
                      ) : isActive && inputValue ? (
                        <span className="text-[#4F46E5] font-medium">{inputValue}</span>
                      ) : null}
                    </td>
                  )
                })}
                <td className="sticky right-[64px] z-10 w-8 min-w-[32px] text-center border-b border-r border-l-2 border-[#E5E7EB] border-l-[#D1D5DB] bg-white text-[#111827] text-[11px] font-medium group-hover:bg-[#F9FAFB]">{sum.at}</td>
                <td className="sticky right-[32px] z-10 w-8 min-w-[32px] text-center border-b border-r border-[#E5E7EB] bg-white text-[#6B7280] text-[11px] group-hover:bg-[#F9FAFB]">{sum.vacation || '–'}</td>
                <td className="sticky right-0     z-10 w-8 min-w-[32px] text-center border-b border-r border-[#E5E7EB] bg-white text-[#6B7280] text-[11px] group-hover:bg-[#F9FAFB]">{sum.sick || '–'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
