# Chef-App Phase 1a – Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lokale PocketBase-Instanz mit vollständigem Schema aufsetzen, Monorepo-Struktur anlegen und die chef-app bis zu einem lauffähigen Login + Layout mit Stub-Seiten bringen.

**Architecture:** Monorepo `times/` mit `shared/types/index.ts` für alle PocketBase-Interfaces. `chef-app/` ist eine eigenständige Vite-App. Zustand verwaltet Auth-State. React Router v6 + `ProtectedRoute` schützen alle Seiten. PocketBase-Rules erzwingen Datenzugriff serverseitig.

**Tech Stack:** React 18 + TypeScript strict, Vite 5, React Router v6, Zustand v4, PocketBase JS SDK v0.21, Tailwind CSS v3 + shadcn/ui (Amber #BA7517), Lucide React, Vitest + React Testing Library

---

## Dateistruktur

```
times/
├── scripts/
│   └── setup-pb.mjs          ← PocketBase Schema-Setup (Node 18+, kein Dep)
├── shared/
│   └── types/
│       └── index.ts           ← Alle PocketBase-Interfaces
└── chef-app/
    ├── .env.example
    ├── .gitignore
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── components.json
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── lib/
        │   └── pb.ts
        ├── stores/
        │   └── auth.ts
        ├── components/
        │   └── Layout/
        │       ├── AppLayout.tsx
        │       ├── Sidebar.tsx
        │       └── ProtectedRoute.tsx
        └── pages/
            └── Login.tsx
```

---

## Task 1: Monorepo-Struktur + Shared Types

**Files:**
- Create: `shared/types/index.ts`

- [ ] **Step 1: Verzeichnisse anlegen**

```bash
mkdir -p shared/types scripts
```

- [ ] **Step 2: Shared Types schreiben**

`shared/types/index.ts`:
```typescript
// PocketBase-Basisfelder (alle Records haben diese)
export interface PBRecord {
  id: string
  created: string
  updated: string
}

// ── Enums ──────────────────────────────────────────────
export type UserRole       = 'gf' | 'sl' | 'mitarbeiter'
export type ContractType   = 'vz' | 'tz' | 'mj' | 'az'
export type AbsenceType    = 'U' | 'RU' | 'U3' | 'SU' | 'K' | 'KK' | 'AT' | 'S' | 'ÜA'
export type AbsenceStatus  = 'pending' | 'approved' | 'rejected'
export type DocumentType   = 'vertrag' | 'lohnschein' | 'au_schein' | 'sonstiges'
export type NotifType      = 'absence_request' | 'absence_approved' | 'absence_rejected' | 'general'

// ── Collections ────────────────────────────────────────
export interface User extends PBRecord {
  email: string
  name: string
  role: UserRole
  employee?: string
  expand?: { employee?: Employee }
}

export interface Department extends PBRecord {
  name: string
  color: string
  sort_order: number
}

export interface Employee extends PBRecord {
  first_name: string
  last_name: string
  email: string
  phone: string
  birthday: string        // ISO date
  street: string
  zip: string
  city: string
  department: string      // relation ID
  position: string
  contract_type: ContractType
  weekly_hours: number
  start_date: string      // ISO date
  end_date?: string       // ISO date
  vacation_days: number
  active: boolean
  expand?: { department?: Department }
}

export interface Absence extends PBRecord {
  employee: string        // relation ID
  date_from: string       // ISO date
  date_to: string         // ISO date
  type: AbsenceType
  status: AbsenceStatus
  note?: string
  document?: string       // file
  created_by: string
  approved_by?: string
  approved_at?: string
  expand?: { employee?: Employee; approved_by?: User }
}

export interface VacationAccount extends PBRecord {
  employee: string
  year: number
  entitlement: number
  carry_over: number
  carry_over_expires: string  // ISO date
  expand?: { employee?: Employee }
}

export interface TimeEntry extends PBRecord {
  employee: string
  start_time: string      // ISO datetime
  end_time?: string       // null = eingestempelt
  break_minutes: number
  note?: string
  corrected_by?: string
}

export interface Document extends PBRecord {
  employee: string
  name: string
  type: DocumentType
  file: string
  date: string
  uploaded_by: string
}

export interface Notification extends PBRecord {
  user: string
  title: string
  message: string
  type: NotifType
  read: boolean
  reference_id?: string
}

export interface Settings extends PBRecord {
  key: string
  value: string
}

export interface Availability extends PBRecord {
  employee: string
  day_of_week: number     // 0 = So … 6 = Sa
  from_time: string       // "08:00"
  to_time: string
  available: boolean
}

// ── Konstanten ─────────────────────────────────────────
export const VACATION_TYPES: AbsenceType[] = ['U', 'RU', 'U3', 'SU']
export const AUTO_APPROVED_TYPES: AbsenceType[] = ['K', 'KK', 'AT', 'S', 'ÜA']

export const CONTRACT_LABELS: Record<ContractType, string> = {
  vz: 'Vollzeit', tz: 'Teilzeit', mj: 'Minijob', az: 'Azubi',
}

export const ABSENCE_COLORS: Record<AbsenceType, { bg: string; text: string }> = {
  U:    { bg: '#FAEEDA', text: '#633806' },
  RU:   { bg: '#EF9F27', text: '#412402' },
  U3:   { bg: '#FAC775', text: '#633806' },
  SU:   { bg: '#EEEDFE', text: '#3C3489' },
  K:    { bg: '#FCEBEB', text: '#791F1F' },
  KK:   { bg: '#F7C1C1', text: '#501313' },
  AT:   { bg: '#F1EFE8', text: '#444441' },
  S:    { bg: '#E6F1FB', text: '#0C447C' },
  'ÜA': { bg: '#E1F5EE', text: '#085041' },
}
```

- [ ] **Step 3: Commit**

```bash
git add shared/
git commit -m "feat: shared TypeScript types für PocketBase-Collections"
```

---

## Task 2: PocketBase herunterladen + starten

**Files:**
- Create: `scripts/setup-pb.mjs`

- [ ] **Step 1: PocketBase binary herunterladen (macOS Apple Silicon)**

```bash
curl -L https://github.com/pocketbase/pocketbase/releases/download/v0.21.3/pocketbase_0.21.3_darwin_arm64.zip -o /tmp/pb.zip
unzip /tmp/pb.zip pocketbase -d .
chmod +x ./pocketbase
```

Für Intel-Mac stattdessen: `pocketbase_0.21.3_darwin_amd64.zip`

- [ ] **Step 2: PocketBase starten**

```bash
./pocketbase serve
```

Erwartete Ausgabe:
```
Server started at http://127.0.0.1:8091
  - REST API: http://127.0.0.1:8091/api/
  - Admin UI: http://127.0.0.1:8091/_/
```

PocketBase läuft im Vordergrund. Neues Terminal für die nächsten Schritte öffnen.

- [ ] **Step 3: Admin-Account anlegen**

Browser öffnen: `http://127.0.0.1:8091/_/`
Admin-E-Mail: `admin@schichtplan.de`
Admin-Passwort: `Admin1234!` (danach ändern)

- [ ] **Step 4: Schema-Setup-Script schreiben**

`scripts/setup-pb.mjs`:
```javascript
// Requires Node 18+ (native fetch). Run: node scripts/setup-pb.mjs
const BASE = 'http://127.0.0.1:8091'
const EMAIL = process.argv[2] ?? 'admin@schichtplan.de'
const PASS  = process.argv[3] ?? 'Admin1234!'

// ── Auth ───────────────────────────────────────────────
const authRes = await fetch(`${BASE}/api/admins/auth-with-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identity: EMAIL, password: PASS }),
})
const { token } = await authRes.json()
if (!token) { console.error('Auth fehlgeschlagen'); process.exit(1) }
console.log('✓ Admin authentifiziert')

