import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'

export default function ProtectedRoute() {
  const user = useAuthStore(s => s.user)

  if (!user) return <Navigate to="/login" replace />

  if (user.role === 'mitarbeiter') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F2EE]">
        <div className="bg-white border border-[#EDE7DC] rounded-[8px] p-8 max-w-sm text-center shadow-sm">
          <p className="font-semibold mb-2 text-[#1A1917]">Falscher Zugang</p>
          <p className="text-sm text-[#706D6A]">
            Bitte die <strong>Mitarbeiter-App</strong> nutzen.
          </p>
        </div>
      </div>
    )
  }

  return <Outlet />
}
