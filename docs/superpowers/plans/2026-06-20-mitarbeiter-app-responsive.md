# Mitarbeiter-App Responsivitäts-Fixes — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alle Mobile-Responsivitätsprobleme der Mitarbeiter-App beheben — Safe-Area, Bottom-Sheet-Dialoge, fluid SwipeButton, Viewport-sicheres Notification-Panel, Grid-Korrekturen, Accessibility und eine neue Card-Ansicht für den Dienstplan auf Mobile.

**Architecture:** Mobile-First-Fixes mit Tailwind-Breakpoints (`md:` = 768px als einzige Grenze). Bestehende Desktop-Layouts bleiben unverändert, Mobile-Layouts werden ergänzt. Neue Dienstplan-Komponente `DienstplanMobileCard.tsx` kapselt das Card-Layout sauber ab.

**Tech Stack:** React 19, TypeScript strict, Tailwind v3 (sm=640px, md=768px), Lucide-Icons, date-fns v4, PocketBase SDK, Vitest (keine neuen Tests nötig — alle Änderungen sind CSS/Layout)

## Global Constraints

- Nur der `md:`-Breakpoint wird in der App verwendet — keinen neuen einführen außer `sm:` wo explizit angegeben
- Kein shadcn/ui vorhanden — eigene Komponenten und Custom-Tailwind
- Shared-Types unter `@shared/types` importieren (z.B. `ShiftEntry`, `SHIFT_COLOR_BG`, `SHIFT_COLOR_TEXT`)
- Nach jedem Task: `cd mitarbeiter-app && npm run build` ausführen und auf Build-Fehler prüfen
- Nur Mitarbeiter-App anfassen — Chef-App bleibt unverändert

---

## Dateiübersicht

