# Mitarbeiter-App – Design-Dokument

**Projekt:** Schicht & Plan  
**Phase:** 5 – Mitarbeiter-App  
**Datum:** 2026-05-20  
**Status:** Genehmigt

---

## 1. Ziel

Separate React-App für Mitarbeiter des Gastronomie-/Hotelbetriebs. Mitarbeiter sehen ihre eigenen Daten (Abwesenheiten, Zeiterfassung, Dienstplan, Dokumente) und können Anträge stellen sowie Zeiten selbst stempeln. Desktop-first, aber responsive (Antragsstellung auch am Smartphone möglich).

---

## 2. Architektur

**Ansatz:** Separate Vite-App in `mitarbeiter-app/` – vollständig eigenständig, gleicher Tech-Stack wie die Chef-App.

### Tech-Stack

```
React 18 + TypeScript (strict)
Vite 5
React Router v6 (Outlet-basiertes Routing)
Zustand v4 (auth store)
PocketBase JS SDK v0.21
Tailwind CSS v3 + shadcn/ui (Amber als Primärfarbe – identisch zur Chef-App)
date-fns v3
Lucide React
```

### Backend

Verbindet sich zur **selben PocketBase-Instanz** wie die Chef-App (`VITE_PB_URL` in `.env`). Kein eigenes Backend.

### Design

Durchgängig einheitlich mit der Chef-App:
- Amber Primärfarbe (`#BA7517`, hsl: 35 82% 41%)
- Gleiche shadcn/ui Komponenten
- Gleiche CSS-Variablen und globale Klassen
- Sidebar-Navigation (Desktop), kein Bottom-Navigation

---

## 3. Navigation & Seiten

| Route | Seite | Beschreibung |
|---|---|---|
| `/` | Dashboard | Stempeluhr, Urlaubskonto, offene Anträge |
| `/dienstplan` | Dienstplan | Eigener Schichtplan (nur veröffentlichte) |
| `/abwesenheiten` | Abwesenheiten | Jahresübersicht + Monats-Modal + Anträge |
| `/zeiten` | Zeiterfassung | Stempeluhr-Historie, Woche/Monat, Überstundenkonto |
| `/meine-daten` | Meine Daten | Stammdaten, Dokumente, Verfügbarkeiten |
| `/schichttausch` | Schichttausch | Optional – per `settings`-Flag aktivierbar |

---

## 4. Seiten-Design

### 4.1 Dashboard (`/`)

```
┌─────────────────────────────────────────────────────────────────┐
│ ▌ Schicht & Plan                            🔔 Ronny Beckmann ▾ │
├──────────┬──────────────────────────────────────────────────────┤
│ 🏠 Home  │  Guten Morgen, Ronny                  Di, 20.05.2026  │
│ 📋 Plan  │                                                       │
│ 📅 Abw.  │  ┌─────────────────────┐  ┌────────────────────────┐ │
│ ⏱ Zeiten │  │    STEMPELUHR       │  │   URLAUBSKONTO         │ │
│ 👤 Daten │  │  ●  NICHT GESTEMPELT│  │  Anspruch 2026   24 T  │ │
│          │  │  [  EINSTEMPELN  ]  │  │  Genommen         3 T  │ │
│          │  │  Heute: 0:00 h      │  │  Verbleibend     21 T  │ │
│          │  └─────────────────────┘  └────────────────────────┘ │
│          │  ┌──────────────────────────────────────────────────┐ │
│          │  │  OFFENE ANTRÄGE                                  │ │
│          │  │  Urlaub  26.05.–28.05.2026   ● Ausstehend       │ │
│          │  └──────────────────────────────────────────────────┘ │
└──────────┴──────────────────────────────────────────────────────┘
```

**Stempeluhr-Logik:**
- Button wechselt zwischen „Einstempeln" und „Ausstempeln"
- Zeigt aktuelle Session-Dauer live
- Laufende Session wird als `time_entry` mit `start_time` gespeichert; `end_time` bei Ausstempeln gesetzt
- Admin kann Zeiten nachträglich korrigieren (in der Chef-App)

### 4.2 Dienstplan (`/dienstplan`)

