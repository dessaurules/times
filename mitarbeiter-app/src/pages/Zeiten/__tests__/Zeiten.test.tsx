import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('embla-carousel-react', () => ({
  default: () => [vi.fn(), { scrollTo: vi.fn(), selectedScrollSnap: () => 0, on: vi.fn(), off: vi.fn() }],
}))

const mockGetFirstListItem = vi.fn()
const mockGetOne = vi.fn()
const mockGetFullList = vi.fn()

vi.mock('../../../lib/pb', () => ({
  pb: {
    collection: (name: string) => {
      if (name === 'settings')     return { getFirstListItem: mockGetFirstListItem }
      if (name === 'employees')    return { getOne: mockGetOne }
      if (name === 'time_entries') return { getFullList: mockGetFullList }
      throw new Error(`unerwartete Collection: ${name}`)
    },
  },
}))

vi.mock('../../../stores/auth', () => ({
  useAuthStore: (selector: (s: { user: { id: string; employee: string } }) => unknown) =>
    selector({ user: { id: 'u1', employee: 'emp1' } }),
}))

import Zeiten from '../Zeiten'

describe('Zeiten (Seiten-Rahmen)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-04T12:00:00'))
    mockGetFirstListItem.mockResolvedValue({ value: 'NW' })
    mockGetOne.mockResolvedValue({ id: 'emp1', weekly_hours: 40 })
    mockGetFullList.mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('zeigt Titel, Überstunden-Kachel und alle drei Karussell-Titel', async () => {
    render(<Zeiten />)
    expect(screen.getByText('Meine Zeiten')).toBeInTheDocument()
    expect(await screen.findByText(/Überstunden 2026/)).toBeInTheDocument()
    expect(screen.getByText('Täglich')).toBeInTheDocument()
    expect(screen.getByText('Wöchentlich')).toBeInTheDocument()
    expect(screen.getByText('Monatlich')).toBeInTheDocument()
  })

  it('behält den Korrekturhinweis, zeigt aber keine Soll-Hinweiszeile mehr', async () => {
    render(<Zeiten />)
    await screen.findByText(/Überstunden 2026/)
    expect(screen.getByText(/Korrekturen werden vom Betrieb vorgenommen/)).toBeInTheDocument()
    expect(screen.queryByText(/Vertrag/)).not.toBeInTheDocument()
  })
})
