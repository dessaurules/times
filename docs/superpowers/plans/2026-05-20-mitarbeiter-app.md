# Mitarbeiter-App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate React-App für Mitarbeiter – Stempeluhr, Abwesenheiten, Dienstplan, Zeiterfassung, eigene Daten.

**Architecture:** Eigenständige Vite-App in `times/mitarbeiter-app/`. Verbindet sich zur selben PocketBase-Instanz wie die Chef-App. Sidebar-Layout, Amber-Design identisch zur Chef-App.

**Tech Stack:** React 18, TypeScript strict, Vite 5, React Router v6, Zustand v4, PocketBase SDK 0.21, Tailwind CSS v3, shadcn/ui, date-fns v3, Lucide React

---

## Dateistruktur

```
times/mitarbeiter-app/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── postcss.config.js
├── components.json
├── .env
├── .env.example
├── .gitignore
└── src/
    ├── main.tsx
    ├── App.tsx                          # Routing
    ├── index.css                        # Tailwind + shadcn CSS-Variablen
    ├── lib/
    │   ├── pb.ts                        # PocketBase Singleton
    │   └── utils.ts                     # cn() Tailwind-Merge
    ├── stores/
    │   ├── auth.ts                      # Zustand: Login/Logout/User
    │   └── notifications.ts             # Zustand: Glocke + Realtime
    ├── types/
    │   └── index.ts                     # Alle TypeScript-Typen + Hilfsfunktionen
    ├── components/
    │   ├── Layout/
    │   │   ├── Layout.tsx               # Outlet-Wrapper mit Sidebar
    │   │   ├── Layout.module.css
    │   │   ├── Sidebar.tsx              # Navigation + Glocke + User-Menu
    │   │   └── Sidebar.module.css
    │   └── ui/                          # shadcn/ui Komponenten
    │       ├── badge.tsx
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── dialog.tsx
    │       ├── input.tsx
    │       ├── label.tsx
    │       ├── select.tsx
    │       ├── separator.tsx
    │       ├── table.tsx
    │       └── toast.tsx
    └── pages/
        ├── Login.tsx
        ├── Login.module.css
        ├── Dashboard.tsx                # Stempeluhr + Urlaubskonto + offene Anträge
        ├── Dashboard.module.css
        ├── Dienstplan.tsx               # Eigener Schichtplan (nur published)
        ├── Abwesenheiten/
        │   ├── Abwesenheiten.tsx        # Jahresübersicht (12 Kacheln)
        │   ├── MonthModal.tsx           # Monats-Modal: 1 Zeile × 31 Tage
        │   └── AntragDialog.tsx         # Antrag stellen + AU-Upload
        ├── Zeiten/
        │   └── Zeiten.tsx               # Wochenübersicht + Saldo
        └── MeineDaten/
            ├── MeineDaten.tsx           # Tab-Container
            ├── Stammdaten.tsx           # Lesend: Name, Abteilung, Vertrag
            ├── Dokumente.tsx            # Eigene Dokumente + Download
            └── Verfuegbarkeiten.tsx     # Verfügbarkeiten bearbeiten
```

---

## Task 1: Projekt-Setup

**Files:**
- Create: `times/mitarbeiter-app/package.json`
- Create: `times/mitarbeiter-app/vite.config.ts`
- Create: `times/mitarbeiter-app/tailwind.config.ts`
- Create: `times/mitarbeiter-app/tsconfig.json`
- Create: `times/mitarbeiter-app/tsconfig.node.json`
- Create: `times/mitarbeiter-app/postcss.config.js`
- Create: `times/mitarbeiter-app/index.html`
- Create: `times/mitarbeiter-app/.env.example`
- Create: `times/mitarbeiter-app/.gitignore`

- [ ] **Schritt 1: Vite-Projekt erstellen**

```bash
cd /Users/ronnybeckmann/Downloads/Projects/times
npm create vite@latest mitarbeiter-app -- --template react-ts
cd mitarbeiter-app
```

- [ ] **Schritt 2: Dependencies installieren**

```bash
npm install pocketbase zustand react-router-dom date-fns lucide-react
npm install -D tailwindcss postcss autoprefixer @types/node
npx tailwindcss init -p
```

- [ ] **Schritt 3: shadcn/ui initialisieren**

```bash
npx shadcn@latest init
```

Bei den Fragen:
- Style: **Default**
- Base color: **Neutral** (Farben werden manuell überschrieben)
- CSS variables: **yes**

- [ ] **Schritt 4: shadcn/ui Komponenten installieren**

```bash
npx shadcn@latest add button card dialog input label select separator badge table
```

- [ ] **Schritt 5: `vite.config.ts` anpassen**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
  },
})
```

- [ ] **Schritt 6: `tsconfig.json` anpassen (Pfad-Alias)**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Schritt 7: `tailwind.config.ts` konfigurieren**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Schritt 8: `.env.example` anlegen**

```
VITE_PB_URL=http://localhost:8090
```

- [ ] **Schritt 9: `.env` anlegen (lokale Entwicklung)**

```
VITE_PB_URL=http://localhost:8090
```

- [ ] **Schritt 10: TypeScript prüfen**

```bash
npx tsc --noEmit
```

Erwartet: keine Fehler (außer ggf. fehlende Imports die in späteren Tasks hinzugefügt werden)

- [ ] **Schritt 11: Commit**

```bash
cd /Users/ronnybeckmann/Downloads/Projects/times
git add mitarbeiter-app/
git commit -m "feat: bootstrap mitarbeiter-app (Vite + React + TS + Tailwind + shadcn)"
```

---

## Task 2: CSS-Variablen + Amber-Design

**Files:**
- Modify: `src/index.css`

- [ ] **Schritt 1: `src/index.css` mit Amber-Design überschreiben**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --primary:              35 82% 41%;
    --primary-foreground:   0 0% 100%;
    --background:           0 0% 100%;
    --foreground:           30 6% 10%;
    --muted:                35 15% 95%;
    --muted-foreground:     30 5% 45%;
    --border:               35 15% 88%;
    --input:                35 15% 88%;
    --ring:                 35 82% 41%;
    --radius:               0.5rem;
    --card:                 0 0% 100%;
    --card-foreground:      30 6% 10%;
    --destructive:          0 84% 60%;
    --destructive-foreground: 0 0% 100%;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --background:         30 6% 10%;
      --foreground:         35 15% 95%;
      --card:               30 6% 13%;
      --card-foreground:    35 15% 95%;
      --muted:              30 6% 18%;
      --muted-foreground:   30 5% 60%;
      --border:             30 6% 20%;
      --input:              30 6% 20%;
    }
  }

  * { @apply border-border; }
  body { @apply bg-background text-foreground; font-family: system-ui, -apple-system, sans-serif; }
}

/* Globale Hilfsklassen */
.page { @apply p-6 max-w-7xl mx-auto; }
.page-title { @apply text-2xl font-bold text-foreground mb-6; }
```

- [ ] **Schritt 2: TypeScript prüfen**

```bash
npx tsc --noEmit
```

Erwartet: 0 Fehler

- [ ] **Schritt 3: Commit**

```bash
git add mitarbeiter-app/src/index.css
git commit -m "feat: amber design tokens für mitarbeiter-app"
```

---

## Task 3: Types + PocketBase Client + Utils

**Files:**
- Create: `src/types/index.ts`
- Create: `src/lib/pb.ts`
- Create: `src/lib/utils.ts`

- [ ] **Schritt 1: `src/lib/pb.ts` erstellen**

```typescript
import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_PB_URL as string)

export default pb
```

- [ ] **Schritt 2: `src/lib/utils.ts` erstellen**

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

```bash
npm install clsx tailwind-merge
```

- [ ] **Schritt 3: `src/types/index.ts` erstellen**

