# Mobile Bugfixes für Mitarbeiter-App

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Behebe responsive Design-Probleme auf iPhone, Fix für Swipe-Button-Animation und Auto-Refresh der Minutenzeit beim Stempeln

**Architecture:** 
- **Responsive Issues:** Tailwind-Breakpoints prüfen, mobile-first Ansatz mit `px-4 sm:px-6 md:px-0`, flexible Grid-Layouts statt fixen Breiten
- **Swipe-Button:** Überprüfe Button-Animation und CSS-Transitions für korrektes Snap-Verhalten
- **Timer-Refresh:** RealTime-Subscriptions für live Minutenzeit-Updates statt nur Polling mit setInterval

**Tech Stack:** React 19, Tailwind CSS, date-fns, PocketBase RealTime Subscriptions

## Global Constraints

- iPhone-Kompatibilität: min. iOS 14 (Safari)
- Bildschirmgrößen: 320px–390px (kleine iPhones) bis 460px+ (größere)
- Mobile-first Tailwind-Breakpoints: `sm:640px`, `md:768px`
- RealTime im Produktions-Backend nutzen (PocketBase RealTime-Subscriptions)
- Keine Breaking Changes in bestehendem API

---

## Task 1: Responsive Design für Login-Seite

**Files:**
- Modify: `mitarbeiter-app/src/pages/Login.tsx:26–87`
- Test: Manual testing auf iPhone SE (375px) und iPhone 14 Pro (430px)

**Interfaces:**
- Consumes: Keine neuen Abhängigkeiten
- Produces: Vollständig responsive Login-Seite mit optimalen Abständen auf mobil

**Problems to Fix:**
- Card-Padding zu groß auf kleinen Screens (aktuell `p-8`)
- Text-Größe könnte auf sehr kleinen Screens optimiert werden
- Input-Höhe und Button-Höhe konsistent

- [ ] **Step 1: Prüfe aktuelle Responsive-Verhalten auf iPhone SE (375px)**

Mit DevTools öffnen → Device emulation auf iPhone SE 375px
Beobachte: Ist die Card gut lesbar? Gibt es overflow? Passen alle Elemente?

- [ ] **Step 2: Update Card-Padding für mobile Geräte**

**Old** (Zeile 38):
```tsx
<div className="bg-white rounded-2xl shadow-xl shadow-gray-100 border border-[#E5E7EB] p-8">
```

**New**:
```tsx
<div className="bg-white rounded-2xl shadow-xl shadow-gray-100 border border-[#E5E7EB] p-6 sm:p-8">
```

- [ ] **Step 3: Update Heading-Größe für mobile**

**Old** (Zeile 33):
```tsx
<h1 className="text-2xl font-bold text-[#111827]">Schicht & Plan</h1>
```

**New**:
```tsx
<h1 className="text-xl sm:text-2xl font-bold text-[#111827]">Schicht & Plan</h1>
```

- [ ] **Step 4: Commit**

```bash
git add mitarbeiter-app/src/pages/Login.tsx
git commit -m "fix: responsive padding und text-sizes auf Login-Seite für mobile"
```

---

## Task 2: Responsive Design für Zeiten-Seite (Tabelle)

**Files:**
- Modify: `mitarbeiter-app/src/pages/Zeiten/Zeiten.tsx:206–335`
- Test: Manual testing auf iPhone (375px, 414px)

**Interfaces:**
- Consumes: Existing TimeEntry struktur
- Produces: Responsive Tabellen-Layout mit Stack-View auf mobil

**Problems to Fix:**
- Tabelle hat `min-w-[480px]` mit 6 Spalten → zu eng auf iPhone
- Grid `grid-cols-[80px_1fr_1fr_80px_80px_90px]` ist nicht responsive
- Horizontal-Scroll ist schwierig auf mobil

**Strategy:** 
- Auf Screens < 768px: Vertikale Card-Liste statt Tabelle
- Auf Screens ≥ 768px: Behalte Tabelle mit horizontalem Scroll

