import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute      from './components/Layout/ProtectedRoute'
import GFRoute             from './components/Layout/GFRoute'
import AppLayout           from './components/Layout/AppLayout'
import Login               from './pages/Login'
import Dashboard           from './pages/Dashboard'
import Mitarbeiterliste    from './pages/Mitarbeiterliste'
import Einstellungen       from './pages/Einstellungen'
import Abwesenheiten      from './pages/Abwesenheiten'
import Zeiterfassung     from './pages/Zeiterfassung'
import Berichte          from './pages/Berichte'
import Dienstplan        from './pages/Dienstplan'
import ShiftTemplatesPage from '@/pages/Admin/ShiftTemplates'
import GameTasks from './pages/Admin/GameTasks'
import GameRewards from './pages/Admin/GameRewards'
import GameApprovals from './pages/Admin/GameApprovals'
import GameSettings from './pages/Admin/GameSettings'
import { useAuthStore } from './stores/auth'
import { pb } from './lib/pb'

export default function App() {
  useEffect(() => {
    useAuthStore.getState().refresh().catch(() => {
      pb.authStore.clear()
      useAuthStore.getState().logout()
    })
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index                      element={<Dashboard />} />
            <Route path="/abwesenheiten"      element={<Abwesenheiten />} />
            <Route path="/zeiterfassung"      element={<Zeiterfassung />} />
            <Route path="/berichte"           element={<Berichte />} />
            <Route path="/dienstplan"         element={<Dienstplan />} />
            {/* Nur GF */}
            <Route element={<GFRoute />}>
              <Route path="/mitarbeiter"              element={<Mitarbeiterliste />} />
              <Route path="/einstellungen"            element={<Einstellungen />} />
              <Route path="/admin/shift-templates"    element={<ShiftTemplatesPage />} />
              <Route path="/admin/gamification/tasks"    element={<GameTasks />} />
              <Route path="/admin/gamification/rewards"  element={<GameRewards />} />
              <Route path="/admin/gamification/approvals" element={<GameApprovals />} />
              <Route path="/admin/gamification/settings" element={<GameSettings />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
