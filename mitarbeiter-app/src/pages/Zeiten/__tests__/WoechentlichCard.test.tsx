import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import type { TimeEntry } from '@shared/types'

const mockGetFullList = vi.fn()

vi.mock('../../../lib/pb', () => ({
  pb: {
    collection: () => ({
      getFullList: mockGetFullList,
    }),
  },
}))

import WoechentlichCard from '../WoechentlichCard'

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

describe('WoechentlichCard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-05T10:00:00'))
    mockGetFullList.mockReset()
    mockGetFullList.mockResolvedValue([
      entry({ id: 'kw32', start_time: '2026-08-03T08:00:00', end_time: '2026-08-03T16:30:00', break_minutes: 30 }), // KW32, Ist 8:00h
      entry({ id: 'kw31', start_time: '2026-07-27T08:00:00', end_time: '2026-07-27T15:00:00', break_minutes: 0 }),  // KW31, Ist 7:00h
    ])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('zeigt 7 Wochen-Zeilen mit der aktuellen Woche oben', async () => {
    render(<WoechentlichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    const kwLabels = await screen.findAllByText(/^KW \d+$/)
    expect(kwLabels).toHaveLength(7)
    expect(kwLabels[0]).toHaveTextContent('KW 32')
    expect(kwLabels[6]).toHaveTextContent('KW 26')
  })

  it('hebt die aktuelle Woche hervor und zeigt ihre Ist/Soll/Differenz-Werte', async () => {
    render(<WoechentlichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    const kw32 = await screen.findByText('KW 32')
    expect(kw32.parentElement).toHaveClass('text-indigo-600')
    const row = kw32.closest('div.grid')!
    expect(within(row).getByText('8:00 h')).toBeInTheDocument()
    expect(within(row).getByText('40:00 h')).toBeInTheDocument()
    expect(within(row).getByText('−32:00 h')).toBeInTheDocument()
  })

  it('zeigt die Ist-Werte einer vorherigen Woche', async () => {
    render(<WoechentlichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    const kw31 = await screen.findByText('KW 31')
    const row = kw31.closest('div.grid')!
    expect(within(row).getByText('7:00 h')).toBeInTheDocument()
  })

  it('der rechte Pfeil ist deaktiviert, solange der aktuelle Block sichtbar ist', async () => {
    render(<WoechentlichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    await screen.findByText('KW 32')
    const buttons = screen.getAllByRole('button')
    expect(buttons[1]).toBeDisabled()
  })

  it('paginiert beim Klick auf den linken Pfeil blockweise um 7 Wochen', async () => {
    render(<WoechentlichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    await screen.findByText('KW 32')
    mockGetFullList.mockClear()
    mockGetFullList.mockResolvedValue([])
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    expect(await screen.findByText('KW 25')).toBeInTheDocument()
    expect(mockGetFullList).toHaveBeenCalledTimes(1)
    expect(screen.getAllByRole('button')[1]).not.toBeDisabled()
  })
})
