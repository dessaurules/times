import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Der initiale refresh() passiert in App.tsx — hier NICHT zusätzlich aufrufen:
// zwei parallele authRefresh()-Calls lösen die Auto-Cancellation des SDK aus.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
