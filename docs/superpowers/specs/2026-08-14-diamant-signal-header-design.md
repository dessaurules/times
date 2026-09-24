# Diamant-Signal im Header der Mitarbeiter-App — Design Document

**Datum:** 2026-08-14
**Status:** Design Approved
**Scope:** Der Gamification-Diamant im mobilen Header zeigt durch Farbe und ein Funkeln an, ob es Neues gibt

---

## 1. ZUSAMMENFASSUNG

Der Diamant im mobilen Header der Mitarbeiter-App trug bisher ein Badge mit dem Punktestand. Das Badge ist entfernt. An seine Stelle tritt ein Signalzustand: Der Diamant ruht grau wie die Glocke daneben und wechselt auf Indigo mit einem wandernden Glanzstrich, sobald es etwas Neues gibt — eine verfügbare Aufgabe, eine neue Prämie, ein Ergebnis der eigenen Einreichung oder eine Frist, die in der nächsten Stunde abläuft.

Was als „gesehen" gilt, merkt sich ein Zeitstempel im Nutzerprofil, damit der Stand zwischen Handy und Desktop übereinstimmt.

---

## 2. ANFORDERUNGEN

### Funktional

- Ruhezustand: Diamant in `#6B7280`, identisch zur `NotificationBell` daneben, keine Bewegung
- Signalzustand: Diamant in `#4F46E5`, ein Lichtpunkt wandert alle 2,6 s die Kontur entlang
- Vier Signalquellen, verknüpft mit ODER (siehe Abschnitt 3)
- Öffnen des Gamification-Sheets setzt den Merker und beendet die ersten drei Signale
- Die Fristwarnung ist nicht wegklickbar und endet erst, wenn der Auftrag eingereicht oder abgelaufen ist
- Live-Aktualisierung ohne Reload über PocketBase-Subscriptions

### Nicht-funktional

- Bei `prefers-reduced-motion: reduce` entfällt die Animation, der Farbwechsel bleibt
- Fehlgeschlagene Abfragen führen zu keinem sichtbaren Fehler im Header
- Keine Auto-Cancellation-Fehler (`requestKey: null` plus `isAbort`-Guard)
- Kein zusätzlicher Dauer-Poll: die Signale kommen über Subscriptions, nur die Frist braucht einen Minuten-Ticker

---

## 3. SIGNALREGEL

Der Diamant funkelt, sobald **mindestens eine** der vier Bedingungen zutrifft.

| # | Quelle | Bedingung | Verstummt beim Öffnen |
|---|---|---|---|
| 1 | `gam_tasks` | `active = true`, nicht abgelaufen, `created` nach dem Merker | ja |
| 2 | `gam_rewards` | `status = 'active'`, `created` nach dem Merker | ja |
| 3 | `gam_events` | `user_id` = ich, Typ `submission_approved` oder `reward_redeemed`, `created` nach dem Merker | ja |
| 4 | `gam_assignments` | eigener Auftrag mit `status = 'active'`, `expires_at` weniger als 60 Minuten entfernt | **nein** |

### Warum Quelle 4 anders funktioniert

Quellen 1 bis 3 sind Ereignisse — sie sind erledigt, sobald man sie zur Kenntnis genommen hat. Quelle 4 ist ein Zustand: Die Frist läuft weiter, egal wie oft man nachsieht. Deshalb funkelt der Diamant auch direkt nach dem Öffnen des Sheets weiter, wenn eine Frist knapp wird. Das wirkt beim ersten Mal wie ein Fehler, ist aber der Zweck der Warnung.

### Gamification abgeschaltet

Ist `gam_settings.enabled` auf `false`, rendert `GamificationHeader` wie bisher `null` — es gibt dann
weder Diamant noch Signal. `useGamificationSignal` startet in diesem Fall keine Abfrage und keine
Subscription, damit eine abgeschaltete Funktion keine Last erzeugt.

### Leerer Merker

Ein leeres `gam_seen_at` bedeutet „noch nie gesehen". Alle bestehenden Aufgaben und Prämien gelten damit als neu, der Diamant funkelt beim ersten Start und beruhigt sich nach dem ersten Öffnen des Sheets. Die Alternative — beim ersten Laden stumm auf jetzt setzen — würde einem neuen Mitarbeiter die bereits vorhandenen Aufgaben verschweigen.

