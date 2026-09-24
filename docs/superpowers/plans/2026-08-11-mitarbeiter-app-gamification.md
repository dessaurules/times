# Gamification in der Mitarbeiter-App lauffähig machen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Auth-Race-Condition beheben, die verhindert, dass ein per SSO angemeldeter Benutzer die Mitarbeiter-App betreten kann — und anschließend die Gamification-Funktionalität in der Mitarbeiter-App end-to-end verifizieren.

**Architecture:** Beide Apps behandeln im `refresh()` des Auth-Stores jeden Fehler als Auth-Fehler und rufen `pb.authStore.clear()`. Startet ein zweiter `authRefresh()` parallel, bricht das PocketBase-SDK den ersten per Auto-Cancellation ab (`ClientResponseError.isAbort === true`) — der Store leert daraufhin den User-State, obwohl der Token gültig ist. Der Fix führt einen `isAbort`-Guard ein und entfernt den redundanten zweiten Aufruf in der Mitarbeiter-App.

**Tech Stack:** React 19, Zustand, PocketBase JS SDK 0.26.9, Vitest + React Testing Library, Vite 8

## Global Constraints

- PocketBase JS SDK ist **0.26.9**. `pb.authStore.record` ist die aktuelle API; `.model` existiert noch als Deprecation und wird hier nicht angefasst.
- Auth-Rules in Migrationen immer `@request.auth.role` schreiben, **niemals** `@request.auth.record.role` (letzteres ist v0.22-Syntax und matcht in v0.38 nie).
- Die Mitarbeiter-Rolle heißt in der Datenbank **`mitarbeiter`**, nicht `ma`. (CLAUDE.md dokumentiert das falsch — siehe Task 4.)
- Datenbank: **niemals** löschen oder überschreiben. Vor jeder Schema-Änderung ein Backup mit `cp pb_data/data.db pb_data/data.db.backup.$(date +%Y%m%d_%H%M%S)`.
- **Nie deployen** ohne ausdrückliche Erlaubnis des Nutzers.
- Dev-Umgebung: PocketBase auf Port 8091, chef-app auf 5173, mitarbeiter-app auf 5174 (erreichbar unter `http://localhost:5173/ma/`).

---

## File Structure

| Datei | Verantwortung | Änderung |
|---|---|---|
| `mitarbeiter-app/src/stores/auth.ts` | Auth-State der MA-App | `refresh()` erhält `isAbort`-Guard |
| `mitarbeiter-app/src/hooks/__tests__/authStore.test.ts` | Test für obiges | **neu** |
| `mitarbeiter-app/src/main.tsx` | App-Bootstrap | redundanten `refresh()`-Aufruf entfernen |
| `chef-app/src/stores/auth.ts` | Auth-State der Chef-App | derselbe `isAbort`-Guard |
| `chef-app/src/__tests__/authStore.test.ts` | Test für obiges | **neu** |
| `CLAUDE.md` | Projektdoku | Rollen-Namen korrigieren, TODOs aktualisieren |

---

### Task 1: `isAbort`-Guard im Auth-Store der Mitarbeiter-App

Der Kern-Fix. Ein abgebrochener Request ist kein Auth-Fehler und darf den User nicht ausloggen.

**Files:**
- Modify: `mitarbeiter-app/src/stores/auth.ts:34-43`
- Test: `mitarbeiter-app/src/hooks/__tests__/authStore.test.ts` (neu)

**Interfaces:**
- Consumes: `pb` aus `mitarbeiter-app/src/lib/pb.ts`, Typ `User` aus `@shared/types`
- Produces: `useAuthStore` mit unverändertem Interface (`user`, `isLoading`, `login`, `logout`, `refresh`). Nur das Fehlerverhalten von `refresh()` ändert sich: bei `isAbort === true` bleibt der State unangetastet.

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

