import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarOff, Clock, BarChart2, Settings, LogOut,
} from 'lucide-react'
import { useAuthStore } from '../../stores/auth'
import { cn } from '@/lib/utils'
import NotificationBell from '../NotificationBell'

const glassUI = import.meta.env.VITE_GLASS_UI === 'true'

const NAV = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard',     end: true,  gfOnly: false },
  { to: '/mitarbeiter',   icon: Users,           label: 'Mitarbeiter',               gfOnly: true  },
  { to: '/abwesenheiten', icon: CalendarOff,     label: 'Abwesenheiten',             gfOnly: false },
  { to: '/zeiterfassung', icon: Clock,           label: 'Zeiterfassung',             gfOnly: false },
  { to: '/berichte',      icon: BarChart2,       label: 'Berichte',                  gfOnly: false },
  { to: '/einstellungen', icon: Settings,        label: 'Einstellungen',             gfOnly: true  },
]

export default function Sidebar() {
  const logout   = useAuthStore(s => s.logout)
  const user     = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const isGF     = user?.role === 'gf'

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className={cn(
      'w-[220px] shrink-0 flex flex-col h-full',
      glassUI
        ? 'bg-white/15 backdrop-blur-xl border-r border-white/20'
        : 'bg-white border-r border-[#EDE7DC]'
    )}>
      <div className={cn(
        'flex items-center gap-2 px-5 py-[18px] font-bold text-[15px] border-b',
        glassUI ? 'text-white border-white/20' : 'text-[#BA7517] border-[#EDE7DC]'
      )}>
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        Schicht &amp; Plan
        <div className="ml-auto">
          <NotificationBell />
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.filter(n => !n.gfOnly || isGF).map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                glassUI
                  ? isActive
                    ? 'bg-white/25 text-white font-medium'
                    : 'text-white/70 hover:bg-white/15 hover:text-white'
                  : isActive
                    ? 'bg-[rgba(186,117,23,0.12)] text-[#BA7517] font-medium'
                    : 'text-[#706D6A] hover:bg-[#F5F2EE] hover:text-[#1A1917]'
              )
            }
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={cn('px-3 pt-3 pb-4 border-t', glassUI ? 'border-white/20' : 'border-[#EDE7DC]')}>
        {user && (
          <div className="px-3 py-2 mb-1 text-xs">
            <div className={cn('font-medium truncate', glassUI ? 'text-white' : 'text-[#1A1917]')}>{user.name}</div>
            <div className={cn('text-[11px]', glassUI ? 'text-white/60' : 'text-[#706D6A]')}>{user.role === 'gf' ? 'Geschäftsführung' : 'Schichtleitung'}</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm transition-colors',
            glassUI ? 'text-white/70 hover:bg-white/15 hover:text-white' : 'text-[#706D6A] hover:bg-[#F5F2EE] hover:text-[#1A1917]'
          )}
        >
          <LogOut size={16} />
          <span>Abmelden</span>
        </button>
      </div>
    </aside>
  )
}
