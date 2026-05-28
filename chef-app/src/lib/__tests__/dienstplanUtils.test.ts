import { describe, test, expect } from 'vitest'
import { getWeekDays, getWeekStart, canEditDept, visibleDepts, sortEmployees, calcSollMins } from '../dienstplanUtils'
import type { Employee, Absence } from '@shared/types'

describe('getWeekDays', () => {
  // Pfingstmontag 2026 is 2026-05-25.
  // KW21 2026 starts Mon 2026-05-18 → next Monday (2026-05-25) is Pfingstmontag → 8 days.
  test('KW21 2026 hat 8 Tage wegen Pfingstmontag', () => {
    const mon18mai = new Date('2026-05-18T00:00:00')
    const days = getWeekDays(mon18mai, 'ST')
    expect(days).toHaveLength(8)
    expect(days[7].isHoliday).toBe(true)
    expect(days[7].date).toBe('2026-05-25')
    expect(days[7].dayName).toBe('Mo')
  })

  // KW22 2026 starts Mon 2026-05-25 (= Pfingstmontag itself).
  // Next Monday 2026-06-01 is NOT a holiday → 7 days. days[0] is a holiday.
  test('KW22 2026 hat 7 Tage, Tag 0 ist Pfingstmontag', () => {
    const mon25mai = new Date('2026-05-25T00:00:00')
    const days = getWeekDays(mon25mai, 'ST')
    expect(days).toHaveLength(7)
    expect(days[0].isHoliday).toBe(true)
    expect(days[0].date).toBe('2026-05-25')
  })

  test('normaler Montag hat 7 Tage', () => {
    const mon = new Date('2026-03-16T00:00:00') // normaler Montag
    const days = getWeekDays(mon, 'ST')
    expect(days).toHaveLength(7)
  })

  test('Wochenende-Tage korrekt markiert', () => {
    const mon = new Date('2026-05-18T00:00:00')
    const days = getWeekDays(mon, 'ST')
    expect(days[5].isWeekend).toBe(true)  // Samstag
    expect(days[6].isWeekend).toBe(true)  // Sonntag
    expect(days[0].isWeekend).toBe(false) // Montag
  })
})

describe('canEditDept', () => {
  test('gf darf alles', () => {
    expect(canEditDept('gf', undefined, 'any_dept')).toBe(true)
    expect(canEditDept('gf', [], 'dept1')).toBe(true)
  })

  test('planer nur eigene Abteilung', () => {
    expect(canEditDept('sl', ['dept1', 'dept2'], 'dept1')).toBe(true)
    expect(canEditDept('sl', ['dept1', 'dept2'], 'dept3')).toBe(false)
  })

  test('planer ohne Abteilungen darf nichts', () => {
    expect(canEditDept('sl', [], 'dept1')).toBe(false)
    expect(canEditDept('sl', undefined, 'dept1')).toBe(false)
  })
})

describe('visibleDepts', () => {
  test('gf sieht alle', () => {
    const result = visibleDepts('gf', undefined, ['a', 'b', 'c'])
    expect(result).toEqual(['a', 'b', 'c'])
  })

  test('planer sieht nur zugewiesene', () => {
    const result = visibleDepts('sl', ['a', 'c'], ['a', 'b', 'c'])
    expect(result).toEqual(['a', 'c'])
  })

  test('filter auf existierende Depts', () => {
    const result = visibleDepts('sl', ['a', 'x'], ['a', 'b', 'c'])
    expect(result).toEqual(['a']) // 'x' nicht in allDeptIds
  })
})

describe('calcSollMins', () => {
  const emp   = { id: 'e1', weekly_hours: 40 } as Employee
  const daily = Math.round(40 / 5) * 60 // 480 min

  // Normale Woche ohne Feiertage (KW11 2026)
  const normalDays = getWeekDays(new Date('2026-03-16T00:00:00'), 'ST')

  // KW21 2026 — enthält Pfingstmontag (2026-05-25) als 8. Tag (Werktag)
  const daysWithHoliday = getWeekDays(new Date('2026-05-18T00:00:00'), 'ST')

  function absence(type: Absence['type']): Absence {
    return { id: 'a1', type, status: 'approved' } as Absence
  }

  test('keine Abwesenheit, kein Feiertag → volles Soll', () => {
    expect(calcSollMins(emp, normalDays, {})).toBe(40 * 60)
  })

  test('1 Urlaubstag (Arbeitstag) → Soll reduziert um 1 Tagessoll', () => {
    const map = { 'e1_2026-03-16': absence('U') } // Montag KW11
    expect(calcSollMins(emp, normalDays, map)).toBe(40 * 60 - daily)
  })

  test('Urlaub auf Samstag → kein Abzug', () => {
    const map = { 'e1_2026-03-21': absence('U') }
    expect(calcSollMins(emp, normalDays, map)).toBe(40 * 60)
  })

  test('Urlaub auf Sonntag → kein Abzug', () => {
    const map = { 'e1_2026-03-22': absence('U') }
    expect(calcSollMins(emp, normalDays, map)).toBe(40 * 60)
  })

  test('Feiertag auf Werktag (Pfingstmontag) → Abzug ohne Abwesenheit', () => {
    expect(calcSollMins(emp, daysWithHoliday, {})).toBe(40 * 60 - daily)
  })

  test('AT auf Arbeitstag → kein Abzug', () => {
    const map = { 'e1_2026-03-16': absence('AT') }
    expect(calcSollMins(emp, normalDays, map)).toBe(40 * 60)
  })

  test('Krank auf Arbeitstag → Abzug', () => {
    const map = { 'e1_2026-03-17': absence('K') } // Dienstag KW11
    expect(calcSollMins(emp, normalDays, map)).toBe(40 * 60 - daily)
  })

  test('5 Urlaubstage Mo–Fr → Soll = 0', () => {
    const map: Record<string, Absence> = {
      'e1_2026-03-16': absence('U'),
      'e1_2026-03-17': absence('U'),
      'e1_2026-03-18': absence('U'),
      'e1_2026-03-19': absence('U'),
      'e1_2026-03-20': absence('U'),
    }
    expect(calcSollMins(emp, normalDays, map)).toBe(0)
  })

  test('Mitarbeiter ohne weekly_hours → Soll 0, kein Crash', () => {
    const empNoHours = { id: 'e2' } as Employee
    expect(calcSollMins(empNoHours, normalDays, {})).toBe(0)
  })
})

describe('sortEmployees', () => {
  const emps = [
    { id: '1' } as Employee,
    { id: '2' } as Employee,
    { id: '3' } as Employee,
  ]

  test('keine Order → Originalreihenfolge', () => {
    const result = sortEmployees(emps, 'dept1', {})
    expect(result.map(e => e.id)).toEqual(['1', '2', '3'])
  })

  test('mit Order → sortiert', () => {
    const result = sortEmployees(emps, 'dept1', { dept1: ['3', '1', '2'] })
    expect(result.map(e => e.id)).toEqual(['3', '1', '2'])
  })

  test('unbekannte IDs in Order → ans Ende', () => {
    const result = sortEmployees(emps, 'dept1', { dept1: ['2'] })
    expect(result[0].id).toBe('2')
  })
})
