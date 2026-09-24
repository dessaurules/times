# Mitarbeiter-App: Dashboard Redesign & Push-Notifications – Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dashboard zeigt Monatsstunden-Halbkreis + Urlaubsbalken; echte System-Push-Notifications für 5 Szenarien.

**Architecture:** Phase 1 (Tasks 1–3) ist reines React-Refactoring in der Mitarbeiter-App, unabhängig von Phase 2. Phase 2 (Tasks 4–9) fügt einen neuen Node.js Push-Service, einen vite-plugin-pwa Service Worker und PocketBase JS Hooks hinzu.

**Tech Stack:** React 19, TypeScript, Vite 8, vite-plugin-pwa, PocketBase 0.26.9, Node.js (Express + web-push + node-cron + tsx), date-fns v4

---

## Dateistruktur

```
mitarbeiter-app/src/
  components/
    MonatsstundenGauge.tsx      ← NEU: SVG-Halbkreis
    UrlaubsCard.tsx             ← NEU: Fortschrittsbalken + Legende
    PushPermissionBanner.tsx    ← NEU: Push-Erlaubnis-Banner
    Layout/AppLayout.tsx        ← MODIFY: Banner einbinden
  lib/
    push.ts                     ← NEU: Web-Push-Subscription
  pages/
    Dashboard.tsx               ← MODIFY: Monatsnavigation + neue Karten

push-service/                   ← NEU: Node.js Service
  package.json
  tsconfig.json
  .env
  src/
    index.ts                    ← Express + Cron-Start
    sender.ts                   ← sendPushToEmployee()
    jobs/
      einstempel.ts             ← Cron: Eingestempelt?
      ausstempel.ts             ← Cron: Noch gestempelt?
      morgen.ts                 ← Cron: Schicht morgen

pb_hooks/                       ← NEU: PocketBase Server-Hooks
  push_absences.pb.js           ← Hook: Antrag genehmigt/abgelehnt
  push_dienstplan.pb.js         ← Hook: Dienstplan veröffentlicht

scripts/setup-pb.mjs            ← MODIFY: push_subscriptions Collection + push_notified Felder
```

---

## Phase 1: Dashboard Redesign

### Task 1: MonatsstundenGauge Komponente

**Files:**
- Create: `mitarbeiter-app/src/components/MonatsstundenGauge.tsx`

- [ ] **Datei erstellen**

```tsx
// mitarbeiter-app/src/components/MonatsstundenGauge.tsx
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  actualMins: number
  targetMins: number
  month: Date
  onPrev: () => void
  onNext: () => void
}

function formatHM(mins: number) {
  const h = Math.floor(Math.abs(mins) / 60)
  const m = Math.abs(mins) % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

const R = 84
const HALF_CIRC = Math.PI * R // ≈ 263.9

export default function MonatsstundenGauge({ actualMins, targetMins, month, onPrev, onNext }: Props) {
  const pct = targetMins > 0 ? Math.min(actualMins / targetMins, 1) : 0
  const dashOffset = (1 - pct) * HALF_CIRC
  const monthLabel = format(month, 'MMMM yyyy', { locale: de })

  return (
    <div className="rounded-2xl bg-white border border-[#E5E7EB] shadow-sm p-5">
      {/* Monatsnavigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onPrev}
          className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280] transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-[#374151] capitalize">{monthLabel}</span>
        <button
          onClick={onNext}
          className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280] transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Halbkreis */}
      <div className="flex flex-col items-center">
        <svg width="200" height="110" viewBox="0 0 200 110" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
          {/* Hintergrund-Bogen */}
          <path
            d={`M ${100 - R} 100 A ${R} ${R} 0 0 1 ${100 + R} 100`}
            fill="none" stroke="#E5E7EB" strokeWidth="16" strokeLinecap="round"
          />
          {/* Fortschritts-Bogen */}
          <path
            d={`M ${100 - R} 100 A ${R} ${R} 0 0 1 ${100 + R} 100`}
            fill="none" stroke="url(#gaugeGrad)" strokeWidth="16" strokeLinecap="round"
            strokeDasharray={HALF_CIRC}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="text-center -mt-3">
          <div className="text-3xl font-bold text-[#111827] tabular-nums">{formatHM(actualMins)}</div>
          <div className="text-sm text-[#6B7280] mt-0.5">
            von {formatHM(targetMins)} Stunden
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Dev-Server starten und visuell prüfen** — `cd mitarbeiter-app && npm run dev`
  - Gauge zeigt Halbkreis mit Gradient
  - Navigation ← → wechselt Monatslabel
  - Bei 0% ist Bogen leer, bei 100% voll

- [ ] **Commit**

```bash
git add mitarbeiter-app/src/components/MonatsstundenGauge.tsx
git commit -m "feat(mitarbeiter): MonatsstundenGauge SVG-Halbkreis Komponente"
```

---

### Task 2: UrlaubsCard Komponente

**Files:**
- Create: `mitarbeiter-app/src/components/UrlaubsCard.tsx`

- [ ] **Datei erstellen**

```tsx
// mitarbeiter-app/src/components/UrlaubsCard.tsx
import { cn } from '@/lib/utils'

