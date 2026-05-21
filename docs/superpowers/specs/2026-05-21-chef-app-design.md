# Chef-App – Design-Dokument

**Projekt:** Schicht & Plan
**Phase:** 1–3 – Chef-App (GF + SL)
**Datum:** 2026-05-21
**Status:** Genehmigt

---

## 1. Ziel

React-App für Geschäftsführer und Schichtleiter eines Gastronomie-/Hotelbetriebs (16–30 MA, Dessau-Roßlau). Verwaltung von Mitarbeitern, Abwesenheiten, Zeiterfassung und Berichten. Desktop-first. Gleiche PocketBase-Instanz wie die Mitarbeiter-App.

---

## 2. Architektur

**Monorepo** – alle Apps im selben Repository:

```
times/
├── chef-app/          ← diese App
├── mitarbeiter-app/   ← separate Vite-App (bereits geplant)
├── shared/            ← gemeinsame TypeScript-Typen
└── docs/
```

`shared/types/index.ts` definiert die TypeScript-Interfaces für alle PocketBase-Collections. Beide Apps importieren ausschließlich von dort — keine duplizierten Typen.

### Tech-Stack

```
React 18 + TypeScript (strict)
Vite 5
React Router v6 (Outlet-basiertes Routing)
Zustand v4 (auth store)
PocketBase JS SDK v0.21
Tailwind CSS v3 + shadcn/ui (Amber #BA7517 als Primärfarbe)
date-fns v3
feiertagejs (Feiertage nach Bundesland)
Lucide React
```

### Backend

PocketBase läuft lokal auf `http://localhost:8090` (Dev). `VITE_PB_URL` in `.env`. Kein eigenes Backend.

---

## 3. PocketBase Schema

### 3.1 Collections & Felder

**`users`** (PocketBase built-in Auth)
- `email`, `name` (built-in)
- `role`: select – `gf | sl | mitarbeiter`
- `employee`: relation → `employees` (optional; Pflicht für sl + mitarbeiter)

**`employees`**
- `first_name`, `last_name`: text
- `email`: text (Firmen-E-Mail)
- `phone`: text
- `birthday`: date
- `street`, `zip`, `city`: text
- `department`: relation → `departments`
- `position`: text (Stellenbezeichnung)
- `contract_type`: select – `vz | tz | mj | az`
- `weekly_hours`: number (Soll-Stunden/Woche)
- `start_date`: date
- `end_date`: date (optional; gesetzt bei Austritt)
- `vacation_days`: number (Jahresanspruch in Tagen)
- `active`: bool (default: true)

**`departments`**
- `name`: text
- `color`: text (Hex, z. B. `#BA7517`)
- `sort_order`: number

**`absences`**
- `employee`: relation → `employees`
- `date_from`, `date_to`: date
- `type`: select – `U | RU | U3 | SU | K | KK | AT | S | ÜA`
- `status`: select – `pending | approved | rejected`
- `note`: text (optional)
- `document`: file (optional, AU-Bescheinigung)
- `created_by`: relation → `users`
- `approved_by`: relation → `users` (optional)
- `approved_at`: date (optional)

**`vacation_accounts`** – ein Eintrag pro Mitarbeiter pro Jahr
- `employee`: relation → `employees`
- `year`: number
- `entitlement`: number (Jahresanspruch für dieses Jahr)
- `carry_over`: number (Resturlaub aus Vorjahr)
- `carry_over_expires`: date (befüllt aus `settings.carry_over_deadline`)

Genommene Tage werden dynamisch aus genehmigten `absences` (Typ U/RU/U3/SU) berechnet.

**`time_entries`**
- `employee`: relation → `employees`
- `start_time`: datetime
- `end_time`: datetime (null = aktuell eingestempelt)
- `break_minutes`: number (nach §4 ArbZG: ab 6 h → 30 min, ab 9 h → 45 min)
- `note`: text (optional)
- `corrected_by`: relation → `users` (optional)

**`documents`**
- `employee`: relation → `employees`
- `name`: text
- `type`: select – `vertrag | lohnschein | au_schein | sonstiges`
- `file`: file
- `date`: date
- `uploaded_by`: relation → `users`

**`notifications`**
- `user`: relation → `users`
- `title`, `message`: text
- `type`: select – `absence_request | absence_approved | absence_rejected | general`
- `read`: bool (default: false)
- `reference_id`: text (optional, ID des verknüpften Datensatzes)

**`settings`** – Key-Value-Store
| key | Beispielwert | Beschreibung |
|---|---|---|
| `company_name` | `"Hotel Zum Anker"` | Firmenname |
| `federal_state` | `"ST"` | Bundesland für Feiertage (feiertagejs-Code) |
| `carry_over_deadline` | `"03-31"` | Verfallsdatum Resturlaub (MM-DD) |
| `shift_swap_enabled` | `"false"` | Schichttausch in Mitarbeiter-App |

**`availability`** – für Mitarbeiter-App Phase 4
- `employee`: relation → `employees`
- `day_of_week`: number (0 = So, 1 = Mo … 6 = Sa)
- `from_time`, `to_time`: text (`"08:00"`)
- `available`: bool

### 3.2 Zugriffsregeln

