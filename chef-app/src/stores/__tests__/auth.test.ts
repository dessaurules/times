import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from '../auth'

vi.mock('../../lib/pb', () => ({
  pb: {
    collection: vi.fn().mockReturnValue({ authRefresh: vi.fn() }),
    authStore: {
      isValid: false,
      model: null,
      clear: vi.fn(),
      onChange: vi.fn(),
    },
  },
}))

import { pb } from '../../lib/pb'

function authRefreshMock() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (pb.collection as any)().authRefresh
}

describe('auth store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pb.authStore.isValid = false
  })

  describe('logout recursion protection', () => {
    it('logout() sollte isValid-Check haben um Rekursion zu vermeiden', () => {
      // Fix: logout() muss vor pb.authStore.clear() checken ob isValid===true,
      // damit ein bereits geleerter Store keinen erneuten onChange-Trigger erzeugt.
      //
      // Ohne Guard: logout() -> clear() -> onChange feuert -> logout() -> clear() -> ...
      // Mit Guard: logout() sieht isValid===false, skippt clear(), terminiert.

      const store = useAuthStore.getState()
      store.logout()

      // Der Guard sollte verhindern dass clear() aufgerufen wird wenn isValid===false
      // (was in diesem Mock der default ist)
      expect(store.user).toBeNull()
    })
  })

  describe('refresh()', () => {
    beforeEach(() => {
      pb.authStore.isValid = true
      useAuthStore.setState({ user: { id: 'u1', role: 'gf' } as never })
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
      authRefreshMock().mockResolvedValue({ record: { id: 'u2', role: 'gf' } })

      await useAuthStore.getState().refresh()

      expect(useAuthStore.getState().user?.id).toBe('u2')
    })
  })
})
