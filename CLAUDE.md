# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Schicht & Plan** is an HR management system for gastronomy/hospitality. It's a monorepo with two separate React 19 apps, a PocketBase backend, and a push notification service:

**Development (Unified Origin via Proxy):**
- **chef-app** (Port 5173, Root): Dashboard for managers/GF with employee management, scheduling, time tracking, reports
- **mitarbeiter-app** (Port 5173/ma/, proxied to 5174): PWA for employees with shift viewing, time tracking, absences, personal data
- **PocketBase** (Port 8091): Backend database and real-time system

**Production (Unified Origin via Path):**
- **chef-app** (Port 3001, Root): Same functionality
- **mitarbeiter-app** (Port 3001/ma/): Same functionality, served via serve.mjs
- **push-service** (Port 3456): Web Push Notification service with VAPID keys
- **PocketBase** (Port 8092): Backend database and real-time system

**SSO Note:** Both apps share the same origin (localhost:5173 in dev, 192.168.178.106:3001 in prod) via unified path structure. User logs in once, token is automatically shared via localStorage.

## Key Architecture

### App Structure
Both React apps follow the same pattern:
- `/src/components` — reusable UI components, Layout/ contains ProtectedRoute (auth guard) and AppLayout (main wrapper)
- `/src/pages` — page components matching the app's routes
- `/src/hooks` — custom React hooks, including PocketBase subscriptions
- `/src/lib` — shared utilities and constants
- `/src/stores` — Zustand stores for state management

### Authentication & Authorization
- **ProtectedRoute**: Guards all pages; redirects to /login if not authenticated
- **GFRoute** (chef-app only): Additional guard for admin pages; requires `role === "gf"`
- Users stored in PocketBase `users` collection with `role` field.
  Gültige Werte: `gf` (Geschäftsführung), `sl` (Schichtleitung), `mitarbeiter`.
  ⚠️ Der Wert heißt `mitarbeiter`, **nicht** `ma` — `/ma/` ist nur der URL-Pfad.

### Real-time & Push Notifications
- PocketBase subscriptions via SDK for real-time updates (Dienstplan, Abwesenheiten, Zeiten)
- Web Push Notifications: VAPID keys in `.env.production` → push-service sends notifications
- Hooks in `pb_hooks/` (push_absences.pb.js, push_dienstplan.pb.js, sync_names.pb.js) trigger server-side actions

