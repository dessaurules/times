import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { TimeEntry } from '@shared/types'

const mockGetFullList = vi.fn()

vi.mock('../../../lib/pb', () => ({
  pb: {
    collection: () => ({
      getFullList: mockGetFullList,
    }),
  },
}))

import TaeglichCard from '../TaeglichCard'

function entry(overrides: Partial<TimeEntry>): TimeEntry {
  return {
    id: 'e1',
    created: '2026-08-03T00:00:00Z',
    updated: '2026-08-03T00:00:00Z',
    employee: 'emp1',
    start_time: '2026-08-03T08:00:00',
    break_minutes: 0,
    ...overrides,
  }
}

describe('TaeglichCard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-04T12:00:00'))
    mockGetFullList.mockReset()
    mockGetFullList.mockResolvedValue([
      entry({ id: 'mo', start_time: '2026-08-03T08:00:00', end_time: '2026-08-03T16:30:00', break_minutes: 30 }),
      entry({ id: 'di', start_time: '2026-08-04T09:00:00', end_time: undefined, break_minutes: 0 }),
    ])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('zeigt die aktuelle Kalenderwoche und die Tage-Tabelle', async () => {
    render(<TaeglichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    expect(await screen.findByText('KW 32')).toBeInTheDocument()
    expect(screen.getByText('Kommt')).toBeInTheDocument()
    expect(screen.getByText('08:00')).toBeInTheDocument() // Kommt Montag
  })

  it('zeigt eine laufende Session als "läuft…"', async () => {
    render(<TaeglichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    expect(await screen.findByText('läuft…')).toBeInTheDocument()
  })

  it('summiert Ist-Zeiten der Woche in der Fußzeile', async () => {
    render(<TaeglichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    await screen.findByText('Woche gesamt')
    // Mo 8:00h + Di (09:00–12:00 laufend) 3:00h = 11:00h
    expect(screen.getByText('11:00 h')).toBeInTheDocument()
    // Soll 40:00h − Ist 11:00h = −29:00h
    expect(screen.getByText('−29:00 h')).toBeInTheDocument()
  })

  it('zeigt keine Soll-Hinweiszeile mehr', async () => {
    render(<TaeglichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    await screen.findByText('Woche gesamt')
    expect(screen.queryByText(/Vertrag/)).not.toBeInTheDocument()
  })

  it('lädt die Vorwoche beim Klick auf den linken Pfeil', async () => {
    const { container } = render(<TaeglichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    await screen.findByText('KW 32')
    mockGetFullList.mockClear()
    mockGetFullList.mockResolvedValue([])
    const [prevButton] = container.querySelectorAll('button')
    fireEvent.click(prevButton)
    expect(await screen.findByText('KW 31')).toBeInTheDocument()
    expect(mockGetFullList).toHaveBeenCalledTimes(1)
  })
})
