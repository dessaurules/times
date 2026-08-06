import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockCreate = vi.fn()
const mockGetFirstListItem = vi.fn()

function makeDefaultCollection() {
  return {
    getFullList: vi.fn().mockResolvedValue([]),
    getFirstListItem: vi.fn().mockRejectedValue({ status: 404 }),
    subscribe: vi.fn().mockResolvedValue(() => {}),
    unsubscribe: vi.fn(),
  }
}

vi.mock('../../lib/pb', () => ({
  pb: {
    authStore: { record: { id: 'user123' } },
    collection: (name: string) => {
      if (name === 'shift_plans') {
        return { ...makeDefaultCollection(), getFirstListItem: mockGetFirstListItem, create: mockCreate }
      }
      return makeDefaultCollection()
    },
  },
}))

import Dienstplan from '../Dienstplan'

describe('Dienstplan — Plan-Anlage', () => {
  beforeEach(() => {
    mockCreate.mockClear()
    mockGetFirstListItem.mockReset()
  })

  it('legt bei fehlendem Plan (404) genau einmal einen neuen shift_plans-Datensatz an', async () => {
    mockGetFirstListItem.mockRejectedValue({ status: 404 })
    mockCreate.mockResolvedValue({ id: 'plan1', week_start: '2026-08-03', week_end: '2026-08-09', status: 'draft', created_by: 'user123' })

    render(<MemoryRouter><Dienstplan /></MemoryRouter>)

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1))
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: 'user123' }),
      expect.anything(),
    )
  })

  it('wirft einen Nicht-404-Fehler weiter statt einen Plan anzulegen', async () => {
    mockGetFirstListItem.mockRejectedValue({ status: 500, message: 'Server error' })

    render(<MemoryRouter><Dienstplan /></MemoryRouter>)

    await waitFor(() => expect(mockGetFirstListItem).toHaveBeenCalled())
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('legt keinen Plan an, wenn kein angemeldeter User vorhanden ist (kein leeres created_by)', async () => {
    mockGetFirstListItem.mockRejectedValue({ status: 404 })

    vi.resetModules()
    vi.doMock('../../lib/pb', () => ({
      pb: {
        authStore: { record: null },
        collection: (name: string) => {
          if (name === 'shift_plans') {
            return { ...makeDefaultCollection(), getFirstListItem: mockGetFirstListItem, create: mockCreate }
          }
          return makeDefaultCollection()
        },
      },
    }))
    const { default: DienstplanNoAuth } = await import('../Dienstplan')

    render(<MemoryRouter><DienstplanNoAuth /></MemoryRouter>)

    await waitFor(() => expect(mockGetFirstListItem).toHaveBeenCalled())
    // create() darf nie mit einem leeren/undefined created_by aufgerufen werden —
    // das war die serverseitig 400 ("Cannot be blank.") erzeugende Root Cause.
    expect(mockCreate).not.toHaveBeenCalled()

    vi.doUnmock('../../lib/pb')
  })
})