| Datei | Aktion |
|---|---|
| `src/index.css` | Modify: `.safe-bottom` CSS-Klasse hinzufügen |
| `src/components/Layout/BottomNav.tsx` | Modify: Touch-Target `py-2` → `py-3` |
| `src/hooks/useSwipeGesture.ts` | Modify: `getWidth`-Callback statt `BUTTON_WIDTH` |
| `src/components/SwipeButton.tsx` | Modify: `width: '100%'` + `maxWidth: 280px` statt 280px hardcoded |
| `src/pages/Abwesenheiten/AntragDialog.tsx` | Modify: Bottom-Sheet-Layout auf Mobile |
| `src/components/NotificationBell.tsx` | Modify: Viewport-Clamp + pointerdown + maxHeight |
| `src/pages/Zeiten/Zeiten.tsx` | Modify: Header flex-wrap + flex-1 in Nav |
| `src/pages/Abwesenheiten/Abwesenheiten.tsx` | Modify: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4` |
| `src/pages/MeineDaten/MeineDaten.tsx` | Modify: Verfügbarkeits-Row flex-wrap + aria-labels |
| `src/pages/Dashboard.tsx` | Modify: "Meine Anträge" Header flex-wrap |
| `src/pages/Dienstplan/DienstplanMobileCard.tsx` | Create: Card-View-Komponente für Mobile |
| `src/pages/Dienstplan.tsx` | Modify: Conditional Rendering Mobile/Desktop |

---

## Task 1: BottomNav — Safe-Area + Touch-Targets

**Dateien:**
- Modify: `mitarbeiter-app/src/index.css`
- Modify: `mitarbeiter-app/src/components/Layout/BottomNav.tsx`

**Problem:** Die Klasse `safe-bottom` ist in der gesamten App nirgends definiert (weder `index.css` noch `tailwind.config.ts`). Auf iPhones mit Home-Indicator überlappt die BottomNav den Systembereich. Touch-Targets sind mit `py-2` + 18px-Icon zu klein (< 44pt).

- [ ] **Schritt 1: CSS-Klasse definieren**

In `src/index.css`, direkt nach der `.blink`-Klassen-Definition (vor `@layer base`), einfügen:

```css
@layer utilities {
  .safe-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

- [ ] **Schritt 2: Touch-Target vergrößern**

In `BottomNav.tsx`, in der `cn()`-Klassen-Liste des Tab-Buttons, `py-2` auf `py-3` ändern:

```tsx
// VORHER (Zeile ~23):
'flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors',

// NACHHER:
'flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors',
```

- [ ] **Schritt 3: Build + Verify**

```bash
cd /Users/ronnybeckmann/Projects/times/mitarbeiter-app && npm run build
```

DevTools → iPhone SE (375×667) → Unten am BottomNav: weißer Puffer sichtbar (Safe Area). Nav-Tabs sind tapper-freundlicher.

- [ ] **Schritt 4: Commit**

```bash
git add mitarbeiter-app/src/index.css mitarbeiter-app/src/components/Layout/BottomNav.tsx
git commit -m "fix(layout): add safe-bottom CSS utility and increase BottomNav touch targets"
```

---

## Task 2: SwipeButton — Fluid-Breite

**Dateien:**
- Modify: `mitarbeiter-app/src/hooks/useSwipeGesture.ts`
- Modify: `mitarbeiter-app/src/components/SwipeButton.tsx`

**Problem:** `const buttonWidth = 280` und `style={{ width: '280px' }}` sind hardcoded. Auf iPhone SE (375px Viewport − 48px Padding = 327px Container) ist 280px in Ordnung, aber auf 320px-Geräten (288px Container) bricht der Button aus.

Außerdem ist der Swipe-Threshold in `useSwipeGesture.ts` absolut (`TRIGGER_THRESHOLD = 200`) und `fillPercent` wird relativ zu `BUTTON_WIDTH = 280` berechnet — beides muss auf die echte DOM-Breite reagieren.

- [ ] **Schritt 1: useSwipeGesture.ts — getWidth-Callback einbauen**

```typescript
// VORHER — Zeile 3:
const BUTTON_WIDTH = 280
const TRIGGER_THRESHOLD = 200

interface UseSwipeGestureOptions {
  onSwipeComplete?: () => void
  onSwipeFailed?: () => void
}

// NACHHER — BUTTON_WIDTH entfernen, getWidth-Option hinzufügen:
const TRIGGER_THRESHOLD = 200

interface UseSwipeGestureOptions {
  onSwipeComplete?: () => void
  onSwipeFailed?: () => void
  getWidth?: () => number   // liefert die tatsächliche DOM-Breite zur Laufzeit
}
```

In `onPointerMove` (suche nach `const percent = Math.min`):

```typescript
// VORHER:
const percent = Math.min((distance / BUTTON_WIDTH) * 100, 100)

// NACHHER:
const width = options.getWidth?.() ?? 280
const percent = Math.min((distance / width) * 100, 100)
```

- [ ] **Schritt 2: SwipeButton.tsx — fluid Breite + containerRef**

```tsx
// Neue Imports ergänzen (useRef, useCallback falls noch nicht vorhanden):
import { useRef, useCallback } from 'react'

// Innerhalb der Komponente, vor dem useSwipeGesture-Aufruf:
const containerRef = useRef<HTMLDivElement>(null)

const getWidth = useCallback(() => {
  return containerRef.current?.getBoundingClientRect().width ?? 280
}, [])

// useSwipeGesture-Aufruf erweitern:
const { fillPercent, pointerHandlers, reset } = useSwipeGesture({
  onSwipeComplete,
  onSwipeFailed,
  getWidth,  // NEU
})
```

Im `style`-Prop des Root-Div:

```tsx
// VORHER:
style={{
  touchAction: 'none',
  width: `${buttonWidth}px`,
  height: '60px',
  ...
}}

// NACHHER (buttonWidth-Konstante komplett entfernen):
style={{
  touchAction: 'none',
  width: '100%',
  maxWidth: '280px',
  height: '60px',
  ...
}}
```

`ref={containerRef}` an das Root-Div anhängen.

- [ ] **Schritt 3: Build + Verify**

```bash
cd /Users/ronnybeckmann/Projects/times/mitarbeiter-app && npm run build
```

DevTools → iPhone SE: SwipeButton füllt den Container, kein Überlauf. Swipe-Geste: Thumb bewegt sich korrekt bis zum Ende.

- [ ] **Schritt 4: Commit**

```bash
git add mitarbeiter-app/src/hooks/useSwipeGesture.ts mitarbeiter-app/src/components/SwipeButton.tsx
git commit -m "fix(swipe): make SwipeButton fluid-width with DOM-based swipe threshold"
```

---

## Task 3: AntragDialog — Bottom-Sheet auf Mobile

**Datei:**
- Modify: `mitarbeiter-app/src/pages/Abwesenheiten/AntragDialog.tsx`

**Problem:** Das Modal ist immer vertikal zentriert (`items-center`). Bei langen Formularen (Datei-Upload + Textarea) auf iOS springt die virtuelle Tastatur und der Dialog wird oben abgeschnitten. Kein `max-h` / `overflow-y-auto`.

**Vorbild:** `MonthModal.tsx` macht es bereits richtig mit `items-end md:items-center`.

- [ ] **Schritt 1: Wrapper-Div anpassen (Zeile ~117)**

```tsx
// VORHER:
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">

// NACHHER:
<div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm">
```

- [ ] **Schritt 2: Panel-Div anpassen (Zeile ~118)**

```tsx
// VORHER:
<div className="w-full max-w-md bg-white rounded-2xl shadow-2xl">

// NACHHER:
<div className="w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
```

- [ ] **Schritt 3: Build + Verify**

```bash
cd /Users/ronnybeckmann/Projects/times/mitarbeiter-app && npm run build
```

DevTools → iPhone SE: "Antrag stellen" öffnet ein Bottom-Sheet von unten, scrollt intern bei langen Formularen. Desktop: Dialog bleibt zentriert mit vollen Ecken.

- [ ] **Schritt 4: Commit**

```bash
git add mitarbeiter-app/src/pages/Abwesenheiten/AntragDialog.tsx
git commit -m "fix(dialog): convert AntragDialog to bottom-sheet on mobile"
```

---

## Task 4: NotificationBell — Viewport-Safe Dropdown

**Datei:**
- Modify: `mitarbeiter-app/src/components/NotificationBell.tsx`

**Probleme:**
1. `left: rect.right - 320` kann auf 375px-Geräten < 8px werden und Panel ragt links aus dem Viewport
2. `mousedown` statt `pointerdown` — auf Touch mit Delay
3. Panel hat `max-h-[320px]` auf der `<ul>`, aber das äußere `div` (Portal) hat keine Viewport-Höhen-Begrenzung

- [ ] **Schritt 1: mousedown → pointerdown (Zeile ~70–77)**

```tsx
// VORHER:
function onMouseDown(e: MouseEvent) {
  const target = e.target as Node
  if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
    setOpen(false)
  }
}
if (open) document.addEventListener('mousedown', onMouseDown)
return () => document.removeEventListener('mousedown', onMouseDown)

// NACHHER:
function onPointerDown(e: PointerEvent) {
  const target = e.target as Node
  if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
    setOpen(false)
  }
}
if (open) document.addEventListener('pointerdown', onPointerDown)
return () => document.removeEventListener('pointerdown', onPointerDown)
```

- [ ] **Schritt 2: Left-Position mit Viewport-Clamp (Zeile ~83)**

```tsx
// VORHER:
setPos({ top: rect.bottom + 8, left: Math.max(8, rect.right - 320) })

// NACHHER:
setPos({
  top: rect.bottom + 8,
  left: Math.min(
    Math.max(8, rect.right - 320),
    window.innerWidth - 328  // 320px Panel + 8px rechter Rand
  ),
})
```

- [ ] **Schritt 3: Panel-Style anpassen — fluid width + maxHeight**

Das Portal-Div (äußeres div mit `position: fixed` via inline style) erhält zusätzlich `maxHeight`:

```tsx
// Im style-Prop des äußeren Panel-Divs (das mit position: 'fixed'):
style={{
  position: 'fixed',
  top: pos.top,
  left: pos.left,
  zIndex: 9999,
  width: 'min(320px, calc(100vw - 16px))',       // NEU: fluid auf kleinen Screens
  maxHeight: `calc(100vh - ${pos.top}px - 8px)`, // NEU: Viewport-Begrenzung
}}
```

`max-h-[320px]` von der `<ul>` entfernen und stattdessen `overflow-y-auto` auf dem Panel selbst oder der `<ul>` behalten.

- [ ] **Schritt 4: Build + Verify**

```bash
cd /Users/ronnybeckmann/Projects/times/mitarbeiter-app && npm run build
```

DevTools → iPhone SE (375px): Bell antippen → Panel erscheint vollständig im Viewport, linker Rand ≥ 8px. Panel scrollt intern bei vielen Nachrichten. Touch außerhalb schließt das Panel sofort.

- [ ] **Schritt 5: Commit**

```bash
git add mitarbeiter-app/src/components/NotificationBell.tsx
git commit -m "fix(notifications): viewport-safe panel position and pointerdown close handler"
```

---

## Task 5: Zeiten-Seite — Header + Wochen-Navigation

**Datei:**
- Modify: `mitarbeiter-app/src/pages/Zeiten/Zeiten.tsx`

**Probleme:**
1. Header (`flex justify-between`) zeigt links "Meine Zeiten" und rechts Überstunden-Kachel — auf 320px überlappen sich beide
2. Das mittlere Element der Wochen-Navigation hat kein `flex-1` (der Dienstplan hat es, Zeiten nicht)

- [ ] **Schritt 1: Header-Container — flex-wrap (Zeile ~155)**

```tsx
// VORHER:
<div className="flex items-center justify-between mb-6">

// NACHHER:
<div className="flex flex-wrap items-start justify-between gap-y-3 mb-6">
```

- [ ] **Schritt 2: Linker Titel-Block — min-w-0 (Zeile ~156)**

```tsx
// VORHER:
<div>
  <h1 className="text-2xl font-bold text-[#111827]">Meine Zeiten</h1>

// NACHHER:
<div className="min-w-0">
  <h1 className="text-2xl font-bold text-[#111827]">Meine Zeiten</h1>
```

- [ ] **Schritt 3: Mittleres Nav-Element — flex-1 hinzufügen (Zeile ~190)**

Suche nach dem `<div className="text-center">` zwischen den beiden Chevron-Buttons in der Wochen-Navigation:

```tsx
// VORHER:
<div className="text-center">

// NACHHER:
<div className="flex-1 text-center">
```

- [ ] **Schritt 4: Build + Verify**

```bash
cd /Users/ronnybeckmann/Projects/times/mitarbeiter-app && npm run build
```

DevTools → iPhone SE: Überstunden-Kachel bricht unter den Titel, kein Overflow. KW-Navigation: Datum ist korrekt zentriert.

- [ ] **Schritt 5: Commit**

```bash
git add mitarbeiter-app/src/pages/Zeiten/Zeiten.tsx
git commit -m "fix(zeiten): fix header overflow and week-nav centering on mobile"
```

---

## Task 6: Abwesenheiten — 2-spaltiges Monatsgitter

**Datei:**
- Modify: `mitarbeiter-app/src/pages/Abwesenheiten/Abwesenheiten.tsx`

**Problem:** `grid-cols-3` auf Mobile ergibt auf iPhone SE (375px) ~116px pro Kachel. Mit `p-4` (16px beidseitig) bleiben nur ~84px Innenraum — der Monatsname wird abgeschnitten.

- [ ] **Schritt 1: Loading-Skeleton-Grid (Zeile ~140)**

```tsx
// VORHER:
<div className="grid grid-cols-3 md:grid-cols-4 gap-3">

// NACHHER:
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
```

- [ ] **Schritt 2: Haupt-Monatsgitter (Zeile ~148)**

```tsx
// VORHER:
<div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-5">

// NACHHER:
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-5">
```

- [ ] **Schritt 3: Build + Verify**

```bash
cd /Users/ronnybeckmann/Projects/times/mitarbeiter-app && npm run build
```

DevTools → iPhone SE (375px): 2 Spalten, ~170px breit, Monatsname vollständig lesbar. Desktop: 4 Spalten unverändert.

- [ ] **Schritt 4: Commit**

```bash
git add mitarbeiter-app/src/pages/Abwesenheiten/Abwesenheiten.tsx
git commit -m "fix(abwesenheiten): use 2-column month grid on small screens"
```

---

## Task 7: MeineDaten — Verfügbarkeits-Zeitfelder

**Datei:**
- Modify: `mitarbeiter-app/src/pages/MeineDaten/MeineDaten.tsx`

**Problem:** Zwei `<input type="time">` + Label `w-24` + Toggle in einer `flex`-Zeile ohne `flex-wrap`. Auf 320px-Geräten (288px Innenbreite) passen 96px (Label) + 2 × 90px (Inputs) + 8px (Bindestrich) = 284px kaum und ohne `flex-wrap` kommt es zum Overflow.

- [ ] **Schritt 1: Row-Container — flex-wrap ergänzen (Zeile ~269)**

```tsx
// VORHER:
<div key={day} className="flex items-center gap-3 px-5 py-3.5">

// NACHHER:
<div key={day} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5">
```

- [ ] **Schritt 2: Zeitfelder-Container + Inputs erweitern (Zeile ~295)**

```tsx
// VORHER:
<div className="flex items-center gap-2">
  <input type="time" ... className="h-8 px-2 rounded-lg border ..." />
  <span className="text-[#9CA3AF] text-sm">–</span>
  <input type="time" ... className="h-8 px-2 rounded-lg border ..." />
</div>

// NACHHER:
<div className="flex items-center gap-2 flex-1 min-w-0">
  <input type="time" ... className="h-8 px-2 rounded-lg border ... min-w-[80px] flex-1" />
  <span className="text-[#9CA3AF] text-sm shrink-0">–</span>
  <input type="time" ... className="h-8 px-2 rounded-lg border ... min-w-[80px] flex-1" />
</div>
```

(Die bestehenden Klassen auf den Inputs bleiben erhalten, `min-w-[80px] flex-1` wird ergänzt. `shrink-0` auf dem Bindestrich-Span damit er nie verschwindet.)

- [ ] **Schritt 3: Build + Verify**

```bash
cd /Users/ronnybeckmann/Projects/times/mitarbeiter-app && npm run build
```

DevTools → iPhone SE: Wochentag + Toggle in Zeile 1, Zeitfelder in Zeile 2 wenn nötig. Desktop: alles einzeilig.

- [ ] **Schritt 4: Commit**

```bash
git add mitarbeiter-app/src/pages/MeineDaten/MeineDaten.tsx
git commit -m "fix(meine-daten): make availability time inputs wrap on small screens"
```

---

## Task 8: Dashboard — "Meine Anträge" Header

**Datei:**
- Modify: `mitarbeiter-app/src/pages/Dashboard.tsx`

**Problem:** `flex items-center justify-between` ohne `flex-wrap` — bei langen Badge-Werten oder kleinen Screens verdrängt der Button den Titel.

- [ ] **Schritt 1: Header-Container anpassen (Zeile ~312)**

```tsx
// VORHER:
<div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">

// NACHHER:
<div className="px-5 py-4 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-y-2">
```

- [ ] **Schritt 2: Build + Verify**

```bash
cd /Users/ronnybeckmann/Projects/times/mitarbeiter-app && npm run build
```

DevTools → iPhone SE: Titel + Badge und Button brechen sauber um ohne Overflow.

- [ ] **Schritt 3: Commit**

```bash
git add mitarbeiter-app/src/pages/Dashboard.tsx
git commit -m "fix(dashboard): make Meine-Antraege header wrap on narrow viewports"
```

---

## Task 9: Accessibility — aria-labels

**Datei:**
- Modify: `mitarbeiter-app/src/pages/MeineDaten/MeineDaten.tsx`

**Probleme:**
1. Tab-Buttons (Stammdaten / Dokumente / Verfügbarkeiten) zeigen auf Mobile nur Icons, haben aber kein `aria-label`
2. Download-Link für Dokumente hat nur ein Icon auf Mobile — kein `aria-label`

- [ ] **Schritt 1: Tab-Buttons — aria-label + aria-current (Zeile ~121–134)**

Suche nach dem `tabs.map(...)` Block. Jeder `<button>` bekommt:

```tsx
// VORHER:
<button
  key={id}
  onClick={() => setTab(id)}
  className={cn(...)}
>
  <Icon size={15} />
  <span className="hidden sm:inline">{label}</span>
</button>

// NACHHER:
<button
  key={id}
  onClick={() => setTab(id)}
  aria-label={label}
  aria-current={tab === id ? 'page' : undefined}
  className={cn(...)}
>
  <Icon size={15} aria-hidden="true" />
  <span className="hidden sm:inline" aria-hidden="true">{label}</span>
</button>
```

- [ ] **Schritt 2: Download-Link — aria-label (Zeile ~226–234)**

```tsx
// VORHER:
<a
  href={getFileUrl(doc)}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ..."
>
  <Download size={12} />
  <span className="hidden md:inline">Öffnen</span>
</a>

// NACHHER:
<a
  href={getFileUrl(doc)}
  target="_blank"
  rel="noopener noreferrer"
  aria-label={`${doc.name} öffnen`}
  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ..."
>
  <Download size={12} aria-hidden="true" />
  <span className="hidden md:inline" aria-hidden="true">Öffnen</span>
</a>
```

- [ ] **Schritt 3: Build + Verify**

```bash
cd /Users/ronnybeckmann/Projects/times/mitarbeiter-app && npm run build
```

macOS VoiceOver (Cmd+F5): Tab-Buttons werden als "Stammdaten", "Dokumente", "Verfügbarkeiten" vorgelesen. Download-Link: "[Dokumentname] öffnen".

- [ ] **Schritt 4: Commit**

```bash
git add mitarbeiter-app/src/pages/MeineDaten/MeineDaten.tsx
git commit -m "fix(a11y): add aria-labels to tab buttons and document download links in MeineDaten"
```

---

## Task 10: Dienstplan — Mobile Card-View

**Dateien:**
- Create: `mitarbeiter-app/src/pages/Dienstplan/DienstplanMobileCard.tsx`
- Modify: `mitarbeiter-app/src/pages/Dienstplan.tsx`

**Problem:** Die Wochenansicht ist ausschließlich als Tabelle mit `overflow-x-auto` implementiert. Auf Mobile ist horizontales Scrollen in einer Hauptansicht schlechte UX — eine Card-Ansicht ist intuitiver.

**Strategie:** Neue Komponente `DienstplanMobileCard` rendert Cards für `md:hidden`, die bestehende Tabelle rendert `hidden md:block`. Beide teilen sich die gleichen Daten (kein extra API-Call).

**Hinweis:** Die lokalen Interfaces `ShiftPlan` und `ShiftEntry` in `Dienstplan.tsx` (Zeilen 14–28) bleiben erhalten, da `ShiftEntry` aus `@shared/types` andere Felder hat (z.B. fehlt `is_open` in der shared-Version). `SHIFT_COLOR_BG` und `SHIFT_COLOR_TEXT` sind in `@shared/types` vorhanden und werden importiert.

- [ ] **Schritt 1: Verzeichnis erstellen**

```bash
mkdir -p /Users/ronnybeckmann/Projects/times/mitarbeiter-app/src/pages/Dienstplan
```

- [ ] **Schritt 2: DienstplanMobileCard.tsx anlegen**

```tsx
// /src/pages/Dienstplan/DienstplanMobileCard.tsx
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { SHIFT_COLOR_BG, SHIFT_COLOR_TEXT } from '@shared/types'

// Lokale Interface-Kopie (identisch mit Dienstplan.tsx da shared/ShiftEntry abweicht)
interface ShiftEntry {
  id: string
  date: string
  start_time: string
  end_time: string
  start_time2?: string
  end_time2?: string
  color: string
  color2?: string
  note?: string
  is_free_day?: boolean
  is_open?: boolean
  expand?: { department?: { name: string } }
}

export interface DayCardData {
  date: string
  day: Date
  isWeekend: boolean
  isHoliday: boolean
  holidayName?: string
  isToday: boolean
  entry: ShiftEntry | null
}

function calcHours(startTime: string, endTime: string): string | null {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) return null
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}:${String(m).padStart(2, '0')} h`
}

