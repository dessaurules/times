import express from 'express'
import compression from 'compression'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(compression())

const chefAppPath = path.join(__dirname, 'chef-app', 'dist')
const mitAppPath = path.join(__dirname, 'mitarbeiter-app', 'dist')

// ── Chef-App auf Root ────────────────────────────────────────
app.use('/', express.static(chefAppPath, {
  index: false,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) res.set('Cache-Control', 'no-cache')
  }
}))
app.get('/', (req, res) => {
  res.sendFile(path.join(chefAppPath, 'index.html'))
})
app.get(/^(?!\/ma\/)/, (req, res) => {
  res.sendFile(path.join(chefAppPath, 'index.html'))
})

// ── Mitarbeiter-App unter /ma ────────────────────────────────
app.use('/ma/', express.static(mitAppPath, {
  index: false,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) res.set('Cache-Control', 'no-cache')
  }
}))
app.get('/ma/', (req, res) => {
  res.sendFile(path.join(mitAppPath, 'index.html'))
})
app.get('/ma/*', (req, res) => {
  res.sendFile(path.join(mitAppPath, 'index.html'))
})

// ── Server starten ───────────────────────────────────────────
const PORT = 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Unified Server läuft auf http://0.0.0.0:${PORT}`)
  console.log(`   - Chef-App: http://0.0.0.0:${PORT}/`)
  console.log(`   - Mitarbeiter-App: http://0.0.0.0:${PORT}/ma/`)
})

// Fehlerbehandlung
process.on('uncaughtException', (err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
