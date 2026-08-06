import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

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
    col.getFullList.mockResolvedValue([
      {
        get: (key: string) => (key === 'enabled' ? true : undefined),
      },
    ])
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
