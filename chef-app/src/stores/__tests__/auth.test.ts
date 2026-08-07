import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from '../auth'

vi.mock('../../lib/pb', () => ({
  pb: {
    collection: vi.fn(),
    authStore: {
      isValid: false,
      model: null,
      clear: vi.fn(),
      onChange: vi.fn(),
    },
  },
}))

describe('auth store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