### Bereits angenommene Aufgaben

Quelle 1 filtert nicht heraus, was der Nutzer schon angenommen hat. Das ist bewusst: Eine Aufgabe annehmen setzt voraus, das Sheet geöffnet zu haben, und dabei wandert der Merker hinter das `created` der Aufgabe. Der Fall „neu und schon angenommen" kann daher nicht eintreten, und ein Filter über die eigenen Assignment-IDs wäre toter Code.

---

## 4. DATENMODELL

### Neues Feld

`users.gam_seen_at` — Typ `date`, optional, ohne Vorgabewert.

`date` ist der PocketBase-Feldtyp für vollständige ISO-8601-Zeitstempel mit Uhrzeit; `time_entries.start_time`
nutzt denselben Typ. Die CLAUDE.md nennt ihn dort „datetime" — das beschreibt die Semantik, nicht den
Typnamen im Schema.

Die `updateRule` der `users`-Collection lautet bereits `@request.auth.role = 'gf' || id = @request.auth.id`. Ein Mitarbeiter darf seinen eigenen Datensatz also schreiben — es braucht **keine** Rule-Änderung.

### Migration

Neue Datei `pb_migrations/<timestamp>_add_gam_seen_at_users.js` nach dem Muster von
`1779887367_updated_employees.js`: `collection.fields.addAt(...)` im Vorwärts-Zweig,
`collection.fields.removeById(...)` im Rückwärts-Zweig.

Die Spalte existiert in SQLite noch nicht, deshalb greift **nicht** die Sonderbehandlung aus der CLAUDE.md
(Werte sichern → Spalte droppen → Feld anlegen → Werte zurückschreiben). Das war nur bei den
`created`/`updated`-Feldern nötig, deren Spalten bereits per direktem `ALTER TABLE` existierten.

---

## 5. ARCHITEKTUR

```
mitarbeiter-app/src/
├── hooks/
│   └── useGamificationSignal.ts      (neu)
├── components/Gamification/
│   ├── GemSignal.tsx                 (neu)
│   ├── GamificationHeader.tsx        (geändert)
│   └── GamificationSheet.tsx         (unverändert)
├── index.css                         (geändert: Keyframes)
└── pb_migrations/
    └── <ts>_add_gam_seen_at_users.js (neu)
```

### `useGamificationSignal()`

Einziger Ort, an dem die Signalregel lebt. Rückgabe:

```ts
{ sparkle: boolean, markSeen: () => Promise<void> }
```

Der Hook hält den Merker im State (initial aus `pb.authStore.record.gam_seen_at`) und prüft die
Quellen 1 bis 3 als reine Zähl-Abfragen:

```ts
pb.collection('gam_tasks').getList(1, 1, {
  filter: `active = true && (expires_at = "" || expires_at > @now) && created > "${seenAt}"`,
  requestKey: null,
})
```

Ausgewertet wird nur `totalItems > 0`; es werden keine Datensätze in den State übernommen. Für jede der
drei Collections läuft zusätzlich eine Subscription, die bei `create` eine neue Prüfung anstößt.

Quelle 4 kommt aus dem bestehenden `useAssignments` — der Hook lädt ohnehin nur die eigenen Aufträge und
hat bereits eine Subscription. Ein `setInterval` von 60 Sekunden stößt die Neuberechnung der
Fristgrenze an, damit die Warnung auch ohne Re-Render anspringt.

`markSeen()` schreibt `gam_seen_at` auf den aktuellen Zeitpunkt, setzt den lokalen State sofort
(damit das Funkeln nicht auf die Serverantwort wartet) und lässt die Quellen 1 bis 3 damit ins Leere
laufen.

### `GemSignal.tsx`

Ein eigenes SVG statt der lucide-Komponente `<Gem>`, weil der Glanzstrich ein zusätzlicher Pfad über der
Kontur ist und lucide keine Kinder in sein SVG lässt. Die drei Pfade des Diamanten werden aus lucide
übernommen; dazu kommt eine Kopie des Umriss-Pfades mit `pathLength="100"`, `stroke-dasharray="18 82"`
und der Klasse `gem-sweep`.

Prop: `sparkle: boolean`. Steuert Strichfarbe (`currentColor` über eine Tailwind-Klasse) und ob der
Glanzpfad gerendert wird.

