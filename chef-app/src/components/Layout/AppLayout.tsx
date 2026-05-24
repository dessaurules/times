import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { cn } from '@/lib/utils'

const glassUI = import.meta.env.VITE_GLASS_UI === 'true'

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-[#F5F2EE] overflow-hidden">
      <Sidebar />
      <main className={cn(
        'flex-1 overflow-auto',
        glassUI && 'bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 min-h-screen'
      )}>
        <div className="p-6 max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
