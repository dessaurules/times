import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { useAuthStore } from './stores/auth'

// User-Daten beim Start auffrischen (employee-Feld, Rolle etc.)
useAuthStore.getState().refresh()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
