import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { Employee, Absence, AbsenceType } from '@shared/types'
import { ABSENCE_COLORS, VACATION_TYPES } from '@shared/types'
import type { CalendarDay } from '../../lib/calendarUtils'

export interface KalenderTableProps {
  employees: Employee[]
  absenceMap: Map<string, Absence>
  calendarDays: CalendarDay[]
  activeCell: { empId: string; date: string } | null
  inputValue: string
  dragRange: { empId: string; start: string; end: string } | null
  onCellClick: (empId: string, date: string, absence: Absence | undefined) => void
  onCellMouseDown: (empId: string, date: string) => void
  onCellMouseEnter: (empId: string, date: string) => void
}

const SICK_TYPES: AbsenceType[] = ['K', 'KK']

export default function KalenderTable({
  employees, absenceMap, calendarDays,
  activeCell, inputValue, dragRange,
  onCellClick, onCellMouseDown, onCellMouseEnter,
}: KalenderTableProps) {
  const summaries = useMemo(() => {
    return employees.map(emp => {
      let at = 0, vacation = 0, sick = 0
      for (const day of calendarDays) {
        const absence = absenceMap.get(`${emp.id}_${day.date}`)
        if (!absence || absence.status !== 'approved') continue
        if (absence.type === 'AT') at++
        else if (VACATION_TYPES.includes(absence.type)) vacation++
        else if (SICK_TYPES.includes(absence.type)) sick++
      }
      return { at, vacation, sick }
    })
  }, [employees, absenceMap, calendarDays])

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-[11px] leading-none select-none">
        <thead>
          <tr className="bg-[#F5F2EE]">
            <th className="sticky left-0 z-10 bg-[#F5F2EE] text-left text-xs font-semibold text-[#1A1917] px-3 py-2 min-w-[160px] border-b border-r border-[#EDE7DC]">
              Mitarbeiter
            </th>
            {calendarDays.map(day => (
              <th
                key={day.date}
                className={cn(
                  'w-6 min-w-[24px] text-center font-normal border-b border-r border-[#EDE7DC] py-1',
                  (day.isWeekend || day.isHoliday) && 'bg-gray-100 text-gray-400',
                )}
              >
                <div className="font-semibold">{day.day}</div>
                <div className="text-gray-400">{day.dayLabel}</div>
              </th>
            ))}
            {['AT', 'U+RU', 'K'].map(label => (
              <th key={label} className="w-8 min-w-[32px] text-center text-xs font-semibold text-[#706D6A] border-b border-r border-[#EDE7DC] px-1 py-2">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map((emp, empIdx) => {
            const sum = summaries[empIdx]
            return (
              <tr key={emp.id} className="group">
                <td className="sticky left-0 z-10 bg-white border-b border-r border-[#EDE7DC] px-3 py-1 font-medium text-[#1A1917] whitespace-nowrap group-hover:bg-[#FDFCFB]">
                  {emp.last_name}, {emp.first_name}
                </td>
                {calendarDays.map(day => {
                  const key = `${emp.id}_${day.date}`
                  const absence = absenceMap.get(key)
                  const isBlocked = day.isWeekend || day.isHoliday
                  const isActive = activeCell?.empId === emp.id && activeCell?.date === day.date
                  const inDrag = dragRange?.empId === emp.id &&
                    day.date >= dragRange.start && day.date <= dragRange.end
                  const colors = absence ? ABSENCE_COLORS[absence.type] : null

                  return (
                    <td
                      key={day.date}
                      data-cell={`${emp.id}_${day.date}`}
                      className={cn(
                        'w-6 min-w-[24px] h-7 border-b border-r border-[#EDE7DC] text-center align-middle cursor-default',
                        isBlocked && 'bg-gray-50',
                        !isBlocked && !absence && 'group-hover:bg-[#FDFCFB] hover:bg-[#F5F2EE] cursor-pointer',
                        isActive && 'outline outline-2 outline-offset-[-2px] outline-[#BA7517] z-10',
                        inDrag && !absence && !isBlocked && 'bg-amber-50',
                      )}
                      style={absence && colors ? { backgroundColor: colors.bg } : undefined}
                      onClick={() => !isBlocked && onCellClick(emp.id, day.date, absence)}
                      onMouseDown={() => !isBlocked && !absence && onCellMouseDown(emp.id, day.date)}
                      onMouseEnter={() => onCellMouseEnter(emp.id, day.date)}
                    >
                      {absence ? (
                        <span
                          className={cn(
                            'font-medium',
                            absence.status === 'pending' && 'opacity-60',
                          )}
                          style={colors ? { color: colors.text } : undefined}
                        >
                          {absence.type}
                        </span>
                      ) : isActive && inputValue ? (
                        <span className="text-[#BA7517] font-medium">{inputValue}</span>
                      ) : null}
                    </td>
                  )
                })}
                <td className="w-8 min-w-[32px] text-center border-b border-r border-[#EDE7DC] text-[#706D6A]">{sum.at || ''}</td>
                <td className="w-8 min-w-[32px] text-center border-b border-r border-[#EDE7DC] text-[#706D6A]">{sum.vacation || ''}</td>
                <td className="w-8 min-w-[32px] text-center border-b border-r border-[#EDE7DC] text-[#706D6A]">{sum.sick || ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
