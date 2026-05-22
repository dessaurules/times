import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, CalendarOff, Clock, User, LogOut, Zap,
} from 'lucide-react'
import { useAuthStore } from '../../stores/auth'
import { cn } from '@/lib/utils'
import NotificationBell from '../NotificationBell'

const NAV = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard',     end: true  },
  { to: '/dienstplan',    icon: CalendarDays,    label: 'Dienstplan'                },
  { to: '/abwesenheiten', icon: CalendarOff,     label: 'Abwesenheiten'             },
  { to: '/zeiten',        icon: Clock,           label: 'Meine Zeiten'              },
  { to: '/meine-daten',   icon: User,            label: 'Meine Daten'               },
]

export default function Sidebar() {
  const logout   = useAuthStore(s => s.logout)
  const user     = useAuthStore(s => s.user)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="hidden md:flex w-[220px] shrink-0 flex-col h-full bg-white border-r border-[#E5E7EB]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-[18px] border-b border-[#E5E7EB]">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
          <Zap size={14} className="text-white" />
        </div>
        <span className="font-bold text-[15px] bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
          Schicht & Plan
        </span>
        <div className="ml-auto">
          <NotificationBell />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                isActive
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-medium shadow-sm shadow-indigo-200'
                  : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]'
              )
            }
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 pt-3 pb-4 border-t border-[#E5E7EB]">
        {user && (
          <div className="px-3 py-2 mb-1">
            <div className="text-xs font-medium text-[#111827] truncate">{user.name}</div>
            <div className="text-[11px] text-[#6B7280]">Mitarbeiter</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors"
        >
          <LogOut size={16} />
          <span>Abmelden</span>
        </button>
      </div>
    </aside>
  )
}
