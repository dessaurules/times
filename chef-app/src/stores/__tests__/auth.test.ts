import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/pb', () => ({
  pb: {
    authStore: {
      isValid: false,
      model: null,
      clear: vi.fn(),
      loadFromCookie: vi.fn(),
    },
    collection: vi.fn().mockReturnValue({
      authWithPassword: vi.fn().mockResolvedValue({
        record: { id: '1', email: 'admin@example.com', name: 'Admin', role: 'gf' },
      }),
    }),
  },
}))

import { useAuthStore } from '../auth'

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isLoading: false })
  })

  it('startet ohne eingeloggten Nutzer', () => {
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('setzt user nach login', async () => {
    await useAuthStore.getState().login('admin@example.com', 'Test1234!')
    expect(useAuthStore.getState().user).not.toBeNull()
    expect(useAuthStore.getState().user?.role).toBe('gf')
  })

  it('isGF gibt true zurück wenn role = gf', async () => {
    await useAuthStore.getState().login('admin@example.com', 'Test1234!')
    expect(useAuthStore.getState().isGF()).toBe(true)
    expect(useAuthStore.getState().isSL()).toBe(false)
  })

  it('logout löscht user', async () => {
    await useAuthStore.getState().login('admin@example.com', 'Test1234!')
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().user).toBeNull()
  })
})