const H = { 'Content-Type': 'application/json', Authorization: token }

// users-Collection-ID einmalig holen (für Relation-Felder)
const usersColRes = await fetch(`${BASE}/api/collections/users`, { headers: H })
const usersCol = await usersColRes.json()
const USERS_ID = usersCol.id
console.log(`✓ users Collection ID: ${USERS_ID}`)

async function create(body) {
  const r = await fetch(`${BASE}/api/collections`, {
    method: 'POST', headers: H, body: JSON.stringify(body),
  })
  const d = await r.json()
  if (!r.ok) throw new Error(`${body.name}: ${JSON.stringify(d)}`)
  console.log(`✓ Collection "${body.name}" angelegt (${d.id})`)
  return d
}

async function patch(id, body) {
  const r = await fetch(`${BASE}/api/collections/${id}`, {
    method: 'PATCH', headers: H, body: JSON.stringify(body),
  })
  const d = await r.json()
  if (!r.ok) throw new Error(`patch ${id}: ${JSON.stringify(d)}`)
  console.log(`✓ Collection "${d.name}" aktualisiert`)
  return d
}

// ── 1. departments (keine Relations) ──────────────────
const departments = await create({
  name: 'departments', type: 'base',
  listRule: "@request.auth.id != ''",
  viewRule: "@request.auth.id != ''",
  createRule: "@request.auth.record.role = 'gf'",
  updateRule: "@request.auth.record.role = 'gf'",
  deleteRule: "@request.auth.record.role = 'gf'",
  schema: [
    { name: 'name',       type: 'text',   required: true,  options: { min: 1, max: 100, pattern: '' } },
    { name: 'color',      type: 'text',   required: true,  options: { min: 7, max: 7,   pattern: '' } },
    { name: 'sort_order', type: 'number', required: false, options: { min: null, max: null, noDecimal: true } },
  ],
})

