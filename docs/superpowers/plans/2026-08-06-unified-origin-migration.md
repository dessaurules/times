# Unified-Origin-Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die bereits im Arbeitsverzeichnis liegenden, unversionierten Änderungen (Chef-App + Mitarbeiter-App auf einem gemeinsamen Origin/Port, SSO-Auth-Refresh, Migration `time_entries` auf `datetime`) auf dem Dev-Server verifizieren und in nachvollziehbaren, lokalen Commits sichern.

**Architektur:** Die Änderungen existieren bereits als Code (kein neues Feature), sind aber unstrukturiert vermischt und ungetestet. Statt TDD-from-scratch wird pro logischer Gruppe verifiziert (manuell + bestehende Test-Suite) und danach isoliert committet — so bleibt jeder Commit einzeln nachvollziehbar und revertierbar.

**Tech Stack:** Express (`serve.mjs`), Vite (Proxy + `base`), Zustand (`stores/auth`), PocketBase JS SDK ^0.26.9, PocketBase-Migrationen.

## Global Constraints

- **Kein `git push`** — alle Commits bleiben lokal auf `development`, bis explizit anders angewiesen.
- PocketBase muss für alle Tests auf Port **8091** laufen (nicht 8095 — siehe Task 0, dort läuft aktuell eine verwaiste Alt-Instanz).
- Bestehende Testsuiten (`npm run test:run` in `chef-app/` und `mitarbeiter-app/`) müssen nach jeder Gruppe grün bleiben.
- Commit-Messages auf Deutsch, wie im bisherigen Log (`fix:`, `feat:`, `chore:` Präfixe).

---

### Task 0: Dev-Umgebung auf den erwarteten Zustand bringen

**Files:**
- Keine Code-Änderung — nur Prozess-/Umgebungs-Check.

**Kontext:** `lsof -nP -iTCP -sTCP:LISTEN` zeigt aktuell nur eine PocketBase-Instanz auf **Port 8095** (seit Freitag laufend). Beide Apps sind aber per `.env` fest auf `VITE_PB_URL=http://127.0.0.1:8091` konfiguriert — dorthin lauscht aktuell **niemand**. Ohne Fix laufen alle folgenden Verifikationsschritte gegen eine nicht erreichbare Datenbank.

- [ ] **Schritt 1: Alte Instanz identifizieren und Zustand klären**

```bash
ps aux | grep "[p]ocketbase serve"
lsof -nP -iTCP -sTCP:LISTEN | grep 809
```

Prüfen, ob die Instanz auf 8095 noch für einen anderen Zweck gebraucht wird (z. B. manueller Test), bevor sie ggf. beendet wird.

- [ ] **Schritt 2: PocketBase auf 8091 starten**

```bash
cd /Users/ronnybeckmann/Projects/times
./pocketbase serve --http="127.0.0.1:8091"
```

- [ ] **Schritt 3: Health-Check**

```bash
curl -s http://127.0.0.1:8091/api/health
```

Erwartet: `{"message":"API is healthy.","code":200,"data":{}}`

---

### Task 1: SSO Auth-Refresh + Auto-Logout verifizieren und committen

**Files:**
- Modify: `chef-app/src/lib/pb.ts`
- Modify: `mitarbeiter-app/src/lib/pb.ts`
- Modify: `chef-app/src/App.tsx`
- Modify: `mitarbeiter-app/src/App.tsx`
- Modify: `chef-app/src/stores/auth.ts` (Rekursions-Fix, siehe Kontext)
- Modify: `mitarbeiter-app/src/stores/auth.ts` (Rekursions-Fix, siehe Kontext)
- Test: `chef-app/src/pages/__tests__/Login.test.tsx` (bestehend, als Regressionscheck)
- Test: `chef-app/src/stores/__tests__/auth.test.ts` bzw. Äquivalent (neuer Regressionstest für den Rekursions-Fix, siehe Schritt 1a)

**Kontext:** Beide `pb.ts` bekommen einen `authStore.onChange`-Handler, der bei ungültigem Token automatisch `useAuthStore.getState().logout()` aufruft. Beide `App.tsx` bekommen einen `useEffect`, der beim Start `authRefresh()` aufruft und bei Fehlschlag den AuthStore leert. Das ist die Grundlage für SSO zwischen den Apps auf gemeinsamem Origin (Token wird über `localStorage` geteilt, muss aber bei Ablauf synchron invalidiert werden).

