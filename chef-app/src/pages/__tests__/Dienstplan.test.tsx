import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StrictMode } from 'react'
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

  it('erzeugt bei React-StrictMode-Doppelmount (zwei parallele Effect-Läufe für dieselbe Woche) trotzdem nur einen shift_plans-Datensatz', async () => {
    // StrictMode invoziert Effects in Dev absichtlich zweimal (mount → cleanup →
    // mount), um fehlende Aufräumlogik aufzudecken. Ohne den planRequestsRef-
    // Promise-Cache in Dienstplan.tsx würden beide Invocations parallel
    // getFirstListItem() (beide 404, da noch nichts angelegt) und danach beide
    // create() aufrufen — das war per manuellem Browser-Test nachgewiesen (siehe
    // Report: 2 Datensätze für dieselbe Woche trotz reinem `cancelled`-Flag).
    mockGetFirstListItem.mockRejectedValue({ status: 404 })
    mockCreate.mockResolvedValue({ id: 'plan1', week_start: '2026-08-03', week_end: '2026-08-09', status: 'draft', created_by: 'user123' })

    render(
      <StrictMode>
        <MemoryRouter><Dienstplan /></MemoryRouter>
      </StrictMode>,
    )

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1))

    // Kurz weiter warten: falls die Dedup-Logik fehlt, läuft die zweite
    // StrictMode-Invocation ihren eigenen create()-Aufruf im Hintergrund noch
    // zu Ende (async), auch nachdem der erste bereits aufgelöst ist.
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(mockCreate).toHaveBeenCalledTimes(1)
  })
})
