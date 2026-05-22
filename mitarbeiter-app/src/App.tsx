import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/Layout/ProtectedRoute'
import AppLayout      from './components/Layout/AppLayout'
import Login          from './pages/Login'
import Dashboard      from './pages/Dashboard'
import Dienstplan     from './pages/Dienstplan'
import Abwesenheiten  from './pages/Abwesenheiten/Abwesenheiten'
import Zeiten         from './pages/Zeiten/Zeiten'
import MeineDaten     from './pages/MeineDaten/MeineDaten'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index                    element={<Dashboard />} />
            <Route path="/dienstplan"       element={<Dienstplan />} />
            <Route path="/abwesenheiten"    element={<Abwesenheiten />} />
            <Route path="/zeiten"           element={<Zeiten />} />
            <Route path="/meine-daten"      element={<MeineDaten />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