**Bekannter Bug (gefunden während der Arbeit am Dienstplan-Login-Bugfixes-Plan, noch nicht behoben — MUSS in diesem Task mit gefixt werden):** `RangeError: Maximum call stack size exceeded`, deterministisch bei fast jedem vollständigen Seiten-Reload reproduzierbar. Ursache: `pb.authStore.onChange(() => { if (!pb.authStore.isValid) useAuthStore.getState().logout() })` in `pb.ts` löst bei ungültigem Token `logout()` aus; `logout()` in `stores/auth.ts` ruft `pb.authStore.clear()` auf — das feuert `onChange` erneut, `isValid` ist immer noch `false`, `logout()` wird erneut aufgerufen, erneut `clear()`, unendliche Rekursion bis zum Stack-Overflow. Ausgelöst wird der erste `clear()`-Aufruf u. a. durch `App.tsx`s `authRefresh().catch(() => pb.authStore.clear())`, dessen Promise bei React-StrictMode-Doppelmount durch PocketBase's Auto-Cancellation abgebrochen werden kann.

**Fix:** In `logout()` (`chef-app/src/stores/auth.ts` und `mitarbeiter-app/src/stores/auth.ts`) den `clear()`-Aufruf mit einem `isValid`-Check absichern, sodass ein bereits geleerter Store keinen erneuten `onChange`-Trigger erzeugt:

```tsx
logout: () => {
  if (pb.authStore.isValid) pb.authStore.clear()
  set({ user: null })
},
```

Das durchbricht die Rekursion: Der erste (echte) `clear()`-Aufruf feuert `onChange` einmal, der daraus resultierende zweite `logout()`-Aufruf sieht `isValid === false`, überspringt `clear()` und terminiert.

- [ ] **Schritt 1: Diff der vier Dateien noch einmal lesen und auf Vollständigkeit prüfen**

```bash
git diff -- chef-app/src/lib/pb.ts mitarbeiter-app/src/lib/pb.ts chef-app/src/App.tsx mitarbeiter-app/src/App.tsx
```

Prüfen: Importiert `pb.ts` in beiden Apps korrekt `useAuthStore` aus `../stores/auth` (Zirkelbezug vermeiden — `stores/auth.ts` importiert bereits `pb` aus `lib/pb.ts`, das neue `onChange` in `pb.ts` darf `useAuthStore` nur lazy über `.getState()` nutzen, nicht als Modul-Top-Level-Import mit sofortiger Ausführung, sonst Circular-Import-Fehler beim Start).

- [ ] **Schritt 1a: Rekursions-Fix implementieren und mit Regressionstest belegen (RED/GREEN)**

`logout()` in beiden `stores/auth.ts` wie im Kontext beschrieben um den `isValid`-Guard ergänzen. Davor einen Test schreiben, der ohne den Guard fehlschlägt: `pb.authStore.clear()` so mocken/stubben, dass es bei jedem Aufruf `onChange`-Listener erneut synchron auslöst (simuliert das reale PocketBase-Verhalten), dann `logout()` aufrufen und assertieren, dass `clear`/`onChange` nur endlich oft (z. B. maximal 1x) aufgerufen wird, statt in einen Stack-Overflow zu laufen. RED zuerst mit dem alten Code bestätigen (Test muss mit `RangeError: Maximum call stack size exceeded` oder einer Aufruf-Zähler-Assertion fehlschlagen), dann Fix anwenden, GREEN bestätigen.

- [ ] **Schritt 2: Dev-Server beider Apps starten und manuell verifizieren**

```bash
# Terminal 1
cd chef-app && npm run dev
# Terminal 2
cd mitarbeiter-app && npm run dev
```

Browser: In der Chef-App einloggen, DevTools → Application → Local Storage → `pocketbase_auth`-Eintrag manuell auf ungültigen Token setzen, Seite neu laden. Erwartet: automatischer Logout (Redirect zu `/login`), **kein `RangeError: Maximum call stack size exceeded`** (das ist der konkrete Test für den Schritt-1a-Fix), keine Endlosschleife, keine Konsolenfehler außer dem erwarteten Refresh-Fehlschlag. Zusätzlich: normalen manuellen Logout über den Sidebar-Button testen — muss weiterhin sauber funktionieren (Guard darf den regulären Logout-Pfad nicht brechen).