```typescript
// ─── PocketBase Basis ────────────────────────────────────────────
export interface PBRecord {
  id: string
  created: string
  updated: string
}

// ─── Departments ────────────────────────────────────────────────
export interface Department extends PBRecord {
  name: string
  color: string
  sort: number
}

// ─── Employees ──────────────────────────────────────────────────
export type ContractType = 'vollzeit' | 'teilzeit' | 'minijob' | 'azubi'

export interface Employee extends PBRecord {
  name: string
  department_id: string
  contract_type: ContractType
  weekly_hours: number
  vacation_days: number
  working_days: number | null
  entry_date: string
  exit_date: string | null
  is_active: boolean
  expand?: { department_id?: Department }
}

// ─── Users ──────────────────────────────────────────────────────
export type UserRole = 'admin' | 'geschaeftsfuehrer' | 'schichtleiter' | 'mitarbeiter'

export interface AuthUser extends PBRecord {
  email: string
  name: string
  role: UserRole
  employee_id: string | null
  department_id: string | null
  is_active: boolean
}

// ─── Abwesenheiten ───────────────────────────────────────────────
export type AbsenceType = 'U' | 'RU' | 'U3' | 'SU' | 'K' | 'KK' | 'AT' | 'S' | 'ÜA'
export type AbsenceStatus = 'pending' | 'approved' | 'rejected'

export interface Absence extends PBRecord {
  employee_id: string
  type: AbsenceType
  date_from: string
  date_to: string
  days: number
  status: AbsenceStatus
  note: string
  approved_by: string
  approved_at: string
  created_by: string
}

export const ABSENCE_LABELS: Record<AbsenceType, string> = {
  U:  'Urlaub',
  RU: 'Resturlaub',
  U3: 'Urlaub Minijob',
  SU: 'Sonderurlaub',
  K:  'Krank',
  KK: 'Kind Krank',
  AT: 'Arzt-/Behördentermin',
  S:  'Schule (Azubi)',
  ÜA: 'Überstunden-Ausgleich',
}

// Kürzel die sofort approved werden (keine Genehmigung nötig)
export const DIRECT_APPROVED: AbsenceType[] = ['K', 'KK', 'AT', 'S', 'ÜA']

export const ABSENCE_COLORS: Record<AbsenceType, { bg: string; text: string }> = {
  U:  { bg: '#FAEEDA', text: '#633806' },
  RU: { bg: '#EF9F27', text: '#412402' },
  U3: { bg: '#FAC775', text: '#633806' },
  SU: { bg: '#EEEDFE', text: '#3C3489' },
  K:  { bg: '#FCEBEB', text: '#791F1F' },
  KK: { bg: '#F7C1C1', text: '#501313' },
  AT: { bg: '#F1EFE8', text: '#444441' },
  S:  { bg: '#E6F1FB', text: '#0C447C' },
  ÜA: { bg: '#E1F5EE', text: '#085041' },
}

// ─── Time Entries ────────────────────────────────────────────────
export interface TimeEntry extends PBRecord {
  employee_id: string
  date: string
  start_time: string
  end_time: string
  break_minutes: number
  total_hours: number
  is_milolog: boolean
  note: string
  created_by: string
}

// ─── Shift Plans + Entries ───────────────────────────────────────
export type ShiftPlanStatus = 'draft' | 'published'

export interface ShiftPlan extends PBRecord {
  week: number
  year: number
  status: ShiftPlanStatus
  notes: string
  created_by: string
  published_at: string
}

export interface ShiftEntry extends PBRecord {
  plan_id: string
  employee_id: string | null
  department_id: string
  date: string
  start_time: string
  end_time: string
  is_open: boolean
  note: string
  expand?: { plan_id?: ShiftPlan; department_id?: Department }
}

// ─── Documents ───────────────────────────────────────────────────
export type DocumentCategory =
  | 'vertrag' | 'zeugnis' | 'krankmeldung' | 'lohnschein'
  | 'au_bescheinigung' | 'abmahnung' | 'sonstiges'

export interface EmployeeDocument extends PBRecord {
  employee_id: string
  name: string
  category: DocumentCategory
  file: string
  retention_until: string
  expires_at: string
  created_by: string
}

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  vertrag:           'Vertrag',
  zeugnis:           'Zeugnis',
  krankmeldung:      'Krankmeldung',
  lohnschein:        'Lohnschein',
  au_bescheinigung:  'AU-Bescheinigung',
  abmahnung:         'Abmahnung',
  sonstiges:         'Sonstiges',
}

// ─── Availability ────────────────────────────────────────────────
export type AvailabilityType = 'wish' | 'unavailable'

export interface Availability extends PBRecord {
  employee_id: string
  day_of_week: number
  time_from: string
  time_to: string
  type: AvailabilityType
  note: string
}

export const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

// ─── Notifications ───────────────────────────────────────────────
export type NotificationType =
  | 'absence_approved' | 'absence_rejected' | 'absence_pending'
  | 'swap_request' | 'swap_approved' | 'shift_published'
  | 'milolog_reminder' | 'system'

export interface Notification extends PBRecord {
  user_id: string
  type: NotificationType
  message: string
  reference_id: string
  reference_type: string
  is_read: boolean
}

// ─── Feiertage Sachsen-Anhalt 2025 + 2026 ───────────────────────
export const FEIERTAGE: string[] = [
  '2025-01-01','2025-04-18','2025-04-21','2025-05-01','2025-05-29',
  '2025-06-09','2025-10-03','2025-10-31','2025-11-20','2025-12-25','2025-12-26',
  '2026-01-01','2026-04-03','2026-04-06','2026-05-01','2026-05-14',
  '2026-05-25','2026-10-03','2026-10-31','2026-11-19','2026-12-25','2026-12-26',
]

export function isFeiertag(dateStr: string): boolean {
  return FEIERTAGE.includes(dateStr)
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function isBlockedDay(dateStr: string): boolean {
  const date = new Date(dateStr)
  return isWeekend(date) || isFeiertag(dateStr)
}

// ─── Arbeitszeit-Hilfsfunktionen ─────────────────────────────────
export function calcBreakRequired(hours: number): number {
  if (hours >= 9) return 45
  if (hours >= 6) return 30
  return 0
}

export function calcTotalHours(startTime: string, endTime: string, breakMinutes: number): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const totalMin = (eh * 60 + em) - (sh * 60 + sm) - breakMinutes
  return Math.max(0, totalMin / 60)
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}:${m.toString().padStart(2, '0')} h`
}
```

- [ ] **Schritt 4: TypeScript prüfen**

```bash
npx tsc --noEmit
```

Erwartet: 0 Fehler

- [ ] **Schritt 5: Commit**

```bash
git add mitarbeiter-app/src/
git commit -m "feat: types, pb client und utils"
```

---

## Task 4: Auth Store + Login-Seite

**Files:**
- Create: `src/stores/auth.ts`
- Create: `src/pages/Login.tsx`
- Create: `src/pages/Login.module.css`

- [ ] **Schritt 1: `src/stores/auth.ts` erstellen**

```typescript
import { create } from 'zustand'
import pb from '@/lib/pb'
import type { AuthUser } from '@/types'

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  init: () => void
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  init: () => {
    if (pb.authStore.isValid && pb.authStore.record) {
      set({ user: pb.authStore.record as unknown as AuthUser, isLoading: false })
    } else {
      set({ isLoading: false })
    }
    pb.authStore.onChange(() => {
      if (pb.authStore.isValid && pb.authStore.record) {
        set({ user: pb.authStore.record as unknown as AuthUser })
      } else {
        set({ user: null })
      }
    })
  },

  login: async (email, password) => {
    await pb.collection('users').authWithPassword(email, password)
    set({ user: pb.authStore.record as unknown as AuthUser })
  },

  logout: () => {
    pb.authStore.clear()
    set({ user: null })
  },
}))
```

- [ ] **Schritt 2: `src/pages/Login.module.css` erstellen**

```css
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: hsl(var(--muted));
}

.card {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  padding: 2.5rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
}

.logo {
  text-align: center;
  margin-bottom: 2rem;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  color: hsl(var(--foreground));
  margin: 0;
}

.subtitle {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  margin: 0.25rem 0 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
}