```
┌──────────────────────────────────────────────────────────────┐
│  Mein Dienstplan            ◀ KW 21 / Mai 2026 ▶             │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Mo 18.05   08:00 – 16:00   Service    8,0 h          │    │
│  │ Di 19.05   08:00 – 16:00   Service    8,0 h          │    │
│  │ Mi 20.05   10:00 – 18:00   Service    8,0 h          │    │
│  │ Do 21.05   FREI            –           –             │    │
│  │ Fr 22.05   FREI            –           –             │    │
│  │ Sa 23.05   09:00 – 15:00   Service    6,0 h          │    │
│  │ So 24.05   FREI            –           –             │    │
│  ├──────────────────────────────────────────────────────┤    │
│  │ Woche gesamt: 30,0 h  · Soll: 40,0 h                │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

**Regeln:**
- Zeigt nur `shift_entries` mit `plan_id.status = 'published'`
- Entwürfe sind für Mitarbeiter unsichtbar (PocketBase-Regel)
- Navigation: wochenweise per Pfeile

### 4.3 Abwesenheiten (`/abwesenheiten`)

**Jahresübersicht** – 12 Monats-Kacheln, Klick öffnet Monats-Modal:

```
┌─────────────────────────────────────────────────────────────────┐
│  Abwesenheiten  2026                             [+ Antrag]     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │ Januar  │ │ Februar │ │  März   │ │  April  │              │
│  │    –    │ │    –    │ │    –    │ │  ░U░░U░ │              │
│  │         │ │         │ │         │ │  2 T U  │              │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘              │
│  ...                                                            │
│  Gesamt: U 2 T · K 1 T · Verbleibend 22 T                      │
└─────────────────────────────────────────────────────────────────┘
```

**Monats-Modal** – alle Tage in einer horizontalen Zeile (wie Excel-Vorlage):

```
┌──────────────────────────────────────────────────────────────────────┐
│  April 2026                                          [+ Antrag]   ✕  │
├──────────────────────────────────────────────────────────────────────┤
│  ◄ scroll ──────────────────────────────────────────── scroll ►      │
│  ┌────┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐  │
│  │    │01│02│03│04│05│06│07│08│09│10│11│12│13│14│15│16│17│18│19│…  │
│  │    │Mi│Do│Fr│Sa│So│Mo│Di│Mi│Do│Fr│Sa│So│Mo│Di│Mi│Do│Fr│Sa│So│…  │
│  ├────┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤  │
│  │ RB │  │  │  │██│██│  │  │  │  │  │██│██│  │  │ U│ U│  │██│██│…  │
│  └────┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘  │
│  ██ Wochenende/Feiertag   U Urlaub   K Krank                        │
│  Arbeitstage: 21  ·  Urlaub: 2 T  ·  Krank: 0 T                    │
└──────────────────────────────────────────────────────────────────────┘
```

**Antrag stellen – Dialog:**

```
┌──────────────────────────────────────────┐
│  Neuer Antrag                         ✕  │
│  Art       [Krank (K)              ▾]    │
│  Von        [20.05.2026]                 │
│  Bis        [22.05.2026]                 │
│  AU-Bescheinigung                        │
│  ┌──────────────────────────────────┐    │
│  │  📎 Datei auswählen (PDF/JPG)   │    │
│  └──────────────────────────────────┘    │
│  Notiz (optional)                        │
│           [Abbrechen]  [Einreichen]      │
└──────────────────────────────────────────┘
```

**Regeln:**
- Genehmigungs-pflichtige Kürzel: U, RU, U3, SU → `status: pending`
- Direkt-Kürzel: K, KK, AT, S, ÜA → `status: approved`
- AU-Upload nur bei K und KK (optional, aber empfohlen)
- Wochenenden und Feiertage (Sachsen-Anhalt) grau/gesperrt

### 4.4 Zeiterfassung (`/zeiten`)

```
┌──────────────────────────────────────────────────────────────┐
│  Zeiterfassung          ◀ KW 21 / Mai 2026 ▶                 │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Tag    Kommt   Geht    Pause   Ist     Status          │  │
│  │ Mo 18  08:00   16:30   30 min  8:00 h  ✓              │  │
│  │ Di 19  07:45   16:15   30 min  8:00 h  ✓              │  │
│  │ Mi 20  08:00   –       –       3:12 h  ● läuft        │  │
│  │ Do 21  –       –       –       –       –              │  │
│  │ Fr 22  –       –       –       –       –              │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ Soll: 40:00 h   Ist: 19:12 h   Diff: -20:48 h        │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Regeln:**
- Mitarbeiter stempelt via Dashboard (Kommt/Geht-Button)
- Beim Login wird geprüft ob eine offene Session existiert (`start_time` gesetzt, kein `end_time`) – falls ja, wird der Button als „Ausstempeln" angezeigt
- Zeiterfassung-Seite zeigt Verlauf (nur lesen)
- Admin kann Einträge in der Chef-App korrigieren
- Pausenberechnung nach §4 ArbZG (ab 6h → 30min, ab 9h → 45min)
- Überstundenkonto: kumulierter Saldo über Monate

