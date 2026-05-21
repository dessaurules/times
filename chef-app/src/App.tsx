import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/Layout/ProtectedRoute'
import Login from './pages/Login'

function Stub({ label }: { label: string }) {
  return (
    <div className="p-8 text-[#706D6A] text-sm">
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
          <Route index element={<Stub label="Dashboard" />} />
          <Route path="/mitarbeiter" element={<Stub label="Mitarbeiterliste" />} />
          <Route path="/mitarbeiter/neu" element={<Stub label="Neuer Mitarbeiter" />} />
          <Route path="/mitarbeiter/:id" element={<Stub label="Mitarbeiter-Detail" />} />
          <Route path="/abwesenheiten" element={<Stub label="Abwesenheiten (Phase 2)" />} />
          <Route path="/zeiterfassung" element={<Stub label="Zeiterfassung (Phase 3)" />} />
          <Route path="/berichte" element={<Stub label="Berichte (Phase 3)" />} />
          <Route path="/einstellungen" element={<Stub label="Einstellungen" />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
