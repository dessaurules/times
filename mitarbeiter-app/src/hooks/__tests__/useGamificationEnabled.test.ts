import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

vi.mock('../../lib/pb', () => ({
  pb: {
    collection: vi.fn().mockReturnValue({
      getFullList: vi.fn(),
      subscribe: vi.fn(),
    }),
  },
}))

import { pb } from '../../lib/pb'
import { useGamificationEnabled } from '../useGamificationEnabled'

// Helper to access the collection mock methods
function getCollectionMock() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (pb.collection as any)()
}

describe('useGamificationEnabled', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should load enabled status from gam_settings', async () => {
    const col = getCollectionMock()
    // PocketBase SDK 0.26 returns plain record objects — no .get() accessor.
    col.getFullList.mockResolvedValue([{ id: 'set1', enabled: true }])
    col.subscribe.mockResolvedValue(() => {})

    const { result } = renderHook(() => useGamificationEnabled())

    expect(result.current.loading).toBe(true)
    expect(result.current.enabled).toBe(false)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.enabled).toBe(true)
  })

  it('should default to false when no records exist', async () => {
    const col = getCollectionMock()
    col.getFullList.mockResolvedValue([])
    col.subscribe.mockResolvedValue(() => {})

    const { result } = renderHook(() => useGamificationEnabled())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.enabled).toBe(false)
  })

  it('should apply real-time updates via the record property', async () => {
    const col = getCollectionMock()
    col.getFullList.mockResolvedValue([{ id: 'set1', enabled: false }])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let emit: ((e: any) => void) | undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    col.subscribe.mockImplementation(async (_topic: string, cb: (e: any) => void) => {
      emit = cb
      return () => {}
    })

    const { result } = renderHook(() => useGamificationEnabled())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    await waitFor(() => expect(emit).toBeDefined())
    expect(result.current.enabled).toBe(false)

    act(() => {
      emit!({ action: 'update', record: { id: 'set1', enabled: true } })
    })

    expect(result.current.enabled).toBe(true)
  })

  it('should handle errors gracefully', async () => {
    const col = getCollectionMock()
    col.getFullList.mockRejectedValue(new Error('Collection error'))
    col.subscribe.mockResolvedValue(() => {})

    const { result } = renderHook(() => useGamificationEnabled())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.enabled).toBe(false)
  })
})