- [ ] **Schritt 3: Bestehende Test-Suite laufen lassen**

```bash
cd chef-app && npm run test:run
cd ../mitarbeiter-app && npm run test:run
```

Erwartet: Alle Tests grün (insbesondere `Login.test.tsx`, `auth.test.ts` — dort wird `pb.authStore` gemockt, die neuen `onChange`/`authRefresh`-Aufrufe dürfen bestehende Mocks nicht brechen, ggf. Mock in `auth.test.ts` um `onChange: vi.fn()` und `authRefresh: vi.fn()` ergänzen, falls Tests fehlschlagen).

- [ ] **Schritt 4: Commit**

```bash
git add chef-app/src/lib/pb.ts mitarbeiter-app/src/lib/pb.ts chef-app/src/App.tsx mitarbeiter-app/src/App.tsx chef-app/src/stores/auth.ts mitarbeiter-app/src/stores/auth.ts chef-app/src/stores/__tests__/auth.test.ts
git commit -m "feat(sso): Auth-Refresh beim App-Start + Auto-Logout bei ungültigem Token

Behebt zusätzlich einen Stack-Overflow durch Rekursion zwischen
authStore.onChange und logout()/clear() (RangeError: Maximum call
stack size exceeded), gefunden während der Arbeit am
Dienstplan-Login-Bugfixes-Plan."
```

---

### Task 2: Unified Server (Port 3001, `/ma/`-Pfad) verifizieren und committen

**Files:**
- Modify: `serve.mjs`
- Modify: `chef-app/vite.config.ts`
- Modify: `chef-app/vite.config.js`
- Modify: `mitarbeiter-app/vite.config.ts`
- Modify: `deploy.sh`

**Kontext:** `serve.mjs` bedient künftig beide Apps über einen einzigen Express-Server auf Port 3001 (Mitarbeiter-App unter `/ma`, Chef-App auf Root) statt zwei getrennter Server auf 3001/3002. Im Dev-Modus proxied `chef-app/vite.config.ts` Anfragen unter `/ma` auf Port 5174 (Mitarbeiter-App-Dev-Server). `mitarbeiter-app/vite.config.ts` bekommt `base: '/ma/'` inkl. angepasster PWA-Manifest-Pfade (`start_url`, `scope`, Icons).

- [ ] **Schritt 1: Prod-Build beider Apps testen**

```bash
cd chef-app && npm run build
cd ../mitarbeiter-app && npm run build
```

Erwartet: Beide Builds fehlerfrei (TypeScript-Check + Vite-Build). Prüfen, dass `mitarbeiter-app/dist/index.html` alle Asset-Pfade mit `/ma/`-Präfix referenziert (`grep '"/ma/' mitarbeiter-app/dist/index.html`).

- [ ] **Schritt 2: Unified-Server lokal starten und beide Apps über Port 3001 aufrufen**

```bash
cd /Users/ronnybeckmann/Projects/times
node serve.mjs
```

Browser: `http://localhost:3001` (Chef-App) und `http://localhost:3001/ma/` (Mitarbeiter-App) öffnen. Erwartet: Beide laden korrekt, keine 404 auf Assets/Icons, PWA-Manifest unter `http://localhost:3001/ma/manifest.webmanifest` lädt mit `"start_url":"/ma/"`.

- [ ] **Schritt 3: Dev-Modus-Proxy testen**

```bash
cd chef-app && npm run dev    # Terminal 1, Port 5173
cd mitarbeiter-app && npm run dev  # Terminal 2, Port 5174
```

Browser: `http://localhost:5173/ma/` öffnen. Erwartet: Proxy leitet auf Mitarbeiter-App-Dev-Server (5174) durch, kein CORS-Fehler (Login-Token wird über denselben Origin `5173` geteilt).

- [ ] **Schritt 4: SSO End-to-End manuell prüfen**

In Chef-App (Root) einloggen, dann zu `/ma/` navigieren. Erwartet: automatisch eingeloggt (kein erneuter Login-Screen), da Token über `localStorage` auf gleichem Origin geteilt wird.

- [ ] **Schritt 5: `deploy.sh` auf Konsistenz prüfen**

```bash
grep -n "3001\|3002\|/ma" deploy.sh
```

