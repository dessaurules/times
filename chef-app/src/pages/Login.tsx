import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { Button } from '../components/ui/button'
import { Input }  from '../components/ui/input'
import { Label }  from '../components/ui/label'

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const navigate = useNavigate()
  const login = useAuthStore(s => s.login)
  const isLoading = useAuthStore(s => s.isLoading)
  const user = useAuthStore(s => s.user)

  if (user && (user.role === 'gf' || user.role === 'sl')) {
    navigate('/', { replace: true })
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await login(email, password)
    } catch {
      setError('E-Mail oder Passwort falsch.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F2EE]">
      <div className="bg-white border border-[#EDE7DC] rounded-[8px] p-8 w-full max-w-sm shadow-sm">

        <div className="flex items-center gap-2 mb-8 text-[#BA7517] font-bold text-[15px]">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          Schicht &amp; Plan
        </div>

        <h1 className="text-xl font-bold mb-1 text-[#1A1917]">Anmelden</h1>
        <p className="text-sm text-[#706D6A] mb-6">Chef-App · Verwaltung</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              className="mt-1 border-[#EDE7DC] focus:border-[#BA7517] focus:ring-[#BA7517]"
            />
          </div>
          <div>
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="mt-1 border-[#EDE7DC] focus:border-[#BA7517] focus:ring-[#BA7517]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#BA7517] hover:bg-[#9E6312] text-white font-semibold"
          >
            {isLoading ? 'Anmelden …' : 'Anmelden'}
          </Button>
        </form>
      </div>
    </div>
  )
}
