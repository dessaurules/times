import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute      from './components/Layout/ProtectedRoute'
import GFRoute             from './components/Layout/GFRoute'
import AppLayout           from './components/Layout/AppLayout'
import Login               from './pages/Login'
import Dashboard           from './pages/Dashboard'
import Mitarbeiterliste    from './pages/Mitarbeiterliste'
import MitarbeiterDetail   from './pages/MitarbeiterDetail'
import Einstellungen       from './pages/Einstellungen'
import Abwesenheiten      from './pages/Abwesenheiten'
import Zeiterfassung     from './pages/Zeiterfassung'
import Berichte          from './pages/Berichte'

export default function App() {
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
            {/* Nur GF */}
            <Route element={<GFRoute />}>
              <Route path="/mitarbeiter"      element={<Mitarbeiterliste />} />
              <Route path="/mitarbeiter/neu"  element={<MitarbeiterDetail />} />
              <Route path="/mitarbeiter/:id"  element={<MitarbeiterDetail />} />
              <Route path="/einstellungen"    element={<Einstellungen />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