Sicherstellen, dass alle Text-Ausgaben (URLs in Log-Meldungen) durchgängig auf `3001` + `/ma/` verweisen und keine Referenz auf Port `3002` mehr übrig ist. **Nicht ausführen** — `deploy.sh` deployt auf den Pi, das ist laut Projekt-Vorgabe nur mit expliziter Freigabe erlaubt.

- [ ] **Schritt 6: Commit**

```bash
git add serve.mjs chef-app/vite.config.ts chef-app/vite.config.js mitarbeiter-app/vite.config.ts deploy.sh
git commit -m "feat(server): Chef-App und Mitarbeiter-App auf gemeinsamem Origin (Port 3001, /ma/) zusammenführen"
```

---

### Task 3: Migration `time_entries` auf `datetime` verifizieren und committen

**Files:**
- Modify: `pb_migrations/1779358911_created_time_entries.js`

**Kontext:** `start_time`/`end_time` wechseln von PocketBase-Feldtyp `"date"` auf `"datetime"`. Laut `CLAUDE.md` war das bereits am 2026-06-26 als nötige Korrektur dokumentiert (ISO-8601-Timestamps statt reinem Datum) — diese Migrationsdatei ist die tatsächliche Umsetzung, aber noch nicht angewendet/committet.

- [ ] **Schritt 1: Migration anwenden (PocketBase-Neustart wendet neue/geänderte Migrationsdateien automatisch an)**

```bash
# PocketBase-Prozess aus Task 0 beenden und neu starten
./pocketbase serve --http="127.0.0.1:8091"
```

Log beobachten: PocketBase meldet angewendete Migrationen beim Start. Prüfen, ob `1779358911_created_time_entries` als "applied" erscheint (`_migrations`-Systemtabelle in `pb_data/data.db`).

- [ ] **Schritt 2: Bestehende Datensätze prüfen**

Im PocketBase-Admin (`http://127.0.0.1:8091/_/`) → Collection `time_entries` öffnen. Prüfen, ob vorhandene Einträge weiterhin korrekt als Datum+Uhrzeit angezeigt werden (Typwechsel `date`→`datetime` ist in PocketBase abwärtskompatibel, da beide intern als Text/RFC3339 gespeichert werden — trotzdem visuell verifizieren).

- [ ] **Schritt 3: Neuen Zeiteintrag über die Mitarbeiter-App anlegen**

In der Mitarbeiter-App über den Swipe-Button einstempeln. Erwartet: kein Validierungsfehler, `start_time` wird als vollständiger ISO-Timestamp (inkl. Uhrzeit) gespeichert — prüfbar über PocketBase-Admin oder:

```bash
curl -s "http://127.0.0.1:8091/api/collections/time_entries/records?sort=-created&perPage=1" \
  -H "Authorization: Bearer <token>" | python3 -m json.tool
```

- [ ] **Schritt 4: Commit**

```bash
git add pb_migrations/1779358911_created_time_entries.js
git commit -m "fix(migration): time_entries.start_time/end_time von date auf datetime umstellen"
```

---

### Task 4: Vorbereitete Nebenfixes sichten und einzeln committen

**Files:**
- Modify: `chef-app/src/pages/Dashboard.tsx`
- Modify: `chef-app/src/pages/Mitarbeiterliste.tsx`
- Modify: `mitarbeiter-app/src/pages/Dashboard.tsx`
- ~~Modify: `chef-app/src/pages/Dienstplan.tsx`~~ — **bereits erledigt, siehe Hinweis unter Schritt 4**

**Kontext:** Im unversionierten Diff steckten ursprünglich vier fachlich unabhängige Fixes, die nichts mit der Unified-Origin-Migration zu tun haben, aber schon fertig im Arbeitsverzeichnis lagen. Sie werden einzeln committet, damit die Historie sauber bleibt. **Update:** Schritt 4 (Dienstplan-Real-Time-Subscription) wurde bereits während der Arbeit am Dienstplan-Login-Bugfixes-Plan versehentlich mitcommittet (Commit `9d5d078`, als Nebeneffekt eines `git add` auf dieselbe Datei) — per finaler Code-Review verifiziert korrekt und konsistent mit etablierten Mustern (`NotificationBell.tsx`, `Dashboard.tsx`). Nur Schritte 1–3 sind hier noch offen.

- [ ] **Schritt 1: `chef-app/src/pages/Dashboard.tsx` — Mitarbeiterzahl-Query korrigiert**