| Collection | GF | SL | Mitarbeiter |
|---|---|---|---|
| `employees` | CRUD | Lesen | Nur eigener Datensatz |
| `departments` | CRUD | Lesen | Lesen |
| `absences` | CRUD | CRUD | Eigene lesen + pending erstellen |
| `vacation_accounts` | CRUD | Lesen | Eigene lesen |
| `time_entries` | CRUD | Lesen | Eigene lesen + stempeln |
| `documents` | CRUD | Lesen | Eigene lesen |
| `notifications` | CRUD | Eigene | Eigene |
| `settings` | CRUD | Lesen | – |
| `availability` | CRUD | Lesen | Eigene CRUD |

---

## 4. Authentifizierung & Rollen

- Login via PocketBase Auth
- Nach Login: `role` prüfen
  - `mitarbeiter` → Fehlermeldung: „Bitte die Mitarbeiter-App nutzen"
  - `gf | sl` → Chef-App
- `ProtectedRoute` leitet nicht eingeloggte Nutzer zu `/login`
- SL sieht in der Sidebar nur: Dashboard, Abwesenheiten, Berichte (kein Zugriff auf /mitarbeiter, /einstellungen)

---

## 5. Seiten & Routing (phasenweise)

### Phase 1 – Foundation

| Route | Seite |
|---|---|
| `/login` | Login |
| `/` | Dashboard |
| `/mitarbeiter` | Mitarbeiterliste |
| `/mitarbeiter/neu` | Neuen Mitarbeiter anlegen |
| `/mitarbeiter/:id` | Mitarbeiter-Detail (Stammdaten, Dokumente, Urlaubskonto) |
| `/einstellungen` | Abteilungen, Firmenname, Bundesland, Resturlaub-Verfallsdatum (nur GF) |

**Dashboard** zeigt:
- Statistik-Kacheln (MA heute anwesend, abwesend, offene Genehmigungen, Resturlaub-Verfall)
- Offene Genehmigungen (mit Genehmigen/Ablehnen)
- Heute abwesend

**Mitarbeiterliste** zeigt:
- Tabellenansicht mit Filter (Abteilung, Vertragsart, aktiv/inaktiv) und Suche
- Einladen per E-Mail (PocketBase `requestVerification`-Flow)

**Mitarbeiter-Detail** – drei Tabs:
- Stammdaten (alle Felder, editierbar für GF)
- Dokumente (hochladen, herunterladen, löschen)
- Urlaubskonto (Jahresübersicht: Anspruch, RU, genommen, verbleibend)

### Phase 2 – Abwesenheiten

| Route | Seite |
|---|---|
| `/abwesenheiten` | Excel-Kalender + Genehmigungsworkflow |

- Monatsansicht: eine Zeile pro Mitarbeiter, alle Tage als Spalten
- Direkte Zelleingabe (Kürzel tippen), Drag-to-Fill, Pfeiltasten-Navigation
- Wochenenden + Feiertage (via `feiertagejs` + `settings.federal_state`) grau/gesperrt
- Genehmigungspflichtige Kürzel (U, RU, U3, SU) → `status: pending`
- Direktkürzel (K, KK, AT, S, ÜA) → sofort `status: approved`
- Zusammenfassungsspalten: AT / U+RU / K pro Mitarbeiter

### Phase 3 – Zeiterfassung & Berichte

| Route | Seite |
|---|---|
| `/zeiterfassung` | Alle Stempelzeiten, wochenweise, Korrekturen |
| `/berichte` | Monats-/Jahresauswertung Abwesenheiten + Überstunden |

---

## 6. Feiertage & Kalender-Logik

- `feiertagejs` berechnet alle Feiertage für ein gegebenes Jahr und Bundesland
- Bundesland wird aus `settings.federal_state` geladen (default: `"ST"` – Sachsen-Anhalt)
- Feiertage + Wochenenden gelten als gesperrte Tage:
  - Zählen nicht als Urlaubstage
  - Werden im Kalender grau dargestellt
  - Können nicht per Drag-to-Fill belegt werden

---

## 7. Projektstruktur

```
chef-app/
├── .env.example
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── components.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── lib/
    │   ├── pb.ts          ← PocketBase-Instanz
    │   ├── holidays.ts    ← feiertagejs-Wrapper
    │   └── utils.ts
    ├── stores/
    │   ├── auth.ts
    │   └── notifications.ts
    ├── types/             ← re-export aus ../../shared/types
    ├── components/
    │   ├── Layout/
    │   │   ├── AppLayout.tsx
    │   │   ├── Sidebar.tsx
    │   │   └── ProtectedRoute.tsx
    │   └── ui/            ← shadcn/ui Komponenten
    └── pages/
        ├── Login.tsx
        ├── Dashboard.tsx
        ├── Mitarbeiter/
        │   ├── Mitarbeiterliste.tsx
        │   ├── MitarbeiterDetail.tsx
        │   ├── MitarbeiterForm.tsx
        │   ├── Stammdaten.tsx
        │   ├── Dokumente.tsx
        │   └── Urlaubskonto.tsx
        ├── Abwesenheiten/
        │   ├── Abwesenheiten.tsx
        │   ├── KalenderTable.tsx
        │   └── GenehmigungRow.tsx
        ├── Zeiterfassung/
        │   └── Zeiterfassung.tsx
        ├── Berichte/
        │   └── Berichte.tsx
        └── Einstellungen/
            └── Einstellungen.tsx

shared/
└── types/
    └── index.ts           ← Employee, Absence, VacationAccount, …
```

---

## 8. Nicht im Scope

- Dienstplanung (separates Projekt, eigene Anforderungen)
- Lohnabrechnung / IBAN / Steuerklasse
- Mehrere Standorte / Mandanten
- Mobile-App (Desktop-first, responsive nur für Mitarbeiter-App)
