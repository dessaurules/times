import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, Users, CalendarOff, CalendarRange, Clock, BarChart2, Settings, LogOut, Sparkles, ChevronDown,
} from 'lucide-react'
import { useAuthStore } from '../../stores/auth'
import { cn } from '@/lib/utils'
import NotificationBell from '../NotificationBell'

interface NavItem {
  to?: string
  icon: React.ComponentType<{ size: number }>
  label: string
  end?: boolean
  gfOnly?: boolean
  submenu?: NavItem[]
}

const NAV: NavItem[] = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard',     end: true,  gfOnly: false },
  { to: '/mitarbeiter',   icon: Users,           label: 'Mitarbeiter',               gfOnly: true  },
  { to: '/abwesenheiten', icon: CalendarOff,     label: 'Abwesenheiten',             gfOnly: false },
  { to: '/dienstplan',   icon: CalendarRange,   label: 'Dienstplan',                gfOnly: false },
  { to: '/zeiterfassung', icon: Clock,           label: 'Zeiterfassung',             gfOnly: false },
  { to: '/berichte',      icon: BarChart2,       label: 'Berichte',                  gfOnly: false },
  { to: '/einstellungen', icon: Settings,        label: 'Einstellungen',             gfOnly: true  },
  {
    icon: Sparkles,
    label: 'Gamification',
    gfOnly: true,
    submenu: [
      { to: '/admin/gamification/tasks', icon: Sparkles, label: 'Aufgaben', gfOnly: true },
      { to: '/admin/gamification/rewards', icon: Sparkles, label: 'Prämien', gfOnly: true },
      { to: '/admin/gamification/approvals', icon: Sparkles, label: 'Genehmigungen', gfOnly: true },
      { to: '/admin/gamification/settings', icon: Sparkles, label: 'Einstellungen', gfOnly: true },
    ],
  },
]

export default function Sidebar() {
  const logout   = useAuthStore(s => s.logout)
  const user     = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const isGF     = user?.role === 'gf'
  const [expandedSubmenu, setExpandedSubmenu] = useState<string | null>(null)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="w-[220px] shrink-0 flex flex-col h-full bg-white border-r border-[#E5E7EB]">
      <div className="flex items-center gap-2 px-5 py-[18px] font-bold text-[15px] border-b border-[#E5E7EB] text-[#4F46E5]">
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
        {NAV.filter(n => !n.gfOnly || isGF).map((item) => {
          const key = item.to || item.label
          if (item.submenu) {
            const isExpanded = expandedSubmenu === key
            return (
              <div key={key}>
                <button
                  onClick={() => setExpandedSubmenu(isExpanded ? null : key)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                    'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]'
                  )}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                  <ChevronDown
                    size={16}
                    className={cn('ml-auto transition-transform', isExpanded && 'rotate-180')}
                  />
                </button>
                {isExpanded && (
                  <div className="pl-6 mt-0.5 space-y-0.5">
                    {item.submenu.map((subitem) => (
                      <NavLink
                        key={subitem.to}
                        to={subitem.to || ''}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                            isActive
                              ? 'bg-[rgba(79,70,229,0.10)] text-[#4F46E5] font-medium'
                              : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]'
                          )
                        }
                      >
                        <subitem.icon size={16} />
                        <span>{subitem.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          }
          return (
            <NavLink
              key={key}
              to={item.to || ''}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-[rgba(79,70,229,0.10)] text-[#4F46E5] font-medium'
                    : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]'
                )
              }
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="px-3 pt-3 pb-4 border-t border-[#E5E7EB]">
        {user && (
          <div className="px-3 py-2 mb-1 text-xs">
            <div className="font-medium truncate text-[#111827]">{user.name}</div>
            <div className="text-[11px] text-[#6B7280]">{user.role === 'gf' ? 'Geschäftsführung' : 'Schichtleitung'}</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm transition-colors text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
        >
          <LogOut size={16} />
          <span>Abmelden</span>
        </button>
      </div>
    </aside>
  )
}
