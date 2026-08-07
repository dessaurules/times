# Mitarbeiter-App: Dashboard Redesign & Push-Notifications

**Datum:** 2026-05-26  
**Scope:** Mitarbeiter-App (`mitarbeiter-app/`) + neuer Push-Service (`push-service/`)  
**Inspiration:** clockin App – "Mein Bereich"-Ansicht (Minute 3:12 im Demo-Video)

---

## Kontext

Die bestehende Urlaubskonto-Karte auf dem Dashboard zeigt nur statische Zahlen (Anspruch / Genommen / Verbleibend). Ziel ist eine visuell ansprechendere Darstellung der geleisteten Monatsstunden (Halbkreis-Gauge) und des Urlaubskontos (Fortschrittsbalken mit Aufschlüsselung). Zusätzlich sollen echte System-Push-Notifications eingeführt werden, damit Mitarbeiter auch bei geschlossener App benachrichtigt werden können.

---

## Feature 1: Dashboard Redesign

### Was sich ändert

Die Urlaubskonto-Karte (aktuell `Dashboard.tsx` Zeilen 209–236) wird ersetzt durch:

1. **Monatsnavigation** – `← Oktober 2026 →` über der neuen Karte; State: `viewMonth: Date`
2. **MonatsstundenGauge** – SVG-Halbkreis, zeigt `IST / SOLL` Stunden des gewählten Monats
3. **UrlaubsCard** – Fortschrittsbalken + Legende (verbraucht · verplant · offen) + Überstunden-Badge

### Neue Komponenten

**`MonatsstundenGauge`** (`src/components/MonatsstundenGauge.tsx`)
- Props: `actualMins: number`, `targetMins: number`, `month: Date`
- Rendert SVG-Halbkreis (Indigo-Gradient) + große Zeitanzeige darunter (`74:40`)
- Zeigt Soll-Stunden als Subtitle: `von 176 Stunden · Oktober`

**`UrlaubsCard`** (`src/components/UrlaubsCard.tsx`)
- Props: `taken: number`, `planned: number`, `entitlement: number`, `overtimeMins: number`
- Fortschrittsbalken: Indigo für verbraucht, Amber für verplant, Grau für offen
- Legende: `● 8 Verbraucht  ● 1 Verplant` + `21 Offen` rechts
- Überstunden-Badge (grün wenn positiv, rot wenn negativ): `+6:22 Überstunden (Jahr)`

### Neue Daten in `Dashboard.tsx`

```ts
const [viewMonth, setViewMonth] = useState(new Date())
```

Zusätzliche PocketBase-Abfragen beim Monatswechsel:
- `time_entries` gefiltert auf `start_time >= Monatsstart && start_time <= Monatsende`
- `absences` mit `status = "pending"` für "verplant"-Tage (pending vacation types)

**Soll-Stunden-Berechnung:**
```ts
// Arbeitstage im Monat (ohne Wochenenden + Feiertage)
const workdays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  .filter(d => !isWeekend(d) && !holidays.has(format(d, 'yyyy-MM-dd'))).length
const targetMins = Math.round((emp.weekly_hours / 5) * workdays * 60)
```

**Geplante Tage (pending):**
```ts
const plannedDays = absences
  .filter(a => VACATION_TYPES.includes(a.type) && a.status === 'pending')
  .reduce((sum, a) => sum + workingDaysInRange(a.date_from, a.date_to, holidays), 0)
```

### Layout nach Redesign

```
Greeting-Header
└── Grid (md:grid-cols-2)
    ├── Stempeluhr-Card (unverändert)
    └── [Neue Spalte]
        ├── Monatsnavigation ← Oktober 2026 →
        ├── MonatsstundenGauge
        └── UrlaubsCard
Meine Anträge (unverändert)
```

---

## Feature 2: System-Push-Notifications

### Architektur-Überblick

```
Mitarbeiter-App (PWA)
  └── Service Worker (vite-plugin-pwa)
      └── Web Push Subscription → PocketBase: push_subscriptions

PocketBase JS Hooks (pb_hooks/)
  └── Bei Events → HTTP POST → Push-Service

Push-Service (push-service/ Node.js)
  ├── POST /send-push  ← PocketBase ruft das auf
  └── node-cron       ← Zeit-basierte Prüfungen
      └── → web-push → Browser Push Service → Gerät
```

### Teil A: Mitarbeiter-App (PWA)

**Installation:**
```bash
cd mitarbeiter-app
npm install vite-plugin-pwa
```

**`vite.config.ts`** – VitePWA Plugin hinzufügen:
- `registerType: 'autoUpdate'`
- Manifest mit App-Name, Icons, `display: 'standalone'`
- Service Worker Strategie: `generateSW`

**`src/lib/push.ts`** – neue Datei:
```ts
export async function subscribePush(): Promise<void>
// 1. Notification.requestPermission()
// 2. serviceWorker.pushManager.subscribe({ applicationServerKey: VAPID_PUBLIC })
// 3. POST Subscription-Objekt an /api/push/subscribe (Push-Service)
//    oder direkt in PocketBase collection speichern
```

