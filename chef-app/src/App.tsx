import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute      from './components/Layout/ProtectedRoute'
import AppLayout           from './components/Layout/AppLayout'
import Login               from './pages/Login'
import Dashboard           from './pages/Dashboard'
import Mitarbeiterliste    from './pages/Mitarbeiterliste'
import MitarbeiterDetail   from './pages/MitarbeiterDetail'
import Einstellungen       from './pages/Einstellungen'
import Abwesenheiten      from './pages/Abwesenheiten'

function Stub({ label }: { label: string }) {
  return (
    <div className="p-2 text-[#706D6A] text-sm">
      {label} — wird in einer späteren Phase implementiert.
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index                      element={<Dashboard />} />
            <Route path="/mitarbeiter"        element={<Mitarbeiterliste />} />
            <Route path="/mitarbeiter/neu"    element={<MitarbeiterDetail />} />
            <Route path="/mitarbeiter/:id"    element={<MitarbeiterDetail />} />
            <Route path="/abwesenheiten"      element={<Abwesenheiten />} />
            <Route path="/zeiterfassung"      element={<Stub label="Zeiterfassung (Phase 3)" />} />
            <Route path="/berichte"           element={<Stub label="Berichte (Phase 3)" />} />
            <Route path="/einstellungen"      element={<Einstellungen />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
