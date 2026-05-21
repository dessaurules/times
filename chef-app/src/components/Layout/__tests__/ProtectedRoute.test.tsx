import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../../../lib/pb', () => ({
  pb: { authStore: { isValid: false, model: null, clear: vi.fn(), loadFromCookie: vi.fn() } },
}))

vi.mock('../../../stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

import ProtectedRoute from '../ProtectedRoute'
import { useAuthStore } from '../../../stores/auth'

const mockUseAuthStore = vi.mocked(useAuthStore)

function mockUser(user: { role: string } | null) {
  const state = { user } as ReturnType<typeof useAuthStore>
  // Handle both selector form useAuthStore(s => s.user) and plain useAuthStore()
  mockUseAuthStore.mockImplementation((selector?: unknown) => {
    if (typeof selector === 'function') {
      return (selector as (s: typeof state) => unknown)(state)
    }
    return state
  })
}

function renderWithRouter(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login-Seite</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Dashboard</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  it('leitet zu /login weiter wenn kein User', () => {
    mockUser(null)
    renderWithRouter('/')
    expect(screen.getByText('Login-Seite')).toBeInTheDocument()
  })

  it('zeigt Fehlermeldung für Mitarbeiter-Rolle', () => {
    mockUser({ role: 'mitarbeiter' })
    renderWithRouter('/')
    expect(screen.getByText(/Mitarbeiter-App/i)).toBeInTheDocument()
  })

  it('zeigt Inhalt für GF', () => {
    mockUser({ role: 'gf' })
    renderWithRouter('/')
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
