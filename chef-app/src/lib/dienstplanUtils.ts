import { startOfWeek, addDays, format, isSameDay, getISOWeek } from 'date-fns'
import { getHolidays } from 'feiertagejs'
import type { Employee } from '@shared/types'

export interface WeekDay {
  date:         string   // 'yyyy-MM-dd'
  label:        string   // 'dd.MM.' z.B. '25.05.'
  dayName:      string   // 'Mo', 'Di', … 'So'
  isWeekend:    boolean
  isHoliday:    boolean
  holidayName?: string
}

export function getWeekStart(offset: number): Date {
  const base = startOfWeek(new Date(), { weekStartsOn: 1 })
  return addDays(base, offset * 7)
}

export function getWeekLabel(weekStart: Date, days: WeekDay[]): string {
  const kw = getISOWeek(weekStart)
  const first = days[0]
  const last  = days[days.length - 1]
  const holSuffix = last.isHoliday ? ` (${last.holidayName})` : ''
  return `KW ${kw} · ${first.label} – ${last.label}${holSuffix}`
}

export function getWeekDays(weekStart: Date, federalState: string): WeekDay[] {
  const year     = weekStart.getFullYear()
  const holidays = getHolidays(year, federalState as Parameters<typeof getHolidays>[1])
  const nextYearHols = getHolidays(year + 1, federalState as Parameters<typeof getHolidays>[1])
  const allHols = [...holidays, ...nextYearHols]

  const days: WeekDay[] = []
  for (let i = 0; i < 7; i++) {
    days.push(makeDay(addDays(weekStart, i), allHols))
  }

  // Wenn der folgende Montag (Tag +7) ein Feiertag ist → als 8. Spalte anhängen
  const nextMonday = addDays(weekStart, 7)
  const nextMondayHol = allHols.find(h => isSameDay(new Date(h.date), nextMonday))
  if (nextMondayHol) {
    days.push(makeDay(nextMonday, allHols))
  }

  return days
}

function makeDay(d: Date, allHols: Array<{ date: Date; name: string }>): WeekDay {
  const hol = allHols.find(h => isSameDay(new Date(h.date), d))
  const dow = d.getDay()
  return {
    date:        format(d, 'yyyy-MM-dd'),
    label:       format(d, 'dd.MM.'),
    dayName:     ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][dow],
    isWeekend:   dow === 0 || dow === 6,
    isHoliday:   !!hol,
    holidayName: hol?.name,
  }
}

export function canEditDept(
  role: string,
  plannerDepts: string[] | undefined,
  deptId: string,
): boolean {
  if (role === 'gf') return true
  return (plannerDepts ?? []).includes(deptId)
}

export function visibleDepts(
  role: string,
  plannerDepts: string[] | undefined,
  allDeptIds: string[],
): string[] {
  if (role === 'gf') return allDeptIds
  return (plannerDepts ?? []).filter(d => allDeptIds.includes(d))
}

const LS_KEY = (weekStart: string) => `dp-row-order-${weekStart}`

export function loadRowOrder(weekStart: string): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY(weekStart)) ?? '{}') as Record<string, string[]>
  } catch {
    return {}
  }
}

export function saveRowOrder(weekStart: string, order: Record<string, string[]>): void {
  localStorage.setItem(LS_KEY(weekStart), JSON.stringify(order))
}

export function sortEmployees(
  employees: Employee[],
  deptId: string,
  rowOrder: Record<string, string[]>,
): Employee[] {
  const order = rowOrder[deptId]
  if (!order || order.length === 0) return employees
  return [...employees].sort(
    (a, b) => {
      const ai = order.indexOf(a.id)
      const bi = order.indexOf(b.id)
      const aIdx = ai === -1 ? 999 : ai
      const bIdx = bi === -1 ? 999 : bi
      return aIdx - bIdx
    },
  )
}
