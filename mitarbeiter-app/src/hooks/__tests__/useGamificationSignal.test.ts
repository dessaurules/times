import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

vi.mock('../../lib/pb', () => ({
  pb: {
    authStore: { record: { id: 'user-1', gam_seen_at: '2026-08-14 08:00:00.000Z' } },
    collection: vi.fn(),
  },
}))

let mockEnabled = true
vi.mock('../useGamificationEnabled', () => ({
  useGamificationEnabled: () => ({ enabled: mockEnabled, loading: false }),
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockAssignments: any[] = []
vi.mock('../useAssignments', () => ({
  useAssignments: () => ({ assignments: mockAssignments, loading: false }),
}))

import { pb } from '../../lib/pb'
import { useGamificationSignal } from '../useGamificationSignal'

/**
 * Zeitpunkt, zu dem die fiktiven Datensaetze angelegt wurden: nach dem
 * Merker im Testprofil (08:00), aber vor "jetzt". Der Mock wertet den
 * `created > "…"`-Teil des Filters wirklich aus — ein Mock, der den Filter
 * ignoriert, wuerde nach markSeen weiterhin Treffer melden und damit genau
 * das Verhalten unterschlagen, das der Test beweisen soll.
 */
const RECORD_CREATED = '2026-08-14T09:00:00.000Z'

/** Liest den Merker aus dem Filterstring und normalisiert ihn auf ISO. */
function seitWann(filter: string): number {
  const treffer = filter.match(/created > "([^"]+)"/)
  if (!treffer) return 0
  return new Date(treffer[1].replace(' ', 'T')).getTime()
}

/** Zaehlt pro Collection, wieviele Treffer die Existenzpruefung melden soll. */
function mockCounts(counts: { tasks?: number; rewards?: number; events?: number }) {
  const update = vi.fn().mockResolvedValue({})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(pb.collection as any).mockImplementation((name: string) => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getList: vi.fn().mockImplementation(async (_p: number, _n: number, opts: any) => {
      const konfiguriert =
        name === 'gam_tasks' ? counts.tasks ?? 0
        : name === 'gam_rewards' ? counts.rewards ?? 0
        : name === 'gam_events' ? counts.events ?? 0
        : 0
      const sichtbar = seitWann(opts?.filter ?? '') < new Date(RECORD_CREATED).getTime()
      return { totalItems: sichtbar ? konfiguriert : 0, items: [] }
    }),
    subscribe: vi.fn().mockResolvedValue(() => {}),
    update,
  }))
  return { update }
}