// ── 2. settings (keine Relations) ─────────────────────
await create({
  name: 'settings', type: 'base',
  listRule: "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl'",
  viewRule: "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl'",
  createRule: "@request.auth.record.role = 'gf'",
  updateRule: "@request.auth.record.role = 'gf'",
  deleteRule: "@request.auth.record.role = 'gf'",
  schema: [
    { name: 'key',   type: 'text', required: true,  options: { min: 1, max: 100, pattern: '' } },
    { name: 'value', type: 'text', required: false, options: { min: null, max: null, pattern: '' } },
  ],
})

// ── 3. employees (→ departments) ──────────────────────
const employees = await create({
  name: 'employees', type: 'base',
  listRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl'",
  viewRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || id = @request.auth.record.employee",
  createRule: "@request.auth.record.role = 'gf'",
  updateRule: "@request.auth.record.role = 'gf'",
  deleteRule: "@request.auth.record.role = 'gf'",
  schema: [
    { name: 'first_name',    type: 'text',     required: true,  options: { min: 1, max: 100, pattern: '' } },
    { name: 'last_name',     type: 'text',     required: true,  options: { min: 1, max: 100, pattern: '' } },
    { name: 'email',         type: 'email',    required: true,  options: { exceptDomains: [] } },
    { name: 'phone',         type: 'text',     required: false, options: { min: null, max: 30, pattern: '' } },
    { name: 'birthday',      type: 'date',     required: false, options: { min: '', max: '' } },
    { name: 'street',        type: 'text',     required: false, options: { min: null, max: 200, pattern: '' } },
    { name: 'zip',           type: 'text',     required: false, options: { min: null, max: 10,  pattern: '' } },
    { name: 'city',          type: 'text',     required: false, options: { min: null, max: 100, pattern: '' } },
    { name: 'department',    type: 'relation', required: false, options: { collectionId: departments.id, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: ['name'] } },
    { name: 'position',      type: 'text',     required: false, options: { min: null, max: 100, pattern: '' } },
    { name: 'contract_type', type: 'select',   required: true,  options: { maxSelect: 1, values: ['vz','tz','mj','az'] } },
    { name: 'weekly_hours',  type: 'number',   required: true,  options: { min: 0, max: 168, noDecimal: false } },
    { name: 'start_date',    type: 'date',     required: true,  options: { min: '', max: '' } },
    { name: 'end_date',      type: 'date',     required: false, options: { min: '', max: '' } },
    { name: 'vacation_days', type: 'number',   required: true,  options: { min: 0, max: 365, noDecimal: true } },
    { name: 'active',        type: 'bool',     required: false, options: {} },
  ],
})

// ── 4. users collection: role + employee Felder hinzufügen ──

const newFields = [
  { name: 'role',     type: 'select',   required: true,  options: { maxSelect: 1, values: ['gf','sl','mitarbeiter'] } },
  { name: 'employee', type: 'relation', required: false, options: { collectionId: employees.id, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: ['first_name','last_name'] } },
]
// Felder nicht doppelt hinzufügen
const existingNames = usersCol.schema.map(f => f.name)
const fieldsToAdd = newFields.filter(f => !existingNames.includes(f.name))
if (fieldsToAdd.length > 0) {
  await patch('users', { schema: [...usersCol.schema, ...fieldsToAdd] })
} else {
  console.log('✓ users-Felder bereits vorhanden, übersprungen')
}

// ── 5. absences ───────────────────────────────────────
await create({
  name: 'absences', type: 'base',
  listRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee.user = @request.auth.id",
  viewRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee.user = @request.auth.id",
  createRule: "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || (employee.user = @request.auth.id && @request.data.status = 'pending')",
  updateRule: "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || (employee.user = @request.auth.id && status = 'pending')",
  deleteRule: "@request.auth.record.role = 'gf'",
  schema: [
    { name: 'employee',    type: 'relation', required: true,  options: { collectionId: employees.id, cascadeDelete: true,  minSelect: null, maxSelect: 1, displayFields: [] } },
    { name: 'date_from',   type: 'date',     required: true,  options: { min: '', max: '' } },
    { name: 'date_to',     type: 'date',     required: true,  options: { min: '', max: '' } },
    { name: 'type',        type: 'select',   required: true,  options: { maxSelect: 1, values: ['U','RU','U3','SU','K','KK','AT','S','ÜA'] } },
    { name: 'status',      type: 'select',   required: true,  options: { maxSelect: 1, values: ['pending','approved','rejected'] } },
    { name: 'note',        type: 'text',     required: false, options: { min: null, max: 500, pattern: '' } },
    { name: 'document',    type: 'file',     required: false, options: { maxSelect: 1, maxSize: 10485760, mimeTypes: ['application/pdf','image/jpeg','image/png'], thumbs: [], protected: false } },
    { name: 'created_by',  type: 'relation', required: true,  options: { collectionId: USERS_ID, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] } },
    { name: 'approved_by', type: 'relation', required: false, options: { collectionId: USERS_ID, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] } },
    { name: 'approved_at', type: 'date',     required: false, options: { min: '', max: '' } },
  ],
})