.error {
  background: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
  border: 1px solid hsl(var(--destructive) / 0.3);
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
}
```

- [ ] **Schritt 3: `src/pages/Login.tsx` erstellen**

```typescript
import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Clock } from 'lucide-react'
import styles from './Login.module.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch {
      setError('E-Mail oder Passwort falsch.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <Clock size={40} className="text-primary mx-auto mb-2" />
          <h1 className={styles.title}>Schicht & Plan</h1>
          <p className={styles.subtitle}>Mitarbeiter-Portal</p>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div>
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Anmelden…' : 'Anmelden'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Schritt 4: TypeScript prüfen**

```bash
npx tsc --noEmit
```

Erwartet: 0 Fehler

- [ ] **Schritt 5: Commit**

```bash
git add mitarbeiter-app/src/
git commit -m "feat: auth store und login-seite"
```

---

## Task 5: Layout + Sidebar + Routing

**Files:**
- Create: `src/components/Layout/Layout.tsx`
- Create: `src/components/Layout/Layout.module.css`
- Create: `src/components/Layout/Sidebar.tsx`
- Create: `src/components/Layout/Sidebar.module.css`
- Create: `src/stores/notifications.ts`
- Create: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Schritt 1: `src/stores/notifications.ts` erstellen**

```typescript
import { create } from 'zustand'
import pb from '@/lib/pb'
import type { Notification } from '@/types'

interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  load: (userId: string) => Promise<void>
  markAllRead: (userId: string) => Promise<void>
  subscribe: (userId: string) => () => void
}

export const useNotifications = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  load: async (userId) => {
    const records = await pb.collection('notifications').getFullList<Notification>({
      filter: `user_id = "${userId}"`,
      sort: '-created',
      requestKey: 'notifications-load',
    })
    set({
      notifications: records,
      unreadCount: records.filter(n => !n.is_read).length,
    })
  },

  markAllRead: async (userId) => {
    const unread = get().notifications.filter(n => !n.is_read)
    await Promise.all(unread.map(n => pb.collection('notifications').update(n.id, { is_read: true })))
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, is_read: true })),
      unreadCount: 0,
    }))
  },

  subscribe: (userId) => {
    pb.collection('notifications').subscribe('*', (e) => {
      if (e.record.user_id !== userId) return
      if (e.action === 'create') {
        set(state => ({
          notifications: [e.record as Notification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }))
      }
    })
    return () => pb.collection('notifications').unsubscribe('*')
  },
}))
```

- [ ] **Schritt 2: `src/components/Layout/Sidebar.module.css` erstellen**

```css
.sidebar {
  width: 220px;
  min-height: 100vh;
  background: hsl(var(--card));
  border-right: 1px solid hsl(var(--border));
  display: flex;
  flex-direction: column;
  padding: 0;
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1.25rem 1rem;
  border-bottom: 1px solid hsl(var(--border));
  font-weight: 700;
  font-size: 1rem;
  color: hsl(var(--primary));
}

.nav {
  flex: 1;
  padding: 0.75rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.navItem {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-radius: calc(var(--radius) - 2px);
  color: hsl(var(--muted-foreground));
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
}

.navItem:hover {
  background: hsl(var(--muted));
  color: hsl(var(--foreground));
}

.navItem.active {
  background: hsl(var(--primary) / 0.12);
  color: hsl(var(--primary));
}

.bottom {
  padding: 0.75rem;
  border-top: 1px solid hsl(var(--border));
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.userInfo {
  font-size: 0.8rem;
  color: hsl(var(--muted-foreground));
  padding: 0 0.5rem;
}

.userName {
  font-weight: 600;
  color: hsl(var(--foreground));
  display: block;
}

.bell {
  position: relative;
  display: inline-flex;
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: hsl(var(--destructive));
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  border-radius: 999px;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
}
```

- [ ] **Schritt 3: `src/components/Layout/Sidebar.tsx` erstellen**

```typescript
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, Calendar, Clock, User, Bell, LogOut, ArrowLeftRight } from 'lucide-react'
import { useAuth } from '@/stores/auth'
import { useNotifications } from '@/stores/notifications'
import { Button } from '@/components/ui/button'
import styles from './Sidebar.module.css'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { to: '/',             label: 'Dashboard',      icon: <LayoutDashboard size={18} /> },
  { to: '/dienstplan',   label: 'Dienstplan',      icon: <CalendarDays size={18} /> },
  { to: '/abwesenheiten',label: 'Abwesenheiten',   icon: <Calendar size={18} /> },
  { to: '/zeiten',       label: 'Zeiterfassung',   icon: <Clock size={18} /> },
  { to: '/meine-daten',  label: 'Meine Daten',     icon: <User size={18} /> },
]

export default function Sidebar({ showSwap }: { showSwap: boolean }) {
  const { user, logout } = useAuth()
  const { unreadCount } = useNotifications()

  const items = showSwap
    ? [...NAV_ITEMS, { to: '/schichttausch', label: 'Schichttausch', icon: <ArrowLeftRight size={18} /> }]
    : NAV_ITEMS

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <Clock size={22} />
        Schicht & Plan
      </div>

      <nav className={styles.nav}>
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              [styles.navItem, isActive ? styles.active : ''].join(' ')
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className={styles.bottom}>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user?.name}</span>
          Mitarbeiter
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={styles.bell}>
            <Bell size={18} className="text-muted-foreground" />
            {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
          </span>
          <Button variant="ghost" size="sm" onClick={logout} className="gap-2 text-muted-foreground">
            <LogOut size={16} />
            Abmelden
          </Button>
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Schritt 4: `src/components/Layout/Layout.module.css` erstellen**

```css
.root {
  display: flex;
  min-height: 100vh;
}

.main {
  flex: 1;
  overflow: auto;
  background: hsl(var(--background));
}
```

- [ ] **Schritt 5: `src/components/Layout/Layout.tsx` erstellen**

```typescript
import { Outlet, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '@/stores/auth'
import { useNotifications } from '@/stores/notifications'
import pb from '@/lib/pb'
import Sidebar from './Sidebar'
import styles from './Layout.module.css'

export default function Layout() {
  const { user } = useAuth()
  const { load, subscribe } = useNotifications()
  const [showSwap, setShowSwap] = useState(false)

  useEffect(() => {
    if (!user) return
    load(user.id)
    const unsub = subscribe(user.id)

    pb.collection('settings').getFirstListItem('key = "shift_swap_enabled"')
      .then(r => setShowSwap(r.value === true || r.value === 'true'))
      .catch(() => setShowSwap(false))

    return () => { unsub() }
  }, [user])

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className={styles.root}>
      <Sidebar showSwap={showSwap} />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Schritt 6: `src/App.tsx` erstellen**

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '@/stores/auth'
import Layout from '@/components/Layout/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Dienstplan from '@/pages/Dienstplan'
import Abwesenheiten from '@/pages/Abwesenheiten/Abwesenheiten'
import Zeiten from '@/pages/Zeiten/Zeiten'
import MeineDaten from '@/pages/MeineDaten/MeineDaten'

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { init } = useAuth()
  useEffect(() => { init() }, [init])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<AuthGate><Layout /></AuthGate>}>
          <Route index element={<Dashboard />} />
          <Route path="dienstplan" element={<Dienstplan />} />
          <Route path="abwesenheiten" element={<Abwesenheiten />} />
          <Route path="zeiten" element={<Zeiten />} />
          <Route path="meine-daten" element={<MeineDaten />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Schritt 7: `src/main.tsx` anpassen**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Schritt 8: Stub-Seiten anlegen (damit Routing nicht bricht)**

`src/pages/Dashboard.tsx`:
```typescript
export default function Dashboard() { return <div className="page"><h1 className="page-title">Dashboard</h1></div> }
```

`src/pages/Dienstplan.tsx`:
```typescript
export default function Dienstplan() { return <div className="page"><h1 className="page-title">Dienstplan</h1></div> }
```

`src/pages/Abwesenheiten/Abwesenheiten.tsx`:
```typescript
export default function Abwesenheiten() { return <div className="page"><h1 className="page-title">Abwesenheiten</h1></div> }
```

`src/pages/Zeiten/Zeiten.tsx`:
```typescript
export default function Zeiten() { return <div className="page"><h1 className="page-title">Zeiterfassung</h1></div> }
```

`src/pages/MeineDaten/MeineDaten.tsx`:
```typescript
export default function MeineDaten() { return <div className="page"><h1 className="page-title">Meine Daten</h1></div> }
```

- [ ] **Schritt 9: TypeScript prüfen + Dev-Server starten**

```bash
npx tsc --noEmit
npm run dev
```

Erwartet: App läuft auf http://localhost:5174, Login-Seite erscheint

- [ ] **Schritt 10: Commit**

```bash
git add mitarbeiter-app/src/
git commit -m "feat: layout, sidebar, routing, stub-seiten"
```

---

## Task 6: Dashboard – Stempeluhr + Urlaubskonto

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Create: `src/pages/Dashboard.module.css`

- [ ] **Schritt 1: `src/pages/Dashboard.module.css` erstellen**

```css
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.card {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  padding: 1.5rem;
}

.cardTitle {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: hsl(var(--muted-foreground));
  margin-bottom: 1rem;
}

.stempelBtn {
  width: 100%;
  padding: 0.875rem;
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.stempelStatus {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  margin-bottom: 1rem;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: hsl(var(--muted-foreground));
}

.dot.active {
  background: #22c55e;
}

.stempelTime {
  font-size: 1.5rem;
  font-weight: 700;
  color: hsl(var(--foreground));
}

.urlaubRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0;
  border-bottom: 1px solid hsl(var(--border));
  font-size: 0.9rem;
}

.urlaubRow:last-child { border-bottom: none; }

.urlaubLabel { color: hsl(var(--muted-foreground)); }

.urlaubValue { font-weight: 600; }

.urlaubValue.highlight { color: hsl(var(--primary)); font-size: 1.1rem; }

.antraegeCard {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  padding: 1.5rem;
}

.antragRow {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid hsl(var(--border));
  font-size: 0.9rem;
}

.antragRow:last-child { border-bottom: none; }

.pendingBadge {
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: hsl(35 82% 41% / 0.12);
  color: hsl(var(--primary));
  font-weight: 500;
  white-space: nowrap;
}

.emptyState {
  text-align: center;
  color: hsl(var(--muted-foreground));
  padding: 2rem 0;
  font-size: 0.875rem;
}
```

- [ ] **Schritt 2: `src/pages/Dashboard.tsx` implementieren**

```typescript
import { useEffect, useState, useRef } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useAuth } from '@/stores/auth'
import pb from '@/lib/pb'
import type { Absence, Employee, TimeEntry } from '@/types'
import { ABSENCE_LABELS, formatHours } from '@/types'
import { Button } from '@/components/ui/button'
import { Timer, CheckCircle2 } from 'lucide-react'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { user } = useAuth()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [openEntry, setOpenEntry] = useState<TimeEntry | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [pendingAbsences, setPendingAbsences] = useState<Absence[]>([])
  const [usedVacation, setUsedVacation] = useState(0)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const today = format(new Date(), 'yyyy-MM-dd')
  const greeting = new Date().getHours() < 12 ? 'Guten Morgen' : new Date().getHours() < 18 ? 'Guten Tag' : 'Guten Abend'

  useEffect(() => {
    if (!user?.employee_id) return
    loadData()
  }, [user])

  useEffect(() => {
    if (openEntry) {
      const start = new Date(`${openEntry.date}T${openEntry.start_time}`)
      timerRef.current = setInterval(() => {
        setElapsed((Date.now() - start.getTime()) / 1000 / 3600)
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [openEntry])

  async function loadData() {
    const empId = user!.employee_id!
    const [emp, entries, absences] = await Promise.all([
      pb.collection('employees').getOne<Employee>(empId),
      pb.collection('time_entries').getFullList<TimeEntry>({
        filter: `employee_id = "${empId}" && end_time = ""`,
        sort: '-created',
      }),
      pb.collection('absences').getFullList<Absence>({
        filter: `employee_id = "${empId}" && status = "pending"`,
        sort: '-created',
      }),
    ])
    setEmployee(emp)
    setOpenEntry(entries[0] ?? null)
    setPendingAbsences(absences)

    const year = new Date().getFullYear()
    const allAbsences = await pb.collection('absences').getFullList<Absence>({
      filter: `employee_id = "${empId}" && status = "approved" && (type = "U" || type = "RU" || type = "U3") && date_from >= "${year}-01-01"`,
    })
    setUsedVacation(allAbsences.reduce((s, a) => s + a.days, 0))
  }

  async function handleStempel() {
    if (!user?.employee_id) return
    setLoading(true)
    try {
      if (openEntry) {
        const now = format(new Date(), 'HH:mm')
        const hours = calcTotalHoursSimple(openEntry.start_time, now)
        const breakMin = hours >= 9 ? 45 : hours >= 6 ? 30 : 0
        await pb.collection('time_entries').update(openEntry.id, {
          end_time: now,
          break_minutes: breakMin,
          total_hours: Math.max(0, hours - breakMin / 60),
        })
        setOpenEntry(null)
        setElapsed(0)
      } else {
        const entry = await pb.collection('time_entries').create<TimeEntry>({
          employee_id: user.employee_id,
          date: today,
          start_time: format(new Date(), 'HH:mm'),
          end_time: '',
          break_minutes: 0,
          total_hours: 0,
          is_milolog: employee?.contract_type === 'minijob',
          created_by: user.id,
        })
        setOpenEntry(entry)
      }
    } finally {
      setLoading(false)
    }
  }

  function calcTotalHoursSimple(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    return ((eh * 60 + em) - (sh * 60 + sm)) / 60
  }

  const verbleibend = (employee?.vacation_days ?? 0) - usedVacation

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          {greeting}, {user?.name?.split(' ')[0]}
        </h1>
        <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
          {format(new Date(), 'EEEE, dd.MM.yyyy', { locale: de })}
        </span>
      </div>

      <div className={styles.grid}>
        {/* Stempeluhr */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Stempeluhr</div>
          <div className={styles.stempelStatus}>
            <span className={[styles.dot, openEntry ? styles.active : ''].join(' ')} />
            {openEntry ? `Seit ${openEntry.start_time} Uhr eingestempelt` : 'Nicht eingestempelt'}
          </div>
          {openEntry && (
            <div className={styles.stempelTime}>{formatHours(elapsed)}</div>
          )}
          <Button
            className={styles.stempelBtn}
            variant={openEntry ? 'outline' : 'default'}
            onClick={handleStempel}
            disabled={loading}
            style={{ marginTop: '1rem' }}
          >
            <Timer size={18} style={{ marginRight: 8 }} />
            {openEntry ? 'Ausstempeln' : 'Einstempeln'}
          </Button>
        </div>

        {/* Urlaubskonto */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Urlaubskonto {new Date().getFullYear()}</div>
          <div className={styles.urlaubRow}>
            <span className={styles.urlaubLabel}>Jahresanspruch</span>
            <span className={styles.urlaubValue}>{employee?.vacation_days ?? '–'} T</span>
          </div>
          <div className={styles.urlaubRow}>
            <span className={styles.urlaubLabel}>Genommen</span>
            <span className={styles.urlaubValue}>{usedVacation} T</span>
          </div>
          <div className={styles.urlaubRow}>
            <span className={styles.urlaubLabel}>Verbleibend</span>
            <span className={[styles.urlaubValue, styles.highlight].join(' ')}>{verbleibend} T</span>
          </div>
        </div>
      </div>

      {/* Offene Anträge */}
      <div className={styles.antraegeCard}>
        <div className={styles.cardTitle}>Offene Anträge</div>
        {pendingAbsences.length === 0 ? (
          <div className={styles.emptyState}>
            <CheckCircle2 size={24} className="mx-auto mb-2 text-muted-foreground" />
            Keine offenen Anträge
          </div>
        ) : (
          pendingAbsences.map(a => (
            <div key={a.id} className={styles.antragRow}>
              <span style={{ fontWeight: 600 }}>{ABSENCE_LABELS[a.type]}</span>
              <span style={{ color: 'hsl(var(--muted-foreground))' }}>
                {format(new Date(a.date_from), 'dd.MM.')} – {format(new Date(a.date_to), 'dd.MM.yyyy')}
              </span>
              <span className={styles.pendingBadge}>● Ausstehend</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Schritt 3: TypeScript prüfen**

```bash
npx tsc --noEmit
```

Erwartet: 0 Fehler

- [ ] **Schritt 4: Im Browser testen**

```bash
npm run dev
```

Checklist:
- Login funktioniert
- Dashboard zeigt Stempeluhr-Button
- Einstempeln → Button wechselt zu „Ausstempeln", Timer läuft
- Ausstempeln → `time_entry` hat `end_time` gesetzt
- Urlaubskonto zeigt korrekte Zahlen

- [ ] **Schritt 5: Commit**

```bash
git add mitarbeiter-app/src/pages/Dashboard.tsx mitarbeiter-app/src/pages/Dashboard.module.css
git commit -m "feat: dashboard mit stempeluhr und urlaubskonto"
```

---

## Task 7: Dienstplan-Seite

**Files:**
- Modify: `src/pages/Dienstplan.tsx`

- [ ] **Schritt 1: `src/pages/Dienstplan.tsx` implementieren**

```typescript
import { useEffect, useState } from 'react'
import { format, startOfISOWeek, addDays, getISOWeek } from 'date-fns'
import { de } from 'date-fns/locale'
import { useAuth } from '@/stores/auth'
import pb from '@/lib/pb'
import type { ShiftEntry } from '@/types'
import { formatHours, calcTotalHours } from '@/types'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Dienstplan() {
  const { user } = useAuth()
  const [weekStart, setWeekStart] = useState(() => startOfISOWeek(new Date()))
  const [entries, setEntries] = useState<ShiftEntry[]>([])
  const [loading, setLoading] = useState(false)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const kw = getISOWeek(weekStart)
  const year = weekStart.getFullYear()

  useEffect(() => {
    if (!user?.employee_id) return
    loadEntries()
  }, [weekStart, user])

  async function loadEntries() {
    setLoading(true)
    const from = format(weekStart, 'yyyy-MM-dd')
    const to = format(addDays(weekStart, 6), 'yyyy-MM-dd')
    const results = await pb.collection('shift_entries').getFullList<ShiftEntry>({
      filter: `employee_id = "${user!.employee_id}" && date >= "${from}" && date <= "${to}" && plan_id.status = "published"`,
      expand: 'plan_id,department_id',
      sort: 'date',
    })
    setEntries(results)
    setLoading(false)
  }

  const totalHours = entries.reduce((sum, e) => {
    if (!e.end_time) return sum
    return sum + calcTotalHours(e.start_time, e.end_time, 0)
  }, 0)

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Mein Dienstplan</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(d => addDays(d, -7))}>
            <ChevronLeft size={16} />
          </Button>
          <span style={{ fontSize: '0.9rem', fontWeight: 500, minWidth: 160, textAlign: 'center' }}>
            KW {kw} / {format(weekStart, 'MMMM yyyy', { locale: de })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(d => addDays(d, 7))}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'hsl(var(--muted))', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>Tag</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>Kommt</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>Geht</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>Abteilung</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>Stunden</th>
            </tr>
          </thead>
          <tbody>
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const entry = entries.find(e => e.date === dateStr)
              const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')
              const hours = entry?.end_time ? calcTotalHours(entry.start_time, entry.end_time, 0) : 0
              return (
                <tr key={dateStr} style={{
                  borderTop: '1px solid hsl(var(--border))',
                  background: isToday ? 'hsl(var(--primary) / 0.05)' : undefined,
                }}>
                  <td style={{ padding: '0.875rem 1rem', fontWeight: isToday ? 600 : 400 }}>
                    {format(day, 'EEE dd.MM.', { locale: de })}
                    {isToday && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'hsl(var(--primary))', fontWeight: 600 }}>HEUTE</span>}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', color: entry ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}>
                    {entry?.start_time ?? 'FREI'}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', color: entry?.end_time ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}>
                    {entry?.end_time ?? '–'}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', color: 'hsl(var(--muted-foreground))' }}>
                    {entry?.expand?.department_id?.name ?? '–'}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: hours > 0 ? 500 : 400, color: hours > 0 ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}>
                    {hours > 0 ? formatHours(hours) : '–'}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid hsl(var(--border))', background: 'hsl(var(--muted))', fontSize: '0.875rem' }}>
              <td colSpan={4} style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Woche gesamt</td>
              <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: 'hsl(var(--primary))' }}>
                {formatHours(totalHours)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {loading && <p style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))', marginTop: '1rem', fontSize: '0.875rem' }}>Lädt…</p>}
    </div>
  )
}
```

- [ ] **Schritt 2: TypeScript prüfen + testen**

```bash
npx tsc --noEmit
npm run dev
```

Checklist:
- Wochennavigation (vor/zurück) funktioniert
- Eigene Schichten aus PocketBase erscheinen (nur published)
- Freie Tage zeigen „FREI"
- Fußzeile summiert Stunden

- [ ] **Schritt 3: Commit**

```bash
git add mitarbeiter-app/src/pages/Dienstplan.tsx
git commit -m "feat: dienstplan-seite mit wochenansicht"
```

---

## Task 8: Abwesenheiten – Jahresübersicht + Monats-Modal

**Files:**
- Modify: `src/pages/Abwesenheiten/Abwesenheiten.tsx`
- Create: `src/pages/Abwesenheiten/MonthModal.tsx`

- [ ] **Schritt 1: `src/pages/Abwesenheiten/AntragDialog.tsx` als Stub anlegen** (wird in Task 9 vollständig implementiert)

```typescript
interface Props {
  employeeId: string
  userId: string
  onClose: () => void
  onSaved: () => void
}
export default function AntragDialog(_props: Props) { return null }
```

- [ ] **Schritt 3: `src/pages/Abwesenheiten/MonthModal.tsx` erstellen**

```typescript
import { useEffect, useState, useRef } from 'react'
import { getDaysInMonth, format, getDay } from 'date-fns'
import { de } from 'date-fns/locale'
import { X } from 'lucide-react'
import pb from '@/lib/pb'
import type { Absence } from '@/types'
import { ABSENCE_COLORS, isBlockedDay } from '@/types'
import { Button } from '@/components/ui/button'

const DAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

interface Props {
  year: number
  monthIndex: number        // 0 = Januar
  employeeId: string
  employeeName: string
  onClose: () => void
  onAntrag: () => void
}

export default function MonthModal({ year, monthIndex, employeeId, employeeName, onClose, onAntrag }: Props) {
  const [absences, setAbsences] = useState<Absence[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  const daysInMonth = getDaysInMonth(new Date(year, monthIndex, 1))
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, monthIndex, i + 1)
    const dateStr = format(date, 'yyyy-MM-dd')
    return { date, dateStr, dayNum: i + 1, dayName: DAY_SHORT[getDay(date)] }
  })

  const monthName = format(new Date(year, monthIndex, 1), 'MMMM yyyy', { locale: de })

  useEffect(() => {
    const from = format(new Date(year, monthIndex, 1), 'yyyy-MM-dd')
    const to = format(new Date(year, monthIndex, daysInMonth), 'yyyy-MM-dd')
    pb.collection('absences').getFullList<Absence>({
      filter: `employee_id = "${employeeId}" && date_from <= "${to}" && date_to >= "${from}"`,
    }).then(setAbsences)
  }, [year, monthIndex, employeeId])

  function getAbsenceForDay(dateStr: string): Absence | undefined {
    return absences.find(a => dateStr >= a.date_from && dateStr <= a.date_to)
  }

  const summary = absences.reduce<Record<string, number>>((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + a.days
    return acc
  }, {})

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
    }}>
      <div style={{
        background: 'hsl(var(--card))', borderRadius: 'var(--radius)',
        border: '1px solid hsl(var(--border))', width: '95vw', maxWidth: 900,
        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem', borderBottom: '1px solid hsl(var(--border))',
        }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{monthName}</span>
            <span style={{ marginLeft: 12, color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>{employeeName}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" onClick={onAntrag}>+ Antrag</Button>
            <Button variant="ghost" size="icon" onClick={onClose}><X size={18} /></Button>
          </div>
        </div>

        {/* Scrollbare Tageszeile */}
        <div ref={scrollRef} style={{ overflowX: 'auto', padding: '1rem 1.25rem' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 'max-content' }}>
            <thead>
              <tr>
                {/* Name-Spalte */}
                <th style={{ padding: '0 8px 4px 0', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', textAlign: 'left', fontWeight: 600, minWidth: 80 }}>
                  {employeeName.split(' ').map(n => n[0]).join('')}
                </th>
                {days.map(({ dayNum, dayName }) => (
                  <th key={dayNum} style={{
                    padding: '0 2px 4px',
                    fontSize: '0.7rem',
                    color: 'hsl(var(--muted-foreground))',
                    textAlign: 'center',
                    fontWeight: 500,
                    minWidth: 32,
                  }}>
                    {String(dayNum).padStart(2, '0')}<br />
                    <span style={{ fontSize: '0.65rem' }}>{dayName}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '0 8px 0 0' }} />
                {days.map(({ dateStr, dayNum }) => {
                  const blocked = isBlockedDay(dateStr)
                  const absence = getAbsenceForDay(dateStr)
                  return (
                    <td key={dayNum} style={{ padding: '2px', textAlign: 'center' }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: blocked
                          ? 'hsl(var(--muted))'
                          : absence
                            ? ABSENCE_COLORS[absence.type].bg
                            : 'transparent',
                        color: blocked
                          ? 'hsl(var(--muted-foreground))'
                          : absence
                            ? ABSENCE_COLORS[absence.type].text
                            : 'hsl(var(--foreground))',
                        border: '1px solid',
                        borderColor: blocked ? 'hsl(var(--border))' : absence ? 'transparent' : 'hsl(var(--border))',
                        opacity: blocked ? 0.5 : 1,
                      }}>
                        {absence?.type ?? ''}
                      </div>
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer: Zusammenfassung */}
        <div style={{
          borderTop: '1px solid hsl(var(--border))',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          gap: '1.5rem',
          flexWrap: 'wrap',
          fontSize: '0.875rem',
          color: 'hsl(var(--muted-foreground))',
        }}>
          {Object.entries(summary).map(([type, days]) => (
            <span key={type}>
              <strong style={{ color: 'hsl(var(--foreground))' }}>{type}</strong>: {days} T
            </span>
          ))}
          {Object.keys(summary).length === 0 && <span>Keine Abwesenheiten</span>}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Schritt 4: `src/pages/Abwesenheiten/Abwesenheiten.tsx` implementieren**

```typescript
import { useEffect, useState } from 'react'
import { format, getDaysInMonth } from 'date-fns'
import { de } from 'date-fns/locale'
import { useAuth } from '@/stores/auth'
import pb from '@/lib/pb'
import type { Absence } from '@/types'
import { ABSENCE_COLORS } from '@/types'
import { Button } from '@/components/ui/button'
import MonthModal from './MonthModal'
import AntragDialog from './AntragDialog'

const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

export default function Abwesenheiten() {
  const { user } = useAuth()
  const [year] = useState(new Date().getFullYear())
  const [absences, setAbsences] = useState<Absence[]>([])
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [showAntrag, setShowAntrag] = useState(false)

  useEffect(() => {
    if (!user?.employee_id) return
    loadAbsences()
  }, [user, year])

  async function loadAbsences() {
    const all = await pb.collection('absences').getFullList<Absence>({
      filter: `employee_id = "${user!.employee_id}" && date_from >= "${year}-01-01" && date_from <= "${year}-12-31"`,
      sort: 'date_from',
    })
    setAbsences(all)
  }

  function getAbsencesForMonth(monthIndex: number): Absence[] {
    const from = format(new Date(year, monthIndex, 1), 'yyyy-MM-dd')
    const to = format(new Date(year, monthIndex, getDaysInMonth(new Date(year, monthIndex))), 'yyyy-MM-dd')
    return absences.filter(a => a.date_from <= to && a.date_to >= from)
  }

  const totals = absences.reduce<Record<string, number>>((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + a.days
    return acc
  }, {})

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Abwesenheiten {year}</h1>
        <Button onClick={() => setShowAntrag(true)}>+ Antrag</Button>
      </div>

      {/* 12 Monatskacheln */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {MONTHS.map((name, idx) => {
          const monthAbsences = getAbsencesForMonth(idx)
          const isCurrentMonth = idx === new Date().getMonth() && year === new Date().getFullYear()
          return (
            <div
              key={idx}
              onClick={() => setSelectedMonth(idx)}
              style={{
                background: 'hsl(var(--card))',
                border: `1px solid ${isCurrentMonth ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
                borderRadius: 'var(--radius)',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s',
                minHeight: 100,
              }}
              onMouseOver={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)')}
              onMouseOut={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', color: isCurrentMonth ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' }}>
                {name}
              </div>
              {monthAbsences.length === 0 ? (
                <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>–</span>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {monthAbsences.map(a => (
                    <span key={a.id} style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: ABSENCE_COLORS[a.type].bg,
                      color: ABSENCE_COLORS[a.type].text,
                    }}>
                      {a.type} {a.days}T
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Jahres-Zusammenfassung */}
      <div style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 'var(--radius)',
        padding: '1rem 1.25rem',
        display: 'flex',
        gap: '1.5rem',
        flexWrap: 'wrap',
        fontSize: '0.875rem',
      }}>
        <span style={{ fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>Gesamt {year}:</span>
        {Object.entries(totals).map(([type, days]) => (
          <span key={type} style={{ color: 'hsl(var(--foreground))' }}>
            <strong>{type}</strong> {days} T
          </span>
        ))}
        {Object.keys(totals).length === 0 && <span style={{ color: 'hsl(var(--muted-foreground))' }}>Noch keine Abwesenheiten</span>}
      </div>

      {selectedMonth !== null && (
        <MonthModal
          year={year}
          monthIndex={selectedMonth}
          employeeId={user!.employee_id!}
          employeeName={user!.name}
          onClose={() => setSelectedMonth(null)}
          onAntrag={() => { setShowAntrag(true) }}
        />
      )}

      {showAntrag && (
        <AntragDialog
          employeeId={user!.employee_id!}
          userId={user!.id}
          onClose={() => setShowAntrag(false)}
          onSaved={() => { setShowAntrag(false); loadAbsences() }}
        />
      )}
    </div>
  )
}
```

- [ ] **Schritt 5: TypeScript prüfen + testen**

```bash
npx tsc --noEmit
npm run dev
```

Checklist:
- 12 Monatskacheln erscheinen
- Klick öffnet Monats-Modal
- Modal zeigt alle Tage in einer Zeile (horizontal scroll)
- Wochenenden/Feiertage grau
- Abwesenheitskürzel in richtigen Farben

- [ ] **Schritt 6: Commit**

```bash
git add mitarbeiter-app/src/pages/Abwesenheiten/
git commit -m "feat: abwesenheiten jahresübersicht und monats-modal"
```

---

## Task 9: Abwesenheiten – Antrag-Dialog

**Files:**
- Create: `src/pages/Abwesenheiten/AntragDialog.tsx`

- [ ] **Schritt 1: `src/pages/Abwesenheiten/AntragDialog.tsx` erstellen**

```typescript
import { useState, FormEvent } from 'react'
import { format, eachDayOfInterval, parseISO } from 'date-fns'
import pb from '@/lib/pb'
import type { AbsenceType } from '@/types'
import { ABSENCE_LABELS, DIRECT_APPROVED, isBlockedDay } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Paperclip } from 'lucide-react'

interface Props {
  employeeId: string
  userId: string
  onClose: () => void
  onSaved: () => void
}

export default function AntragDialog({ employeeId, userId, onClose, onSaved }: Props) {
  const [type, setType] = useState<AbsenceType>('U')
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const showAuUpload = type === 'K' || type === 'KK'

  function calcWorkingDays(from: string, to: string): number {
    try {
      const days = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) })
      return days.filter(d => !isBlockedDay(format(d, 'yyyy-MM-dd'))).length
    } catch {
      return 0
    }
  }

  const workingDays = calcWorkingDays(dateFrom, dateTo)
  const isDirect = DIRECT_APPROVED.includes(type)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (workingDays === 0) {
      setError('Kein gültiger Arbeitstag im gewählten Zeitraum.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('employee_id', employeeId)
      formData.append('type', type)
      formData.append('date_from', dateFrom)
      formData.append('date_to', dateTo)
      formData.append('days', String(workingDays))
      formData.append('status', isDirect ? 'approved' : 'pending')
      formData.append('note', note)
      formData.append('created_by', userId)
      if (file) formData.append('file', file)

      await pb.collection('absences').create(formData)
      onSaved()
    } catch {
      setError('Fehler beim Speichern. Bitte erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60,
    }}>
      <div style={{
        background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
        borderRadius: 'var(--radius)', width: '100%', maxWidth: 460, padding: '1.5rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Neuer Antrag</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X size={18} /></Button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <Label>Art</Label>
            <Select value={type} onValueChange={v => setType(v as AbsenceType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(ABSENCE_LABELS) as [AbsenceType, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{k} – {v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <Label>Von</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} required />
            </div>
            <div>
              <Label>Bis</Label>
              <Input type="date" value={dateTo} min={dateFrom} onChange={e => setDateTo(e.target.value)} required />
            </div>
          </div>

          {workingDays > 0 && (
            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', margin: 0 }}>
              {workingDays} Arbeitstag{workingDays !== 1 ? 'e' : ''} · {isDirect ? 'Wird direkt eingetragen' : 'Wartet auf Genehmigung'}
            </p>
          )}

          {showAuUpload && (
            <div>
              <Label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <Paperclip size={14} />
                AU-Bescheinigung (optional, PDF/JPG)
              </Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
              {file && <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', marginTop: 4 }}>{file.name}</p>}
            </div>
          )}

          <div>
            <Label>Notiz (optional)</Label>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Zusätzliche Infos…" />
          </div>

          {error && (
            <p style={{ color: 'hsl(var(--destructive))', fontSize: '0.875rem', margin: 0 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={loading || workingDays === 0}>
              {loading ? 'Wird eingereicht…' : 'Einreichen'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Schritt 2: TypeScript prüfen + testen**

```bash
npx tsc --noEmit
npm run dev
```

Checklist:
- Dialog öffnet sich über „+ Antrag"-Button
- Arbeitstage werden korrekt berechnet (ohne WE + Feiertage)
- K/KK zeigt AU-Upload-Feld
- Direktkürzel (K, AT…) zeigen „Wird direkt eingetragen"
- Antrag landet in PocketBase mit korrektem Status

- [ ] **Schritt 3: Commit**

```bash
git add mitarbeiter-app/src/pages/Abwesenheiten/AntragDialog.tsx
git commit -m "feat: antrag-dialog mit au-upload und arbeitstag-berechnung"
```

---

## Task 10: Zeiterfassung-Seite

**Files:**
- Modify: `src/pages/Zeiten/Zeiten.tsx`

- [ ] **Schritt 1: `src/pages/Zeiten/Zeiten.tsx` implementieren**

```typescript
import { useEffect, useState } from 'react'
import { format, startOfISOWeek, addDays, getISOWeek, startOfMonth, endOfMonth } from 'date-fns'
import { de } from 'date-fns/locale'
import { useAuth } from '@/stores/auth'
import pb from '@/lib/pb'
import type { Employee, TimeEntry } from '@/types'
import { formatHours, calcTotalHours } from '@/types'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Zeiten() {
  const { user } = useAuth()
  const [weekStart, setWeekStart] = useState(() => startOfISOWeek(new Date()))
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [employee, setEmployee] = useState<Employee | null>(null)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const kw = getISOWeek(weekStart)

  useEffect(() => {
    if (!user?.employee_id) return
    pb.collection('employees').getOne<Employee>(user.employee_id).then(setEmployee)
  }, [user])

  useEffect(() => {
    if (!user?.employee_id) return
    loadEntries()
  }, [weekStart, user])

  async function loadEntries() {
    const from = format(weekStart, 'yyyy-MM-dd')
    const to = format(addDays(weekStart, 6), 'yyyy-MM-dd')
    const results = await pb.collection('time_entries').getFullList<TimeEntry>({
      filter: `employee_id = "${user!.employee_id}" && date >= "${from}" && date <= "${to}"`,
      sort: 'date',
    })
    setEntries(results)
  }

  function getEntryForDay(dateStr: string): TimeEntry | undefined {
    return entries.find(e => e.date === dateStr)
  }

  const sollProTag = (employee?.weekly_hours ?? 40) / 5
  const istTotal = entries.reduce((sum, e) => sum + (e.total_hours ?? 0), 0)
  const sollTotal = employee ? employee.weekly_hours : 40
  const diff = istTotal - sollTotal

  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Zeiterfassung</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(d => addDays(d, -7))}>
            <ChevronLeft size={16} />
          </Button>
          <span style={{ fontSize: '0.9rem', fontWeight: 500, minWidth: 160, textAlign: 'center' }}>
            KW {kw} / {format(weekStart, 'MMMM yyyy', { locale: de })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(d => addDays(d, 7))}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'hsl(var(--muted))', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>Tag</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>Kommt</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>Geht</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>Pause</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>Ist</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const entry = getEntryForDay(dateStr)
              const isToday = dateStr === today
              const isRunning = entry && !entry.end_time
              return (
                <tr key={dateStr} style={{
                  borderTop: '1px solid hsl(var(--border))',
                  background: isToday ? 'hsl(var(--primary) / 0.05)' : undefined,
                }}>
                  <td style={{ padding: '0.875rem 1rem', fontWeight: isToday ? 600 : 400 }}>
                    {format(day, 'EEE dd.MM.', { locale: de })}
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>{entry?.start_time ?? '–'}</td>
                  <td style={{ padding: '0.875rem 1rem', color: isRunning ? 'hsl(var(--primary))' : undefined }}>
                    {isRunning ? 'läuft…' : (entry?.end_time || '–')}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', color: 'hsl(var(--muted-foreground))' }}>
                    {entry?.break_minutes ? `${entry.break_minutes} min` : '–'}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: 500 }}>
                    {entry?.total_hours ? formatHours(entry.total_hours) : '–'}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontSize: '0.8rem' }}>
                    {isRunning ? <span style={{ color: 'hsl(var(--primary))' }}>● läuft</span>
                      : entry?.total_hours ? <span style={{ color: '#22c55e' }}>✓</span>
                      : '–'}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid hsl(var(--border))', background: 'hsl(var(--muted))' }}>
              <td colSpan={3} style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>
                Soll: {formatHours(sollTotal)} · Ist: {formatHours(istTotal)}
              </td>
              <td />
              <td colSpan={2} style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, fontSize: '0.875rem', color: diff >= 0 ? '#22c55e' : 'hsl(var(--destructive))' }}>
                {diff >= 0 ? '+' : ''}{formatHours(Math.abs(diff))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Schritt 2: TypeScript prüfen + testen**

```bash
npx tsc --noEmit
npm run dev
```

Checklist:
- Wochennavigation funktioniert
- Eigene Zeiteinträge erscheinen
- Laufende Session zeigt „läuft…"
- Saldo-Zeile zeigt Soll/Ist/Differenz (grün/rot)

- [ ] **Schritt 3: Commit**

```bash
git add mitarbeiter-app/src/pages/Zeiten/Zeiten.tsx
git commit -m "feat: zeiterfassung wochenübersicht mit saldo"
```

---

## Task 11: Meine Daten – Stammdaten + Dokumente + Verfügbarkeiten

**Files:**
- Modify: `src/pages/MeineDaten/MeineDaten.tsx`
- Create: `src/pages/MeineDaten/Stammdaten.tsx`
- Create: `src/pages/MeineDaten/Dokumente.tsx`
- Create: `src/pages/MeineDaten/Verfuegbarkeiten.tsx`

- [ ] **Schritt 1: `src/pages/MeineDaten/Stammdaten.tsx` erstellen**

```typescript
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import pb from '@/lib/pb'
import type { Employee, Department } from '@/types'

const CONTRACT_LABELS: Record<string, string> = {
  vollzeit: 'Vollzeit',
  teilzeit: 'Teilzeit',
  minijob: 'Minijob',
  azubi: 'Azubi',
}

interface Props { employeeId: string }

export default function Stammdaten({ employeeId }: Props) {
  const [employee, setEmployee] = useState<Employee | null>(null)

  useEffect(() => {
    pb.collection('employees').getOne<Employee>(employeeId, { expand: 'department_id' })
      .then(setEmployee)
  }, [employeeId])

  if (!employee) return <p style={{ color: 'hsl(var(--muted-foreground))' }}>Lädt…</p>

  const dept = (employee.expand?.department_id as Department | undefined)?.name ?? '–'

  const rows: [string, string][] = [
    ['Name',              employee.name],
    ['Abteilung',         dept],
    ['Vertragsart',       CONTRACT_LABELS[employee.contract_type] ?? employee.contract_type],
    ['Wochenstunden',     `${employee.weekly_hours} h`],
    ['Eintrittsdatum',    format(new Date(employee.entry_date), 'dd.MM.yyyy')],
    ['Urlaubsanspruch',   `${employee.vacation_days} Tage`],
  ]

  return (
    <div>
      <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 500 }}>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <td style={{ padding: '0.75rem 0', color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem', width: 180 }}>{label}</td>
              <td style={{ padding: '0.75rem 0', fontWeight: 500 }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
        ⚠ Stammdaten können nur vom Admin geändert werden.
      </p>
    </div>
  )
}
```

- [ ] **Schritt 2: `src/pages/MeineDaten/Dokumente.tsx` erstellen**

```typescript
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import pb from '@/lib/pb'
import type { EmployeeDocument } from '@/types'
import { DOCUMENT_CATEGORY_LABELS } from '@/types'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface Props { employeeId: string }

export default function Dokumente({ employeeId }: Props) {
  const [docs, setDocs] = useState<EmployeeDocument[]>([])

  useEffect(() => {
    pb.collection('documents').getFullList<EmployeeDocument>({
      filter: `employee_id = "${employeeId}"`,
      sort: '-created',
    }).then(setDocs)
  }, [employeeId])

  function getDownloadUrl(doc: EmployeeDocument): string {
    return pb.files.getURL(doc, doc.file)
  }

  if (docs.length === 0) {
    return <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>Keine Dokumente vorhanden.</p>
  }

  return (
    <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'hsl(var(--muted))', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>Name</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>Typ</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>Datum</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {docs.map(doc => (
            <tr key={doc.id} style={{ borderTop: '1px solid hsl(var(--border))' }}>
              <td style={{ padding: '0.875rem 1rem' }}>{doc.name}</td>
              <td style={{ padding: '0.875rem 1rem', color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
                {DOCUMENT_CATEGORY_LABELS[doc.category]}
              </td>
              <td style={{ padding: '0.875rem 1rem', color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
                {format(new Date(doc.created), 'dd.MM.yyyy')}
              </td>
              <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                >
                  <a href={getDownloadUrl(doc)} target="_blank" rel="noreferrer" download>
                    <Download size={15} style={{ marginRight: 4 }} />
                    PDF
                  </a>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Schritt 3: `src/pages/MeineDaten/Verfuegbarkeiten.tsx` erstellen**

```typescript
import { useEffect, useState } from 'react'
import pb from '@/lib/pb'
import type { Availability, AvailabilityType } from '@/types'
import { DAY_LABELS } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props { employeeId: string }

interface DayRow {
  day: number
  entries: Availability[]
}

export default function Verfuegbarkeiten({ employeeId }: Props) {
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    pb.collection('availability').getFullList<Availability>({
      filter: `employee_id = "${employeeId}"`,
      sort: 'day_of_week',
    }).then(setAvailabilities)
  }, [employeeId])

  async function handleAdd(day: number) {
    setSaving(true)
    const created = await pb.collection('availability').create<Availability>({
      employee_id: employeeId,
      day_of_week: day,
      time_from: '08:00',
      time_to: '16:00',
      type: 'wish',
      note: '',
    })
    setAvailabilities(prev => [...prev, created])
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await pb.collection('availability').delete(id)
    setAvailabilities(prev => prev.filter(a => a.id !== id))
  }

  async function handleUpdate(id: string, field: keyof Availability, value: string) {
    await pb.collection('availability').update(id, { [field]: value })
    setAvailabilities(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a))
  }

  return (
    <div>
      <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>
        Trage hier deine bevorzugten Arbeitszeiten oder Nicht-Verfügbarkeiten ein. Diese werden bei der Dienstplanung berücksichtigt.
      </p>
      {DAY_LABELS.map((dayName, dayIdx) => {
        const dayEntries = availabilities.filter(a => a.day_of_week === dayIdx)
        return (
          <div key={dayIdx} style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'hsl(var(--muted))', borderRadius: 'var(--radius)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '0.875rem' }}>{dayName}</strong>
              <Button variant="ghost" size="sm" onClick={() => handleAdd(dayIdx)} disabled={saving}>+ Eintrag</Button>
            </div>
            {dayEntries.map(entry => (
              <div key={entry.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <Select
                  value={entry.type}
                  onValueChange={v => handleUpdate(entry.id, 'type', v)}
                >
                  <SelectTrigger style={{ width: 160 }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wish">Wunsch</SelectItem>
                    <SelectItem value="unavailable">Nicht verfügbar</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="time"
                  value={entry.time_from}
                  onChange={e => handleUpdate(entry.id, 'time_from', e.target.value)}
                  style={{ width: 110 }}
                />
                <span style={{ color: 'hsl(var(--muted-foreground))' }}>–</span>
                <Input
                  type="time"
                  value={entry.time_to}
                  onChange={e => handleUpdate(entry.id, 'time_to', e.target.value)}
                  style={{ width: 110 }}
                />
                <Button variant="ghost" size="sm" onClick={() => handleDelete(entry.id)}
                  style={{ color: 'hsl(var(--destructive))' }}>✕</Button>
              </div>
            ))}
            {dayEntries.length === 0 && (
              <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', margin: 0 }}>Keine Einträge</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Schritt 4: `src/pages/MeineDaten/MeineDaten.tsx` implementieren**

```typescript
import { useState } from 'react'
import { useAuth } from '@/stores/auth'
import Stammdaten from './Stammdaten'
import Dokumente from './Dokumente'
import Verfuegbarkeiten from './Verfuegbarkeiten'

type Tab = 'stammdaten' | 'dokumente' | 'verfuegbarkeiten'

const TABS: { id: Tab; label: string }[] = [
  { id: 'stammdaten',      label: 'Stammdaten' },
  { id: 'dokumente',       label: 'Dokumente' },
  { id: 'verfuegbarkeiten',label: 'Verfügbarkeiten' },
]

export default function MeineDaten() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('stammdaten')

  if (!user?.employee_id) {
    return (
      <div className="page">
        <h1 className="page-title">Meine Daten</h1>
        <p style={{ color: 'hsl(var(--muted-foreground))' }}>
          Kein Mitarbeiterprofil verknüpft. Bitte den Admin kontaktieren.
        </p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1 className="page-title">Meine Daten</h1>

      {/* Tab-Navigation */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '-1px' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
              borderBottom: activeTab === tab.id ? '2px solid hsl(var(--primary))' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'stammdaten'       && <Stammdaten employeeId={user.employee_id} />}
      {activeTab === 'dokumente'        && <Dokumente employeeId={user.employee_id} />}
      {activeTab === 'verfuegbarkeiten' && <Verfuegbarkeiten employeeId={user.employee_id} />}
    </div>
  )
}
```

- [ ] **Schritt 5: TypeScript prüfen + testen**

```bash
npx tsc --noEmit
npm run dev
```

Checklist:
- Tab-Navigation wechselt zwischen Stammdaten / Dokumente / Verfügbarkeiten
- Stammdaten zeigt Name, Abteilung, Vertragsart, Stunden, Urlaub
- Dokumente listet eigene Dokumente mit Download-Link
- Verfügbarkeiten: Einträge anlegen, Zeit + Typ bearbeiten, löschen

- [ ] **Schritt 6: Commit**

```bash
git add mitarbeiter-app/src/pages/MeineDaten/
git commit -m "feat: meine-daten mit stammdaten, dokumente und verfügbarkeiten"
```

---

## Task 12: Build + Abschluss

**Files:**
- Modify: `times/mitarbeiter-app/package.json` (falls Build-Skript fehlt)

- [ ] **Schritt 1: Finaler TypeScript-Check**

```bash
npx tsc --noEmit
```

Erwartet: 0 Fehler

- [ ] **Schritt 2: Produktions-Build**

```bash
npm run build
```

Erwartet: `dist/` Ordner wird erstellt, keine Fehler

- [ ] **Schritt 3: Build lokal prüfen**

```bash
npm run preview
```

Öffne http://localhost:4173 – Login-Seite erscheint, alle Seiten funktionieren.

- [ ] **Schritt 4: Finaler Commit**

```bash
cd /Users/ronnybeckmann/Downloads/Projects/times
git add mitarbeiter-app/
git commit -m "feat: mitarbeiter-app phase 5 vollständig implementiert"
```

---

## Bekannte Einschränkungen

| Punkt | Status |
|---|---|
| Schichttausch | Vorbereitet, aber nicht implementiert – eigener Implementierungsplan bei Bedarf |
| PocketBase Realtime Stempeluhr | Timer läuft clientseitig – bei Page-Reload wird Zeit aus DB neu berechnet |
| Bundle-Größe | Vite-Warnung ab 500 kB – unkritisch für Desktop |
| Dev-Port | 5174 (nicht 5173, da Chef-App diesen belegt) |
