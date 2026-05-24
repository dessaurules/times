import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

const glassUI = import.meta.env.VITE_GLASS_UI === 'true'

const GLASS_BG: React.CSSProperties = {
  background: [
    'radial-gradient(ellipse at 15% 20%, rgba(37,99,235,0.90) 0%, transparent 52%)',
    'radial-gradient(ellipse at 80% 12%, rgba(147,197,253,0.75) 0%, transparent 52%)',
    'radial-gradient(ellipse at 50% 88%, rgba(99,102,241,0.80) 0%, transparent 52%)',
    'radial-gradient(ellipse at 92% 65%, rgba(255,255,255,0.25) 0%, transparent 45%)',
    'radial-gradient(ellipse at 8%  72%, rgba(56,189,248,0.70) 0%, transparent 45%)',
    'radial-gradient(ellipse at 48% 42%, rgba(186,230,253,0.40) 0%, transparent 40%)',
    '#0c1f6e',
  ].join(','),
}

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden" style={glassUI ? GLASS_BG : { background: '#F5F2EE' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
