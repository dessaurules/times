import { getDaysInMonth, getDay, format, parseISO, addDays, isAfter } from 'date-fns'
import { de } from 'date-fns/locale'
import type { Absence } from '@shared/types'

export interface CalendarDay {
  date: string      // YYYY-MM-DD
  day: number       // 1–31
  dayLabel: string  // 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'
  isWeekend: boolean
  isHoliday: boolean
}

export function buildCalendarDays(year: number, month: number, holidayDates: Set<string>): CalendarDay[] {
  const count = getDaysInMonth(new Date(year, month - 1))
  return Array.from({ length: count }, (_, i) => {
    const day = i + 1
    const date = new Date(year, month - 1, day)
    const isoDate = format(date, 'yyyy-MM-dd')
    const dow = getDay(date) // 0 = Sun, 6 = Sat
    return {
      date: isoDate,
      day,
      dayLabel: format(date, 'EEE', { locale: de }).replace('.', '').slice(0, 2),
      isWeekend: dow === 0 || dow === 6,
      isHoliday: holidayDates.has(isoDate),
    }
  })
}

export function buildAbsenceMap(absences: Absence[]): Map<string, Absence> {
  const map = new Map<string, Absence>()
  for (const abs of absences) {
    if (abs.status === 'rejected') continue   // abgelehnte nicht im Kalender
    let cur = parseISO(abs.date_from)
    const end = parseISO(abs.date_to)
    while (!isAfter(cur, end)) {
      map.set(`${abs.employee}_${format(cur, 'yyyy-MM-dd')}`, abs)
      cur = addDays(cur, 1)
    }
  }
  return map
}
