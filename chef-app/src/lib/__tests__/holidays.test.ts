import { describe, it, expect } from 'vitest'
import { getHolidayDates } from '../holidays'

describe('getHolidayDates', () => {
  it('returns Neujahr for ST 2026', () => {
    const dates = getHolidayDates(2026, 'ST')
    expect(dates.has('2026-01-01')).toBe(true)
  })

  it('returns a Set of strings in YYYY-MM-DD format', () => {
    const dates = getHolidayDates(2026, 'ST')
    expect(dates.size).toBeGreaterThan(0)
    for (const d of dates) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('does not throw for unknown state', () => {
    expect(() => getHolidayDates(2026, 'XX')).not.toThrow()
  })
})
