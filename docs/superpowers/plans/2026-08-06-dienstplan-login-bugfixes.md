# Dienstplan- & Login-Bugfixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Task 1 ist ein Bugfix — beim Ausführen zusätzlich superpowers:systematic-debugging beachten**, da die Root Cause des 400-Fehlers noch nicht abschließend verifiziert ist (nur eine begründete Hypothese, siehe Kontext).

**Goal:** Die beiden im letzten Dev-Log (`chef-app/chef-app.log`) sichtbaren Fehler beheben: den `400`-Fehler beim automatischen Anlegen eines `shift_plans`-Datensatzes im Dienstplan, und die React-Warnung "Cannot update a component (`BrowserRouter`) while rendering a different component (`Login`)".

**Architektur:** Zwei unabhängige, kleine Fixes in bestehenden Komponenten — kein neuer Code, keine neuen Abhängigkeiten.

**Tech Stack:** React 19 + react-router-dom, PocketBase JS SDK ^0.26.9, Vitest + React Testing Library.

## Global Constraints

- **Kein `git push`** — Commits bleiben lokal.
- PocketBase muss auf Port 8091 laufen (siehe Task 0 im Unified-Origin-Plan — falls der noch nicht ausgeführt wurde, zuerst dort Task 0 erledigen).
- Bestehende Tests dürfen durch die Fixes nicht brechen; neue Regressionstests sind Pflichtbestandteil beider Tasks.

---

### Task 1: `shift_plans`-400-Fehler beim automatischen Anlegen beheben

**Files:**
- Modify: `chef-app/src/pages/Dienstplan.tsx:98-121`
- Test: `chef-app/src/pages/__tests__/Dienstplan.test.tsx` (ggf. neu anlegen, falls noch nicht vorhanden — prüfen mit `find chef-app/src -iname "Dienstplan.test*"`)

**Interfaces:**
- Konsumiert: `pb.collection('shift_plans').getFirstListItem<ShiftPlan>()`, `.create<ShiftPlan>()` (PocketBase SDK)
- Produziert: `plan: ShiftPlan | null` (State), von nachfolgendem Code zum Laden der `shift_entries` verwendet

**Kontext (Stand der Untersuchung, noch nicht final verifiziert):**

Der Dev-Log zeigt wiederholt:
```
18:49:30 [vite] ClientResponseError 400: Failed to create record.
 > src/pages/Dienstplan.tsx:104:24
```

Der aktuelle Code (`Dienstplan.tsx:98-112`):

```tsx
useEffect(() => {
  setPlanLoading(true)
  pb.collection('shift_plans')
    .getFirstListItem<ShiftPlan>(`week_start ~ "${weekStartStr}"`, { requestKey: null })
    .then(p => { setPlan(p); return p })
    .catch(async () => {
      const created = await pb.collection('shift_plans').create<ShiftPlan>({
        week_start:  weekStartStr,
        week_end:    format(addDays(weekStart, days.length - 1), 'yyyy-MM-dd'),
        status:      'draft',
        created_by:  (pb.authStore.model?.id ?? '') as string,
      }, { requestKey: null })
      setPlan(created)
      return created
    })
    .then(async p => { /* shift_entries laden */ })
    .finally(() => setPlanLoading(false))
}, [weekStartStr, weekStart, days.length])
```

Geprüfte, aber **ausgeschlossene** Ursachen (bereits verifiziert, nicht erneut prüfen):
- `pb.authStore.model` ist in SDK ^0.26.9 kein totes Feld — es existiert als deprecated Alias für `.record` und liefert weiterhin den eingeloggten User (`node_modules/pocketbase/dist/pocketbase.es.d.mts:181`).
- `shift_plans`-Migration hat **keinen** Unique-Index auf `week_start` (`pb_migrations/1779887367_created_shift_plans.js:87` → `"indexes": []`) — ein doppeltes Anlegen würde also nicht per Unique-Constraint mit 400 abgewiesen.

