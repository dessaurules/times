# Compact Cards Prototyp – 3 Varianten

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zwei Dashboard-Karten (MonatsstundenGauge + UrlaubsCard) kompakt und nebeneinander oberhalb der Stempeluhr neu gestalten — 3 Varianten als Prototyp, damit der User eine wählen kann.

**Architecture:** Eine neue Prototyp-Seite `DashboardPrototyp.tsx` rendert alle 3 Varianten mit Dummy-Daten zum direkten Vergleich. Die echten Komponenten bleiben unberührt. Nach Auswahl einer Variante werden `MonatsstundenGauge` und `UrlaubsCard` ersetzt und das Dashboard-Layout umgebaut.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, date-fns, bestehende shadcn/ui Patterns aus mitarbeiter-app

## Global Constraints

- Kein Überstunden-Badge (`monthDeltaMins`) in der UrlaubsCard — entfällt komplett
- Beide Karten müssen auf Mobile (375px) nebeneinander passen
- Indigo/Violet-Farbschema (#4F46E5 → #7C3AED) konsistent mit Design-System
- Nur Tailwind-Klassen, keine eigenen CSS-Dateien
- Kein neues `p-5 space-y-3` Layout — kompakter: maximal `p-3` oder `p-4`
- `PropTypes` nicht nötig, nur TypeScript-Interfaces

---

## Design-Rationale (Senior Designer)

Die Stempeluhr ist die primäre Aktion der App. Karten oben funktionieren, wenn sie **so kompakt** sind, dass die Stempeluhr ohne Scrollen sichtbar bleibt. Ziel: Karten ≤ 80px Höhe auf Mobile, nebeneinander in einem `grid grid-cols-2 gap-3`.

**Was bleibt:**
- MonatsstundenGauge: Aktuell geleistete Stunden + Soll-Stunden (als Fortschrittsindikator)
- UrlaubsCard: Verbleibende Urlaubstage (Zahl groß), genehmigte + ausstehende Tage als Balken

**Was fällt weg:**
- Überstunden-Badge (monthDeltaMins) — wie vom User gewünscht
- Monatsnavigation (Pfeile) in der kompakten Gauge → zu viel Platz auf kleinen Karten

---

## Die 3 Varianten

### Variante A — "Numbers First" (Minimal, keine SVG)
Zwei flache Karten, nur Zahlen + linearer Balken. Keine SVG-Gauge.

```
┌─────────────────┐  ┌─────────────────┐
│ Jun 2026        │  │ 🌴 Urlaub       │
│ ━━━━━━━━░░░░░░  │  │ ━━━━━░░░░░░░░░  │
│ 38:20 / 168:00h │  │ 12 Tage offen   │
└─────────────────┘  └─────────────────┘
```

### Variante B — "Mini Ring" (Mini-SVG-Gauge)
Kleiner Halbkreis-Ring (R=32, statt R=84) links in der Karte, Zahlen rechts daneben.

```
┌─────────────────┐  ┌─────────────────┐
│  ◜◝  38:20      │  │ 🌴  12          │
│  ◟◞  /168h      │  │ Tage offen      │
│  Jun 2026       │  │ ━━━━━░░         │
└─────────────────┘  └─────────────────┘
```

### Variante C — "Single Strip" (Beide Infos in einer Karte)
Ein durchgehender horizontaler Streifen mit Trenner in der Mitte.

```
┌──────────────────────────────────────────┐
│ 38:20 h          │  🌴 12 Tage offen     │
│ von 168h   ━━░░  │  ━━━━━░░  8 genehm.  │
└──────────────────────────────────────────┘
```

---

## Dateistruktur

```
mitarbeiter-app/src/
├── pages/
│   └── DashboardPrototyp.tsx    ← NEU: Prototyp-Seite mit allen 3 Varianten
└── components/
    ├── MonatsstundenGauge.tsx   ← UNBERÜHRT
    └── UrlaubsCard.tsx          ← UNBERÜHRT
```

---

## Task 1: Prototyp-Seite mit Dummy-Daten aufsetzen

**Files:**
- Create: `mitarbeiter-app/src/pages/DashboardPrototyp.tsx`

**Interfaces:**
- Produces: Default-Export `DashboardPrototyp` — standalone Seite, kein PocketBase-Aufruf

- [ ] **Step 1: Datei anlegen mit Dummy-Daten und Grundstruktur**

```tsx
// mitarbeiter-app/src/pages/DashboardPrototyp.tsx
// Prototyp-Seite: 3 Varianten der kompakten Karten (kein PocketBase, nur Dummy-Daten)

const DUMMY = {
  actualMins: 2300,     // 38:20 h
  targetMins: 10080,    // 168:00 h
  month: new Date(2026, 5, 1),  // Juni 2026
  taken: 8,
  planned: 2,
  entitlement: 30,
}

export default function DashboardPrototyp() {
  return (
    <div className="max-w-md mx-auto p-4 space-y-10">
      <h1 className="text-xl font-bold text-[#111827]">Karten-Prototyp</h1>

      {/* Variante A */}
      <section>
        <p className="text-xs font-semibold text-[#6B7280] mb-2 uppercase tracking-wide">Variante A – Numbers First</p>
        <VariantA {...DUMMY} />
      </section>

      {/* Variante B */}
      <section>
        <p className="text-xs font-semibold text-[#6B7280] mb-2 uppercase tracking-wide">Variante B – Mini Ring</p>
        <VariantB {...DUMMY} />
      </section>

      {/* Variante C */}
      <section>
        <p className="text-xs font-semibold text-[#6B7280] mb-2 uppercase tracking-wide">Variante C – Single Strip</p>
        <VariantC {...DUMMY} />
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Variante A implementieren — "Numbers First"**

Zwei Karten nebeneinander, nur Zahlen und linearer Fortschrittsbalken. Keine SVG.

```tsx
interface CardProps {
  actualMins: number
  targetMins: number
  month: Date
  taken: number
  planned: number
  entitlement: number
}

function fmtH(mins: number) {
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`
}

function VariantA({ actualMins, targetMins, month, taken, planned, entitlement }: CardProps) {
  const pct = targetMins > 0 ? Math.min((actualMins / targetMins) * 100, 100) : 0
  const open = Math.max(0, entitlement - taken - planned)
  const takenPct = entitlement > 0 ? (taken / entitlement) * 100 : 0
  const plannedPct = entitlement > 0 ? (planned / entitlement) * 100 : 0
  const monthLabel = month.toLocaleDateString('de', { month: 'short', year: 'numeric' })

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Stunden-Karte */}
      <div className="rounded-xl bg-white border border-[#E5E7EB] shadow-sm p-3">
        <div className="text-xs text-[#6B7280] mb-2 capitalize">{monthLabel}</div>
        <div className="h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-base font-bold text-[#111827] tabular-nums">{fmtH(actualMins)}</div>
        <div className="text-[11px] text-[#9CA3AF]">von {fmtH(targetMins)} h</div>
      </div>

      {/* Urlaub-Karte */}
      <div className="rounded-xl bg-white border border-[#E5E7EB] shadow-sm p-3">
        <div className="text-xs text-[#6B7280] mb-2">🌴 Urlaub</div>
        <div className="h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden mb-2 flex">
          {takenPct > 0 && (
            <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-l-full" style={{ width: `${takenPct}%` }} />
          )}
          {plannedPct > 0 && (
            <div className="h-full bg-amber-400" style={{ width: `${plannedPct}%` }} />
          )}
        </div>
        <div className="text-base font-bold text-[#111827]">{open}</div>
        <div className="text-[11px] text-[#9CA3AF]">Tage offen</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Variante B implementieren — "Mini Ring"**

Mini-SVG-Halbkreis (R=32, SVG 88x52) links, Zahlen rechts.

```tsx
const R_MINI = 32
const HALF_CIRC_MINI = Math.PI * R_MINI

function VariantB({ actualMins, targetMins, month, taken, planned, entitlement }: CardProps) {
  const pct = targetMins > 0 ? Math.min(actualMins / targetMins, 1) : 0
  const dashOffset = (1 - pct) * HALF_CIRC_MINI
  const open = Math.max(0, entitlement - taken - planned)
  const takenPct = entitlement > 0 ? (taken / entitlement) * 100 : 0
  const plannedPct = entitlement > 0 ? (planned / entitlement) * 100 : 0
  const monthLabel = month.toLocaleDateString('de', { month: 'short', year: 'numeric' })

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Stunden-Karte mit Mini-Ring */}
      <div className="rounded-xl bg-white border border-[#E5E7EB] shadow-sm p-3 flex items-center gap-3">
        <svg width="64" height="36" viewBox="0 0 88 52" style={{ overflow: 'visible', flexShrink: 0 }}>
          <defs>
            <linearGradient id="gB" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
          <path
            d={`M ${44 - R_MINI} 44 A ${R_MINI} ${R_MINI} 0 0 1 ${44 + R_MINI} 44`}
            fill="none" stroke="#E5E7EB" strokeWidth="8" strokeLinecap="round"
          />
          <path
            d={`M ${44 - R_MINI} 44 A ${R_MINI} ${R_MINI} 0 0 1 ${44 + R_MINI} 44`}
            fill="none" stroke="url(#gB)" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={HALF_CIRC_MINI}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div>
          <div className="text-sm font-bold text-[#111827] tabular-nums leading-tight">{fmtH(actualMins)}</div>
          <div className="text-[11px] text-[#9CA3AF]">/{fmtH(targetMins)} h</div>
          <div className="text-[11px] text-[#6B7280] mt-0.5 capitalize">{monthLabel}</div>
        </div>
      </div>

      {/* Urlaub-Karte */}
      <div className="rounded-xl bg-white border border-[#E5E7EB] shadow-sm p-3">
        <div className="flex items-center gap-1 mb-2">
          <span className="text-sm">🌴</span>
          <span className="text-[11px] font-medium text-[#6B7280]">Urlaub</span>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <div className="text-xl font-bold text-[#111827]">{open}</div>
            <div className="text-[11px] text-[#9CA3AF]">Tage offen</div>
          </div>
          <div className="flex-1 pb-1">
            <div className="h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden flex">
              {takenPct > 0 && (
                <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-l-full" style={{ width: `${takenPct}%` }} />
              )}
              {plannedPct > 0 && (
                <div className="h-full bg-amber-400" style={{ width: `${plannedPct}%` }} />
              )}
            </div>
            <div className="text-[11px] text-[#9CA3AF] mt-1">{taken + planned} von {entitlement}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Variante C implementieren — "Single Strip"**

Beide Infos in einer durchgehenden Karte, mit vertikalem Trenner.

```tsx
function VariantC({ actualMins, targetMins, month, taken, planned, entitlement }: CardProps) {
  const pct = targetMins > 0 ? Math.min((actualMins / targetMins) * 100, 100) : 0
  const open = Math.max(0, entitlement - taken - planned)
  const takenPct = entitlement > 0 ? (taken / entitlement) * 100 : 0
  const plannedPct = entitlement > 0 ? (planned / entitlement) * 100 : 0
  const monthLabel = month.toLocaleDateString('de', { month: 'short', year: 'numeric' })

  return (
    <div className="rounded-xl bg-white border border-[#E5E7EB] shadow-sm p-3 flex items-center gap-0">
      {/* Stunden-Seite */}
      <div className="flex-1 pr-3">
        <div className="text-[11px] text-[#6B7280] mb-1.5 capitalize">{monthLabel}</div>
        <div className="text-lg font-bold text-[#111827] tabular-nums leading-tight">{fmtH(actualMins)} h</div>
        <div className="text-[11px] text-[#9CA3AF] mb-2">von {fmtH(targetMins)} h</div>
        <div className="h-1 rounded-full bg-[#E5E7EB] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Trenner */}
      <div className="w-px bg-[#E5E7EB] self-stretch mx-0" />

      {/* Urlaub-Seite */}
      <div className="flex-1 pl-3">
        <div className="text-[11px] text-[#6B7280] mb-1.5">🌴 Urlaub</div>
        <div className="text-lg font-bold text-[#111827] leading-tight">{open}</div>
        <div className="text-[11px] text-[#9CA3AF] mb-2">Tage offen</div>
        <div className="h-1 rounded-full bg-[#E5E7EB] overflow-hidden flex">
          {takenPct > 0 && (
            <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-l-full" style={{ width: `${takenPct}%` }} />
          )}
          {plannedPct > 0 && (
            <div className="h-full bg-amber-400" style={{ width: `${plannedPct}%` }} />
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Route für Prototyp-Seite in App.tsx eintragen (temporär)**

Datei: `mitarbeiter-app/src/App.tsx`

Füge import und Route hinzu:
```tsx
import DashboardPrototyp from './pages/DashboardPrototyp'
// ...
<Route path="/prototyp" element={<DashboardPrototyp />} />
```

Die Route liegt hinter dem Auth-Guard — wenn der User eingeloggt ist, ist `/prototyp` direkt erreichbar.

- [ ] **Step 6: Dev-Server starten und Prototyp im Browser prüfen**

```bash
cd /Users/ronnybeckmann/Projects/times/mitarbeiter-app && npm run dev
```

URL: `http://localhost:5174/prototyp` (oder den Port aus dem Terminal)

Prüfen:
- Alle 3 Varianten sichtbar?
- Auf 375px (Mobile) — beide Karten nebeneinander, kein Overflow?
- Stunden-Zahlen und Fortschrittsbalken korrekt?
- Urlaubs-Karte zeigt `open = entitlement - taken - planned` an?

---

## Task 2: Variante auswählen und ins Dashboard integrieren

> Dieser Task wird erst nach User-Feedback zum Prototyp gestartet.

**Files:**
- Modify: `mitarbeiter-app/src/components/MonatsstundenGauge.tsx` (ersetzen durch kompakte Version)
- Modify: `mitarbeiter-app/src/components/UrlaubsCard.tsx` (Überstunden-Badge entfernen, Prop `monthDeltaMins` raus)
- Modify: `mitarbeiter-app/src/pages/Dashboard.tsx` (Reihenfolge: Karten oben, Stempeluhr darunter)
- Delete: `mitarbeiter-app/src/pages/DashboardPrototyp.tsx` (nach Integration)

- [ ] **Step 1: UrlaubsCard.tsx — `monthDeltaMins` Prop und Badge entfernen**

Interface auf:
```tsx
interface Props {
  taken: number
  planned: number
  entitlement: number
}
```

Kompletter Badge-Block entfernen:
```tsx
// ENTFERNEN:
{monthDeltaMins !== 0 && (
  <div className={cn(...)}>
    {formatHM(monthDeltaMins)} Std. im Monat
  </div>
)}
```

- [ ] **Step 2: Dashboard.tsx — `monthDeltaMins` Prop aus UrlaubsCard-Aufruf entfernen**

```tsx
// VORHER:
<UrlaubsCard
  taken={takenDays}
  planned={plannedDays}
  entitlement={entitlement}
  monthDeltaMins={actualMonthMins - targetMins}
/>

// NACHHER:
<UrlaubsCard
  taken={takenDays}
  planned={plannedDays}
  entitlement={entitlement}
/>
```

- [ ] **Step 3: Dashboard.tsx — Reihenfolge und Layout umbauen**

```tsx
// VORHER: Stempeluhr links, Karten rechts (md:grid-cols-2)
// NACHHER: Karten oben (grid-cols-2), Stempeluhr darunter (volle Breite)

return (
  <div>
    {/* Header */}
    ...

    {/* Schnellübersicht — Karten oben, nebeneinander */}
    <div className="grid grid-cols-2 gap-3 mb-4">
      <MonatsstundenGauge ... />
      <UrlaubsCard ... />
    </div>

    {/* Stempeluhr — volle Breite */}
    <div className="mb-6">
      <div className={cn('rounded-2xl p-6 ...', ...)}>
        ...
      </div>
    </div>

    {/* Meine Anträge */}
    ...
  </div>
)
```

- [ ] **Step 4: Gewählte Variante als neue MonatsstundenGauge und UrlaubsCard implementieren**

Inhalt der jeweiligen Varianten-Funktion 1:1 in `MonatsstundenGauge.tsx` bzw. `UrlaubsCard.tsx` übertragen.

- [ ] **Step 5: Prototyp-Seite und Route aufräumen**

```bash
# DashboardPrototyp.tsx löschen
rm mitarbeiter-app/src/pages/DashboardPrototyp.tsx
# Route aus App.tsx entfernen
```

- [ ] **Step 6: Build prüfen**

```bash
cd /Users/ronnybeckmann/Projects/times/mitarbeiter-app && npm run build
```

Erwartung: Kein TypeScript-Fehler, Build erfolgreich.

- [ ] **Step 7: Commit**

```bash
git add mitarbeiter-app/src/components/MonatsstundenGauge.tsx \
        mitarbeiter-app/src/components/UrlaubsCard.tsx \
        mitarbeiter-app/src/pages/Dashboard.tsx
git commit -m "feat(dashboard): compact stats cards above stamp clock — variant [A/B/C]"
```

---

## Verification

1. Dev-Server starten: `npm run dev` in `mitarbeiter-app/`
2. `/prototyp` aufrufen — alle 3 Varianten sichtbar
3. Chrome DevTools → 375px (iPhone SE) — beide Karten nebeneinander ohne Overflow
4. Zahlen stimmen mit Dummy-Daten überein: `38:20 / 168:00 h`, `12 Tage offen`
5. Nach Integration: Dashboard lädt normal, Stempeluhr funktioniert (Swipe), Karten zeigen echte Daten
6. `npm run build` — kein Fehler
