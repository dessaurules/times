import { describe, it, expect } from 'vitest'
import { buildCalendarDays, buildAbsenceMap } from '../calendarUtils'
import type { Absence } from '@shared/types'

describe('buildCalendarDays', () => {
  it('returns 31 days for January', () => {
    const days = buildCalendarDays(2026, 1, new Set())
    expect(days).toHaveLength(31)
  })

  it('returns 28 days for February 2025', () => {
    expect(buildCalendarDays(2025, 2, new Set())).toHaveLength(28)
  })

  it('marks Saturdays and Sundays as isWeekend', () => {
    // 2026-01-01 is Thursday, 2026-01-03 is Saturday, 2026-01-04 is Sunday
    const days = buildCalendarDays(2026, 1, new Set())
    const sat = days.find(d => d.day === 3)!
    const sun = days.find(d => d.day === 4)!
    const mon = days.find(d => d.day === 5)!
    expect(sat.isWeekend).toBe(true)
    expect(sun.isWeekend).toBe(true)
    expect(mon.isWeekend).toBe(false)
  })

  it('marks holiday dates as isHoliday', () => {
    const holidays = new Set(['2026-01-01'])
    const days = buildCalendarDays(2026, 1, holidays)
    expect(days[0].isHoliday).toBe(true)
    expect(days[1].isHoliday).toBe(false)
  })

  it('each day has correct date string', () => {
    const days = buildCalendarDays(2026, 5, new Set())
    expect(days[0].date).toBe('2026-05-01')
    expect(days[14].date).toBe('2026-05-15')
    expect(days[30].date).toBe('2026-05-31')
  })
})

describe('buildAbsenceMap', () => {
  const base: Absence = {
    id: 'a1', created: '', updated: '',
    employee: 'emp1',
    date_from: '2026-05-04',
    date_to: '2026-05-06',
    type: 'U',
    status: 'approved',
    created_by: 'u1',
  }

  it('maps each day of a range to the absence', () => {
    const map = buildAbsenceMap([base])
    expect(map.get('emp1_2026-05-04')).toBe(base)
    expect(map.get('emp1_2026-05-05')).toBe(base)
    expect(map.get('emp1_2026-05-06')).toBe(base)
    expect(map.get('emp1_2026-05-07')).toBeUndefined()
  })

  it('handles single-day absence', () => {
    const single = { ...base, date_from: '2026-05-10', date_to: '2026-05-10' }
    const map = buildAbsenceMap([single])
    expect(map.size).toBe(1)
    expect(map.get('emp1_2026-05-10')).toBe(single)
  })
})