function ShiftChip({ startTime, endTime, color }: {
  startTime: string
  endTime: string
  color: string
}) {
  const bg  = (SHIFT_COLOR_BG  as Record<string, string>)[color] ?? '#F3F4F6'
  const txt = (SHIFT_COLOR_TEXT as Record<string, string>)[color] ?? '#374151'
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold shrink-0"
      style={{ backgroundColor: bg, color: txt }}
    >
      {startTime}–{endTime}
    </span>
  )
}

export default function DienstplanMobileCard({ days }: { days: DayCardData[] }) {
  return (
    <div className="space-y-2">
      {days.map(({ date, day, isWeekend, isHoliday, holidayName, isToday: today, entry }) => (
        <div
          key={date}
          className={cn(
            'bg-white rounded-xl border px-4 py-3 flex items-center gap-3',
            today && !isWeekend && !isHoliday
              ? 'border-indigo-200 bg-indigo-50/30'
              : 'border-[#E5E7EB]',
            (isWeekend || isHoliday) && 'bg-[#F9FAFB]'
          )}
        >
          {/* Datum-Block */}
          <div className="w-10 shrink-0 text-center">
            <div className={cn(
              'text-[10px] font-semibold uppercase tracking-wide',
              today && !isWeekend && !isHoliday ? 'text-indigo-500' : 'text-[#9CA3AF]'
            )}>
              {format(day, 'EEE', { locale: de })}
            </div>
            <div className={cn(
              'text-xl font-bold leading-tight',
              isWeekend || isHoliday
                ? 'text-[#D1D5DB]'
                : today
                  ? 'text-indigo-600'
                  : 'text-[#111827]'
            )}>
              {format(day, 'd')}
            </div>
          </div>

          {/* Trennlinie */}
          <div className="w-px self-stretch bg-[#F3F4F6] shrink-0" />

          {/* Inhalt */}
          <div className="flex-1 min-w-0">
            {isHoliday ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#9CA3AF]">Feiertag</span>
                {holidayName && (
                  <span className="text-xs text-[#C4B5A0] truncate">{holidayName}</span>
                )}
              </div>
            ) : isWeekend ? (
              <span className="text-xs text-[#D1D5DB]">Wochenende</span>
            ) : entry ? (
              entry.is_free_day ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-[#F0FDF4] text-[#16A34A]">
                  Frei
                </span>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  {entry.start_time && entry.end_time && (
                    <ShiftChip
                      startTime={entry.start_time}
                      endTime={entry.end_time}
                      color={entry.color}
                    />
                  )}
                  {entry.start_time2 && entry.end_time2 && (
                    <>
                      <span className="text-[#D1D5DB] text-xs shrink-0">+</span>
                      <ShiftChip
                        startTime={entry.start_time2}
                        endTime={entry.end_time2}
                        color={entry.color2 ?? entry.color}
                      />
                    </>
                  )}
                  {entry.expand?.department?.name && (
                    <span className="text-xs text-[#6B7280] truncate">
                      {entry.expand.department.name}
                    </span>
                  )}
                  {entry.note && (
                    <span className="text-xs text-[#9CA3AF] italic truncate w-full">
                      {entry.note}
                    </span>
                  )}
                </div>
              )
            ) : (
              <span className="text-xs text-[#D1D5DB]">–</span>
            )}
          </div>

          {/* Stunden rechts */}
          {entry && !isWeekend && !isHoliday && !entry.is_free_day &&
           entry.start_time && entry.end_time && (() => {
            const h1 = calcHours(entry.start_time, entry.end_time)
            const h2 = entry.start_time2 && entry.end_time2
              ? calcHours(entry.start_time2, entry.end_time2)
              : null
            return h1 ? (
              <div className="shrink-0 text-right">
                <div className="text-xs font-semibold tabular-nums text-[#374151]">{h1}</div>
                {h2 && <div className="text-[10px] tabular-nums text-[#9CA3AF]">{h2}</div>}
              </div>
            ) : null
          })()}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Schritt 3: Dienstplan.tsx — Import + dayCardData + Conditional Rendering**

**Import ergänzen** (Zeile nach den bestehenden Imports):

```tsx
import DienstplanMobileCard, { type DayCardData } from './Dienstplan/DienstplanMobileCard'
```

**dayCardData-Variable** direkt vor dem `return` Statement:

```tsx
const holidays = getHolidayMap(fedState, weekStart.getFullYear())

// NEU: Daten für Mobile Card View
const dayCardData: DayCardData[] = weekDays.map(day => {
  const ds = format(day, 'yyyy-MM-dd')
  return {
    date:        ds,
    day,
    isWeekend:   isWeekend(day),
    isHoliday:   holidays.has(ds),
    holidayName: holidays.get(ds),
    isToday:     isToday(day),
    entry:       entries.find(e => e.date === ds) ?? null,
  }
})
```

**Im JSX — Mobile View vor der bestehenden Tabelle einfügen:**

Suche nach dem äußeren `overflow-x-auto`-Div der Tabelle und ersetze:

```tsx
{/* VORHER: */}
<div className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto">
  <div className="bg-white rounded-2xl ... min-w-[400px]">
    {/* ... Tabelle ... */}
  </div>
</div>

{/* NACHHER: */}
{/* Mobile Card View */}
{loading ? (
  <div className="md:hidden space-y-2 mb-4">
    {Array.from({ length: 7 }).map((_, i) => (
      <div key={i} className="h-16 bg-[#F3F4F6] rounded-xl animate-pulse" />
    ))}
  </div>
) : (
  <div className="md:hidden mb-4">
    <DienstplanMobileCard days={dayCardData} />
  </div>
)}

{/* Desktop Tabellen-View — UNVERÄNDERT */}
<div className="hidden md:block -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto">
  <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden min-w-[400px]">
    {/* ... gesamter bestehender Tabellen-Code bleibt erhalten ... */}
  </div>
</div>
```

**Wichtig:** Die bestehende `if (loading) return <Skeleton>` am Anfang des Returns ggf. anpassen, damit sie nur die Desktop-Tabelle betrifft. Alternativ: Loading-State separat für Mobile und Desktop rendern (wie oben gezeigt).

- [ ] **Schritt 4: Build + Verify**

```bash
cd /Users/ronnybeckmann/Projects/times/mitarbeiter-app && npm run build
```

DevTools → iPhone SE: 7 Cards untereinander, kein horizontales Scrollen. Korrekte Schichtzeiten, Feiertags-Hervorhebung, Split-Schichten als zwei Chips. Desktop (≥768px): Tabelle unverändert.

- [ ] **Schritt 5: Commit**

```bash
git add mitarbeiter-app/src/pages/Dienstplan/DienstplanMobileCard.tsx mitarbeiter-app/src/pages/Dienstplan.tsx
git commit -m "feat(dienstplan): add mobile card view for shift entries below md breakpoint"
```

---

## Verifikations-Checkliste

Nach allen 10 Tasks, vollständiger Test:

**Setup:**
```bash
cd /Users/ronnybeckmann/Projects/times/mitarbeiter-app && npm run dev
```
Browser → DevTools (F12) → Device Toolbar (Ctrl+Shift+M)

**Testgeräte in DevTools:**
- iPhone SE: 375×667 — kritischstes Gerät
- iPhone 12 Pro: 390×844 — typisch modern
- iPad Mini: 768×1024 — genau am md-Breakpoint

| Seite | Prüfpunkt | Gerät |
|---|---|---|
| Dashboard | SwipeButton voll breit, kein Overflow | iPhone SE |
| Dashboard | "Meine Anträge" Header umbricht sauber | iPhone SE |
| Dienstplan | Cards erscheinen (keine Tabelle) | iPhone SE |
| Dienstplan | Tabelle erscheint (keine Cards) | iPad Mini |
| Abwesenheiten | 2 Spalten Monatsgitter | iPhone SE |
| Abwesenheiten | AntragDialog kommt von unten | iPhone SE |
| Abwesenheiten | AntragDialog scrollt intern bei langem Inhalt | iPhone SE |
| Zeiten | Header-Kachel umbricht unter Titel | iPhone SE |
| MeineDaten | Verfügbarkeits-Zeitfelder umbrechen | iPhone SE |
| Alle | BottomNav hat Puffer unten (Safe Area) | iPhone SE |
| Alle | NotificationBell-Panel bleibt im Viewport | iPhone SE |
| Alle (Screenreader) | Tab-Buttons + Download-Links vorlesbar | macOS VoiceOver |
