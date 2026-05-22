import { NavLink } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, CalendarOff, Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/',              icon: LayoutDashboard, label: 'Start',    end: true },
  { to: '/dienstplan',    icon: CalendarDays,    label: 'Plan'               },
  { to: '/abwesenheiten', icon: CalendarOff,     label: 'Urlaub'             },
  { to: '/zeiten',        icon: Clock,           label: 'Zeiten'             },
  { to: '/meine-daten',   icon: User,            label: 'Profil'             },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden bg-white border-t border-[#E5E7EB] safe-bottom">
      {NAV.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors',
              isActive ? 'text-indigo-600' : 'text-[#9CA3AF]'
            )
          }
        >
          {({ isActive }) => (
            <>
              <div className={cn(
                'w-10 h-6 rounded-full flex items-center justify-center transition-colors',
                isActive && 'bg-indigo-50'
              )}>
                <Icon size={18} />
              </div>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
