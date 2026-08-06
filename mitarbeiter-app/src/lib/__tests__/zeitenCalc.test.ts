import { describe, it, expect } from 'vitest'
import { netMins, fmtDuration, fmtHHMM, dailySollMins, periodSollMins } from '../zeitenCalc'
import type { TimeEntry } from '@shared/types'

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 't1',
    created: '2026-08-03T00:00:00Z',
    updated: '2026-08-03T00:00:00Z',
    employee: 'emp1',
    start_time: '2026-08-03T08:00:00',
    end_time: '2026-08-03T16:30:00',
    break_minutes: 30,
    ...overrides,
  }
}

describe('netMins', () => {
  it('berechnet Netto-Minuten (Ende − Start − Pause)', () => {
    expect(netMins(makeEntry())).toBe(480) // 8:30h − 0:30h Pause = 8:00h
  })

  it('nutzt den now-Parameter für laufende Einträge ohne end_time', () => {
    const entry = makeEntry({ end_time: undefined, break_minutes: 0 })
    const now = new Date('2026-08-03T10:00:00')
    expect(netMins(entry, now)).toBe(120)
  })

  it('geht nie unter 0, selbst wenn die Pause die Bruttozeit übersteigt', () => {
    const entry = makeEntry({ start_time: '2026-08-03T08:00:00', end_time: '2026-08-03T08:10:00', break_minutes: 30 })
    expect(netMins(entry)).toBe(0)
  })
})

describe('fmtDuration', () => {
  it('formatiert Minuten als H:MM h', () => {
    expect(fmtDuration(480)).toBe('8:00 h')
    expect(fmtDuration(90)).toBe('1:30 h')
  })

  it('zeigt bei signed=true ein + für positive Werte', () => {
    expect(fmtDuration(90, true)).toBe('+1:30 h')
  })

  it('zeigt bei signed=true ein − (Minuszeichen) für negative Werte', () => {
    expect(fmtDuration(-90, true)).toBe('−1:30 h')
  })
})

describe('fmtHHMM', () => {
  it('formatiert einen ISO-Zeitstempel als HH:mm', () => {
    expect(fmtHHMM('2026-08-03T08:05:00')).toBe('08:05')
  })
})

describe('dailySollMins', () => {
  it('berechnet das Tages-Soll aus der Wochenarbeitszeit', () => {
    expect(dailySollMins(40)).toBe(480) // 40h / 5 Tage = 8h = 480min
    expect(dailySollMins(35)).toBe(420)
  })
})

describe('periodSollMins', () => {
  it('zählt nur Werktage (kein Wochenende, kein Feiertag)', () => {
    // Mo 3.8. – So 9.8.2026 (5 Werktage, kein Feiertag in dieser Woche)
    const days = [
      new Date(2026, 7, 3), // Mo
      new Date(2026, 7, 4), // Di
      new Date(2026, 7, 5), // Mi
      new Date(2026, 7, 6), // Do
      new Date(2026, 7, 7), // Fr
      new Date(2026, 7, 8), // Sa
      new Date(2026, 7, 9), // So
    ]
    expect(periodSollMins(40, days, new Set())).toBe(2400) // 5 × 480min
  })

  it('schließt Feiertage aus der Berechnung aus', () => {
    const days = [
      new Date(2026, 7, 3), // Mo
      new Date(2026, 7, 4), // Di (Feiertag)
    ]
    expect(periodSollMins(40, days, new Set(['2026-08-04']))).toBe(480) // nur Montag zählt
  })
})