// ── 6. vacation_accounts ──────────────────────────────
await create({
  name: 'vacation_accounts', type: 'base',
  listRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee.user = @request.auth.id",
  viewRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee.user = @request.auth.id",
  createRule: "@request.auth.record.role = 'gf'",
  updateRule: "@request.auth.record.role = 'gf'",
  deleteRule: "@request.auth.record.role = 'gf'",
  schema: [
    { name: 'employee',           type: 'relation', required: true,  options: { collectionId: employees.id, cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] } },
    { name: 'year',               type: 'number',   required: true,  options: { min: 2000, max: 2100, noDecimal: true } },
    { name: 'entitlement',        type: 'number',   required: true,  options: { min: 0, max: 365, noDecimal: false } },
    { name: 'carry_over',         type: 'number',   required: true,  options: { min: 0, max: 365, noDecimal: false } },
    { name: 'carry_over_expires', type: 'date',     required: true,  options: { min: '', max: '' } },
  ],
})

// ── 7. time_entries ───────────────────────────────────
await create({
  name: 'time_entries', type: 'base',
  listRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee.user = @request.auth.id",
  viewRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee.user = @request.auth.id",
  createRule: "@request.auth.id != ''",
  updateRule: "@request.auth.record.role = 'gf' || (employee.user = @request.auth.id && end_time = '')",
  deleteRule: "@request.auth.record.role = 'gf'",
  schema: [
    { name: 'employee',      type: 'relation', required: true,  options: { collectionId: employees.id, cascadeDelete: true,  minSelect: null, maxSelect: 1, displayFields: [] } },
    { name: 'start_time',    type: 'date',     required: true,  options: { min: '', max: '' } },
    { name: 'end_time',      type: 'date',     required: false, options: { min: '', max: '' } },
    { name: 'break_minutes', type: 'number',   required: false, options: { min: 0, max: 120, noDecimal: true } },
    { name: 'note',          type: 'text',     required: false, options: { min: null, max: 300, pattern: '' } },
    { name: 'corrected_by',  type: 'relation', required: false, options: { collectionId: USERS_ID, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] } },
  ],
})

// ── 8. documents ──────────────────────────────────────
await create({
  name: 'documents', type: 'base',
  listRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee.user = @request.auth.id",
  viewRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee.user = @request.auth.id",
  createRule: "@request.auth.record.role = 'gf'",
  updateRule: "@request.auth.record.role = 'gf'",
  deleteRule: "@request.auth.record.role = 'gf'",
  schema: [
    { name: 'employee',    type: 'relation', required: true,  options: { collectionId: employees.id, cascadeDelete: true,  minSelect: null, maxSelect: 1, displayFields: [] } },
    { name: 'name',        type: 'text',     required: true,  options: { min: 1, max: 200, pattern: '' } },
    { name: 'type',        type: 'select',   required: true,  options: { maxSelect: 1, values: ['vertrag','lohnschein','au_schein','sonstiges'] } },
    { name: 'file',        type: 'file',     required: true,  options: { maxSelect: 1, maxSize: 20971520, mimeTypes: ['application/pdf','image/jpeg','image/png'], thumbs: [], protected: false } },
    { name: 'date',        type: 'date',     required: true,  options: { min: '', max: '' } },
    { name: 'uploaded_by', type: 'relation', required: true,  options: { collectionId: USERS_ID, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] } },
  ],
})

// ── 9. notifications ──────────────────────────────────
await create({
  name: 'notifications', type: 'base',
  listRule:   "user = @request.auth.id",
  viewRule:   "user = @request.auth.id",
  createRule: "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl'",
  updateRule: "user = @request.auth.id",
  deleteRule: "user = @request.auth.id",
  schema: [
    { name: 'user',         type: 'relation', required: true,  options: { collectionId: USERS_ID, cascadeDelete: true,  minSelect: null, maxSelect: 1, displayFields: [] } },
    { name: 'title',        type: 'text',     required: true,  options: { min: 1, max: 200, pattern: '' } },
    { name: 'message',      type: 'text',     required: false, options: { min: null, max: 500, pattern: '' } },
    { name: 'type',         type: 'select',   required: true,  options: { maxSelect: 1, values: ['absence_request','absence_approved','absence_rejected','general'] } },
    { name: 'read',         type: 'bool',     required: false, options: {} },
    { name: 'reference_id', type: 'text',     required: false, options: { min: null, max: 50, pattern: '' } },
  ],
})

