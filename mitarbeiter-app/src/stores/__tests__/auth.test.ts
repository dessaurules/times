import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/pb', () => ({
  pb: {
    authStore: {
      isValid: true,
      model: null,
      clear: vi.fn(),
      onChange: vi.fn(),
    },
    collection: vi.fn().mockReturnValue({ authRefresh: vi.fn() }),
  },
}))

import { pb } from '../../lib/pb'
import { useAuthStore } from '../auth'

function authRefreshMock() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (pb.collection as any)().authRefresh
}

describe('auth store — refresh()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: { id: 'u1', role: 'mitarbeiter' } as never })
  })

  it('behält den eingeloggten User, wenn der Request autocancelled wird', async () => {
    // Das SDK bricht einen laufenden Request ab, sobald ein zweiter mit
    // gleichem requestKey startet. Das ist kein Auth-Fehler — ohne Guard
    // wirft es den User mit gültigem Token aus der App.
    authRefreshMock().mockRejectedValue(
      Object.assign(new Error('The request was autocancelled'), { isAbort: true })
    )

    await useAuthStore.getState().refresh()

    expect(useAuthStore.getState().user).not.toBeNull()
    expect(pb.authStore.clear).not.toHaveBeenCalled()
  })

  it('loggt bei einem echten Auth-Fehler aus', async () => {
    authRefreshMock().mockRejectedValue(
      Object.assign(new Error('Failed to authenticate'), { status: 401 })
    )

    await useAuthStore.getState().refresh()

    expect(useAuthStore.getState().user).toBeNull()
    expect(pb.authStore.clear).toHaveBeenCalled()
  })

  it('übernimmt den frischen Record bei Erfolg', async () => {
    authRefreshMock().mockResolvedValue({ record: { id: 'u2', role: 'mitarbeiter' } })

    await useAuthStore.getState().refresh()

    expect(useAuthStore.getState().user?.id).toBe('u2')
  })
})