describe('useGamificationSignal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnabled = true
    mockAssignments = []
    pb.authStore.record = { id: 'user-1', gam_seen_at: '2026-08-14 08:00:00.000Z' }
  })

  it('funkelt nicht, wenn alle Quellen leer sind', async () => {
    mockCounts({})

    const { result } = renderHook(() => useGamificationSignal())

    await waitFor(() => expect(pb.collection).toHaveBeenCalledWith('gam_tasks'))
    expect(result.current.sparkle).toBe(false)
  })

  it('funkelt bei einer neuen Aufgabe', async () => {
    mockCounts({ tasks: 1 })

    const { result } = renderHook(() => useGamificationSignal())

    await waitFor(() => expect(result.current.sparkle).toBe(true))
  })

  it('funkelt bei einer neuen Praemie', async () => {
    mockCounts({ rewards: 1 })

    const { result } = renderHook(() => useGamificationSignal())

    await waitFor(() => expect(result.current.sparkle).toBe(true))
  })

  it('funkelt bei einem neuen Ereignis zur eigenen Einreichung', async () => {
    mockCounts({ events: 1 })

    const { result } = renderHook(() => useGamificationSignal())

    await waitFor(() => expect(result.current.sparkle).toBe(true))
  })

  it('filtert gegen den Merker aus dem Nutzerprofil', async () => {
    mockCounts({})

    renderHook(() => useGamificationSignal())

    await waitFor(() => expect(pb.collection).toHaveBeenCalledWith('gam_tasks'))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = (pb.collection as any).mock.results
      .map((r: any) => r.value.getList.mock.calls[0])
      .find((c: any) => c && c[2]?.filter?.includes('active = true'))
    expect(call[2].filter).toContain('created > "2026-08-14 08:00:00.000Z"')
    expect(call[2].requestKey).toBeNull()
  })

  it('behandelt einen leeren Merker als "noch nie gesehen"', async () => {
    pb.authStore.record = { id: 'user-1', gam_seen_at: '' }
    mockCounts({})

    renderHook(() => useGamificationSignal())

    await waitFor(() => expect(pb.collection).toHaveBeenCalledWith('gam_tasks'))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = (pb.collection as any).mock.results
      .map((r: any) => r.value.getList.mock.calls[0])
      .find((c: any) => c && c[2]?.filter?.includes('active = true'))
    expect(call[2].filter).toContain('created > "1970-01-01 00:00:00.000Z"')
  })

  it('markSeen schreibt den Zeitstempel und beendet das Funkeln', async () => {
    const { update } = mockCounts({ tasks: 1 })

    const { result } = renderHook(() => useGamificationSignal())
    await waitFor(() => expect(result.current.sparkle).toBe(true))

    await act(async () => {
      await result.current.markSeen()
    })

    expect(result.current.sparkle).toBe(false)
    expect(update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ gam_seen_at: expect.any(String) }),
      { requestKey: null },
    )
  })

  it('ignoriert abgebrochene Anfragen ohne Konsolenausgabe', async () => {
    const fehler = vi.spyOn(console, 'error').mockImplementation(() => {})
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(pb.collection as any).mockImplementation(() => ({
      getList: vi.fn().mockRejectedValue({ isAbort: true }),
      subscribe: vi.fn().mockResolvedValue(() => {}),
      update: vi.fn(),
    }))

    const { result } = renderHook(() => useGamificationSignal())

    await waitFor(() => expect(pb.collection).toHaveBeenCalledWith('gam_tasks'))
    expect(result.current.sparkle).toBe(false)
    expect(fehler).not.toHaveBeenCalled()
    fehler.mockRestore()
  })

  it('fragt nichts ab, solange Gamification abgeschaltet ist', async () => {
    mockEnabled = false
    mockCounts({ tasks: 5 })

    const { result } = renderHook(() => useGamificationSignal())

    expect(pb.collection).not.toHaveBeenCalled()
    expect(result.current.sparkle).toBe(false)
  })

  it('schweigt, wenn der Schreibvorgang abgebrochen wird', async () => {
    const fehler = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockCounts({})
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bisher = (pb.collection as any).getMockImplementation()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(pb.collection as any).mockImplementation((name: string) => ({
      ...bisher(name),
      update: vi.fn().mockRejectedValue({ isAbort: true }),
    }))

    const { result } = renderHook(() => useGamificationSignal())
    await act(async () => {
      await result.current.markSeen()
    })

    expect(fehler).not.toHaveBeenCalled()
    fehler.mockRestore()
  })

  it('protokolliert einen echten Fehler beim Schreiben des Merkers', async () => {
    const fehler = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockCounts({})
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bisher = (pb.collection as any).getMockImplementation()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(pb.collection as any).mockImplementation((name: string) => ({
      ...bisher(name),
      update: vi.fn().mockRejectedValue(new Error('offline')),
    }))

    const { result } = renderHook(() => useGamificationSignal())
    await act(async () => {
      await result.current.markSeen()
    })

    expect(fehler).toHaveBeenCalledWith('[useGamificationSignal] markSeen', expect.any(Error))
    fehler.mockRestore()
  })

  it('funkelt, wenn ein eigener Auftrag in unter 60 Minuten ablaeuft', async () => {
    mockCounts({})
    mockAssignments = [
      {
        id: 'a1',
        status: 'active',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      },
    ]

    const { result } = renderHook(() => useGamificationSignal())

    await waitFor(() => expect(result.current.sparkle).toBe(true))
  })

  it('funkelt nicht bei einer Frist jenseits der 60 Minuten', async () => {
    mockCounts({})
    mockAssignments = [
      {
        id: 'a1',
        status: 'active',
        expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      },
    ]

    const { result } = renderHook(() => useGamificationSignal())

    await waitFor(() => expect(pb.collection).toHaveBeenCalledWith('gam_tasks'))
    expect(result.current.sparkle).toBe(false)
  })

  it('ignoriert Auftraege, die nicht mehr aktiv sind', async () => {
    mockCounts({})
    mockAssignments = [
      {
        id: 'a1',
        status: 'completed',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      },
    ]

    const { result } = renderHook(() => useGamificationSignal())

    await waitFor(() => expect(pb.collection).toHaveBeenCalledWith('gam_tasks'))
    expect(result.current.sparkle).toBe(false)
  })

  it('laesst die Fristwarnung markSeen ueberleben', async () => {
    mockCounts({ tasks: 1 })
    mockAssignments = [
      {
        id: 'a1',
        status: 'active',
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
    ]

    const { result } = renderHook(() => useGamificationSignal())
    await waitFor(() => expect(result.current.sparkle).toBe(true))

    await act(async () => {
      await result.current.markSeen()
    })

    // Die Aufgabe ist abgehakt, die Frist laeuft weiter.
    expect(result.current.sparkle).toBe(true)
  })

  it('erkennt eine ablaufende Frist beim Minuten-Ticker', async () => {
    vi.useFakeTimers()
    mockCounts({})
    mockAssignments = [
      {
        id: 'a1',
        status: 'active',
        expires_at: new Date(Date.now() + 61 * 60 * 1000).toISOString(),
      },
    ]

    const { result } = renderHook(() => useGamificationSignal())
    expect(result.current.sparkle).toBe(false)

    await act(async () => {
      vi.advanceTimersByTime(2 * 60 * 1000)
    })

    expect(result.current.sparkle).toBe(true)
    vi.useRealTimers()
  })
})