Neue Datei `mitarbeiter-app/src/hooks/__tests__/authStore.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/pb', () => ({
  pb: {
    authStore: { isValid: true, clear: vi.fn() },
    collection: vi.fn().mockReturnValue({ authRefresh: vi.fn() }),
  },
}))

import { pb } from '../../lib/pb'
import { useAuthStore } from '../../stores/auth'

function getCollectionMock() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (pb.collection as any)()
}

describe('useAuthStore.refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: { id: 'u1', role: 'mitarbeiter' } as never })
  })

  it('behaelt den User bei Auto-Cancellation (isAbort)', async () => {
    // Das SDK bricht den vorherigen Request ab, wenn ein zweiter mit
    // gleichem requestKey startet. Das ist kein Auth-Fehler.
    getCollectionMock().authRefresh.mockRejectedValue(
      Object.assign(new Error('The request was autocancelled'), { isAbort: true })
    )

    await useAuthStore.getState().refresh()

    expect(useAuthStore.getState().user).not.toBeNull()
    expect(pb.authStore.clear).not.toHaveBeenCalled()
  })

  it('loggt bei einem echten Auth-Fehler aus', async () => {
    getCollectionMock().authRefresh.mockRejectedValue(
      Object.assign(new Error('Failed to authenticate'), { status: 401 })
    )

    await useAuthStore.getState().refresh()

    expect(useAuthStore.getState().user).toBeNull()
    expect(pb.authStore.clear).toHaveBeenCalled()
  })

  it('uebernimmt den frischen Record bei Erfolg', async () => {
    getCollectionMock().authRefresh.mockResolvedValue({
      record: { id: 'u2', role: 'mitarbeiter' },
    })

    await useAuthStore.getState().refresh()

    expect(useAuthStore.getState().user?.id).toBe('u2')
  })
})
```

- [ ] **Step 2: Test laufen lassen und Fehlschlag bestätigen**

Run: `cd mitarbeiter-app && npx vitest run src/hooks/__tests__/authStore.test.ts`
Expected: FAIL — der erste Test schlägt fehl, weil `refresh()` bei `isAbort` aktuell `clear()` aufruft und `user` auf `null` setzt.

- [ ] **Step 3: Den Guard implementieren**

In `mitarbeiter-app/src/stores/auth.ts` den `refresh()`-Block ersetzen:

```ts
  // Holt die aktuellen User-Daten frisch von PocketBase (wichtig nach Änderungen wie employee-Verknüpfung)
  refresh: async () => {
    if (!pb.authStore.isValid) return
    try {
      const fresh = await pb.collection('users').authRefresh()
      set({ user: fresh.record as unknown as User })
    } catch (err) {
      // Auto-Cancellation ist kein Auth-Fehler: das SDK bricht den laufenden
      // Request ab, sobald ein zweiter mit gleichem requestKey startet.
      // Ohne diesen Guard loggt ein paralleler Refresh den User aus.
      if ((err as { isAbort?: boolean })?.isAbort) return
      pb.authStore.clear()
      set({ user: null })
    }
  },
```

- [ ] **Step 4: Tests laufen lassen und Erfolg bestätigen**

Run: `cd mitarbeiter-app && npx vitest run src/hooks/__tests__/authStore.test.ts`
Expected: PASS — alle drei Tests grün.

- [ ] **Step 5: Gesamte Testsuite laufen lassen (keine Regression)**

Run: `cd mitarbeiter-app && npm run test:run`
Expected: Alle Tests grün.

- [ ] **Step 6: Commit**

```bash
git add mitarbeiter-app/src/stores/auth.ts mitarbeiter-app/src/hooks/__tests__/authStore.test.ts
git commit -m "fix(mitarbeiter-app): Treat autocancelled authRefresh as non-fatal

The PocketBase SDK aborts an in-flight request when a second one starts
with the same requestKey. refresh() caught that AbortError like any auth
failure and called authStore.clear(), logging out a user whose token was
perfectly valid — which is why SSO into /ma/ always landed on /login."
```

---

### Task 2: Redundanten `refresh()`-Aufruf im Bootstrap entfernen

`main.tsx` ruft `refresh()` beim Modul-Load auf, `App.tsx` nochmal im `useEffect` — unter `<StrictMode>` also drei parallele Calls. Task 1 macht das ungefährlich, aber die überflüssigen Requests bleiben.

**Files:**
- Modify: `mitarbeiter-app/src/main.tsx:7-8`

