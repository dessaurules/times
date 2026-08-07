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

import MonatlichCard from '../MonatlichCard'

function entry(overrides: Partial<TimeEntry>): TimeEntry {
  return {
    id: 'e1',
    created: '2026-08-03T00:00:00Z',
    updated: '2026-08-03T00:00:00Z',
    employee: 'emp1',
    start_time: '2026-07-10T08:00:00',
    break_minutes: 0,
    ...overrides,
  }
}

describe('MonatlichCard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-05T10:00:00'))
    mockGetFullList.mockReset()
    mockGetFullList.mockResolvedValue([
      entry({ id: 'jul', start_time: '2026-07-10T08:00:00', end_time: '2026-07-10T16:00:00', break_minutes: 0 }),  // Juli, Ist 8:00h
      entry({ id: 'aug', start_time: '2026-08-03T08:00:00', end_time: '2026-08-03T17:00:00', break_minutes: 30 }), // August, Ist 8:30h
    ])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('zeigt alle 12 Monate von Januar bis Dezember', async () => {
    render(<MonatlichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    await screen.findByText('Januar')
    expect(screen.getByText('Dezember')).toBeInTheDocument()
    const text = document.body.textContent ?? ''
    expect(text.indexOf('Januar')).toBeLessThan(text.indexOf('Dezember'))
  })

  it('zeigt Ist/Soll/Differenz für vergangene und den aktuellen Monat', async () => {
    render(<MonatlichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    const juli = await screen.findByText('Juli')
    const juliRow = juli.closest('div.grid')!
    expect(within(juliRow).getByText('8:00 h')).toBeInTheDocument()

    const august = screen.getByText('August')
    expect(august).toHaveClass('text-indigo-600')
    const augustRow = august.closest('div.grid')!
    expect(within(augustRow).getByText('8:30 h')).toBeInTheDocument()
  })

  it('graut zukünftige Monate aus und zeigt keine Werte', async () => {
    render(<MonatlichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    const september = await screen.findByText('September')
    expect(september).toHaveClass('text-[#D1D5DB]')
    const row = september.closest('div.grid')!
    expect(within(row).getAllByText('—')).toHaveLength(3)
  })

  it('zeigt beim Wechsel in ein vergangenes Jahr alle 12 Monate mit Werten (keine grauen Monate)', async () => {
    render(<MonatlichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    await screen.findByText('2026')
    mockGetFullList.mockClear()
    mockGetFullList.mockResolvedValue([])
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(await screen.findByText('2025')).toBeInTheDocument()
    const dezember = screen.getByText('Dezember')
    expect(dezember).not.toHaveClass('text-[#D1D5DB]')
    const row = dezember.closest('div.grid')!
    expect(within(row).getByText('0:00 h')).toBeInTheDocument()
  })
})
