import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/Layout/ProtectedRoute'
import AppLayout      from './components/Layout/AppLayout'
import Login          from './pages/Login'
import Dashboard      from './pages/Dashboard'
import Dienstplan     from './pages/Dienstplan'
import Abwesenheiten  from './pages/Abwesenheiten/Abwesenheiten'
import Zeiten         from './pages/Zeiten/Zeiten'
import MeineDaten     from './pages/MeineDaten/MeineDaten'
import { useAuthStore } from './stores/auth'
import { pb } from './lib/pb'

export default function App() {
  useEffect(() => {
    useAuthStore.getState().refresh().catch(() => {
      pb.authStore.clear()
      useAuthStore.getState().logout()
    })
  }, [])

  // basename aus Vites `base` ('/ma/'): ohne ihn matcht /ma/ keine Route, die
  // Catch-all schreibt die URL auf '/' um — und der naechste Reload laedt dort
  // die Chef-App statt der Mitarbeiter-App.
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
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