**Interfaces:**
- Consumes: nichts Neues.
- Produces: `main.tsx` ohne Auth-Seiteneffekt beim Modul-Load. `App.tsx:15-20` bleibt die einzige Stelle, die den initialen Refresh auslöst.

- [ ] **Step 1: Den Aufruf entfernen**

In `mitarbeiter-app/src/main.tsx` diese beiden Zeilen löschen:

```ts
// User-Daten beim Start auffrischen (employee-Feld, Rolle etc.)
useAuthStore.getState().refresh()
```

Und den dadurch ungenutzten Import entfernen:

```ts
import { useAuthStore } from './stores/auth'
```

Die Datei lautet danach vollständig:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 2: Lint prüfen (kein ungenutzter Import)**

Run: `cd mitarbeiter-app && npx tsc --noEmit`
Expected: Keine Fehler.

- [ ] **Step 3: Testsuite laufen lassen**

Run: `cd mitarbeiter-app && npm run test:run`
Expected: Alle Tests grün.

- [ ] **Step 4: Commit**

```bash
git add mitarbeiter-app/src/main.tsx
git commit -m "refactor(mitarbeiter-app): Drop duplicate authRefresh on bootstrap

main.tsx refreshed at module load and App.tsx again in useEffect — under
StrictMode that is three parallel authRefresh calls. App.tsx is now the
single trigger."
```

---

### Task 3: Denselben Guard in der Chef-App

Die Chef-App hat denselben Bug in `refresh()`. Sie ruft ihn nur einmal auf, weshalb er seltener zuschlägt — er erklärt aber, warum dort die direkte URL-Eingabe (z.B. `/admin/gamification/settings`) aufs Dashboard umleitet statt die Zielseite zu laden.

**Files:**
- Modify: `chef-app/src/stores/auth.ts:34-43`
- Test: `chef-app/src/__tests__/authStore.test.ts` (neu)

**Interfaces:**
- Consumes: `pb` aus `chef-app/src/lib/pb.ts`, Typ `User` aus `@shared/types`
- Produces: `useAuthStore` mit unverändertem Interface (zusätzlich `isGF`, `isSL` — bleiben unangetastet).

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

Neue Datei `chef-app/src/__tests__/authStore.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/pb', () => ({
  pb: {
    authStore: { isValid: true, clear: vi.fn() },
    collection: vi.fn().mockReturnValue({ authRefresh: vi.fn() }),
  },
}))

import { pb } from '../lib/pb'
import { useAuthStore } from '../stores/auth'

function getCollectionMock() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (pb.collection as any)()
}

describe('useAuthStore.refresh (chef-app)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: { id: 'u1', role: 'gf' } as never })
  })

  it('behaelt den User bei Auto-Cancellation (isAbort)', async () => {
    getCollectionMock().authRefresh.mockRejectedValue(
      Object.assign(new Error('The request was autocancelled'), { isAbort: true })
    )

    await useAuthStore.getState().refresh()

    expect(useAuthStore.getState().user).not.toBeNull()
    expect(pb.authStore.clear).not.toHaveBeenCalled()
  })

  it('loggt bei einem echten Auth-Fehler aus', async () => {
    getCollectionMock().authRefresh.mockRejectedValue(
      Object.assign(new Error('Failed to authenticate'), { status: 401 })
    )

    await useAuthStore.getState().refresh()

    expect(useAuthStore.getState().user).toBeNull()
    expect(pb.authStore.clear).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Test laufen lassen und Fehlschlag bestätigen**

Run: `cd chef-app && npx vitest run src/__tests__/authStore.test.ts`
Expected: FAIL beim ersten Test — `user` ist `null`, `clear()` wurde aufgerufen.

- [ ] **Step 3: Den Guard implementieren**

In `chef-app/src/stores/auth.ts` den `refresh()`-Block ersetzen:

```ts
  refresh: async () => {
    if (!pb.authStore.isValid) return
    try {
      const fresh = await pb.collection('users').authRefresh()
      set({ user: fresh.record as unknown as User })
    } catch (err) {
      // Auto-Cancellation ist kein Auth-Fehler: das SDK bricht den laufenden
      // Request ab, sobald ein zweiter mit gleichem requestKey startet.
      if ((err as { isAbort?: boolean })?.isAbort) return
      pb.authStore.clear()
      set({ user: null })
    }
  },