### `index.css`

Neben dem vorhandenen `blink`:

```css
@keyframes gem-sweep {
  0%        { stroke-dashoffset: 100; }
  55%, 100% { stroke-dashoffset: -20; }
}
.gem-sweep { animation: gem-sweep 2.6s cubic-bezier(.4,0,.5,1) infinite; }

@media (prefers-reduced-motion: reduce) {
  .gem-sweep { animation: none; opacity: 0; }
}
```

Die Bewegungsreduktion blendet den Glanzpfad aus, statt ihn eingefroren stehen zu lassen — ein
stillstehender Lichtpunkt auf der Kante sähe wie ein Rendering-Fehler aus.

### `GamificationHeader.tsx`

Verdrahtet beides: `sparkle` geht an `GemSignal`, der Klick öffnet das Sheet und ruft `markSeen()`.
Die Komponente bleibt frei von Abfragelogik.

---

## 6. FEHLERBEHANDLUNG

Alle Abfragen und Subscriptions setzen `requestKey: null`. Jeder `catch`-Block prüft zuerst auf
`isAbort` und ignoriert diese Fehler, statt sie zu protokollieren oder in einen Fehlerzustand zu
überführen — dasselbe Muster, das den Auth-Bug in Commit `c74d7f4` verursacht hat und das in TODO 5
der CLAUDE.md für die Gamification-Hooks noch offen steht.

Bei einem echten Fehler bleibt das jeweilige Teilsignal `false`. Der Header zeigt keinen Fehlerzustand:
Ein verpasstes Funkeln ist harmlos, ein rotes Icon in der Kopfleiste nicht.

Schlägt `markSeen()` fehl, bleibt das lokale `sparkle` trotzdem aus — beim nächsten Laden kehrt das
Signal zurück. Das ist die richtige Richtung: lieber einmal zu viel als eine dauerhaft verschluckte
Meldung.

---

## 7. TESTS

`mitarbeiter-app/__tests__/gamification/` (Vitest + Testing Library, PocketBase gemockt).

**`useGamificationSignal`:**
- je Quelle ein Paar: Signal an, wenn die Bedingung zutrifft; aus, wenn nicht
- kein Signal, wenn alle vier Quellen leer sind
- `markSeen()` schreibt `gam_seen_at` und schaltet die Quellen 1 bis 3 ab
- die Fristwarnung überlebt `markSeen()`
- ein `isAbort`-Fehler erzeugt weder Signal noch Konsolenausgabe
- leerer Merker: alle bestehenden Aufgaben zählen als neu

**`GemSignal`:**
- `sparkle = false`: keine `gem-sweep`-Klasse, Strichfarbe grau
- `sparkle = true`: Glanzpfad vorhanden mit `gem-sweep`, Strichfarbe Indigo

**`GamificationHeader`:**
- Öffnen des Sheets ruft `markSeen()`
- kein Punkte-Badge (der bestehende Test bleibt)

Die `prefers-reduced-motion`-Regel wird nicht getestet — sie lebt in CSS, das jsdom nicht auswertet.
Verifiziert wird sie am Prototyp und im Browser.

---

## 8. ABGRENZUNG

Nicht Teil dieser Arbeit:

- Die Chef-App. Sie hat keinen Gamification-Header.
- Push-Benachrichtigungen für Gamification-Ereignisse. Der Diamant signalisiert nur innerhalb der App.
- Der Punktestand. Er ist mit dem Badge verschwunden und taucht in diesem Design nicht wieder auf.
  Wenn er sichtbar bleiben soll, gehört er ins Sheet, nicht in die Kopfleiste — das wäre eine eigene Aufgabe.
- Die übrigen Hooks aus TODO 5 der CLAUDE.md. `useGamificationSignal` folgt dem richtigen Muster,
  saniert die bestehenden Hooks aber nicht.

---

## 9. AUFZURÄUMEN

`mitarbeiter-app/public/diamant-prototyp.html` ist ein Wegwerf-Artefakt aus der Entwurfsphase und wird
mit der Umsetzung gelöscht. Genau solche Dateien sind bei der Gamification-Session liegengeblieben und
stehen jetzt als TODO 3 in der CLAUDE.md.