**Offene Hypothesen, die als Erstes per systematic-debugging geprüft werden müssen:**
1. Der Filter `week_start ~ "${weekStartStr}"` nutzt den `~`-Contains-Operator auf einem `"date"`-Feld (`type: "date"` laut Migration). PocketBase könnte das Feld intern anders formatieren als der reine `yyyy-MM-dd`-String aus `weekStartStr`, wodurch `getFirstListItem` fälschlich immer in den `.catch()`-Zweig läuft und **jedes Mal neu zu erstellen versucht** — bei React-StrictMode-Doppelmount in Dev führt das zu zwei parallelen Create-Versuchen für dieselbe Woche kurz hintereinander.
2. `.catch()` fängt **jeden** Fehler von `getFirstListItem` ab, nicht nur "404 not found" — ein anderer Fehler (z. B. Malformed-Filter) würde ebenfalls stillschweigend in den Create-Zweig laufen und dort ggf. mit inkonsistenten Daten scheitern.
3. Effect-Dependency `[weekStartStr, weekStart, days.length]` — `weekStart` ist vermutlich ein `Date`-Objekt mit neuer Referenz bei jedem Render, was den Effect öfter feuern lässt als nötig und Race-Conditions zwischen mehreren parallelen `create()`-Aufrufen begünstigt.

- [ ] **Schritt 1: Exakten Fehlerkörper reproduzieren**

Dev-Server + PocketBase auf 8091 starten (siehe Unified-Origin-Plan Task 0), Dienstplan-Seite im Browser öffnen, DevTools → Network → die fehlschlagende `POST /api/collections/shift_plans/records`-Anfrage öffnen und den **vollständigen Response-Body** lesen (PocketBase liefert bei 400 ein `data`-Objekt mit dem konkreten Feldnamen und der Fehlermeldung, z. B. `{"data":{"week_start":{"code":"...","message":"..."}}}`).