interface Props {
  taken: number       // genehmigte Urlaubstage
  planned: number     // ausstehende (pending) Urlaubstage
  entitlement: number // Gesamtanspruch
  monthDeltaMins: number // Ist - Soll des ausgewählten Monats (für Überstunden-Badge)
}

function formatHM(mins: number) {
  const h = Math.floor(Math.abs(mins) / 60)
  const m = Math.abs(mins) % 60
  return `${mins >= 0 ? '+' : '-'}${h}:${String(m).padStart(2, '0')}`
}

export default function UrlaubsCard({ taken, planned, entitlement, monthDeltaMins }: Props) {
  const used    = taken + planned
  const open    = Math.max(0, entitlement - used)
  const takenPct   = entitlement > 0 ? (taken   / entitlement) * 100 : 0
  const plannedPct = entitlement > 0 ? (planned / entitlement) * 100 : 0

  return (
    <div className="rounded-2xl bg-white border border-[#E5E7EB] shadow-sm p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🌴</span>
          <span className="text-sm font-semibold text-[#111827]">Urlaubstage</span>
        </div>
        <span className="text-xs text-[#6B7280]">{used} von {entitlement} benutzt</span>
      </div>

      {/* Fortschrittsbalken */}
      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-[#E5E7EB]">
        {takenPct > 0 && (
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-l-full"
            style={{ width: `${takenPct}%` }}
          />
        )}
        {plannedPct > 0 && (
          <div
            className="h-full bg-amber-400"
            style={{ width: `${plannedPct}%` }}
          />
        )}
      </div>

      {/* Legende + Offen-Zahl */}
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-[#374151]">
            <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
            {taken} Verbraucht
          </div>
          {planned > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-[#374151]">
              <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              {planned} Verplant
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[#111827]">{open}</div>
          <div className="text-xs text-[#6B7280]">Offen</div>
        </div>
      </div>

      {/* Überstunden-Badge */}
      {monthDeltaMins !== 0 && (
        <div className={cn(
          'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full',
          monthDeltaMins > 0
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            : 'bg-red-50 text-red-700 border border-red-100'
        )}>
          {formatHM(monthDeltaMins)} Std. diesen Monat
        </div>
      )}
    </div>
  )
}
```

- [ ] **Visuell prüfen** – Komponente temporär im Dashboard einbinden, verschiedene Werte testen (taken=0, planned=0, overfull)

- [ ] **Commit**

```bash
git add mitarbeiter-app/src/components/UrlaubsCard.tsx
git commit -m "feat(mitarbeiter): UrlaubsCard mit Fortschrittsbalken + Überstunden-Badge"
```

---

### Task 3: Dashboard.tsx – Monatsnavigation + neue Karten

**Files:**
- Modify: `mitarbeiter-app/src/pages/Dashboard.tsx`

- [ ] **Imports ergänzen**

Am Anfang der Datei neue Imports hinzufügen:

```tsx
import {
  startOfMonth, endOfMonth, addMonths, subMonths,
  eachDayOfInterval, isWeekend, format, differenceInMinutes, parseISO,
} from 'date-fns'
// (format, differenceInMinutes, parseISO, eachDayOfInterval, isWeekend bereits vorhanden – nicht doppelt importieren)
import MonatsstundenGauge from '../components/MonatsstundenGauge'
import UrlaubsCard from '../components/UrlaubsCard'
```

- [ ] **Neuen State + Effekt für Monats-Daten hinzufügen**

Nach dem bestehenden `const [fedState, setFedState] = useState('ST')` einfügen:

```tsx
const [viewMonth, setViewMonth] = useState(new Date())
const [monthEntries, setMonthEntries] = useState<TimeEntry[]>([])
```

Neuen `useEffect` nach dem bestehenden data-fetch useEffect einfügen:

```tsx
useEffect(() => {
  if (!employeeId) return
  const from = format(startOfMonth(viewMonth), 'yyyy-MM-dd')
  const to   = format(endOfMonth(viewMonth),   'yyyy-MM-dd')
  pb.collection('time_entries').getFullList<TimeEntry>({
    filter: `employee = "${employeeId}" && start_time >= "${from}" && start_time < "${to} 23:59:59"`,
    sort: 'start_time',
    requestKey: null,
  }).then(setMonthEntries).catch(console.error)
}, [employeeId, viewMonth])
```

- [ ] **targetMins + actualMonthMins berechnen**

Nach dem bestehenden `const holidays = useMemo(...)` einfügen:

```tsx
const targetMins = useMemo(() => {
  const days = eachDayOfInterval({
    start: startOfMonth(viewMonth),
    end:   endOfMonth(viewMonth),
  }).filter(d => !isWeekend(d) && !holidays.has(format(d, 'yyyy-MM-dd')))
  return Math.round((emp?.weekly_hours ?? 0) / 5 * days.length * 60)
}, [viewMonth, emp, holidays])

const actualMonthMins = useMemo(() => {
  return monthEntries.reduce((sum, e) => {
    const gross = differenceInMinutes(
      e.end_time ? parseISO(e.end_time) : new Date(),
      parseISO(e.start_time)
    )
    return sum + Math.max(0, gross - (e.break_minutes ?? 0))
  }, 0)
}, [monthEntries])

const plannedDays = useMemo(() => absences
  .filter(a => VACATION_TYPES.includes(a.type) && a.status === 'pending')
  .reduce((sum, a) => {
    return sum + eachDayOfInterval({ start: parseISO(a.date_from), end: parseISO(a.date_to) })
      .filter(d => !isWeekend(d) && !holidays.has(format(d, 'yyyy-MM-dd')))
      .length
  }, 0), [absences, holidays])
```

- [ ] **Urlaubskonto-Karte ersetzen**

Den Block von `{/* Urlaubskonto */}` (Zeile ~209 bis ~236) **komplett ersetzen** durch:

```tsx
{/* Monatsstunden + Urlaub */}
<div className="space-y-3">
  <MonatsstundenGauge
    actualMins={actualMonthMins}
    targetMins={targetMins}
    month={viewMonth}
    onPrev={() => setViewMonth(m => subMonths(m, 1))}
    onNext={() => setViewMonth(m => addMonths(m, 1))}
  />
  <UrlaubsCard
    taken={takenDays}
    planned={plannedDays}
    entitlement={entitlement}
    monthDeltaMins={actualMonthMins - targetMins}
  />
</div>
```

- [ ] **Ungenutzten Import `CalendarOff` entfernen** (war für die alte Karte)

- [ ] **Manuell testen**
  - Dashboard öffnen: Gauge zeigt aktuellen Monat
  - Navigation ← → wechselt Monat, Stunden aktualisieren sich
  - Urlaubskarte zeigt korrekte Aufschlüsselung
  - Überstunden-Badge erscheint mit korrektem Vorzeichen

- [ ] **Commit**

```bash
git add mitarbeiter-app/src/pages/Dashboard.tsx
git commit -m "feat(mitarbeiter): Dashboard Monatsnavigation + Gauge + UrlaubsCard"
```

---

## Phase 2: Push-Notifications

### Task 4: Schema-Erweiterung in PocketBase

**Files:**
- Modify: `scripts/setup-pb.mjs`

- [ ] **push_subscriptions Collection hinzufügen**

Vor dem letzten `console.log('✓ Setup abgeschlossen')` in `setup-pb.mjs` einfügen:

```js
// ── push_subscriptions ────────────────────────────────
const employees = await (async () => {
  const r = await fetch(`${BASE}/api/collections/employees`, { headers: H })
  return r.json()
})()

await create({
  name: 'push_subscriptions', type: 'base',
  listRule:   "@request.auth.id != '' && employee.user = @request.auth.id",
  viewRule:   "@request.auth.id != '' && employee.user = @request.auth.id",
  createRule: "@request.auth.id != ''",
  updateRule: "@request.auth.id != '' && employee.user = @request.auth.id",
  deleteRule: "@request.auth.id != '' && employee.user = @request.auth.id",
  fields: [
    f.relation('employee', employees.id, { required: true }),
    f.text('endpoint',  { required: true }),
    f.text('p256dh',    { required: true }),
    f.text('auth',      { required: true }),
    f.text('user_agent'),
  ],
})
```

- [ ] **push_notified Feld zu absences hinzufügen**

In der `absences`-Collection-Definition in setup-pb.mjs das Feld ergänzen:

```js
// In der fields-Liste der absences Collection:
f.bool('push_notified'),
```

Falls die Collection bereits existiert, manuell im PocketBase Admin UI unter **absences → Felder → + Neues Feld** ein `bool`-Feld `push_notified` hinzufügen.

- [ ] **push_notified Feld zu shift_plans hinzufügen**

Analog: `f.bool('push_notified')` in der `shift_plans`-Collection.  
Falls sie bereits existiert: PocketBase Admin UI → shift_plans → + Feld → bool → `push_notified`.

- [ ] **Setup-Script ausführen** (PocketBase muss laufen)

```bash
node scripts/setup-pb.mjs
```

Erwartete Ausgabe enthält: `✓ Collection "push_subscriptions" angelegt`

- [ ] **Commit**

```bash
git add scripts/setup-pb.mjs
git commit -m "feat: push_subscriptions Collection + push_notified Felder"
```

---

### Task 5: vite-plugin-pwa einrichten

**Files:**
- Modify: `mitarbeiter-app/vite.config.ts`
- Modify: `mitarbeiter-app/package.json`

- [ ] **Paket installieren**

```bash
cd mitarbeiter-app && npm install vite-plugin-pwa
```

- [ ] **vite.config.ts aktualisieren**

```ts
// mitarbeiter-app/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Schicht & Plan',
        short_name: 'Schicht & Plan',
        description: 'Mitarbeiter-App für Dienstplan, Stempeluhr und Urlaub',
        theme_color: '#4F46E5',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
})
```

- [ ] **Platzhalter-Icons erstellen** (falls noch keine vorhanden)

```bash
# Einfache indigo-farbene Platzhalter-PNGs mit ImageMagick (optional)
# Oder einfach leere PNG-Dateien anlegen — wichtig ist nur dass die Pfade existieren
touch mitarbeiter-app/public/icon-192.png mitarbeiter-app/public/icon-512.png
```

> Hinweis: Echte Icons können später mit einem Online-Tool (z.B. realfavicongenerator.net) generiert werden.

- [ ] **Dev-Build prüfen**

```bash
cd mitarbeiter-app && npm run build
```

Erwartete Ausgabe: Kein Fehler, `dist/sw.js` und `dist/manifest.webmanifest` wurden generiert.

- [ ] **Commit**

```bash
git add mitarbeiter-app/vite.config.ts mitarbeiter-app/package.json mitarbeiter-app/public/
git commit -m "feat(mitarbeiter): vite-plugin-pwa Service Worker + Manifest"
```

---

### Task 6: Frontend Push-Subscription

**Files:**
- Create: `mitarbeiter-app/src/lib/push.ts`
- Create: `mitarbeiter-app/src/components/PushPermissionBanner.tsx`
- Modify: `mitarbeiter-app/src/components/Layout/AppLayout.tsx`

- [ ] **push.ts erstellen**

```ts
// mitarbeiter-app/src/lib/push.ts
import { pb } from './pb'

// VAPID Public Key – nach push-service Setup eintragen
const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC ?? ''

export async function subscribePush(employeeId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    })

    const json = sub.toJSON()
    await pb.collection('push_subscriptions').create({
      employee: employeeId,
      endpoint: json.endpoint,
      p256dh:   json.keys?.p256dh ?? '',
      auth:     json.keys?.auth   ?? '',
      user_agent: navigator.userAgent.slice(0, 200),
    })

    return true
  } catch {
    return false
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}
```

- [ ] **`mitarbeiter-app/.env.local` anlegen** (nach VAPID-Key-Generierung in Task 7 befüllen)

```env
VITE_VAPID_PUBLIC=PLACEHOLDER_WIRD_IN_TASK_7_ERSETZT
```

- [ ] **PushPermissionBanner.tsx erstellen**

```tsx
// mitarbeiter-app/src/components/PushPermissionBanner.tsx
import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { useAuthStore } from '../stores/auth'
import { subscribePush } from '../lib/push'

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches

export default function PushPermissionBanner() {
  const user = useAuthStore(s => s.user)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'default') return
    // iOS: nur anzeigen wenn als PWA installiert
    if (isIOS && !isInStandaloneMode) return
    setShow(true)
  }, [])

  if (!show) return null

  async function handleAllow() {
    if (!user?.employee) return
    const ok = await subscribePush(user.employee)
    setShow(false)
    if (!ok) console.warn('Push-Subscription fehlgeschlagen')
  }

  return (
    <div className="mx-4 mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3">
      <Bell size={16} className="text-indigo-500 mt-0.5 shrink-0" />
      <div className="flex-1">
        {isIOS && !isInStandaloneMode ? (
          <p className="text-xs text-indigo-700">
            Füge diese App zum Homescreen hinzu um Push-Benachrichtigungen zu erhalten.
          </p>
        ) : (
          <>
            <p className="text-xs font-semibold text-indigo-800">Benachrichtigungen aktivieren</p>
            <p className="text-xs text-indigo-600 mt-0.5">
              Erhalte Erinnerungen für Schichten, Dienstpläne und Antragsantworten.
            </p>
            <button
              onClick={handleAllow}
              className="mt-2 text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1 rounded-lg transition-colors"
            >
              Jetzt aktivieren
            </button>
          </>
        )}
      </div>
      <button onClick={() => setShow(false)} className="text-indigo-300 hover:text-indigo-500">
        <X size={14} />
      </button>
    </div>
  )
}
```

- [ ] **AppLayout.tsx: Banner einbinden**

`PushPermissionBanner` nach dem `<header>` (mobiler Header) und vor `<main>` einfügen:

```tsx
// mitarbeiter-app/src/components/Layout/AppLayout.tsx
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import NotificationBell from '../NotificationBell'
import PushPermissionBanner from '../PushPermissionBanner'

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex md:hidden items-center justify-between px-4 py-3 bg-white border-b border-[#E5E7EB] shrink-0">
          <span className="font-bold text-[15px] bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Schicht & Plan
          </span>
          <NotificationBell />
        </header>
        <PushPermissionBanner />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <div className="max-w-4xl mx-auto px-4 py-5 md:px-6 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Manuell testen** – App im Browser öffnen: Banner erscheint, "Jetzt aktivieren" triggert Browser-Dialog

- [ ] **Commit**

```bash
git add mitarbeiter-app/src/lib/push.ts mitarbeiter-app/src/components/PushPermissionBanner.tsx mitarbeiter-app/src/components/Layout/AppLayout.tsx mitarbeiter-app/.env.local
git commit -m "feat(mitarbeiter): Push-Subscription Frontend + Permission-Banner"
```

---

### Task 7: Push-Service Grundgerüst

**Files:**
- Create: `push-service/package.json`
- Create: `push-service/tsconfig.json`
- Create: `push-service/src/sender.ts`
- Create: `push-service/src/index.ts`
- Create: `push-service/.env` (nicht committen)

- [ ] **Verzeichnis und package.json anlegen**

```bash
mkdir -p push-service/src/jobs
```

```json
// push-service/package.json
{
  "name": "push-service",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev":   "tsx watch src/index.ts",
    "start": "tsx src/index.ts"
  },
  "dependencies": {
    "express":    "^4.21.0",
    "node-cron":  "^3.0.3",
    "pocketbase": "^0.26.9",
    "web-push":   "^3.6.7"
  },
  "devDependencies": {
    "@types/express":   "^4.17.21",
    "@types/node":      "^20.0.0",
    "@types/node-cron": "^3.0.11",
    "@types/web-push":  "^3.6.3",
    "tsx":              "^4.19.0",
    "typescript":       "^5.0.0"
  }
}
```

- [ ] **tsconfig.json anlegen**

```json
// push-service/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Abhängigkeiten installieren**

```bash
cd push-service && npm install
```

- [ ] **VAPID-Keys generieren und .env anlegen**

```bash
cd push-service && npx web-push generate-vapid-keys
```

Die Ausgabe enthält Public Key und Private Key. Diese in `.env` eintragen:

```env
# push-service/.env
VAPID_PUBLIC=<PublicKey aus generate-vapid-keys>
VAPID_PRIVATE=<PrivateKey aus generate-vapid-keys>
VAPID_SUBJECT=mailto:admin@example.com
PB_URL=http://127.0.0.1:8091
PB_ADMIN_EMAIL=admin@example.com
PB_ADMIN_PASSWORD=Admin1234!
PORT=3456
```

- [ ] **VAPID_PUBLIC in mitarbeiter-app/.env.local eintragen**

```env
# mitarbeiter-app/.env.local
VITE_VAPID_PUBLIC=<gleicher PublicKey>
```

- [ ] **sender.ts erstellen**

```ts
// push-service/src/sender.ts
import webpush from 'web-push'
import PocketBase from 'pocketbase'

const pb = new PocketBase(process.env.PB_URL ?? 'http://127.0.0.1:8091')

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
  process.env.VAPID_PUBLIC  ?? '',
  process.env.VAPID_PRIVATE ?? '',
)