- [ ] **Step 1: Erstelle neue mobile-optimierte Komponente für Tag-Zeilen**

**Create:** `mitarbeiter-app/src/pages/Zeiten/DayTimeCard.tsx`

```tsx
import { format, parseISO, isWeekend, isToday } from 'date-fns'
import { de } from 'date-fns/locale'
import { Clock } from 'lucide-react'
import type { TimeEntry } from '@shared/types'
import { cn } from '@/lib/utils'

export interface DayTimeCardProps {
  day: Date
  dayEntries: TimeEntry[]
  sollPerDay: number
  isHoliday: boolean
  now: Date
}

function fmtHHMM(iso: string): string {
  return format(parseISO(iso), 'HH:mm')
}

function netMins(entry: TimeEntry, now = new Date()): number {
  const { differenceInMinutes, parseISO } = require('date-fns')
  const end = entry.end_time ? parseISO(entry.end_time) : now
  const gross = differenceInMinutes(end, parseISO(entry.start_time))
  return Math.max(0, gross - (entry.break_minutes ?? 0))
}

function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}:${String(m).padStart(2, '0')} h`
}

export default function DayTimeCard({ day, dayEntries, sollPerDay, isHoliday, now }: DayTimeCardProps) {
  const isWE = isWeekend(day)
  const isCurrent = isToday(day)
  const runningE = dayEntries.find(e => !e.end_time)
  const istMins = dayEntries.reduce((s, e) => s + netMins(e, now), 0)
  const ds = format(day, 'yyyy-MM-dd')

  if (dayEntries.length === 0) {
    return (
      <div className={cn(
        'p-4 rounded-xl border',
        (isWE || isHoliday) ? 'bg-[#F9FAFB] border-[#E5E7EB]' : 'bg-white border-[#E5E7EB]'
      )}>
        <div className="text-sm font-medium text-[#111827] mb-3">
          <div>{format(day, 'EEE', { locale: de })}</div>
          <div className="text-xs text-[#6B7280]">{format(day, 'd. MMM', { locale: de })}</div>
        </div>
        <div className="text-sm text-[#D1D5DB]">Keine Einträge</div>
      </div>
    )
  }

  return (
    <div className={cn(
      'p-4 rounded-xl border space-y-2',
      isCurrent && !isWE ? 'bg-indigo-50/40 border-indigo-200' : 'bg-white border-[#E5E7EB]'
    )}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm font-medium text-[#111827]">
            {format(day, 'EEE', { locale: de })}
          </div>
          <div className="text-xs text-[#6B7280]">
            {format(day, 'd. MMM', { locale: de })}
          </div>
        </div>
        <div className="text-right">
          {isWE || isHoliday ? (
            <span className="text-xs text-[#D1D5DB] font-medium">WE</span>
          ) : runningE ? (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium whitespace-nowrap">
              <Clock size={11} className="animate-pulse" /> läuft
            </span>
          ) : istMins >= sollPerDay - 5 ? (
            <span className="text-xs text-emerald-600 font-bold">✓</span>
          ) : (
            <span className="text-xs text-amber-600 font-bold">~</span>
          )}
        </div>
      </div>

      {/* Times */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-[#9CA3AF] block text-[10px]">Kommt</span>
          <span className="font-medium text-[#111827]">{fmtHHMM(dayEntries[0].start_time)}</span>
        </div>
        <div>
          <span className="text-[#9CA3AF] block text-[10px]">Geht</span>
          <span className={cn('font-medium', runningE ? 'text-emerald-600' : 'text-[#111827]')}>
            {runningE ? 'läuft…' : fmtHHMM(dayEntries[dayEntries.length - 1].end_time!)}
          </span>
        </div>
        <div>
          <span className="text-[#9CA3AF] block text-[10px]">Pause</span>
          <span className="font-medium text-[#111827]">
            {dayEntries[0].break_minutes ? `${dayEntries[0].break_minutes}m` : '—'}
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="border-t border-[#F3F4F6] pt-2 flex justify-between items-center">
        <span className="text-[#9CA3AF] text-xs">Ist</span>
        <span className={cn('font-bold text-sm tabular-nums', runningE ? 'text-emerald-600' : 'text-[#111827]')}>
          {fmtDuration(istMins)}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update Zeiten.tsx um mobile-responsive Layout**

**Old** (Zeile 153–335):

```tsx
return (
  <div>
    {/* Header */}
    ...
    {/* Wochen-Navigation */}
    ...
    {/* Wochen-Tabelle */}
    <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden min-w-[480px]">
      ...
    </div>
    </div>
    ...
  </div>
)
```

**New**:

```tsx
return (
  <div>
    {/* Header */}
    ...
    {/* Wochen-Navigation */}
    ...
    
    {/* Mobile: Card-Liste */}
    <div className="md:hidden space-y-3">
      {loading ? (
        <div className="py-8 text-center text-sm text-[#6B7280]">Lade…</div>
      ) : (
        weekDays.map(day => (
          <DayTimeCard
            key={format(day, 'yyyy-MM-dd')}
            day={day}
            dayEntries={entriesForDay(day)}
            sollPerDay={sollPerDay}
            isHoliday={holidays.has(format(day, 'yyyy-MM-dd'))}
            now={now}
          />
        ))
      )}
    </div>

    {/* Desktop: Tabelle */}
    <div className="hidden md:block overflow-x-auto">
    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
      ... (bestehender Tabellen-Code)
    </div>
    </div>
    ...
  </div>
)
```

**Add import at top:**
```tsx
import DayTimeCard from './DayTimeCard'
```

- [ ] **Step 3: Test auf mobile und desktop**

```bash
# Mobile test: Safari DevTools → iPhone 12 (390px)
# Desktop test: Browser fullscreen auf 1024px+

# Prüfe:
# - Mobile: Card-Liste lesbar, nicht zu viel Whitespace
# - Desktop: Tabelle sichtbar, horizontal scroll falls nötig
# - Übergang smooth bei 768px Breakpoint
```

- [ ] **Step 4: Commit**

```bash
git add mitarbeiter-app/src/pages/Zeiten/DayTimeCard.tsx mitarbeiter-app/src/pages/Zeiten/Zeiten.tsx
git commit -m "fix: responsive zeiten-seite mit card-liste auf mobile"
```

---

## Task 3: Responsive Design für Abwesenheiten-Seite

**Files:**
- Modify: `mitarbeiter-app/src/pages/Abwesenheiten/Abwesenheiten.tsx`
- Test: Manual testing auf iPhone

**Interfaces:**
- Consumes: Existing Absence struktur
- Produces: Responsive Monats-Ansicht auf mobil

- [ ] **Step 1: Überprüfe aktuelle mobile Anzeige**

DevTools auf iPhone 375px öffnen, Abwesenheiten-Seite laden
Beobachte: Funktioniert das Monats-Grid? Gibt es Overflow?

- [ ] **Step 2: Add responsive Padding und Layout-Adjustments**

Finde im Code (ab Zeile 100+) den Rendering-Teil und update:

**Old:**
```tsx
<div className="grid grid-cols-4 gap-2">
```

**New** (if this pattern exists):
```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
```

Add mobile-first padding:

```tsx
<div className="px-4 sm:px-6 md:px-8">
```

- [ ] **Step 3: Update Modal/Dialog für mobile**

Stelle sicher, dass `AntragDialog` auf mobil korrekt displayed wird:

```tsx
// In AntragDialog.tsx
<div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
  <div className="bg-white rounded-2xl sm:rounded-3xl w-full sm:w-full max-w-lg p-6 sm:p-8 shadow-xl">
```

- [ ] **Step 4: Commit**

```bash
git add mitarbeiter-app/src/pages/Abwesenheiten/Abwesenheiten.tsx
git commit -m "fix: responsive layout für abwesenheiten-seite"
```

---

## Task 4: Responsive Design für Dienstplan-Seite

**Files:**
- Modify: `mitarbeiter-app/src/pages/Dienstplan.tsx`
- Test: Manual testing auf iPhone

**Interfaces:**
- Consumes: Existing Shift/Schedule struktur
- Produces: Responsive Dienstplan-Ansicht

- [ ] **Step 1: Review Dienstplan.tsx auf responsive Issues**

```bash
cat /Users/ronnybeckmann/Projects/times/mitarbeiter-app/src/pages/Dienstplan.tsx
```

Prüfe auf:
- Feste Breiten (max-w-xl, w-96, etc.)
- Grid-Layouts ohne Breakpoints
- Overflow-X ohne responsive handling

- [ ] **Step 2: Apply mobile-first adjustments**

Gängige Patterns:
```tsx
// Before
<div className="grid grid-cols-7 gap-2">

// After
<div className="grid grid-cols-7 gap-1 sm:gap-2">
```

```tsx
// Before
<div className="px-6">

// After
<div className="px-4 sm:px-6 md:px-8">
```

- [ ] **Step 3: Commit**

```bash
git add mitarbeiter-app/src/pages/Dienstplan.tsx
git commit -m "fix: responsive layout für dienstplan-seite"
```

---

## Task 5: Responsive Design für Dashboard/Start-Seite

**Files:**
- Modify: `mitarbeiter-app/src/pages/Dashboard.tsx:146–318`
- Test: Manual testing auf iPhone (375px, 390px)

**Interfaces:**
- Consumes: Existing time_entry, absence, vacation_account data
- Produces: Responsive Dashboard mit optimalen Abständen auf mobil

**Problems to Fix:**
- `grid-cols-1 md:grid-cols-2` ist okay, aber Abstand zwischen Cards könnte optimiert sein
- Sidebar/Container-Padding könnte auf mobil kleiner sein
- Große Zahlen und Icons könnten auf sehr kleinen Screens überlaufen

- [ ] **Step 1: Test Dashboard auf iPhone 375px**

DevTools: iPhone 375px
Beobachte: Sind die Cards lesbar? Passen Zahlen (Stunden) komplett? Gibt es Clipping?

- [ ] **Step 2: Reduziere Top-Level Padding auf mobil**

**Old** (Zeile 149):
```tsx
<div className="mb-6">
```

**New**:
```tsx
<div className="px-4 sm:px-6 md:px-0 mb-4 sm:mb-6">
```

- [ ] **Step 3: Reduziere Grid Gap auf mobil**

**Old** (Zeile 162):
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
```

**New**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
```

- [ ] **Step 4: Reduziere Card-Padding auf mobil**

**Old** (Zeile 165):
```tsx
'rounded-2xl p-6 transition-all',
```

**New**:
```tsx
'rounded-2xl p-4 sm:p-6 transition-all',
```

- [ ] **Step 5: Anpasse Heading-Größe**

**Old** (Zeile 151):
```tsx
<h1 className="text-2xl font-bold text-[#111827]">
```

**New**:
```tsx
<h1 className="text-xl sm:text-2xl font-bold text-[#111827]">
```

- [ ] **Step 6: Commit**

```bash
git add mitarbeiter-app/src/pages/Dashboard.tsx
git commit -m "fix: responsive padding und spacing für dashboard"
```

---

## Task 6: Fix Swipe-Button Animation (Snap zurück)

**Files:**
- Modify: `mitarbeiter-app/src/pages/Dashboard.tsx:194–206`
- Test: Manual test - Button cliceken/tappen und beobachten, ob er zurück-snapt

**Interfaces:**
- Consumes: `handleStempel()` function
- Produces: Button mit korrektem Snap-Verhalten nach Interaktion

**Problems to Fix:**
- Button hat nur `active:scale-95` transition, möglicherweise fehlende CSS-transitions für smooth snap-back
- Nach API-Response könnte der Button in falschem State bleiben

- [ ] **Step 1: Überprüfe aktuelles Button-Verhalten**

Öffne Dashboard auf iPhone, tippe mehrmals auf Einstempel-Button
Beobachte: Springt der Button nach Release sofort zurück? Oder bleibt er in Press-State?

- [ ] **Step 2: Update Button-Klasse mit expliziter Transition**

**Old** (Zeile 194–206):
```tsx
<button
  onClick={handleStempel}
  disabled={stamping}
  className={cn(
    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-60',
    isStamped
      ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
      : 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-200 hover:from-indigo-600 hover:to-violet-700'
  )}
>
```

**New**:
```tsx
<button
  onClick={handleStempel}
  disabled={stamping}
  className={cn(
    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 active:scale-95 disabled:opacity-60',
    isStamped
      ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
      : 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-200 hover:from-indigo-600 hover:to-violet-700'
  )}
>
```

(Hinzugefügt: `duration-150` für explizite Transition-Duration)

- [ ] **Step 3: Stelle sicher, dass `stamping` State korrekt managed wird**

Prüfe `handleStempel()` function (Zeile 93–115):
```tsx
async function handleStempel() {
  if (!employeeId || stamping) return
  setStamping(true)  // ← Button disablen
  setError(null)
  try {
    // ... API-Call ...
  } catch (e) {
    setError((e as Error).message)
  } finally {
    setStamping(false)  // ← Button wieder enablen
  }
}
```

Das sieht korrekt aus. Der Button sollte sofort zurück-snappen weil:
1. `active:scale-95` wird auf mobile Release aufgehoben
2. `transition-all duration-150` macht das smooth

- [ ] **Step 4: Test auf iPhone**

```bash
# Öffne Dev Tools mit iPhone-Emulation
# Tippe mehrmals auf Einstempel-Button
# Erwartung: Button snapt sofort (aber smooth) nach Release zurück

# Falls immer noch Problem:
# - Prüfe Browser-DevTools → Computed Styles auf dem Button
# - Checke ob CSS-Transitions richtig applied werden
```

- [ ] **Step 5: Commit**

```bash
git add mitarbeiter-app/src/pages/Dashboard.tsx
git commit -m "fix: button snap-back animation mit expliziter transition-duration"
```

---

## Task 7: Fix Auto-Refresh der Minutenzeit beim Stempeln

**Files:**
- Modify: `mitarbeiter-app/src/pages/Dashboard.tsx:34–89` (useEffect für Timer)
- Test: Live auf Server - Stempel einstempeln und beobachte, ob Minutenzeit alle 10s aktualisiert

**Interfaces:**
- Consumes: `now` state, `openEntry` TimeEntry
- Produces: Live-updating Minutenzeit ohne RealTime-Subscriptions

**Problems to Fix:**
- Timer läuft alle 10 Sekunden (`setInterval(..., 10_000)`)
- Aber Minutenzeit könnte nicht aktualisiert werden, wenn:
  - Timer wird nicht korrekt geleert bei unmount
  - Browser-Tab inaktiv → Timer wird pausiert
  - Zu lange Wartezeit zwischen Updates (10s ist eigentlich lang für Live-Counter)

**Strategy:**
- Reduziere Update-Interval auf 1 Sekunde für besser wahrnehmbare Live-Updates
- Stelle sicher, dass Timer cleanup robust ist
- Teste mit Browser-Dev-Tools Throttling

- [ ] **Step 1: Überprüfe aktuellen Timer-Setup im Dashboard**

Read Zeile 40–88:

```tsx
const [now, setNow] = useState(new Date())
const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

// ...

useEffect(() => {
  timerRef.current = setInterval(() => setNow(new Date()), 10_000)
  return () => { if (timerRef.current) clearInterval(timerRef.current) }
}, [])
```

- [ ] **Step 2: Reduziere Update-Interval auf 1 Sekunde**

**Old** (Zeile 86):
```tsx
timerRef.current = setInterval(() => setNow(new Date()), 10_000)
```

**New**:
```tsx
timerRef.current = setInterval(() => setNow(new Date()), 1_000)
```

**Why:** 1 Sekunde ist Standard für Live-Uhren/Zähler. 10 Sekunden ist zu lange und Benutzer denken, die App ist eingefroren.

- [ ] **Step 3: Gleiches für Zeiten.tsx**

Read und update Zeile 59–62 in Zeiten.tsx:

**Old**:
```tsx
timerRef.current = setInterval(() => setNow(new Date()), 10_000)
```

**New**:
```tsx
timerRef.current = setInterval(() => setNow(new Date()), 1_000)
```

- [ ] **Step 4: Test auf Server**

```bash
# Öffne Mitarbeiter-App auf iPhone (live auf pi)
# Stempel Einstempeln
# Beobachte Dashboard: Minutenzeit sollte jede Sekunde ++1 gehen

# Test 1: normales Ansehen → sollte tick-tick-tick gehen
# Test 2: Tab in den Hintergrund und zurück → sollte weiter ticking
# Test 3: Wechsel zu Zeiten-Seite → sollte auch ticking
```

**If still not working:**
- Prüfe Browser-Console auf Fehler
- Prüfe PocketBase Backend für Fehler in time_entries collection
- Ggf. ist das Problem in RealTime-Subscriptions (separate Task wenn nötig)

- [ ] **Step 5: Commit**

```bash
git add mitarbeiter-app/src/pages/Dashboard.tsx mitarbeiter-app/src/pages/Zeiten/Zeiten.tsx
git commit -m "fix: reduziere timer-interval auf 1s für live minutenzeit-updates"
```

---

## Task 8: (Optional) RealTime-Subscriptions für instant Updates

**Files:**
- Modify: `mitarbeiter-app/src/pages/Dashboard.tsx` (optional enhance)
- Modify: `mitarbeiter-app/src/pages/Zeiten/Zeiten.tsx` (optional enhance)

**Interfaces:**
- Consumes: PocketBase RealTime API
- Produces: Instant time_entry updates ohne Polling

**Note:** Diesen Task machen wir NUR, falls nach Task 7 der Auto-Refresh immer noch nicht funktioniert.

**Plan wenn nötig:**
- Setze RealTime-Subscription auf time_entries collection
- Update local state sofort bei changes im Backend
- Fallback: behalte 1s-Poll als Backup

---

## Testing Checklist (nach allen Tasks)

- [ ] Login-Seite responsive auf iPhone 375px, 390px, 414px
- [ ] Dashboard responsive mit card-layout auf mobil
- [ ] Zeiten responsive mit card-liste auf mobil
- [ ] Abwesenheiten responsive auf mobil
- [ ] Dienstplan responsive auf mobil
- [ ] Button snap-back sofort nach Tap/Release
- [ ] Minutenzeit live-updating (tick-tick-tick jede Sekunde) beim Stempel
- [ ] Keine horizontal-scroll-Fehler auf iPhone
- [ ] Keine clipping/overflow von Text oder Icons auf sehr kleinen Screens (320px)
- [ ] Desktop-Layout (≥768px) nicht beschädigt

## Estimated Scope

- **Responsive Tasks (1-5):** 30-45 min (Code-Änderungen minimal, aber gründliches Testing nötig)
- **Button-Fix (6):** 10-15 min (sollte schnell sein)
- **Timer-Fix (7):** 5 min (ein-Zeile-Änderung + Testing)
- **Total:** ~60 min Arbeit + 20 min Testing = ~1.5h

---

## Next Steps nach Plan-Approval

1. Benutzer reviewt Plan und genehmigt
2. Wählt Execution-Methode:
   - **Subagent-Driven:** Fresh subagent pro Task
   - **Inline:** Alle Tasks in dieser Session
3. Implementation startet
