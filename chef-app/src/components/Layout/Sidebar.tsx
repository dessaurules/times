import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarOff, Clock, BarChart2, Settings, LogOut,
} from 'lucide-react'
import { useAuthStore } from '../../stores/auth'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard',     end: true  },
  { to: '/mitarbeiter',   icon: Users,           label: 'Mitarbeiter'               },
  { to: '/abwesenheiten', icon: CalendarOff,     label: 'Abwesenheiten'             },
  { to: '/zeiterfassung', icon: Clock,           label: 'Zeiterfassung', soon: true },
  { to: '/berichte',      icon: BarChart2,       label: 'Berichte',      soon: true },
  { to: '/einstellungen', icon: Settings,        label: 'Einstellungen'             },
]

export default function Sidebar() {
  const logout   = useAuthStore(s => s.logout)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="w-[220px] shrink-0 bg-white border-r border-[#EDE7DC] flex flex-col h-full">
      <div className="flex items-center gap-2 px-5 py-[18px] text-[#BA7517] font-bold text-[15px] border-b border-[#EDE7DC]">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        Schicht &amp; Plan
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label, end, soon }) =>
          soon ? (
            <div
              key={to}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-[#BBBBBB] cursor-default"
            >
              <Icon size={16} />
              <span>{label}</span>
              <span className="ml-auto text-[10px] bg-[#F5F2EE] text-[#AAAAAA] px-1.5 py-0.5 rounded">bald</span>
            </div>
          ) : (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-[rgba(186,117,23,0.12)] text-[#BA7517] font-medium'
                    : 'text-[#706D6A] hover:bg-[#F5F2EE] hover:text-[#1A1917]'
                )
              }
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          )
        )}
      </nav>

      <div className="px-3 pt-3 pb-4 border-t border-[#EDE7DC]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm text-[#706D6A] hover:bg-[#F5F2EE] hover:text-[#1A1917] transition-colors"
        >
          <LogOut size={16} />
          <span>Abmelden</span>
        </button>
      </div>
    </aside>
  )
}
