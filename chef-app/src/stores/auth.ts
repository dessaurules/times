import { create } from 'zustand'
import { pb } from '../lib/pb'
import type { User } from '@shared/types'

interface AuthState {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
  isGF: () => boolean
  isSL: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: pb.authStore.isValid ? (pb.authStore.model as unknown as User) : null,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const auth = await pb.collection('users').authWithPassword(email, password)
      set({ user: auth.record as unknown as User })
    } finally {
      set({ isLoading: false })
    }
  },

  logout: () => {
    if (pb.authStore.isValid) pb.authStore.clear()
    set({ user: null })
  },

  refresh: async () => {
    if (!pb.authStore.isValid) return
    try {
      const fresh = await pb.collection('users').authRefresh()
      set({ user: fresh.record as unknown as User })
    } catch {
      pb.authStore.clear()
      set({ user: null })
    }
  },

  isGF: () => get().user?.role === 'gf',
  isSL: () => get().user?.role === 'sl',
}))