async function ensureAuth() {
  if (!pb.authStore.isValid) {
    await pb.collection('_superusers').authWithPassword(
      process.env.PB_ADMIN_EMAIL    ?? '',
      process.env.PB_ADMIN_PASSWORD ?? '',
    )
  }
}

interface PushSubscription {
  id: string
  employee: string
  endpoint: string
  p256dh:   string
  auth:     string
}

export async function sendPushToEmployee(
  employeeId: string,
  title: string,
  body: string,
): Promise<void> {
  await ensureAuth()

  let subs: PushSubscription[]
  try {
    subs = await pb.collection('push_subscriptions').getFullList<PushSubscription>({
      filter: `employee = "${employeeId}"`,
      requestKey: null,
    })
  } catch {
    return
  }

  await Promise.allSettled(
    subs.map(async sub => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body }),
        )
      } catch (err: unknown) {
        // Ungültige Subscription entfernen (410 Gone)
        if (err && typeof err === 'object' && 'statusCode' in err && err.statusCode === 410) {
          await pb.collection('push_subscriptions').delete(sub.id).catch(() => {})
        }
      }
    }),
  )
}

export { pb, ensureAuth }
```

- [ ] **index.ts Grundgerüst erstellen** (Cron-Jobs werden in Task 8 ergänzt)

```ts
// push-service/src/index.ts
import express from 'express'
import cron from 'node-cron'
import { sendPushToEmployee } from './sender.js'