Alternativ per `curl`, nachdem man sich einen gültigen Auth-Token besorgt hat:

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:8091/api/collections/users/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{"identity":"<gf-email>","password":"<passwort>"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl -s -X POST http://127.0.0.1:8091/api/collections/shift_plans/records \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"week_start":"2026-08-03","week_end":"2026-08-09","status":"draft","created_by":"<user-id>"}' \
  | python3 -m json.tool
```

- [ ] **Schritt 2: Root Cause anhand des Response-Bodys festlegen**

Abgleich mit den drei Hypothesen oben. Erst nach diesem Schritt den konkreten Fix in Schritt 3 wählen — nicht vorab implementieren.

- [ ] **Schritt 3: Fix implementieren (Grundmuster, exakte Feldnamen je nach Schritt-2-Befund anpassen)**

Unabhängig vom exakten Feldfehler ist der Code robuster zu machen: explizite 404-Prüfung statt "jeder Fehler → create", plus stabile Effect-Dependency:

> **Nachtrag (Umsetzung):** Der `week_start = "${weekStartStr}"`-Filter im Beispielcode unten ist überholt. Per curl während der Umsetzung verifiziert: `=` matcht nie, da PocketBase `date`-Felder mit vollem Zeitstempel-Anteil speichert (z. B. `"2026-08-03 00:00:00.000Z"`), während `weekStartStr` nur `"yyyy-MM-dd"` ist — jeder Seitenaufruf hätte einen neuen Duplikat-Plan angelegt. Der ausgelieferte Code behält daher bewusst den Contains-Operator `~` bei. Quelle der Wahrheit ist die tatsächliche Implementierung in `chef-app/src/pages/Dienstplan.tsx` (inkl. Kommentar dort), nicht dieser Beispielcode.

```tsx
useEffect(() => {
  let cancelled = false
  setPlanLoading(true)

  async function loadOrCreatePlan() {
    try {
      const existing = await pb.collection('shift_plans')
        .getFirstListItem<ShiftPlan>(`week_start = "${weekStartStr}"`, { requestKey: null })
      if (!cancelled) setPlan(existing)
      return existing
    } catch (err) {
      if ((err as { status?: number }).status !== 404) throw err
      const created = await pb.collection('shift_plans').create<ShiftPlan>({
        week_start: weekStartStr,
        week_end:   format(addDays(weekStart, days.length - 1), 'yyyy-MM-dd'),
        status:     'draft',
        created_by: pb.authStore.record?.id ?? '',
      }, { requestKey: null })
      if (!cancelled) setPlan(created)
      return created
    }
  }

  loadOrCreatePlan()
    .then(async p => {
      if (cancelled) return
      const ents = await pb.collection('shift_entries').getFullList<ShiftEntry>({
        filter: `plan_id = "${p.id}"`,
        requestKey: null,
      })
      setEntries(ents)
    })
    .finally(() => { if (!cancelled) setPlanLoading(false) })

  return () => { cancelled = true }
}, [weekStartStr, weekStart, days.length])
```

Änderungen gegenüber Original: (a) `~` → `=` im Filter (exakter Vergleich statt Contains), (b) `.catch()` prüft `status !== 404` und wirft alle anderen Fehler weiter statt sie stillschweigend als "nicht gefunden" zu behandeln, (c) `pb.authStore.model` → `pb.authStore.record` (Konsistenz mit dem bereits migrierten Muster in `MitarbeiterModal.tsx:803`), (d) `cancelled`-Flag verhindert `setState` nach Unmount/Re-Run bei StrictMode-Doppelmount.

- [ ] **Schritt 4: Manuell verifizieren**

Dienstplan-Seite für eine neue, noch nie geöffnete Kalenderwoche öffnen. Erwartet: genau **eine** `POST`-Anfrage im Network-Tab (nicht zwei), Status 200, kein Konsolenfehler. Seite neu laden — erwartet: `GET`-Anfrage findet den Plan jetzt, kein erneutes `POST`.

- [ ] **Schritt 5: Regressionstest schreiben**

Falls `chef-app/src/pages/__tests__/Dienstplan.test.tsx` nicht existiert, neu anlegen; falls vorhanden, ergänzen:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockCreate = vi.fn()
const mockGetFirstListItem = vi.fn()

vi.mock('../../lib/pb', () => ({
  pb: {
    authStore: { record: { id: 'user123' } },
    collection: (name: string) => {
      if (name === 'shift_plans') {
        return { getFirstListItem: mockGetFirstListItem, create: mockCreate }
      }
      return { getFullList: vi.fn().mockResolvedValue([]) }
    },
  },
}))

import Dienstplan from '../Dienstplan'

describe('Dienstplan — Plan-Anlage', () => {
  beforeEach(() => {
    mockCreate.mockClear()
    mockGetFirstListItem.mockReset()
  })

  it('legt bei fehlendem Plan (404) genau einmal einen neuen shift_plans-Datensatz an', async () => {
    mockGetFirstListItem.mockRejectedValue({ status: 404 })
    mockCreate.mockResolvedValue({ id: 'plan1', week_start: '2026-08-03', week_end: '2026-08-09', status: 'draft', created_by: 'user123' })

    render(<MemoryRouter><Dienstplan /></MemoryRouter>)

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1))
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: 'user123' }),
      expect.anything(),
    )
  })

  it('wirft einen Nicht-404-Fehler weiter statt einen Plan anzulegen', async () => {
    mockGetFirstListItem.mockRejectedValue({ status: 500, message: 'Server error' })

    render(<MemoryRouter><Dienstplan /></MemoryRouter>)

    await waitFor(() => expect(mockGetFirstListItem).toHaveBeenCalled())
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
```

- [ ] **Schritt 6: Tests ausführen**

```bash
cd chef-app && npm run test:run -- Dienstplan
```

Erwartet: PASS, inklusive der beiden neuen Fälle.

- [ ] **Schritt 7: Commit**

```bash
git add src/pages/Dienstplan.tsx src/pages/__tests__/Dienstplan.test.tsx
git commit -m "fix(dienstplan): 400-Fehler beim automatischen Plan-Anlegen beheben (exakter Filter, 404-Check, Race-Guard)"
```

---

### Task 2: React-Warnung "Cannot update BrowserRouter while rendering Login" beheben

**Files:**
- Modify: `chef-app/src/pages/Login.tsx:1-20`
- Modify: `chef-app/src/pages/__tests__/Login.test.tsx`

**Interfaces:**
- Konsumiert: `useAuthStore(s => s.user)` (Zustand-Store, liefert `User | null`)
- Produziert: keine neuen Exports — reines internes Rendering-Verhalten

**Kontext:** `Login.tsx:17-20` ruft `navigate('/', { replace: true })` **direkt im Funktionskörper** der Komponente auf (nicht in einem Event-Handler oder `useEffect`):

```tsx
if (user && (user.role === 'gf' || user.role === 'sl')) {
  navigate('/', { replace: true })
  return null
}
```

Das ist die exakte Ursache der geloggten Warnung — `navigate()` löst intern ein `setState` in `BrowserRouter` aus, während `Login` gerade selbst rendert. React erlaubt State-Updates an anderen Komponenten nicht während des Renderns der aktuellen Komponente. Der idiomatische Fix in react-router-dom ist, für deklarative Redirects während des Renderns die `<Navigate>`-Komponente statt des imperativen `navigate()`-Aufrufs zu verwenden — `<Navigate>` kapselt den Redirect intern korrekt (kein direkter `setState`-Aufruf im Render-Pfad der aufrufenden Komponente).

Zum Vergleich: `mitarbeiter-app/src/pages/Login.tsx` und `chef-app/src/components/Layout/Sidebar.tsx` rufen `navigate()` bereits korrekt nur innerhalb von Event-Handlern (`handleSubmit`, `handleLogout`) auf — dort besteht das Problem nicht, keine Änderung nötig.

- [ ] **Schritt 1: Regressionstest zuerst schreiben (RED)**

In `chef-app/src/pages/__tests__/Login.test.tsx` ergänzen — mockt einen bereits eingeloggten `gf`-User und prüft, dass **keine** React-Warnung über State-Updates während des Renderns auftritt:

```tsx
it('redirected einen eingeloggten GF-User ohne React-Render-Warnung', async () => {
  vi.doMock('../../stores/auth', () => ({
    useAuthStore: (selector: (s: { user: { role: string }; isLoading: boolean; login: typeof mockLogin }) => unknown) =>
      selector({ user: { role: 'gf' }, isLoading: false, login: mockLogin }),
  }))
  const { default: LoginWithUser } = await import('../Login')

  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  render(<MemoryRouter><LoginWithUser /></MemoryRouter>)

  const hadRenderWarning = errorSpy.mock.calls.some(call =>
    String(call[0]).includes('Cannot update a component')
  )
  expect(hadRenderWarning).toBe(false)

  errorSpy.mockRestore()
  vi.doUnmock('../../stores/auth')
})
```

- [ ] **Schritt 2: Test ausführen, Fehlschlag bestätigen**

```bash
cd chef-app && npm run test:run -- Login
```

Erwartet: FAIL — `hadRenderWarning` ist `true`, da der aktuelle Code die Warnung auslöst.

- [ ] **Schritt 3: Fix implementieren (GREEN)**

```tsx
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { Button } from '../components/ui/button'
import { Input }  from '../components/ui/input'
import { Label }  from '../components/ui/label'

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const login = useAuthStore(s => s.login)
  const isLoading = useAuthStore(s => s.isLoading)
  const user = useAuthStore(s => s.user)

  if (user && (user.role === 'gf' || user.role === 'sl')) {
    return <Navigate to="/" replace />
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

  // ... Rest der Komponente unverändert (JSX-Formular)
```

Wichtig: `useNavigate` und `const navigate = useNavigate()` vollständig entfernen (Import + Variable) — sonst meldet ESLint `navigate` als unbenutzt, da es nach dem Fix nirgends mehr im Handler gebraucht wird.

- [ ] **Schritt 4: Test erneut ausführen, Erfolg bestätigen**

```bash
cd chef-app && npm run test:run -- Login
```

Erwartet: PASS, `hadRenderWarning` ist `false`.

- [ ] **Schritt 5: Vollständige Test-Suite + Lint laufen lassen**

```bash
npm run test:run
npm run lint
```

Erwartet: alles grün (kein unbenutzter Import mehr).

- [ ] **Schritt 6: Manuell im Browser verifizieren**

Als `gf`-User einloggen, Browser-Konsole beobachten. Erwartet: keine Warnung mehr über `BrowserRouter`/`Login`.

- [ ] **Schritt 7: Commit**

```bash
git add src/pages/Login.tsx src/pages/__tests__/Login.test.tsx
git commit -m "fix(login): Redirect für eingeloggte User über <Navigate> statt navigate() im Render-Pfad"
```

---

## Self-Review

- **Spec-Abdeckung:** Beide im Dev-Log dokumentierten Fehler sind je einem Task zugeordnet.
- **Placeholder-Scan:** Task 1 enthält bewusst offene Hypothesen statt eines vorschnellen Fixes, da die Root Cause noch nicht per Log/Response-Body verifiziert ist — das ist beabsichtigte Debugging-Reihenfolge (systematic-debugging), kein Platzhalter im Sinne von "TODO"; Schritt 3 liefert trotzdem vollständigen, direkt einsetzbaren Beispielcode als Ausgangsbasis.
- **Typ-Konsistenz:** `pb.authStore.record` (Task 1) entspricht dem bereits im Code vorhandenen Muster aus `MitarbeiterModal.tsx:803`, keine Neuerfindung.
- Kein Schritt enthält `git push`.