**`src/components/PushPermissionBanner.tsx`** – Banner beim ersten Start:
- Zeigt sich wenn `Notification.permission === 'default'`
- iOS-Hinweis: "Füge die App zum Homescreen hinzu für Benachrichtigungen"
- Button "Jetzt aktivieren" → `subscribePush()`

### Teil B: PocketBase Collection `push_subscriptions`

| Feld | Typ | Beschreibung |
|---|---|---|
| `employee` | Relation (employees) | Zugehöriger Mitarbeiter |
| `endpoint` | Text | Push-Service URL des Browsers |
| `p256dh` | Text | Verschlüsselungs-Key |
| `auth` | Text | Auth-Secret |
| `user_agent` | Text | Browser-Info (optional) |

API-Regeln: Mitarbeiter kann nur eigene Subscriptions schreiben/lesen.

### Teil C: Push-Service (`push-service/`)

**Stack:** Node.js, Express, `web-push`, `node-cron`, `@pocketbase/js`

**Struktur:**
```
push-service/
├── package.json
├── .env              # VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT, PB_URL, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD
├── src/
│   ├── index.ts      # Express + Cron Setup
│   ├── sender.ts     # sendPushToEmployee(employeeId, title, body)
│   └── jobs/
│       ├── einstempel.ts   # Cron: alle 5 Min
│       ├── ausstempel.ts   # Cron: alle 5 Min
│       └── morgen.ts       # Cron: täglich 18:00
```

**`sender.ts`:**
```ts
async function sendPushToEmployee(employeeId: string, title: string, body: string) {
  // 1. Alle push_subscriptions für employeeId laden
  // 2. web-push.sendNotification() für jede Subscription
  // 3. Ungültige Subscriptions (410 Gone) aus DB löschen
}
```

### Push-Szenarien

**1. Einstempel-Erinnerung** (`jobs/einstempel.ts`)
- Cron: `*/5 * * * *` (alle 5 Min)
- Logik: Lade alle Schichten die heute begannen. Wenn `now > shift.start + 20 Min` und kein `time_entry` für diesen MA heute → Push senden (max. 1× pro Tag pro MA)
- Text: `"Du hast heute um HH:MM Uhr Schichtbeginn — bitte vergiss nicht einzustempeln."`

**2. Ausstempel-Erinnerung** (`jobs/ausstempel.ts`)
- Cron: `*/5 * * * *` (alle 5 Min)
- Logik: Lade alle offenen `time_entries` (kein `end_time`). Wenn `now > shift.end + 30 Min` → Push (max. 1× pro Tag)
- Text: `"Deine Schicht endet um HH:MM Uhr — bitte vergiss nicht auszustempeln!"`

**3. Dienstplan veröffentlicht** (`pb_hooks/shifts.js`)
- PocketBase After-Update Hook auf `shift_plans` Collection
- Wenn `status` wechselt zu `published`: alle betroffenen Mitarbeiter via `POST /send-push` benachrichtigen
- Text: `"Dein Dienstplan für KW XX (DD.–DD. Mon.) wurde veröffentlicht."`

**4. Antrag genehmigt/abgelehnt** (`pb_hooks/absences.js`)
- PocketBase After-Update Hook auf `absences` Collection
- Wenn `status` wechselt von `pending` zu `approved` oder `rejected`:
  - `approved`: `"Dein Urlaubsantrag (DD.–DD. Mon.) wurde genehmigt. 🎉"`
  - `rejected`: `"Dein Urlaubsantrag (DD.–DD. Mon.) wurde leider abgelehnt."`
- Ersetzt/ergänzt die bestehende In-App-Bell-Notification

**5. Morgen-Schicht-Erinnerung** (`jobs/morgen.ts`)
- Cron: `0 18 * * *` (täglich 18:00 Uhr)
- Lade alle Schichten von morgen. Für jeden betroffenen MA → Push
- Text: `"Morgen hast du Frühschicht: HH:MM–HH:MM Uhr (Bereich)."`

### VAPID-Keys Setup

Einmalig generieren und in `push-service/.env` eintragen:
```bash
cd push-service
npx web-push generate-vapid-keys
```

```env
VAPID_PUBLIC=...
VAPID_PRIVATE=...
VAPID_SUBJECT=mailto:admin@example.com
PB_URL=http://127.0.0.1:8091
PB_ADMIN_EMAIL=admin@example.com
PB_ADMIN_PASSWORD=...
```

---

## iOS-Hinweis

Web-Push auf iOS funktioniert nur wenn die App zum Homescreen hinzugefügt wurde (PWA-Modus). Der `PushPermissionBanner` erkennt iOS und zeigt entsprechende Anweisungen.

---

## Verifikation

1. **Dashboard:** Monatsnavigation wechselt korrekt, Gauge aktualisiert sich, Fortschrittsbalken stimmt mit PocketBase-Daten überein
2. **Push-Permission:** Banner erscheint beim ersten Start, verschwindet nach Erlaubnis
3. **Einstempel-Push:** Testschicht anlegen, 20 Min warten (oder Delay temporär auf 1 Min setzen)
4. **Antrag-Push:** Antrag im Chef-App genehmigen → Push kommt auf dem Testgerät an
5. **iOS:** App zu Homescreen hinzufügen, dann Push-Test durchführen