// ── 10. availability ──────────────────────────────────
await create({
  name: 'availability', type: 'base',
  listRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee.user = @request.auth.id",
  viewRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee.user = @request.auth.id",
  createRule: "@request.auth.record.role = 'gf' || employee.user = @request.auth.id",
  updateRule: "@request.auth.record.role = 'gf' || employee.user = @request.auth.id",
  deleteRule: "@request.auth.record.role = 'gf' || employee.user = @request.auth.id",
  schema: [
    { name: 'employee',     type: 'relation', required: true,  options: { collectionId: employees.id, cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] } },
    { name: 'day_of_week',  type: 'number',   required: true,  options: { min: 0, max: 6, noDecimal: true } },
    { name: 'from_time',    type: 'text',     required: true,  options: { min: 5, max: 5, pattern: '^\\d{2}:\\d{2}$' } },
    { name: 'to_time',      type: 'text',     required: true,  options: { min: 5, max: 5, pattern: '^\\d{2}:\\d{2}$' } },
    { name: 'available',    type: 'bool',     required: false, options: {} },
  ],
})

// ── 11. Default settings ──────────────────────────────
// Diese werden per API als Records angelegt, nicht als Schema
const defaultSettings = [
  { key: 'company_name',       value: 'Mein Betrieb' },
  { key: 'federal_state',      value: 'ST' },
  { key: 'carry_over_deadline', value: '03-31' },
  { key: 'shift_swap_enabled',  value: 'false' },
]

for (const s of defaultSettings) {
  const existing = await fetch(`${BASE}/api/collections/settings/records?filter=(key='${s.key}')`, { headers: H })
  const { totalItems } = await existing.json()
  if (totalItems === 0) {
    await fetch(`${BASE}/api/collections/settings/records`, {
      method: 'POST', headers: H, body: JSON.stringify(s),
    })
    console.log(`✓ Setting "${s.key}" angelegt`)
  } else {
    console.log(`  Setting "${s.key}" bereits vorhanden`)
  }
}

console.log('\n✅ PocketBase Schema vollständig eingerichtet.')
console.log('👉 Erstelle jetzt einen GF-Nutzer unter http://127.0.0.1:8091/_/')
```

- [ ] **Step 5: Script ausführen (chef-app muss noch nicht installiert sein)**

```bash
node scripts/setup-pb.mjs
```

Erwartete Ausgabe:
```
✓ Admin authentifiziert
✓ Collection "departments" angelegt (...)
✓ Collection "settings" angelegt (...)
✓ Collection "employees" angelegt (...)
✓ users-Felder aktualisiert
✓ Collection "absences" angelegt (...)
✓ Collection "vacation_accounts" angelegt (...)
✓ Collection "time_entries" angelegt (...)
✓ Collection "documents" angelegt (...)
✓ Collection "notifications" angelegt (...)
✓ Collection "availability" angelegt (...)
✅ PocketBase Schema vollständig eingerichtet.
```

- [ ] **Step 6: Test-Nutzer (GF) anlegen**

PocketBase Admin UI → `http://127.0.0.1:8091/_/` → Collections → users → „New record":
- email: `gf@schichtplan.de`
- password: `Test1234!`
- role: `gf`
- name: `Ronny Beckmann`

- [ ] **Step 7: Commit**

```bash
git add scripts/
git commit -m "feat: PocketBase Schema-Setup-Script + alle Collections"
```

---

## Task 3: Chef-App Vite-Scaffold + Abhängigkeiten

**Files:**
- Create: `chef-app/` (vollständiges Vite-Projekt)

- [ ] **Step 1: Vite-Projekt anlegen**

```bash
npm create vite@latest chef-app -- --template react-ts
```

- [ ] **Step 2: Abhängigkeiten installieren**

```bash
cd chef-app
npm install
npm install pocketbase@0.21 zustand react-router-dom date-fns lucide-react feiertagejs
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
cd ..
```

- [ ] **Step 3: `.env.example` anlegen**

`chef-app/.env.example`:
```
VITE_PB_URL=http://127.0.0.1:8091
```

`chef-app/.env` (nicht in git):
```
VITE_PB_URL=http://127.0.0.1:8091
```

- [ ] **Step 4: `.gitignore` anpassen**

`chef-app/.gitignore` — sicherstellen dass enthalten:
```
.env
dist/
node_modules/
```

- [ ] **Step 5: `tsconfig.json` — strict + Pfad-Aliases**

`chef-app/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`chef-app/tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 7: Test-Setup**

`chef-app/src/test-setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 8: `package.json` scripts ergänzen**

In `chef-app/package.json` unter `"scripts"` hinzufügen:
```json
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 9: Commit**

