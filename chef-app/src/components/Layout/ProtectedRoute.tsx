import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'

export default function ProtectedRoute() {
  const user = useAuthStore(s => s.user)

  if (!user) return <Navigate to="/login" replace />

  if (user.role === 'mitarbeiter') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6]">
        <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-8 max-w-sm text-center shadow-sm">
          <p className="font-semibold mb-2 text-[#111827]">Falscher Zugang</p>
          <p className="text-sm text-[#6B7280]">
            Bitte die <strong>Mitarbeiter-App</strong> nutzen.
          </p>
        </div>
      </div>
    )
  }

  return <Outlet />
}
