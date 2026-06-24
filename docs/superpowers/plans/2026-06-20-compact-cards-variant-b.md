# Compact Cards Variant B+ – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zwei Dashboard-Karten (MonatsstundenGauge + UrlaubsCard) mit Mini-Halbkreis-Ringen kompakt und nebeneinander oberhalb der Stempeluhr implementieren — Variante B+.

**Architecture:** `MonatsstundenGauge.tsx` und `UrlaubsCard.tsx` werden komplett überarbeitet. Beide zeigen Mini-SVG-Halbkreis-Gauges (R=32) mit Daten links im SVG und Beschriftung rechts. Das Dashboard-Layout wird umgebaut: Karten oben (`grid-cols-2 gap-3`), Stempeluhr darunter. `DashboardPrototyp.tsx` wird nach Integration gelöscht.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, SVG mit stroke-dasharray für Ring-Animation, date-fns, bestehende Design-System-Farben.

## Global Constraints

- Keine Monatsnavigation (Pfeile) in der kompakten Gauge — nur Monats-Label
- Nur aktueller Monat angezeigt (kein Umschalten)
- Kein Überstunden-Badge (`monthDeltaMins`) in der UrlaubsCard
- Mini-SVG-Gauge: R=32, SVG 88x52, stroke-width=8, Indigo→Violet Gradient (#4F46E5 → #7C3AED)
- Urlaubs-Gauge: Zwei Farben — Indigo (genehmigte) + Amber (#F59E0B, verplante)
- Beide Karten müssen auf Mobile (375px) nebeneinander passen: `grid grid-cols-2 gap-3`
- Karten-Höhe ≤ 80px auf Mobile
- Nur Tailwind-Klassen, keine CSS-Dateien
- `p-3` Padding in Karten

---

## Design-Rationale

**Variante B+ (Mini Rings für beide):**
- Mini-SVG-Halbkreis-Gauge zeigt Fortschritt visuell auf einen Blick
- Beide Karten haben same visual hierarchy und Design-Konsistenz
- Urlaubs-Gauge mit zwei Farben: Indigo (genehmigt/fest) + Amber (verplant/ausstehend)
- Kompakt genug, dass Stempeluhr ohne Scrollen sichtbar bleibt
- SVG-basiert → skalierbar, animierbar (für Zukunft)

**Layout-Change:**
- Karten oben (Überblick): `grid grid-cols-2 gap-3 mb-4`
- Stempeluhr darunter (primäre Aktion): volle Breite, `mb-6`
- Meine Anträge am Ende

---

## Dateistruktur

```
mitarbeiter-app/src/
├── pages/
│   ├── Dashboard.tsx                  ← MODIFY: Layout umbauen (Karten oben)
│   └── DashboardPrototyp.tsx          ← DELETE (nach Integration)
└── components/
    ├── MonatsstundenGauge.tsx         ← REPLACE: Mini-Ring Variante B
    └── UrlaubsCard.tsx                ← REPLACE: Mini-Ring Variante B mit Amber-Farbe
```

---

## Task 1: MonatsstundenGauge.tsx — Mini-Ring Variante

**Files:**
- Modify: `mitarbeiter-app/src/components/MonatsstundenGauge.tsx`

**Interfaces:**
- Consumes: `actualMins: number`, `targetMins: number`, `month: Date`
- Produces: Kompakte Karte (64px × 36px SVG) mit Ring-Gauge links, Zahlen/Monat rechts

- [ ] **Step 1: Komponenten-Signatur überprüfen und anpassen**

Momentan:
```tsx
interface Props {
  actualMins: number
  targetMins: number
  month: Date
  onPrev: () => void
  onNext: () => void
}
```

Neu (ohne Monatsnavigation):
```tsx
interface Props {
  actualMins: number
  targetMins: number
  month: Date
}
```

- [ ] **Step 2: SVG-Konstanten definieren**

```tsx
const R_MINI = 32
const HALF_CIRC = Math.PI * R_MINI // ≈ 100.53
const SVG_WIDTH = 64
const SVG_HEIGHT = 36
```

- [ ] **Step 3: Komponenten-Körper schreiben**

```tsx
export default function MonatsstundenGauge({ actualMins, targetMins, month }: Props) {
  const pct = targetMins > 0 ? Math.min(actualMins / targetMins, 1) : 0
  const dashOffset = (1 - pct) * HALF_CIRC
  const monthLabel = format(month, 'MMMM yyyy', { locale: de })
  
  function fmtH(mins: number) {
    return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`
  }

  return (
    <div className="rounded-xl bg-white border border-[#E5E7EB] shadow-sm p-3 flex items-center gap-3">
      {/* Mini-Ring SVG */}
      <svg width={SVG_WIDTH} height={SVG_HEIGHT} viewBox="0 0 88 52" style={{ overflow: 'visible', flexShrink: 0 }}>
        <defs>
          <linearGradient id="gaugeGradStunden" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        {/* Hintergrund-Bogen */}
        <path
          d={`M ${44 - R_MINI} 44 A ${R_MINI} ${R_MINI} 0 0 1 ${44 + R_MINI} 44`}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Fortschritts-Bogen */}
        <path
          d={`M ${44 - R_MINI} 44 A ${R_MINI} ${R_MINI} 0 0 1 ${44 + R_MINI} 44`}
          fill="none"
          stroke="url(#gaugeGradStunden)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={HALF_CIRC}
          strokeDashoffset={dashOffset}
        />
      </svg>

      {/* Zahlen & Monat rechts */}
      <div>
        <div className="text-sm font-bold text-[#111827] tabular-nums leading-tight">
          {fmtH(actualMins)}
        </div>
        <div className="text-[11px] text-[#9CA3AF]">
          /{fmtH(targetMins)} h
        </div>
        <div className="text-[11px] text-[#6B7280] mt-0.5 capitalize">
          {monthLabel}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Imports aktualisieren (falls nötig)**

Sicherstellen, dass folgende Imports vorhanden sind:
```tsx
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
```

Remove (falls vorhanden):
```tsx
// import { ChevronLeft, ChevronRight } from 'lucide-react'
```

- [ ] **Step 5: Commit**

```bash
git add mitarbeiter-app/src/components/MonatsstundenGauge.tsx
git commit -m "feat(cards): redesign MonatsstundenGauge with mini-ring variant B"
```

---

## Task 2: UrlaubsCard.tsx — Mini-Ring Variante mit Amber-Balken

**Files:**
- Modify: `mitarbeiter-app/src/components/UrlaubsCard.tsx`

**Interfaces:**
- Consumes: `taken: number`, `planned: number`, `entitlement: number`
- Produces: Kompakte Karte (64px × 36px SVG) mit Urlaubs-Ring links, Anzahl offen rechts

**Wichtig:** Prop `monthDeltaMins` entfällt komplett (einschl. Überstunden-Badge).

- [ ] **Step 1: Props-Interface anpassen**

Momentan:
```tsx
interface Props {
  taken: number
  planned: number
  entitlement: number
  monthDeltaMins: number  // ← ENTFERNEN
}
```

Neu:
```tsx
interface Props {
  taken: number
  planned: number
  entitlement: number
}
```

- [ ] **Step 2: SVG-Konstanten + Farben definieren**

```tsx
const R_MINI = 32
const HALF_CIRC = Math.PI * R_MINI // ≈ 100.53
const INDIGO = '#4F46E5'
const VIOLET = '#7C3AED'
const AMBER = '#F59E0B'
```

- [ ] **Step 3: Komponenten-Körper schreiben**

```tsx
export default function UrlaubsCard({ taken, planned, entitlement }: Props) {
  const open = Math.max(0, entitlement - taken - planned)
  const takenPct = entitlement > 0 ? (taken / entitlement) * 100 : 0
  const plannedPct = entitlement > 0 ? (planned / entitlement) * 100 : 0
  
  // Berechne stroke-dasharray für Ring:
  // taken-Anteil: von 0 bis takenPct
  // planned-Anteil: von takenPct bis (takenPct + plannedPct)
  const takenDash = (takenPct / 100) * HALF_CIRC
  const plannedDash = (plannedPct / 100) * HALF_CIRC
  const takenOffset = 0
  const plannedOffset = -takenDash

  return (
    <div className="rounded-xl bg-white border border-[#E5E7EB] shadow-sm p-3 flex items-center gap-3">
      {/* Mini-Ring SVG mit zwei Farben */}
      <svg width="64" height="36" viewBox="0 0 88 52" style={{ overflow: 'visible', flexShrink: 0 }}>
        <defs>
          <linearGradient id="gaugeGradUrlaub" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={INDIGO} />
            <stop offset="100%" stopColor={VIOLET} />
          </linearGradient>
        </defs>
        {/* Hintergrund-Bogen */}
        <path
          d={`M ${44 - R_MINI} 44 A ${R_MINI} ${R_MINI} 0 0 1 ${44 + R_MINI} 44`}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Genehmigte Tage (Indigo→Violet Gradient) */}
        {takenDash > 0 && (
          <path
            d={`M ${44 - R_MINI} 44 A ${R_MINI} ${R_MINI} 0 0 1 ${44 + R_MINI} 44`}
            fill="none"
            stroke="url(#gaugeGradUrlaub)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={takenDash}
            strokeDashoffset={takenOffset}
          />
        )}
        {/* Verplante Tage (Amber) */}
        {plannedDash > 0 && (
          <path
            d={`M ${44 - R_MINI} 44 A ${R_MINI} ${R_MINI} 0 0 1 ${44 + R_MINI} 44`}
            fill="none"
            stroke={AMBER}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={plannedDash}
            strokeDashoffset={plannedOffset}
          />
        )}
      </svg>

      {/* Anzahl offen & Label rechts */}
      <div>
        <div className="text-sm font-bold text-[#111827] tabular-nums leading-tight">
          {open}
        </div>
        <div className="text-[11px] text-[#9CA3AF]">
          offen
        </div>
        <div className="text-[11px] text-[#6B7280] mt-0.5">
          🌴 Urlaub
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Überstunden-Badge entfernen**

Suche nach diesem Block und **lösche ihn komplett**:
```tsx
{monthDeltaMins !== 0 && (
  <div className={cn(...)}>
    {formatHM(monthDeltaMins)} Std. im Monat
  </div>
)}
```

- [ ] **Step 5: Imports aufräumen**

Entferne (falls vorhanden):
```tsx
// import { cn } from '@/lib/utils'  — nur noch nötig wenn an anderen Stellen verwendet
```

Stelle sicher, dass folgende Imports da sind:
```tsx
// (keine speziellen Imports nötig — nur JSX/React)
```

- [ ] **Step 6: Commit**

```bash
git add mitarbeiter-app/src/components/UrlaubsCard.tsx
git commit -m "feat(cards): redesign UrlaubsCard with mini-ring variant B, remove monthDeltaMins"
```

---

## Task 3: Dashboard.tsx — Layout-Umstrukturierung

**Files:**
- Modify: `mitarbeiter-app/src/pages/Dashboard.tsx`

**Scope:** Layout umbauen (Karten oben, Stempeluhr darunter), Props-Aufruf anpassen

- [ ] **Step 1: Props-Aufruf für UrlaubsCard anpassen (Zeile ca. 320)**

Momentan:
```tsx
<UrlaubsCard
  taken={takenDays}
  planned={plannedDays}
  entitlement={entitlement}
  monthDeltaMins={actualMonthMins - targetMins}
/>
```

Neu:
```tsx
<UrlaubsCard
  taken={takenDays}
  planned={plannedDays}
  entitlement={entitlement}
/>
```

- [ ] **Step 2: MonatsstundenGauge-Aufruf anpassen (entferne onPrev, onNext)**

Momentan (Zeile ca. 313):
```tsx
<MonatsstundenGauge
  actualMins={actualMonthMins}
  targetMins={targetMins}
  month={viewMonth}
  onPrev={() => setViewMonth(m => subMonths(m, 1))}
  onNext={() => setViewMonth(m => addMonths(m, 1))}
/>
```

Neu:
```tsx
<MonatsstundenGauge
  actualMins={actualMonthMins}
  targetMins={targetMins}
  month={viewMonth}
/>
```

- [ ] **Step 3: Haupt-Layout umbauen (Zeile ca. 267)**

Momentan:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
  {/* Stempeluhr links */}
  <div className={cn(...)}>...</div>

  {/* Monatsstunden + Urlaub rechts in verticaler Box */}
  <div className="space-y-3">
    <MonatsstundenGauge ... />
    <UrlaubsCard ... />
  </div>
</div>
```

Neu:
```tsx
{/* Schnellübersicht — Karten oben, nebeneinander */}
<div className="grid grid-cols-2 gap-3 mb-4">
  <MonatsstundenGauge
    actualMins={actualMonthMins}
    targetMins={targetMins}
    month={viewMonth}
  />
  <UrlaubsCard
    taken={takenDays}
    planned={plannedDays}
    entitlement={entitlement}
  />
</div>

{/* Stempeluhr — volle Breite */}
<div className="mb-6">
  <div className={cn(
    'rounded-2xl p-6 transition-colors duration-75',
    isStamped
      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200'
      : 'bg-white border border-[#E5E7EB] shadow-sm'
  )}
  style={getStampCardStyle()}
  >
    {/* Stempeluhr-Inhalt — unverändert */}
    ...
  </div>
</div>

{/* Meine Anträge — unverändert */}
...
```

- [ ] **Step 4: Imports aufräumen (falls nötig)**

Da `onPrev`/`onNext` nicht mehr verwendet werden, können diese entfernt werden:
```tsx
// ENTFERNEN (falls nur für Gauge verwendet):
// import { subMonths, addMonths } from 'date-fns'
```

Aber prüf erst, ob sie an anderen Stellen verwendet werden!

- [ ] **Step 5: Commit**

```bash
git add mitarbeiter-app/src/pages/Dashboard.tsx
git commit -m "feat(dashboard): reorganize layout — compact cards above stamp clock"
```

---

## Task 4: Cleanup & Verification

**Files:**
- Delete: `mitarbeiter-app/src/pages/DashboardPrototyp.tsx`
- Modify: `mitarbeiter-app/src/App.tsx`

- [ ] **Step 1: Prototyp-Seite löschen**

```bash
rm mitarbeiter-app/src/pages/DashboardPrototyp.tsx
```

- [ ] **Step 2: Route aus App.tsx entfernen**

In `mitarbeiter-app/src/App.tsx`, entferne:
```tsx
// IMPORT entfernen:
import DashboardPrototyp from './pages/DashboardPrototyp'

// ROUTE entfernen:
<Route path="/prototyp" element={<DashboardPrototyp />} />
```

- [ ] **Step 3: TypeScript-Check**

```bash
cd /Users/ronnybeckmann/Projects/times/mitarbeiter-app && npm run build
```

Erwartung: Kein Fehler, Build erfolgreich.

- [ ] **Step 4: Dev-Server starten und visuell überprüfen**

```bash
npm run dev
```

URL: `http://localhost:5175/` (oder der Port aus dem Terminal)

Überprüfe:
- ✅ Karten sind oben, Stempeluhr darunter
- ✅ Beide Karten nebeneinander auf Mobile (DevTools → 375px)
- ✅ Mini-Ringe laden korrekt (keine Distortion, keine fehlennen Strokes)
- ✅ Urlaubs-Ring zeigt zwei Farben: Indigo (genehmigte) + Amber (verplante)
- ✅ Stempeluhr funktioniert (Swipe)
- ✅ Daten sind aktuell (echte Werte aus PocketBase, nicht Dummy)
- ✅ Keine Console-Fehler

- [ ] **Step 5: Final Commit**

```bash
git add mitarbeiter-app/src/App.tsx
git commit -m "chore(dashboard): remove DashboardPrototyp and its route"
```

---

## Verification (End-to-End)

1. **Build erfolgreich:** `npm run build` → kein Fehler ✅
2. **Dev-Server lädt:** `npm run dev` → App startet ✅
3. **Dashboard anzeige:**
   - Karten oben: MonatsstundenGauge (links) + UrlaubsCard (rechts)
   - Mini-Ringe sichtbar und korrekt gefärbt
   - Zahlen stimmen mit echten Daten überein
4. **Mobile (375px):** Beide Karten nebeneinander ohne Overflow ✅
5. **Stempeluhr:** Swipe funktioniert, Live-Fortschritts-Animation lädt ✅
6. **Keine Fehler:** Console und Browser-DevTools zeigen keine Fehler ✅

---

## Summary

**Implementiert wird:**
- ✨ Kompakte MonatsstundenGauge mit Mini-SVG-Gauge (R=32)
- ✨ Kompakte UrlaubsCard mit Mini-SVG-Gauge + zwei Farben (Indigo + Amber)
- ✨ Dashboard-Layout umgebaut: Karten oben (`grid-cols-2 gap-3`), Stempeluhr darunter
- ✨ Monatsnavigation entfernt (nur aktueller Monat)
- ✨ Überstunden-Badge entfernt
- ✨ Prototyp-Seite gelöscht

**Git-Historie:** 4 Commits (1 pro Komponente + 1 Cleanup)