Vorher wurde `activeTotal` aus einer separaten `getList(1, 1, ...)`-Abfrage gelesen, obwohl bereits eine `getFullList`-Abfrage für dieselben Mitarbeiter existierte (`empFullList`). Der Fix entfernt die doppelte Abfrage und liest `activeTotal: empFullList.length`.

```bash
cd chef-app && npm run test:run -- Dashboard
git add src/pages/Dashboard.tsx
git commit -m "fix(dashboard): doppelte Mitarbeiter-Abfrage entfernen, activeTotal aus vorhandener Liste ableiten"
```

- [ ] **Schritt 2: `chef-app/src/pages/Mitarbeiterliste.tsx` — Suche mit Debounce**

Suchfeld tippt jetzt in einen separaten `searchInput`-State, der erst nach 300ms Inaktivität in den tatsächlichen `search`-Filter übernommen wird (verhindert eine PocketBase-Anfrage pro Tastenanschlag).

Manuell testen: In der Mitarbeiterliste schnell tippen, Network-Tab beobachten — erwartet nur eine Anfrage nach Tipp-Pause, nicht pro Zeichen.

```bash
git add src/pages/Mitarbeiterliste.tsx
git commit -m "perf(mitarbeiterliste): Suche mit 300ms Debounce statt Anfrage pro Tastenanschlag"
```

- [ ] **Schritt 3: `mitarbeiter-app/src/pages/Dashboard.tsx` — Stempeluhr-Anzeige vereinfacht**

`todayNetMins` zeigt jetzt nur noch die laufende Session (`liveMins`) wenn eingestempelt, sonst `0` — statt der kumulierten Tagesarbeitszeit. Das entspricht exakt der in `CLAUDE.md` dokumentierten Soll-Anzeige ("Stamped: Shows only current session time since clock-in"). Die alte Hilfsfunktion `todayMins()` wurde entfernt.

```bash
cd ../mitarbeiter-app && npm run test:run -- Dashboard
git add src/pages/Dashboard.tsx
git commit -m "fix(stempeluhr): Anzeige zeigt nur aktuelle Session statt kumulierter Tageszeit"
```

- [x] **Schritt 4 — ENTFÄLLT (bereits erledigt):** `chef-app/src/pages/Dienstplan.tsx` — Real-Time-Subscription robuster

War geplant als: `unsubAbsencesRef` als Ref statt Closure-Variable, explizites `unsubscribe('*')` im Cleanup zusätzlich zur gespeicherten Unsub-Funktion (Absicherung gegen doppelte Subscriptions bei React-StrictMode-Doppelmount in Dev). Ist bereits exakt so im Code (`chef-app/src/pages/Dienstplan.tsx`, Commit `9d5d078`) — verifiziert via `grep -n "unsubAbsencesRef" chef-app/src/pages/Dienstplan.tsx` und `git status` (keine offene Änderung mehr an dieser Datei). Kein weiterer Schritt nötig; optional bei Gelegenheit manuell in zwei Browser-Tabs verifizieren (Abwesenheit in Tab 1 anlegen, Real-Time-Update in Tab 2 ohne Reload prüfen), aber nicht blockierend für diesen Task.

---

## Self-Review

- **Task 0** deckt die Blockierung durch die falsch-portige PocketBase-Instanz ab, ohne die sonst keiner der folgenden Tasks verifizierbar wäre.
- **Task 1–3** decken alle vier ursprünglich vermischten Kernänderungen der Unified-Origin-Migration ab (SSO, Server-Zusammenlegung, Migration). Task 1 wurde nachträglich um den Rekursions-Bugfix (`onChange`/`logout`/`clear`) ergänzt, der während der Arbeit am Dienstplan-Login-Bugfixes-Plan in genau diesem Code gefunden wurde.
- **Task 4** trennt die ursprünglich vier fachfremden Fixes, die zufällig im selben Arbeitsverzeichnis lagen, in eigene Commits — vermeidet einen "Mischmasch"-Commit. Schritt 4 (Dienstplan-Subscription) ist bereits erledigt (siehe dort), nur Schritte 1–3 sind noch offen.
- Kein Schritt enthält `git push` — Constraint eingehalten.
- **Update 2026-08-06:** Plan nachträglich angepasst nach Abschluss des Dienstplan-Login-Bugfixes-Plans — Rekursions-Fix ergänzt, Task-4-Schritt-4 als erledigt markiert.