### Time Tracking (Stempeluhr)
- **mitarbeiter-app only**: Swipe-based clock in/out on Dashboard
- **Display logic**: 
  - Not stamped: Shows `0:00 h` (not the day's cumulative time)
  - Stamped: Shows only current session time since clock-in (live countdown with blinking seconds)
- **Data**: Stored in `time_entries` collection (employee, start_time, end_time, break_minutes)
- **Database schema**: `start_time` and `end_time` are `datetime` type (ISO-8601 timestamps), not just `date`
- **Migration**: pb_migrations/1779358911_created_time_entries.js defines the schema; corrections made 2026-06-26

### Gamification System
- **Status**: ✅ IMPLEMENTED & FIXED (2026-08-07)
- **Admin Pages**: `/admin/gamification/tasks`, `/admin/gamification/rewards`, `/admin/gamification/approvals`
- **Collections**: gam_tasks, gam_rewards, gam_settings, gam_assignments, gam_orders, gam_submissions, gam_events
- **API Rules**: 
  - Create/Read: `@request.auth.id != ''` (any authenticated user)
  - Approve: GF-only (`role = 'gf'`)
- **Critical Fixes**:
  - Removed `<StrictMode>` from `chef-app/src/main.tsx` — was causing request cancellation
  - Fixed Auto-Cancellation in Subscribe hooks (added `requestKey: null`, direct state updates)
  - Added System-Columns (`created`, `updated`) to all gam_* tables
  - Applied Update-Migrations (2026-08-07) to correct API Rules
  - gam_settings.enabled = true to activate system
- **Data**: Points system, task assignments, reward orders, employee submissions, approval workflow

### Design System
- Unified design via Tailwind CSS + shadcn/ui components
- Color theme: Indigo (#4F46E5) — **rebuild with `npm run build` after color changes**
- Master template in `docs/design-system/master-template.md` defines 3-column layout for backend pages
- Both apps use the same component patterns and spacing

## Common Commands

### Local Development Setup
```bash
# 1. Start PocketBase (from root) — Terminal 1
./pocketbase serve --http="127.0.0.1:8091"

# 2. Run migrations (from root, once after setup)
node scripts/setup-pb.mjs

# 3. Start chef-app dev server (with proxy to /ma/) — Terminal 2
cd chef-app && npm install && npm run dev

# 4. Start mitarbeiter-app dev server — Terminal 3
cd mitarbeiter-app && npm install && npm run dev

# 5. Start push-service (optional, for notifications) — Terminal 4
cd push-service && npm install && npm run dev

# Access:
# - Chef-App: http://localhost:5173
# - Mitarbeiter-App: http://localhost:5173/ma/ (proxied to 5174)
# - PocketBase Admin: http://localhost:8091/_/

# SSO: Login in chef-app, then visit /ma/ — automatically authenticated!
```

### Chef-App Commands
```bash
cd chef-app
npm run dev           # Start dev server (http://localhost:5173)
npm run build         # Build for production (TypeScript check + Vite build)
npm run lint          # Run ESLint
npm test              # Run Vitest in watch mode
npm run test:run      # Run tests once
npm run test:coverage # Generate coverage report
npm run preview       # Preview production build
```

### Mitarbeiter-App Commands
```bash
cd mitarbeiter-app
npm run dev       # Start dev server (http://localhost:5174)
npm run build     # Build for production
npm test          # Run Vitest in watch mode
npm run test:run  # Run tests once
npm run preview   # Preview production build
```

### PocketBase Admin
- Accessible at http://localhost:8091/_ (or 8092 in production)
- Collections: users, dienstplan, abwesenheiten, zeiten, shift_templates, lager (storage)
- Most data is synced via migrations; avoid manual schema edits

## Important Notes

### Environment Variables
- **chef-app**: VITE_PB_URL (points to PocketBase)
- **mitarbeiter-app**: VITE_PB_URL, VITE_VAPID_PUBLIC (for push notifications)
- **push-service**: PB_URL, VAPID_PUBLIC, VAPID_PRIVATE, PORT

### Deployment
- Push service and PocketBase run on the Pi (server@192.168.178.106)
- **Unified Server:** Both apps served from single Port 3001 via serve.mjs (chef-app at root, mitarbeiter-app at /ma/)
- **Deploy command:** `./deploy.sh` (handles git pull, builds with VITE_PB_URL, restarts systemd services)
- **Never deploy without explicit permission** (see feedback_deployment_control in memory)
- Production uses .env.production for secrets; keep sensitive data out of git

### Production URLs
- **Chef-App:** http://192.168.178.106:3001
- **Mitarbeiter-App:** http://192.168.178.106:3001/ma/
- **PocketBase Admin:** http://192.168.178.106:8092/_/ (or https://pbtimes.robeserver.duckdns.org)
- **SSH Tunnel:** `ssh -L 3001:localhost:3001 server@192.168.178.106` then http://localhost:3001

### Testing
- Both apps use Vitest + React Testing Library
- Test files in `__tests__` or co-located with components
- Mock PocketBase in tests via test-setup.ts

### Styling
- Tailwind CSS + CVA for component variants
- Use `clsx` for conditional classes, `tailwind-merge` for class merging
- color theme centralized; rebuild after changes

### Git & Deployment
- Main branches: development (staging), main (production)
- Deploy script: `./deploy.sh` (runs from root)
- Use TypeScript strict mode; ESLint prevents common mistakes

## Database Rules (CRITICAL)

⚠️ **NEVER delete or overwrite the database** unless explicitly authorized by the user.

**Allowed:**
- ✅ Create new collections
- ✅ Add fields to collections
- ✅ Modify collection settings (API rules, indexes, etc.)
- ✅ Create, update, or delete individual records (via normal operations)
- ✅ Run migrations that add schema

**FORBIDDEN:**
- ❌ Delete databases files (data.db, auxiliary.db)
- ❌ Drop collections without explicit permission
- ❌ Mass delete user data
- ❌ Truncate or reset tables without authorization
- ❌ Any operation that loses existing data

**If data loss is needed:** User must explicitly say "you can delete [X]" or "reset the database" before proceeding.

## Superpowers Skills

Always use superpowers skills before any implementation:

- **superpowers:brainstorming** — Before any feature work or design changes
- **superpowers:systematic-debugging** — Before fixing bugs or test failures
- **superpowers:test-driven-development** — Before implementing features/bugfixes
- **superpowers:verification-before-completion** — Before claiming work is done
- **superpowers:requesting-code-review** — Before merging to main/development
- **superpowers:receiving-code-review** — When implementing review feedback

See skill documentation for full details. Skills ensure quality and structured approach to all work.

## Geplante Features & Bekannte Aufgaben

### 0. Gamification System — behoben in beiden Apps (2026-08-11)

✅ **STATUS: GELÖST** (Commits `3a6755c`, `130610f`, `7e60240`, `c74d7f4`, `f70c76a`, `1e31e91`)

**Mitarbeiter-App verifiziert:** Gamification läuft. Edelstein-Icon im Header, Sheet mit
vier Tabs (Verfügbar / Aktiv / Shop / Aktivität), Aufgaben werden geladen.
Shop ist korrekt leer (beide `gam_rewards` haben `status = 'draft'`, der Shop filtert
auf `active`).

**Ursache 0 — `sort: '-created'` scheiterte überall mit 400:**
Bei allen `gam_*`-Collections und bei `notifications` fehlten `created`/`updated`
im PocketBase-Schema. Bei den `gam_*` existierten die Spalten in SQLite (per direktem
`ALTER TABLE`), bei `notifications` gar nicht. PocketBase validiert `sort`/`filter`
gegen das **Schema**, nicht gegen die Tabelle → `400 invalid sort field "created"`.
Betraf: beide `NotificationBell`, `useActivityFeed`, `useAssignments`.
→ Fix: `1786453058_add_autodate_notifications.js` + `1786453200_add_autodate_gam_collections.js`

⚠️ **Wichtig für künftige Schema-Fixes dieser Art:** `fields.add()` allein genügt nicht,
wenn die Spalte schon existiert — PocketBase legt die Tabelle beim Schema-Save neu an und
scheitert an `duplicate column name`. **Das Admin-UI scheitert genauso** (gleicher
Code-Pfad, verifiziert). Nötig ist: Werte sichern → Spalten droppen → Felder als `autodate`
anlegen → Werte per raw SQL zurückschreiben.

**Ursache 1 — Toggle/Schreibzugriffe schlugen stumm fehl (404):**

**Ursache 1 — Toggle/Schreibzugriffe schlugen stumm fehl (404):**
Alle `gam_*`-Collections nutzten die veraltete PocketBase-v0.22-Syntax
`@request.auth.record.role`. Ab v0.23 existiert die `.record`-Zwischenstufe nicht mehr —
der Ausdruck resolviert zu NULL, matcht nie, und PocketBase antwortet auf Schreib-Requests
mit `404 "sql: no rows in result set"` statt `403`.
Alle übrigen Collections des Projekts nutzten bereits `@request.auth.role`.
→ Fix: `pb_migrations/1786446439_fix_gam_auth_rule_syntax.js` (17 Rules, 6 Collections, nur API-Rules)

**Ursache 2 — irreführende Fehlermeldung trotz geladener Daten:**
PocketBase-SDK-Auto-Cancellation setzte den `error`-State, obwohl die Daten erfolgreich
geladen wurden. Fehler wird nun nur noch angezeigt, wenn tatsächlich keine Daten vorliegen.

**Verifiziert:** Toggle an → aus → an, `enabled` wird persistiert, null 404er in den PB-Logs.

**Merke für künftige Migrationen:** Auth-Rules immer `@request.auth.role` schreiben,
niemals `@request.auth.record.role`.

---

### 0b. Auth & SSO — behoben (2026-08-11, Commit `c74d7f4`)

**Ursache — Auto-Cancellation warf eingeloggte User raus:**
`refresh()` in **beiden** Auth-Stores behandelte jeden Fehler als Auth-Fehler und rief
`pb.authStore.clear()`. Überlappen zwei `authRefresh()`-Calls, bricht das SDK den älteren
ab (`isAbort`) — und dieser AbortError loggte einen User mit gültigem Token aus.
Die Mitarbeiter-App löste das bei **jedem** Laden aus: `main.tsx` refreshte beim
Modul-Load, `App.tsx` nochmal im `useEffect`, was StrictMode auf drei parallele Calls
verdoppelt. SSO nach `/ma/` landete darum immer auf `/login`.
Dieselbe Ursache erklärt, warum direkte Admin-URLs in der Chef-App aufs Dashboard
zurücksprangen.
→ Fix: `isAbort`-Guard in `refresh()` (beide `stores/auth.ts`), doppelter Aufruf entfernt.

**Zusätzlich — Router-`basename` fehlte in der Mitarbeiter-App:**
Ohne ihn matchte `/ma/` keine Route, die Catch-all schrieb die URL auf `/` um, und der
nächste Reload lieferte von dort die **Chef-App**.
→ Fix: `<BrowserRouter basename={import.meta.env.BASE_URL}>` in `mitarbeiter-app/src/App.tsx`

**Ursache — `/ma/`-Dev-Proxy war tot** (Commit `7e60240`):
`tsconfig.node.json` hatte `composite: true` ohne `outDir`, also legte `tsc -b` (Teil von
`npm run build`) ein `vite.config.js` neben die `.ts` — und **Vite lädt `.js` VOR `.ts`**.
Das kompilierte Artefakt kannte den `server.proxy`-Block nicht.
→ Fix: `outDir` auf `node_modules/.tmp`, Artefakte entfernt. `noEmit` geht hier nicht (TS6310).

⚠️ **SSO funktioniert nur bei gleichem Origin.** `localStorage` ist port-gebunden:
- ✅ `localhost:5173` (Chef-App) + `localhost:5173/ma/` (MA-App via Proxy) → Token geteilt
- ❌ `localhost:5174` direkt → eigener `localStorage`, kein SSO
Immer `localhost:5173/ma/` nutzen; 5174 ist nur das interne Proxy-Ziel.

**Merke:** `localStorage.removeItem('pocketbase_auth')` allein loggt **nicht** aus —
`pb.authStore` hält den Token im Speicher und schreibt ihn zurück.

---

### 0c. Offene TODOs aus der Gamification-Session (2026-08-11)

**TODO 3 — Test-Artefakte aufräumen (wenn Gamification final stabil):**
- `chef-app/src/components/Gamification/GamificationTaskListSimple.tsx`
- `chef-app/src/pages/Admin/GameTasksTest.tsx` + Route `/admin/gamification/tasks/test`
- `chef-app/public/test-gamification.html`

**TODO 4 — 14-stellige Record-IDs** (Schema verlangt 15) in `gam_settings` und
`gam_assignments`. Aktuell unkritisch (Updates funktionieren), aber Ursache klären —
vermutlich per Direct-SQL-Insert oder `scripts/create-gamification-collections.mjs`
entstanden. Passt zum Befund, dass auch die `created`-Spalten per direktem SQL kamen.

**TODO 5 — `useGamificationEnabled` braucht denselben `isAbort`-Guard:**
`mitarbeiter-app/src/hooks/useGamificationEnabled.ts:24-27` loggt bei Auto-Cancellation
einen Fehler und fällt auf `enabled: false` zurück. Aktuell harmlos (der erste Load
gewinnt), aber dasselbe Muster wie der Auth-Bug. Gleiches gilt für die übrigen
Gamification-Hooks mit `catch`-Blöcken.

**TODO 6 — `pb_hooks/gamification.pb.js` ist durchgängig für PocketBase v0.22 geschrieben.**
⚠️ **Systematischer Befund, gleiche Wurzel wie die Auth-Rules:** In der Datei fehlt
überall `e.next()`. Ab v0.23 bricht ein `onRecord*Request`-Hook ohne diesen Aufruf die
Kette ab — **nichts wird gespeichert, die API antwortet mit 200 und leerem Body**
(in den PB-Logs sichtbar als `status: 0`).

Behoben ist nur Hook 1 (`gam_assignments` create, Commit `59c3afa`) — das war der
„Annehmen"-Button. Offen:
- Zeile ~128 `onRecordCreateRequest` (`gam_submissions`) → **Einreichen funktioniert nicht**
- Zeile ~218 `onRecordUpdateRequest` (`gam_submissions`) → Genehmigen/Ablehnen
- Zeile ~338 `onRecordUpdateRequest` (`gam_orders`) → Prämien-Freigabe

Bei den beiden Update-Hooks ist Vorsicht nötig: sie speichern `e.record` **selbst** per
`txApp.save()`. Ein blindes `e.next()` würde doppelt speichern (bei `gam_submissions`
approve auch die Punktevergabe). Diese zwei brauchen einen eigenen, sorgfältigen Durchgang.
Zusatzbefund: bei `status = 'rejected'` speichert Hook 3 den Record gar nicht — die
Status-Änderung dürfte dort verloren gehen.

**Merke:** `onRecordAfter*Success`-Hooks (die übrigen Dateien in `pb_hooks/`) brauchen
kein `e.next()`, deshalb funktionieren Push-Notifications & Co. unauffällig.

---

### 1. Dienstplan- & Login-Bugfixes (`docs/superpowers/plans/2026-08-06-dienstplan-login-bugfixes.md`)

**Status:** Nicht erledigt

**Tasks:**
- **Task 1:** `shift_plans`-400-Fehler beim automatischen Anlegen beheben
  - Files: `chef-app/src/pages/Dienstplan.tsx:98-121`
  - Kontext: `getFirstListItem` mit fehlerhaftem Filter führt zu doppeltem `create()` bei StrictMode-Doppelmount
  - Lösung: Exakter Filter (`=` statt `~`), expliziter 404-Check, `cancelled`-Flag gegen Race-Conditions
  
- **Task 2:** React-Warnung "Cannot update BrowserRouter while rendering Login" beheben
  - Files: `chef-app/src/pages/Login.tsx:1-20`
  - Kontext: Imperativer `navigate()` im Render-Pfad statt deklarativer `<Navigate>`-Komponente
  - Lösung: `useNavigate()` entfernen, stattdessen `<Navigate to="/" replace />` zurückgeben

**Priorität:** Mittel (Fehler sichtbar im Dev-Log, aber nicht Critical für Produktion)

---

### 2. Unified-Origin-Migration (`docs/superpowers/plans/2026-08-06-unified-origin-migration.md`)

**Status:** Nicht erledigt

**Tasks:**
- **Task 0:** Dev-Umgebung auf den erwarteten Zustand bringen
  - PocketBase auf Port 8091 starten (nicht 8095)
  - Health-Check durchführen
  
- **Task 1:** SSO Auth-Refresh + Auto-Logout verifizieren und committen
  - Files: `chef-app/src/lib/pb.ts`, `mitarbeiter-app/src/lib/pb.ts`, `App.tsx` (both), `stores/auth.ts` (both)
  - Kontext: Automatisches Logout bei ungültigem Token, RangeError-Rekursions-Fix zwischen `onChange`/`logout`/`clear()`
  - Lösung: `isValid`-Guard in `logout()` hinzufügen um Rekursion zu durchbrechen
  
- **Task 2:** Unified Server (Port 3001, `/ma/`-Pfad) verifizieren und committen
  - Files: `serve.mjs`, `chef-app/vite.config.ts/.js`, `mitarbeiter-app/vite.config.ts`, `deploy.sh`
  - Kontext: Beide Apps auf einem Port+Origin (Chef-App Root, Mitarbeiter-App unter `/ma/`)
  - Lösung: Express-Server mit Path-Routing, Dev-Proxy für `/ma/` auf Port 5174
  
- **Task 3:** Migration `time_entries` auf `datetime` verifizieren und committen
  - Files: `pb_migrations/1779358911_created_time_entries.js`
  - Kontext: Feldtyp-Wechsel von `date` auf `datetime` für ISO-8601-Timestamps
  - Lösung: PocketBase neu starten, Migration wird automatisch angewendet
  
- **Task 4:** Vorbereitete Nebenfixes sichten und einzeln committen
  - Offene Schritte: 3/4 noch offen
  - Schritt 1: `chef-app/src/pages/Dashboard.tsx` — doppelte Mitarbeiter-Abfrage entfernen
  - Schritt 2: `chef-app/src/pages/Mitarbeiterliste.tsx` — Suche mit 300ms Debounce
  - Schritt 3: `mitarbeiter-app/src/pages/Dashboard.tsx` — Stempeluhr-Anzeige vereinfacht (nur aktuelle Session)
  - Schritt 4: Entfällt (Dienstplan-Real-Time-Subscription bereits erledigt in Commit `9d5d078`)

**Priorität:** Mittel (Architektur-Verbesserung, notwendig für Production-Deployment auf gemeinsamen Server)
