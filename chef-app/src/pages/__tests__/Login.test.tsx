import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../lib/pb', () => ({
  pb: { authStore: { isValid: false, model: null, clear: vi.fn(), loadFromCookie: vi.fn() } },
}))

const mockLogin = vi.fn()
let authStoreState = { user: null as { role: string } | null, isLoading: false }
vi.mock('../../stores/auth', () => ({
  useAuthStore: (selector: (s: { user: { role: string } | null; isLoading: boolean; login: typeof mockLogin }) => unknown) =>
    selector({ user: authStoreState.user, isLoading: authStoreState.isLoading, login: mockLogin }),
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

  it('redirected einen eingeloggten GF-User ohne React-Render-Warnung', () => {
    authStoreState = { user: { role: 'gf' }, isLoading: false }

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<MemoryRouter initialEntries={['/login']}><Login /></MemoryRouter>)

    // Verify no "navigate() in render" warning occurred
    // The warning from react-router-dom is: "You should call navigate() in a React.useEffect(), not when your component is first rendered."
    const hadNavigateWarning = warnSpy.mock.calls.some(call =>
      /navigate.*useEffect/i.test(String(call[0]))
    )
    expect(hadNavigateWarning).toBe(false)

    warnSpy.mockRestore()
    authStoreState = { user: null, isLoading: false }
  })
})