```bash
git add chef-app/
git commit -m "feat: chef-app Vite-Scaffold mit TypeScript strict + Vitest"
```

---

## Task 4: Tailwind CSS + shadcn/ui

**Files:**
- Create: `chef-app/tailwind.config.ts`
- Modify: `chef-app/src/index.css`
- Create: `chef-app/components.json`

- [ ] **Step 1: Tailwind installieren**

```bash
cd chef-app
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p --ts
```

- [ ] **Step 2: `tailwind.config.ts` mit Amber-Farbe**

```typescript
import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#BA7517',
          hover:   '#9E6312',
          light:   'rgba(186,117,23,0.12)',
        },
        border:  '#EDE7DC',
        bg:      '#F5F2EE',
        card:    '#FFFFFF',
        muted:   '#706D6A',
      },
      borderRadius: {
        lg: '8px',
        md: '6px',
        sm: '4px',
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 3: `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --primary:       #BA7517;
    --primary-light: rgba(186,117,23,0.12);
    --primary-hover: #9E6312;
    --bg:            #F5F2EE;
    --card:          #FFFFFF;
    --border:        #EDE7DC;
    --text:          #1A1917;
    --text-muted:    #706D6A;
    --radius:        8px;
  }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; }
}
```

- [ ] **Step 4: shadcn/ui initialisieren**

```bash
npx shadcn@latest init
```

Antworten:
- Style: **Default**
- Base color: **Stone** (wir überschreiben mit Amber)
- CSS variables: **Yes**

`components.json` wird erstellt. Danach manuell `components.json` anpassen — `"cssVariables": true` bestätigen.

- [ ] **Step 5: Basis-Komponenten hinzufügen**

```bash
npx shadcn@latest add button input label select dialog table badge
```

- [ ] **Step 6: Testen — App starten**

```bash
npm run dev
```

Erwartete Ausgabe: `VITE v5.x  ready in ...ms → Local: http://localhost:5173/`

Browser öffnen → Vite-Standard-Seite sichtbar.

- [ ] **Step 7: Commit**

```bash
cd ..
git add chef-app/
git commit -m "feat: Tailwind CSS + shadcn/ui mit Amber-Primärfarbe"
```

---

## Task 5: PocketBase Client + Auth Store

**Files:**
- Create: `chef-app/src/lib/pb.ts`
- Create: `chef-app/src/stores/auth.ts`
- Create: `chef-app/src/stores/__tests__/auth.test.ts`

- [ ] **Step 1: Failing test schreiben**

`chef-app/src/stores/__tests__/auth.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock muss vor dem Import des Stores stehen
vi.mock('../../lib/pb', () => ({
  pb: {
    authStore: {
      isValid: false,
      model: null,
      clear: vi.fn(),
    },
    collection: vi.fn().mockReturnValue({
      authWithPassword: vi.fn().mockResolvedValue({
        record: { id: '1', email: 'gf@test.de', name: 'Test GF', role: 'gf' },
      }),
    }),
  },
}))

import { useAuthStore } from '../auth'

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isLoading: false })
  })

  it('startet ohne eingeloggten Nutzer', () => {
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('setzt user nach login', async () => {
    await useAuthStore.getState().login('gf@test.de', 'Test1234!')
    expect(useAuthStore.getState().user).not.toBeNull()
    expect(useAuthStore.getState().user?.role).toBe('gf')
  })

  it('isGF gibt true zurück wenn role = gf', async () => {
    await useAuthStore.getState().login('gf@test.de', 'Test1234!')
    expect(useAuthStore.getState().isGF()).toBe(true)
    expect(useAuthStore.getState().isSL()).toBe(false)
  })

  it('logout löscht user', async () => {
    await useAuthStore.getState().login('gf@test.de', 'Test1234!')
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().user).toBeNull()
  })
})
```

- [ ] **Step 2: Test ausführen — erwartet FAIL**

```bash
cd chef-app && npm run test:run
```

Erwartete Ausgabe: `FAIL  src/stores/__tests__/auth.test.ts`
Grund: `auth.ts` und `pb.ts` existieren noch nicht.

- [ ] **Step 3: `lib/pb.ts` implementieren**

```typescript
import PocketBase from 'pocketbase'

export const pb = new PocketBase(import.meta.env.VITE_PB_URL ?? 'http://127.0.0.1:8091')

// Token beim Start wiederherstellen (localStorage)
pb.authStore.loadFromCookie(document.cookie)
```

- [ ] **Step 4: `stores/auth.ts` implementieren**

```typescript
import { create } from 'zustand'
import { pb } from '../lib/pb'
import type { User } from '@shared/types'

interface AuthState {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isGF: () => boolean
  isSL: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: pb.authStore.isValid ? (pb.authStore.model as unknown as User) : null,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const auth = await pb.collection('users').authWithPassword(email, password)
      set({ user: auth.record as unknown as User })
    } finally {
      set({ isLoading: false })
    }
  },

  logout: () => {
    pb.authStore.clear()
    set({ user: null })
  },

  isGF: () => get().user?.role === 'gf',
  isSL: () => get().user?.role === 'sl',
}))
```