// .env laden (ohne dotenv – tsx unterstützt --env-file)
// Start: tsx --env-file=.env src/index.ts

const app = express()
app.use(express.json())

// Endpunkt für PocketBase Hooks
app.post('/send-push', async (req, res) => {
  const { type, employeeId, status, dateFrom, dateTo, weekLabel, shiftStart, shiftEnd, department } = req.body

  try {
    if (type === 'antrag_status') {
      const approved = status === 'approved'
      await sendPushToEmployee(
        employeeId,
        approved ? 'Antrag genehmigt ✓' : 'Antrag abgelehnt',
        approved
          ? `Dein Urlaubsantrag (${dateFrom} – ${dateTo}) wurde genehmigt. 🎉`
          : `Dein Urlaubsantrag (${dateFrom} – ${dateTo}) wurde leider abgelehnt.`,
      )
    } else if (type === 'dienstplan') {
      await sendPushToEmployee(
        employeeId,
        'Neuer Dienstplan 📅',
        `Dein Dienstplan für ${weekLabel} wurde veröffentlicht.`,
      )
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('[/send-push]', err)
    res.status(500).json({ ok: false })
  }
})

const PORT = Number(process.env.PORT ?? 3456)
app.listen(PORT, () => console.log(`Push-Service läuft auf Port ${PORT}`))

// Cron-Jobs werden in Task 8 hier importiert und gestartet
```

- [ ] **Push-Service starten und testen**

```bash
cd push-service && tsx --env-file=.env src/index.ts
```

Erwartete Ausgabe: `Push-Service läuft auf Port 3456`

Test mit curl:
```bash
curl -X POST http://localhost:3456/send-push \
  -H "Content-Type: application/json" \
  -d '{"type":"antrag_status","employeeId":"TEST_ID","status":"approved","dateFrom":"01.06.","dateTo":"05.06."}'
```
Erwartete Antwort: `{"ok":true}` (kein Fehler, auch wenn keine Subscriptions vorhanden)

- [ ] **Commit**

```bash
cd ..
git add push-service/package.json push-service/tsconfig.json push-service/src/sender.ts push-service/src/index.ts
echo "push-service/.env" >> .gitignore
git add .gitignore
git commit -m "feat: Push-Service Grundgerüst mit Express + sender.ts"
```

---

### Task 8: Cron-Jobs

**Files:**
- Create: `push-service/src/jobs/einstempel.ts`
- Create: `push-service/src/jobs/ausstempel.ts`
- Create: `push-service/src/jobs/morgen.ts`
- Modify: `push-service/src/index.ts`

- [ ] **einstempel.ts erstellen**

```ts
// push-service/src/jobs/einstempel.ts
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { pb, ensureAuth, sendPushToEmployee } from '../sender.js'

// Speichert heute bereits benachrichtigte Mitarbeiter
const notifiedToday = new Set<string>()
let lastReset = new Date().toDateString()

function resetIfNewDay() {
  const today = new Date().toDateString()
  if (today !== lastReset) { notifiedToday.clear(); lastReset = today }
}

interface ShiftEntry {
  id: string; employee: string; date: string; start_time: string; end_time: string
}
interface TimeEntry { id: string; employee: string; start_time: string }

export async function checkEinstempel() {
  resetIfNewDay()
  await ensureAuth()
  const today = format(new Date(), 'yyyy-MM-dd')
  const now   = new Date()

  const shifts = await pb.collection('shift_entries').getFullList<ShiftEntry>({
    filter: `date = "${today}" && employee != "" && employee != null`,
    requestKey: null,
  }).catch(() => [] as ShiftEntry[])

  for (const shift of shifts) {
    if (notifiedToday.has(shift.employee)) continue

    const shiftStart = parseISO(`${today}T${shift.start_time}`)
    const minsLate   = differenceInMinutes(now, shiftStart)
    if (minsLate < 20) continue // Noch nicht 20 Minuten überschritten

    const entries = await pb.collection('time_entries').getFullList<TimeEntry>({
      filter: `employee = "${shift.employee}" && start_time >= "${today} 00:00:00"`,
      requestKey: null,
    }).catch(() => [] as TimeEntry[])

    if (entries.length === 0) {
      const h = shift.start_time.slice(0, 5)
      await sendPushToEmployee(
        shift.employee,
        'Schicht & Plan – Erinnerung ⏰',
        `Du hast heute um ${h} Uhr Schichtbeginn – bitte vergiss nicht einzustempeln.`,
      )
      notifiedToday.add(shift.employee)
    }
  }
}
```

- [ ] **ausstempel.ts erstellen**

```ts
// push-service/src/jobs/ausstempel.ts
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { pb, ensureAuth, sendPushToEmployee } from '../sender.js'

const notifiedEntries = new Set<string>()
let lastReset = new Date().toDateString()

function resetIfNewDay() {
  const today = new Date().toDateString()
  if (today !== lastReset) { notifiedEntries.clear(); lastReset = today }
}

interface TimeEntry  { id: string; employee: string; start_time: string; end_time?: string }
interface ShiftEntry { id: string; employee: string; date: string; end_time: string }

export async function checkAusstempel() {
  resetIfNewDay()
  await ensureAuth()
  const today = format(new Date(), 'yyyy-MM-dd')
  const now   = new Date()

  // Alle offenen Zeiteinträge (kein end_time)
  const openEntries = await pb.collection('time_entries').getFullList<TimeEntry>({
    filter: `end_time = "" || end_time = null`,
    requestKey: null,
  }).catch(() => [] as TimeEntry[])

  for (const entry of openEntries) {
    if (notifiedEntries.has(entry.id)) continue

    // Schicht für diesen MA heute suchen
    const shifts = await pb.collection('shift_entries').getFullList<ShiftEntry>({
      filter: `employee = "${entry.employee}" && date = "${today}"`,
      requestKey: null,
    }).catch(() => [] as ShiftEntry[])

    for (const shift of shifts) {
      const shiftEnd   = parseISO(`${today}T${shift.end_time}`)
      const minsAfter  = differenceInMinutes(now, shiftEnd)
      if (minsAfter < 30) continue

      const h = shift.end_time.slice(0, 5)
      await sendPushToEmployee(
        entry.employee,
        'Schicht & Plan – Erinnerung 🚪',
        `Deine Schicht endet um ${h} Uhr – bitte vergiss nicht auszustempeln!`,
      )
      notifiedEntries.add(entry.id)
    }
  }
}
```

- [ ] **morgen.ts erstellen**

```ts
// push-service/src/jobs/morgen.ts
import { format, addDays } from 'date-fns'
import { de } from 'date-fns/locale'
import { pb, ensureAuth, sendPushToEmployee } from '../sender.js'

interface ShiftEntry {
  id: string; employee: string; date: string
  start_time: string; end_time: string
  expand?: { department?: { name: string } }
}

export async function sendMorgenErinnerung() {
  await ensureAuth()
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const shifts = await pb.collection('shift_entries').getFullList<ShiftEntry>({
    filter: `date = "${tomorrow}" && employee != "" && employee != null`,
    expand: 'department',
    requestKey: null,
  }).catch(() => [] as ShiftEntry[])

  // Nur eine Push pro Mitarbeiter (bei mehreren Schichten: erste nehmen)
  const seen = new Set<string>()
  for (const shift of shifts) {
    if (seen.has(shift.employee)) continue
    seen.add(shift.employee)

    const start = shift.start_time.slice(0, 5)
    const end   = shift.end_time.slice(0, 5)
    const dept  = shift.expand?.department?.name ?? ''
    const dayLabel = format(addDays(new Date(), 1), 'EEEE', { locale: de })

    await sendPushToEmployee(
      shift.employee,
      `Schicht & Plan – Morgen 🌅`,
      `${dayLabel}: ${start}–${end} Uhr${dept ? ` (${dept})` : ''}. Gute Nacht! 😴`,
    )
  }
}
```

- [ ] **Cron-Jobs in index.ts registrieren**

Den `// Cron-Jobs werden in Task 8 hier importiert`-Kommentar in `index.ts` ersetzen:

```ts
import { checkEinstempel } from './jobs/einstempel.js'
import { checkAusstempel } from './jobs/ausstempel.js'
import { sendMorgenErinnerung } from './jobs/morgen.js'

// Alle 5 Minuten: Einstempel + Ausstempel prüfen
cron.schedule('*/5 * * * *', () => {
  checkEinstempel().catch(console.error)
  checkAusstempel().catch(console.error)
})

// Täglich 18:00 Uhr: Morgen-Erinnerung
cron.schedule('0 18 * * *', () => {
  sendMorgenErinnerung().catch(console.error)
}, { timezone: 'Europe/Berlin' })

console.log('Cron-Jobs registriert: */5 Min (Stempel) + 18:00 Uhr (Morgen)')
```

- [ ] **Push-Service neu starten und Cron-Ausgabe prüfen**

```bash
cd push-service && tsx --env-file=.env src/index.ts
```

Erwartete Ausgabe:
```
Push-Service läuft auf Port 3456
Cron-Jobs registriert: */5 Min (Stempel) + 18:00 Uhr (Morgen)
```

- [ ] **Einstempel-Job manuell testen** – Testaufruf per Node-Snippet:

```bash
# Einmalig ausführen (Test):
tsx --env-file=.env -e "import('./src/jobs/einstempel.ts').then(m => m.checkEinstempel()).then(() => process.exit(0))"
```

- [ ] **Commit**

```bash
git add push-service/src/jobs/ push-service/src/index.ts
git commit -m "feat: Push-Service Cron-Jobs (Einstempel, Ausstempel, Morgen)"
```

---

### Task 9: PocketBase Hooks

**Files:**
- Create: `pb_hooks/push_absences.pb.js`
- Create: `pb_hooks/push_dienstplan.pb.js`

- [ ] **pb_hooks Verzeichnis anlegen**

```bash
mkdir -p /Users/ronnybeckmann/Projects/times/pb_hooks
```

- [ ] **push_absences.pb.js erstellen**

```js
// pb_hooks/push_absences.pb.js
/// <reference path="../pb_data/types.d.ts" />

onRecordAfterUpdateSuccess((e) => {
  const record     = e.record
  const status     = record.get('status')
  const notified   = record.get('push_notified')
  const employeeId = record.get('employee')

  if ((status !== 'approved' && status !== 'rejected') || notified || !employeeId) return

  // Zuerst als notified markieren (verhindert doppelte Pushes)
  try {
    record.set('push_notified', true)
    $app.dao().saveRecord(record)
  } catch (err) {
    console.error('[push_absences] saveRecord fehlgeschlagen:', err)
    return
  }

  // Push über Service senden
  const dateFrom = record.get('date_from') ?? ''
  const dateTo   = record.get('date_to')   ?? ''

  try {
    $http.send({
      url:    'http://127.0.0.1:3456/send-push',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:       'antrag_status',
        employeeId,
        status,
        dateFrom: dateFrom.slice(5, 10).replace('-', '.') + '.',
        dateTo:   dateTo.slice(5, 10).replace('-', '.') + '.',
      }),
    })
  } catch (err) {
    console.error('[push_absences] HTTP-Push fehlgeschlagen:', err)
  }
}, 'absences')
```

- [ ] **push_dienstplan.pb.js erstellen**

```js
// pb_hooks/push_dienstplan.pb.js
/// <reference path="../pb_data/types.d.ts" />

onRecordAfterUpdateSuccess((e) => {
  const record   = e.record
  const status   = record.get('status')
  const notified = record.get('push_notified')

  if (status !== 'published' || notified) return

  // Als notified markieren
  try {
    record.set('push_notified', true)
    $app.dao().saveRecord(record)
  } catch (err) {
    console.error('[push_dienstplan] saveRecord fehlgeschlagen:', err)
    return
  }

  // Alle shift_entries für diesen Plan laden und Mitarbeiter benachrichtigen
  let entries
  try {
    entries = $app.dao().findRecordsByFilter(
      'shift_entries',
      `plan_id = "${record.id}" && employee != ""`,
      '', 500, 0,
    )
  } catch (err) {
    console.error('[push_dienstplan] shift_entries laden fehlgeschlagen:', err)
    return
  }

  const planName = record.get('name') ?? record.id

  const seen = new Set()
  for (const entry of entries) {
    const empId = entry.get('employee')
    if (!empId || seen.has(empId)) continue
    seen.add(empId)

    try {
      $http.send({
        url:    'http://127.0.0.1:3456/send-push',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:       'dienstplan',
          employeeId: empId,
          weekLabel:  planName,
        }),
      })
    } catch (err) {
      console.error('[push_dienstplan] HTTP-Push fehlgeschlagen für', empId, err)
    }
  }
}, 'shift_plans')
```

- [ ] **PocketBase neu starten damit Hooks geladen werden**

```bash
# PocketBase stoppen (Ctrl+C) und neu starten:
./pocketbase serve --http="127.0.0.1:8091"
```

PocketBase gibt beim Start aus: `Loaded pb_hooks/push_absences.pb.js` usw.

- [ ] **Hook testen** – Im Chef-App einen Antrag genehmigen. Überprüfen:
  1. PocketBase-Konsolenausgabe: kein Hook-Fehler
  2. push-service-Konsolenausgabe: `/send-push` wurde aufgerufen
  3. Auf dem Testgerät (mit aktivierter Push-Permission): Notification erscheint

- [ ] **Commit**

```bash
git add pb_hooks/push_absences.pb.js pb_hooks/push_dienstplan.pb.js
git commit -m "feat: PocketBase Hooks für Push bei Antragsstatus + Dienstplan"
```

---

## Abschluss

- [ ] **Vollständiger End-to-End Test**
  1. Dashboard: Monatsnavigation ← → prüfen, Gauge + Urlaubsbalken stimmen
  2. Push-Banner erscheint auf Handy, Permission erteilen
  3. Im Chef-App: Antrag genehmigen → Push kommt auf Handy an
  4. Im Chef-App: Dienstplan veröffentlichen → Push kommt bei betroffenen Mitarbeitern an
  5. Einstempel-Test: Schicht anlegen mit Beginn vor 20+ Min, kein Time-Entry → Push nach max. 5 Min Cron

- [ ] **Finaler Commit**

```bash
git add -A
git commit -m "feat: Mitarbeiter-App Dashboard Redesign + Push-Notifications vollständig"
```