```

- [ ] **Step 4: Tests laufen lassen und Erfolg bestätigen**

Run: `cd chef-app && npx vitest run src/__tests__/authStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Gesamte Testsuite laufen lassen**

Run: `cd chef-app && npm run test:run`
Expected: Alle Tests grün.

- [ ] **Step 6: Direkte URL-Navigation manuell prüfen**

Dev-Server müssen laufen (PocketBase 8091, chef-app 5173). Im Browser `http://localhost:5173/admin/gamification/settings` direkt aufrufen.
Expected: Die Gamification-Einstellungsseite lädt — **kein** Redirect aufs Dashboard.

- [ ] **Step 7: Commit**

```bash
git add chef-app/src/stores/auth.ts chef-app/src/__tests__/authStore.test.ts
git commit -m "fix(chef-app): Treat autocancelled authRefresh as non-fatal

Same defect as the mitarbeiter-app store: an aborted request cleared the
auth state. This is why entering an admin URL directly bounced back to the
dashboard instead of loading the page."
```

---

### Task 4: Gamification in der Mitarbeiter-App end-to-end verifizieren

Erst hier lässt sich die eigentliche Frage beantworten. Der Code ist vorhanden (`GamificationHeader`, `-Sheet`, `-TaskList`, `-Shop`, `-Feed`, `-Assignments` plus die Hooks `useGamificationEnabled`, `useUserPoints`, `useAssignments`, `useActivityFeed`), aber noch nie im angemeldeten Zustand geprüft worden.

**Voraussetzung:** Zugangsdaten für den Mitarbeiter-Testbenutzer `maria@test.de` (Rolle `mitarbeiter`, ID `t1gbfog8nb2dl90`). Das Passwort ist nicht bekannt — vom Nutzer erfragen oder von ihm im PocketBase-Admin setzen lassen. **Passwörter nicht selbst setzen.**

**Files:**
- Verify only (keine Änderungen vorgesehen; gefundene Defekte werden als eigene Tasks nachgetragen)

**Interfaces:**
- Consumes: die in Task 1–3 reparierte Auth-Kette.
- Produces: eine Befundliste; jeder Defekt wird mit Datei, Zeile und beobachtetem Verhalten dokumentiert.

- [ ] **Step 1: Ausgangslage herstellen**

```bash
sqlite3 pb_data/data.db "SELECT enabled FROM gam_settings;"
```
Expected: `1`. Falls `0`: in der Chef-App unter `/admin/gamification/settings` einschalten.

- [ ] **Step 2: Als Mitarbeiter anmelden**

`http://localhost:5173/ma/` öffnen, mit `maria@test.de` anmelden.
Expected: Das Dashboard der Mitarbeiter-App lädt.

- [ ] **Step 3: Gamification-Einstieg im Header prüfen**

Expected: Ein Edelstein-Icon (`Gem`, bernsteinfarben) mit Punkte-Badge ist im Header sichtbar. Erscheint es nicht, ist entweder `useGamificationEnabled` auf `false` oder `useUserPoints` wirft — Browser-Konsole prüfen.

- [ ] **Step 4: Das Gamification-Sheet öffnen**

Auf das Edelstein-Icon klicken.
Expected: Das Sheet öffnet mit seinen Tabs (Aufgaben, Shop, Feed, Zuweisungen).

- [ ] **Step 5: Jeden Tab einzeln prüfen**

Erwartete Datenlage (Stand 2026-08-11):

| Tab | Collection | Erwartung |
|---|---|---|
| Aufgaben | `gam_tasks` | 7 Einträge |
| Shop | `gam_rewards` | 2 Einträge |
| Feed | `gam_events` | leer — Leerzustand muss sauber aussehen, kein Fehler |
| Zuweisungen | `gam_assignments` | leer für diesen User (alle 3 Datensätze gehören GF-Usern) |

Für jeden Tab die Browser-Konsole auf Fehler prüfen und Netzwerk-Requests auf Status ≠ 200 durchsehen.

- [ ] **Step 6: Schreibpfad prüfen — Aufgabe annehmen**

