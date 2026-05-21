import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../lib/pb', () => ({
  pb: { authStore: { isValid: false, model: null, clear: vi.fn(), loadFromCookie: vi.fn() } },
}))

const mockLogin = vi.fn()
vi.mock('../../stores/auth', () => ({
  useAuthStore: (selector: (s: { user: null; isLoading: boolean; login: typeof mockLogin }) => unknown) =>
    selector({ user: null, isLoading: false, login: mockLogin }),
}))

import Login from '../Login'

function renderLogin() {
  return render(<MemoryRouter><Login /></MemoryRouter>)
}

describe('Login', () => {
  it('zeigt E-Mail und Passwort-Felder', () => {
    renderLogin()
    expect(screen.getByLabelText(/E-Mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Passwort/i)).toBeInTheDocument()
  })

  it('ruft login mit eingegebenen Daten auf', async () => {
    mockLogin.mockResolvedValueOnce(undefined)
    renderLogin()
    fireEvent.change(screen.getByLabelText(/E-Mail/i), { target: { value: 'admin@example.com' } })
    fireEvent.change(screen.getByLabelText(/Passwort/i), { target: { value: 'Test1234!' } })
    fireEvent.click(screen.getByRole('button', { name: /Anmelden/i }))
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('admin@example.com', 'Test1234!'))
  })

  it('zeigt Fehlermeldung bei falschem Login', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'))
    renderLogin()
    fireEvent.change(screen.getByLabelText(/E-Mail/i), { target: { value: 'wrong@example.com' } })
    fireEvent.change(screen.getByLabelText(/Passwort/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /Anmelden/i }))
    await waitFor(() => expect(screen.getByText(/falsch/i)).toBeInTheDocument())
  })
})