- [ ] **Step 5: Tests ausführen — erwartet PASS**

```bash
npm run test:run
```

Erwartete Ausgabe:
```
✓ src/stores/__tests__/auth.test.ts (4)
Test Files  1 passed (1)
Tests       4 passed (4)
```

- [ ] **Step 6: Commit**

```bash
cd ..
git add chef-app/src/lib/ chef-app/src/stores/
git commit -m "feat: PocketBase client + Zustand auth store"
```

---

## Task 6: React Router + ProtectedRoute + App.tsx

**Files:**
- Create: `chef-app/src/components/Layout/ProtectedRoute.tsx`
- Create: `chef-app/src/components/Layout/__tests__/ProtectedRoute.test.tsx`
- Modify: `chef-app/src/App.tsx`
- Modify: `chef-app/src/main.tsx`

- [ ] **Step 1: Failing test schreiben**

`chef-app/src/components/Layout/__tests__/ProtectedRoute.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../../../lib/pb', () => ({
  pb: { authStore: { isValid: false, model: null, clear: vi.fn() } },
}))

vi.mock('../../../stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

import ProtectedRoute from '../ProtectedRoute'
import { useAuthStore } from '../../../stores/auth'

const mockUseAuthStore = vi.mocked(useAuthStore)

function renderWithRouter(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login-Seite</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Dashboard</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  it('leitet zu /login weiter wenn kein User', () => {
    mockUseAuthStore.mockReturnValue({ user: null } as ReturnType<typeof useAuthStore>)
    renderWithRouter('/')
    expect(screen.getByText('Login-Seite')).toBeInTheDocument()
  })

  it('zeigt Fehlermeldung für Mitarbeiter-Rolle', () => {
    mockUseAuthStore.mockReturnValue({ user: { role: 'mitarbeiter' } } as ReturnType<typeof useAuthStore>)
    renderWithRouter('/')
    expect(screen.getByText(/Mitarbeiter-App/i)).toBeInTheDocument()
  })

  it('zeigt Inhalt für GF', () => {
    mockUseAuthStore.mockReturnValue({ user: { role: 'gf' } } as ReturnType<typeof useAuthStore>)
    renderWithRouter('/')
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Test ausführen — erwartet FAIL**

```bash
cd chef-app && npm run test:run
```

Erwartete Ausgabe: `FAIL  src/components/Layout/__tests__/ProtectedRoute.test.tsx`

- [ ] **Step 3: `ProtectedRoute.tsx` implementieren**

`chef-app/src/components/Layout/ProtectedRoute.tsx`:
```typescript
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'

export default function ProtectedRoute() {
  const user = useAuthStore(s => s.user)

  if (!user) return <Navigate to="/login" replace />

  if (user.role === 'mitarbeiter') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F2EE]">
        <div className="bg-white border border-[#EDE7DC] rounded-[8px] p-8 max-w-sm text-center shadow-sm">
          <p className="font-semibold mb-2 text-[#1A1917]">Falscher Zugang</p>
          <p className="text-sm text-[#706D6A]">
            Bitte die <strong>Mitarbeiter-App</strong> nutzen.
          </p>
        </div>
      </div>
    )
  }

  return <Outlet />
}
```

- [ ] **Step 4: `App.tsx` implementieren**

`chef-app/src/App.tsx`:
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/Layout/ProtectedRoute'
import Login from './pages/Login'

// Lazy placeholder für noch nicht gebaute Seiten
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
          {/* AppLayout + alle Seiten werden in Phase 1b hinzugefügt */}
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
```

- [ ] **Step 5: `main.tsx` bereinigen**

`chef-app/src/main.tsx`:
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

- [ ] **Step 6: Tests ausführen — alle PASS**

```bash
npm run test:run
```

Erwartete Ausgabe:
```
✓ src/stores/__tests__/auth.test.ts (4)
✓ src/components/Layout/__tests__/ProtectedRoute.test.tsx (3)
Test Files  2 passed (2)
Tests       7 passed (7)
```

- [ ] **Step 7: Commit**

```bash
cd ..
git add chef-app/src/
git commit -m "feat: React Router + ProtectedRoute + App.tsx Routing-Struktur"
```

---

## Task 7: Login-Seite

**Files:**
- Create: `chef-app/src/pages/Login.tsx`
- Create: `chef-app/src/pages/__tests__/Login.test.tsx`

- [ ] **Step 1: Failing test schreiben**

