import { getHolidays } from 'feiertagejs'

export function getHolidayDates(year: number, federalState: string): Set<string> {
  try {
    const holidays = getHolidays(year, federalState as Parameters<typeof getHolidays>[1])
    return new Set(holidays.map(h => h.dateString))
  } catch (err) {
    console.warn('getHolidayDates: ungültiges Bundesland oder Fehler', federalState, err)
    return new Set()
  }
}