### 4.5 Meine Daten (`/meine-daten`)

Drei Tabs:

**Stammdaten** – nur lesend (Änderungen durch Admin):
- Name, Abteilung, Vertragsart, Wochenstunden, Eintrittsdatum, Urlaubsanspruch

**Dokumente:**
```
┌──────────────────────────────────────────────────────────────┐
│ Name               Typ         Datum      Aktion             │
│ Arbeitsvertrag     Vertrag      01.2023   ⬇ PDF              │
│ Krankmeldung Mai   AU-Schein    20.05.26  ⬇ PDF              │
│ Lohnschein Apr     Lohnschein   30.04.26  ⬇ PDF              │
└──────────────────────────────────────────────────────────────┘
⚠ Dokumente werden vom Admin verwaltet.
```

**Verfügbarkeiten** – Mitarbeiter trägt bevorzugte/nicht-verfügbare Zeiten ein (wird für KI-Dienstplanung in Phase 6 genutzt).

### 4.6 Schichttausch (`/schichttausch`) – Optional

- Nur sichtbar wenn `settings['shift_swap_enabled'] = true` (eigener Key, unabhängig von `employee_requests_enabled`)
- Tausch beantragen, offene Schichten einsehen
- Workflow: MA beantragt → Kollege stimmt zu → Admin genehmigt

---

## 5. Authentifizierung & Rollen

- Login via PocketBase Auth (gleiche Instanz wie Chef-App)
- Nur Mitarbeiter mit `role = 'mitarbeiter'` haben Zugang
- Schichtleiter und GF landen in der Chef-App
- `employee_id` muss am User-Objekt gesetzt sein (sonst Fehlermeldung)
- ProtectedRoute leitet nicht-eingeloggte Nutzer zur Login-Seite

---

## 6. Datenquellen (PocketBase Collections)

| Collection | Verwendung |
|---|---|
| `users` | Auth, Rolle, employee_id |
| `employees` | Stammdaten (lesend) |
| `absences` | Eigene Abwesenheiten + Anträge erstellen |
| `time_entries` | Stempeluhr, Zeitverlauf |
| `shift_entries` + `shift_plans` | Dienstplan (nur published) |
| `documents` | Eigene Dokumente (lesend + AU-Upload) |
| `availability` | Verfügbarkeiten (lesen + schreiben) |
| `notifications` | Glocke, Realtime |
| `settings` | Schichttausch-Flag |
| `departments` | Abteilungsname anzeigen |

---

## 7. Nicht im Scope

- Lohnzettel erstellen / Gehaltsabrechnungen
- Bankdaten / Notfallkontakt
- Mitarbeiterliste anderer Mitarbeiter
- Dienstplan bearbeiten (nur Admin/GF/SL in Chef-App)
- Abwesenheiten anderer Mitarbeiter sehen

---

## 8. Projektstruktur

```
mitarbeiter-app/
├── .env.example
├── .gitignore
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
    │   ├── pb.ts
    │   └── utils.ts
    ├── stores/
    │   ├── auth.ts
    │   └── notifications.ts
    ├── types/
    │   └── index.ts
    ├── components/
    │   ├── Layout/
    │   └── ui/
    └── pages/
        ├── Login.tsx
        ├── Dashboard.tsx
        ├── Dienstplan.tsx
        ├── Abwesenheiten/
        │   ├── Abwesenheiten.tsx
        │   ├── MonthModal.tsx
        │   └── AntragDialog.tsx
        ├── Zeiten/
        │   └── Zeiten.tsx
        ├── MeineDaten/
        │   ├── MeineDaten.tsx
        │   ├── Stammdaten.tsx
        │   ├── Dokumente.tsx
        │   └── Verfuegbarkeiten.tsx
        └── Schichttausch/
            └── Schichttausch.tsx
```