`chef-app/src/pages/__tests__/Login.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../lib/pb', () => ({
  pb: { authStore: { isValid: false, model: null, clear: vi.fn() } },
}))

const mockLogin = vi.fn()
vi.mock('../../stores/auth', () => ({
  useAuthStore: (selector: (s: { user: null; isLoading: boolean; login: typeof mockLogin }) => unknown) =>
    selector({ user: null, isLoading: false, login: mockLogin }),
}))

import Login from '../Login'

function renderLogin() {
  return render(<MemoryRouter><Login /></MemoryRouter>)
}

describe('Login', () => {
  it('zeigt E-Mail und Passwort-Felder', () => {
    renderLogin()
    expect(screen.getByLabelText(/E-Mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Passwort/i)).toBeInTheDocument()
  })

  it('ruft login mit eingegebenen Daten auf', async () => {
    mockLogin.mockResolvedValueOnce(undefined)
    renderLogin()
    fireEvent.change(screen.getByLabelText(/E-Mail/i), { target: { value: 'gf@test.de' } })
    fireEvent.change(screen.getByLabelText(/Passwort/i), { target: { value: 'Test1234!' } })
    fireEvent.click(screen.getByRole('button', { name: /Anmelden/i }))
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('gf@test.de', 'Test1234!'))
  })

  it('zeigt Fehlermeldung bei falschem Login', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'))
    renderLogin()
    fireEvent.change(screen.getByLabelText(/E-Mail/i), { target: { value: 'x@x.de' } })
    fireEvent.change(screen.getByLabelText(/Passwort/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /Anmelden/i }))
    await waitFor(() => expect(screen.getByText(/falsch/i)).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Test ausführen — erwartet FAIL**

```bash
cd chef-app && npm run test:run
```

Erwartete Ausgabe: `FAIL  src/pages/__tests__/Login.test.tsx`

- [ ] **Step 3: `Login.tsx` implementieren**

`chef-app/src/pages/Login.tsx`:
```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { Button } from '../components/ui/button'
import { Input }  from '../components/ui/input'
import { Label }  from '../components/ui/label'

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const navigate = useNavigate()
  const { login, isLoading, user } = useAuthStore(s => ({
    login: s.login, isLoading: s.isLoading, user: s.user,
  }))

  // Bereits eingeloggt → weiterleiten
  if (user && (user.role === 'gf' || user.role === 'sl')) {
    navigate('/', { replace: true })
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await login(email, password)
    } catch {
      setError('E-Mail oder Passwort falsch.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F2EE]">
      <div className="bg-white border border-[#EDE7DC] rounded-[8px] p-8 w-full max-w-sm shadow-sm">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 text-[#BA7517] font-bold text-[15px]">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          Schicht &amp; Plan
        </div>

        <h1 className="text-xl font-bold mb-1 text-[#1A1917]">Anmelden</h1>
        <p className="text-sm text-[#706D6A] mb-6">Chef-App · Verwaltung</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              className="mt-1 border-[#EDE7DC] focus:border-[#BA7517] focus:ring-[#BA7517]"
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
              className="mt-1 border-[#EDE7DC] focus:border-[#BA7517] focus:ring-[#BA7517]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#BA7517] hover:bg-[#9E6312] text-white font-semibold"
          >
            {isLoading ? 'Anmelden …' : 'Anmelden'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Tests ausführen — alle PASS**

```bash
npm run test:run
```

Erwartete Ausgabe:
```
✓ src/stores/__tests__/auth.test.ts (4)
✓ src/components/Layout/__tests__/ProtectedRoute.test.tsx (3)
✓ src/pages/__tests__/Login.test.tsx (3)
Test Files  3 passed (3)
Tests       10 passed (10)
```

- [ ] **Step 5: Manuell testen**

```bash
npm run dev
```

- Browser → `http://localhost:5173/login`
- Falsches Passwort eingeben → Fehlermeldung erscheint
- Richtiges Login (gf@schichtplan.de / Test1234!) → Weiterleitung zu `/` (Stub-Seite)

- [ ] **Step 6: Commit**

```bash
cd ..
git add chef-app/src/pages/
git commit -m "feat: Login-Seite mit Fehlerbehandlung + Tests"
```

---

## Abschluss Phase 1a

Nach diesen 7 Tasks ist:

- ✅ PocketBase lokal installiert mit vollständigem Schema (10 Collections)
- ✅ Alle Collections mit korrekten Zugriffsregeln
- ✅ Shared TypeScript-Typen für beide Apps
- ✅ Chef-App Vite-Projekt mit Tailwind + shadcn/ui
- ✅ PocketBase Client + Auth Store (Zustand)
- ✅ React Router mit ProtectedRoute (Rollen-Check)
- ✅ Login-Seite funktionsfähig
- ✅ 10 Tests grün

**Weiter mit Phase 1b:** AppLayout + Sidebar + Dashboard + Mitarbeiterverwaltung + Einstellungen
