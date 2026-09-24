import { format, isWeekend, differenceInMinutes, parseISO } from 'date-fns'
import type { TimeEntry } from '@shared/types'

export function netMins(entry: TimeEntry, now: Date = new Date()): number {
  const end   = entry.end_time ? parseISO(entry.end_time) : now
  const gross = differenceInMinutes(end, parseISO(entry.start_time))
  return Math.max(0, gross - (entry.break_minutes ?? 0))
}

export function fmtDuration(mins: number, signed = false): string {
  const neg = mins < 0
  const abs = Math.abs(Math.round(mins))
  const h   = Math.floor(abs / 60)
  const m   = abs % 60
  const str = `${h}:${String(m).padStart(2, '0')} h`
  if (!signed) return str
  return neg ? `−${str}` : `+${str}`
}

export function fmtHHMM(iso: string): string {
  return format(parseISO(iso), 'HH:mm')
}

export function dailySollMins(weeklyHours: number): number {
  return (weeklyHours / 5) * 60
}

export function periodSollMins(weeklyHours: number, days: Date[], holidays: Set<string>): number {
  const workdays = days.filter(d => !isWeekend(d) && !holidays.has(format(d, 'yyyy-MM-dd')))
  return dailySollMins(weeklyHours) * workdays.length
}