Im Tab "Aufgaben" eine Aufgabe annehmen (`GamificationTaskList.tsx:57` legt einen `gam_assignments`-Datensatz an).
Expected: Kein Fehler; danach erscheint der Eintrag im Tab "Zuweisungen".

Verifikation in der Datenbank:
```bash
sqlite3 pb_data/data.db "SELECT user_id, status FROM gam_assignments WHERE user_id='t1gbfog8nb2dl90';"
```
Expected: Mindestens eine Zeile.

- [ ] **Step 7: Schreibpfad prüfen — Einreichung**

Zur angenommenen Aufgabe eine Einreichung abschicken (`GamificationAssignments.tsx:76` legt einen `gam_submissions`-Datensatz an).
Expected: Kein Fehler.

```bash
sqlite3 pb_data/data.db "SELECT user_id, status FROM gam_submissions WHERE user_id='t1gbfog8nb2dl90';"
```
Expected: Mindestens eine Zeile.

- [ ] **Step 8: Genehmigungs-Durchstich prüfen**

In der Chef-App `/admin/gamification/approvals` öffnen.
Expected: Die eben erstellte Einreichung ist sichtbar und genehmigungsfähig.

- [ ] **Step 9: Befunde festhalten**

Alle Abweichungen aus Schritt 3–8 sammeln — je Befund: Datei, Zeile, beobachtetes Verhalten, Konsolen-/Netzwerkausgabe. Läuft alles durch, das in `CLAUDE.md` unter „Gamification System" vermerken. Gibt es Defekte, für jeden eine eigene Task nach dem Muster von Task 1 anhängen (Test zuerst).

- [ ] **Step 10: Commit (nur falls Dokumentation geändert wurde)**

```bash
git add CLAUDE.md
git commit -m "docs: Record mitarbeiter-app gamification verification results"
```

---

### Task 5: Doku-Korrekturen in CLAUDE.md

Beim Debuggen aufgefallene Abweichungen zwischen Doku und Code.

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: nichts.
- Produces: nichts (reine Dokumentation).

- [ ] **Step 1: Rollen-Namen korrigieren**

In `CLAUDE.md` im Abschnitt „Authentication & Authorization":

Vorher:
```
- Users stored in PocketBase `users` collection with `role` field (gf/ma for Geschäftsführer/Mitarbeiter)
```

Nachher:
```
- Users stored in PocketBase `users` collection with `role` field.
  Gültige Werte: `gf` (Geschäftsführung), `sl` (Schichtleitung), `mitarbeiter`.
  ACHTUNG: der Wert heißt `mitarbeiter`, nicht `ma` — `/ma/` ist nur der URL-Pfad.
```

- [ ] **Step 2: TODO 1 als erledigt markieren**

Der Eintrag „TODO 1 — Routing/Auth-Timing in der Chef-App" wird durch Task 3 gelöst. Eintrag entfernen und stattdessen unter „Gamification System" vermerken:

```
**Auth-Race-Condition (2026-08-11, behoben):** `refresh()` in beiden Auth-Stores
wertete einen per Auto-Cancellation abgebrochenen `authRefresh()` als Auth-Fehler
und rief `pb.authStore.clear()`. Folge: SSO in die Mitarbeiter-App landete immer
auf `/login`, und direkte URL-Eingaben in der Chef-App leiteten aufs Dashboard um.
Fix: `isAbort`-Guard in `refresh()`, siehe `stores/auth.ts` in beiden Apps.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: Correct role values and record the auth race-condition fix"
```

---

## Offene Punkte (nicht Teil dieses Plans)

- **400er auf `notifications`:** `GET /api/collections/notifications/records?...&filter=user = "<id>"&sort=-created` liefert dauerhaft 400. Unabhängig von Gamification, eigener Plan.
- **`gam_settings`-Record mit 14-stelliger ID:** Schema verlangt 15. Updates funktionieren, Ursache trotzdem klären (vermutlich `scripts/create-gamification-collections.mjs`).
- **Test-Artefakte aufräumen:** `GamificationTaskListSimple.tsx`, `GameTasksTest.tsx` samt Route, `public/test-gamification.html` — erst entfernen, wenn Gamification final stabil ist.
