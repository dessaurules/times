import express from 'express'
import compression from 'compression'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()

// Middleware
app.use(compression())

// ── Chef-App (Port 4173) ──────────────────────────────────────
const chefAppPath = path.join(__dirname, 'chef-app', 'dist')
app.use('/', (req, res, next) => {
  // Chef-App läuft auf Port 4173 → alle Requests servieren von dist
  // Für SPAs: Fallback auf index.html wenn Datei nicht existiert
  express.static(chefAppPath, {
    index: 'index.html',
    fallthrough: true
  })(req, res, next)
})

// SPA Fallback: alle nicht gefundenen Routes → index.html (Client-Side Routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(chefAppPath, 'index.html'))
})

// ── Fehlerbehandlung ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.message)
  res.status(500).json({ error: 'Internal Server Error' })
})

// ── Server starten ────────────────────────────────────────────
const PORT = process.env.PORT || 4173
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Chef-App Server läuft auf http://0.0.0.0:${PORT}`)
})
