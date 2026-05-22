import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'

export default function GFRoute() {
  const user = useAuthStore(s => s.user)
  if (user?.role !== 'gf') return <Navigate to="/" replace />
  return <Outlet />
}
