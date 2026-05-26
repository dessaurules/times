import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import NotificationBell from '../NotificationBell'
import PushPermissionBanner from '../PushPermissionBanner'

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobiler Header — nur auf kleinen Bildschirmen */}
        <header className="flex md:hidden items-center justify-between px-4 py-3 bg-white border-b border-[#E5E7EB] shrink-0">
          <span className="font-bold text-[15px] bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Schicht & Plan
          </span>
          <NotificationBell />
        </header>
        <PushPermissionBanner />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <div className="max-w-4xl mx-auto px-4 py-5 md:px-6 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
