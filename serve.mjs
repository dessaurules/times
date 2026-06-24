import express from 'express'
import compression from 'compression'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Chef-App (Port 3001) ──────────────────────────────────────
const chefApp = express()
chefApp.use(compression())
const chefAppPath = path.join(__dirname, 'chef-app', 'dist')
chefApp.use(express.static(chefAppPath, { index: 'index.html' }))
chefApp.get('*', (req, res) => {
  res.sendFile(path.join(chefAppPath, 'index.html'))
})
chefApp.listen(3001, '0.0.0.0', () => {
  console.log('✅ Chef-App läuft auf http://0.0.0.0:3001')
})

// ── Mitarbeiter-App (Port 3002) ───────────────────────────────
const mitApp = express()
mitApp.use(compression())
const mitAppPath = path.join(__dirname, 'mitarbeiter-app', 'dist')
mitApp.use(express.static(mitAppPath, { index: 'index.html' }))
mitApp.get('*', (req, res) => {
  res.sendFile(path.join(mitAppPath, 'index.html'))
})
mitApp.listen(3002, '0.0.0.0', () => {
  console.log('✅ Mitarbeiter-App läuft auf http://0.0.0.0:3002')
})

// Fehlerbehandlung
process.on('uncaughtException', (err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
