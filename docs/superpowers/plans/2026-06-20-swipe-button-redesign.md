# SwipeButton Redesign — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SwipeButton auf volle Widget-Breite anpassen, Snap-Back-Animation hinzufügen, und die Stempeluhr-Card live beim Swipen von Weiß/Indigo zu Grün interpolieren.

**Architecture:** Drei Änderungen in Sequenz: (1) Hook gibt `isSnapBack` zurück, (2) SwipeButton nutzt das für CSS-Transition und ruft `onProgress` auf, (3) Dashboard interpoliert die Card-Farbe basierend auf `stampProgress`. Keine neue Komponente nötig.

**Tech Stack:** React 19, TypeScript strict, Tailwind v3, Vite 8 — Monorepo unter `~/Projects/times/mitarbeiter-app/`

## Global Constraints

- Keine neue Abhängigkeit installieren
- Nur `mitarbeiter-app/` anfassen — Chef-App unberührt
- Nach jedem Task: `cd mitarbeiter-app && npm run build` — muss fehlerfrei sein
- Kein Glassmorphism, kein Dark-Mode — Light-Mode bleibt

---

## Dateiübersicht

| Datei | Was ändert sich |
|---|---|
| `src/hooks/useSwipeGesture.ts` | `isAnimating` → `isSnapBack` umbenennen + korrekt setzen |
| `src/components/SwipeButton.tsx` | `maxWidth` entfernen, `onProgress` Prop, Transition-Logik |
| `src/pages/Dashboard.tsx` | `stampProgress` State, Card-Farb-Interpolation |

---

## Task 1: useSwipeGesture — `isSnapBack` Signal

**Dateien:**
- Modify: `mitarbeiter-app/src/hooks/useSwipeGesture.ts`
- Test: `mitarbeiter-app/src/hooks/__tests__/useSwipeGesture.test.ts`

**Interfaces:**
- Produces: `isSnapBack: boolean` im Return-Objekt — `true` für genau eine State-Cycle nach einem fehlgeschlagenen Swipe, dann wieder `false`

**Was das löst:** Aktuell gibt der Hook `isAnimating` zurück, das aber nie genutzt wird. `isSnapBack` signalisiert der SwipeButton-Komponente, wann sie die CSS-Transition für den Rückweg aktivieren soll.

- [ ] **Schritt 1: Test schreiben**

In `src/hooks/__tests__/useSwipeGesture.test.ts`, nach den bestehenden Tests:

```typescript
it('should set isSnapBack to true after failed swipe, then false after reset', () => {
  const { result } = renderHook(() => useSwipeGesture({ getWidth: () => 300 }))

  act(() => {
    result.current.pointerHandlers.onPointerDown(
      { clientX: 0, pointerId: 1 } as PointerEvent
    )
  })
  act(() => {
    result.current.pointerHandlers.onPointerMove(
      { clientX: 50 } as PointerEvent  // 50px von 300 = 16% — kein Trigger
    )
  })
  act(() => {
    result.current.pointerHandlers.onPointerUp(
      { clientX: 50 } as PointerEvent
    )
  })

  expect(result.current.isSnapBack).toBe(true)

  act(() => {
    result.current.reset()
  })

  expect(result.current.isSnapBack).toBe(false)
})
```

- [ ] **Schritt 2: Test fehlschlagen lassen**

```bash
cd /Users/ronnybeckmann/Projects/times/mitarbeiter-app
npm test -- --run src/hooks/__tests__/useSwipeGesture.test.ts
```

Erwartetes Ergebnis: `TypeError: result.current.isSnapBack is undefined`

- [ ] **Schritt 3: Implementierung — `isAnimating` durch `isSnapBack` ersetzen**

Ersetze die gesamte Datei `src/hooks/useSwipeGesture.ts`:

```typescript
import { useState, useRef, useCallback } from 'react'

const TRIGGER_THRESHOLD = 200
const MAX_VELOCITY_FOR_CALC = 1500

interface UseSwipeGestureOptions {
  onSwipeComplete?: () => void
  onSwipeFailed?: () => void
  getWidth?: () => number
}

interface PointerHandlers {
  onPointerDown: (e: PointerEvent) => void
  onPointerMove: (e: PointerEvent) => void
  onPointerUp: (e: PointerEvent) => void
}

export function useSwipeGesture(options: UseSwipeGestureOptions = {}) {
  const [fillPercent, setFillPercent] = useState(0)
  const [isSnapBack, setIsSnapBack]   = useState(false)

  const pointerStartX    = useRef<number | null>(null)
  const pointerStartTime = useRef<number | null>(null)
  const isTracking       = useRef(false)

  const vibrate = useCallback((duration: number) => {
    try { if (navigator.vibrate) navigator.vibrate(duration) } catch {}
  }, [])

  const calculateVelocity = useCallback(
    (distance: number, elapsedMs: number): number => {
      if (elapsedMs === 0) return 0
      return (distance / elapsedMs) * 1000
    }, []
  )

  const shouldTrigger = useCallback(
    (distance: number, velocity: number): boolean => {
      const normalizedVelocity = Math.min(velocity / MAX_VELOCITY_FOR_CALC, 1.0)
      const requirement = TRIGGER_THRESHOLD / (2 - normalizedVelocity)
      return distance >= requirement
    }, []
  )

  const onPointerDown = useCallback((e: PointerEvent) => {
    pointerStartX.current    = e.clientX
    pointerStartTime.current = Date.now()
    isTracking.current       = true
    setIsSnapBack(false)
    setFillPercent(0)
  }, [])

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!isTracking.current || pointerStartX.current === null) return
    const distance = e.clientX - pointerStartX.current
    if (distance < 0) return
    const width   = options.getWidth?.() ?? 280
    const percent = Math.min((distance / width) * 100, 100)
    setFillPercent(percent)
  }, [options])

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      if (!isTracking.current || pointerStartX.current === null || pointerStartTime.current === null) return

      isTracking.current = false

      const distance  = e.clientX - pointerStartX.current
      const elapsedMs = Date.now() - pointerStartTime.current
      const velocity  = calculateVelocity(distance, elapsedMs)

      if (distance >= 0 && shouldTrigger(distance, velocity)) {
        setFillPercent(100)
        setIsSnapBack(false)
        vibrate(15)
        options.onSwipeComplete?.()
      } else {
        setIsSnapBack(true)   // Signal: Snap-Back läuft jetzt
        setFillPercent(0)
        options.onSwipeFailed?.()
      }

      pointerStartX.current    = null
      pointerStartTime.current = null
    },
    [calculateVelocity, shouldTrigger, vibrate, options]
  )

  const reset = useCallback(() => {
    setFillPercent(0)
    setIsSnapBack(false)
    isTracking.current       = false
    pointerStartX.current    = null
    pointerStartTime.current = null
  }, [])

  const pointerHandlers: PointerHandlers = { onPointerDown, onPointerMove, onPointerUp }

  return { fillPercent, isSnapBack, pointerHandlers, reset }
}
```

- [ ] **Schritt 4: Test laufen lassen**

```bash
cd /Users/ronnybeckmann/Projects/times/mitarbeiter-app
npm test -- --run src/hooks/__tests__/useSwipeGesture.test.ts
```

Erwartetes Ergebnis: Neuer Test ✅ — bestehende Tests müssen ebenfalls grün sein (sie nutzen `isSnapBack` nicht).

- [ ] **Schritt 5: Build prüfen**

```bash
cd /Users/ronnybeckmann/Projects/times/mitarbeiter-app && npm run build 2>&1 | tail -5
```

Erwartetes Ergebnis: `✓ built in ...ms`

- [ ] **Schritt 6: Commit**

```bash
cd /Users/ronnybeckmann/Projects/times
git add mitarbeiter-app/src/hooks/useSwipeGesture.ts mitarbeiter-app/src/hooks/__tests__/useSwipeGesture.test.ts
git commit -m "feat(swipe): add isSnapBack signal to useSwipeGesture hook"
```

---

## Task 2: SwipeButton — Fluid-Breite + Snap-Back-Animation + onProgress

**Dateien:**
- Modify: `mitarbeiter-app/src/components/SwipeButton.tsx`
- Test: `mitarbeiter-app/src/components/__tests__/SwipeButton.test.tsx`

**Interfaces:**
- Consumes: `isSnapBack: boolean` aus `useSwipeGesture` (Task 1)
- Produces: `onProgress?: (percent: number) => void` Prop — wird bei jedem `onPointerMove` mit dem aktuellen `fillPercent` aufgerufen

**Was das löst:**
1. `maxWidth: '280px'` entfernen → Button füllt volle Card-Breite
2. Während Drag: keine CSS-Transition (direktes Finger-Feedback)
3. Bei Snap-Back (`isSnapBack === true`): Transition `350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` auf Thumb und Fill
4. `onProgress` nach oben melden für Widget-Farb-Interpolation in Dashboard

- [ ] **Schritt 1: Test schreiben**

In `src/components/__tests__/SwipeButton.test.tsx`, nach bestehenden Tests:

```typescript
it('calls onProgress with fillPercent during pointer move', () => {
  const onProgress = vi.fn()
  const { container } = render(
    <SwipeButton
      isStamped={false}
      isLoading={false}
      onSwipeComplete={vi.fn()}
      onProgress={onProgress}
    />
  )
  const btn = container.firstChild as HTMLElement

  fireEvent.pointerDown(btn, { clientX: 0, pointerId: 1 })
  fireEvent.pointerMove(btn, { clientX: 100 })

  expect(onProgress).toHaveBeenCalled()
  const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1][0]
  expect(lastCall).toBeGreaterThan(0)
})
```

- [ ] **Schritt 2: Test fehlschlagen lassen**

```bash
cd /Users/ronnybeckmann/Projects/times/mitarbeiter-app
npm test -- --run src/components/__tests__/SwipeButton.test.tsx 2>&1 | tail -15
```

Erwartetes Ergebnis: `TypeError: onProgress is not a function` oder ähnlich

- [ ] **Schritt 3: Implementierung — komplette neue SwipeButton.tsx**

Ersetze die gesamte Datei `src/components/SwipeButton.tsx`:

```tsx
import { useRef, useCallback, useEffect } from 'react'
import { useSwipeGesture } from '@/hooks/useSwipeGesture'
import { LogIn, LogOut, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeButtonProps {
  isStamped: boolean
  isLoading: boolean
  onSwipeComplete: () => void
  onSwipeFailed?: () => void
  onProgress?: (percent: number) => void
}

export function SwipeButton({
  isStamped,
  isLoading,
  onSwipeComplete,
  onSwipeFailed,
  onProgress,
}: SwipeButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const fillRef      = useRef<HTMLDivElement>(null)
  const thumbRef     = useRef<HTMLDivElement>(null)

  const getWidth = useCallback(() => {
    return containerRef.current?.getBoundingClientRect().width ?? 300
  }, [])

  const handleProgress = useCallback((percent: number) => {
    onProgress?.(percent)
  }, [onProgress])

  const { fillPercent, isSnapBack, pointerHandlers, reset } = useSwipeGesture({
    onSwipeComplete,
    onSwipeFailed,
    getWidth,
  })

  // onProgress bei jeder fillPercent-Änderung aufrufen
  useEffect(() => {
    handleProgress(fillPercent)
  }, [fillPercent, handleProgress])

  // Snap-Back: Transition aktivieren wenn isSnapBack wechselt
  useEffect(() => {
    const fill  = fillRef.current
    const thumb = thumbRef.current
    if (!fill || !thumb) return

    if (isSnapBack) {
      const ease = '350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      fill.style.transition  = `width ${ease}`
      thumb.style.transition = `left ${ease}`
    } else {
      fill.style.transition  = ''
      thumb.style.transition = ''
    }
  }, [isSnapBack])

  const thumbPosition = Math.max(0, fillPercent - 20)
  const isDisabled    = isLoading

  const text        = isLoading ? 'Bitte warten…' : isStamped ? 'Ausstempeln' : 'Einstempeln'
  const icon        = isLoading ? null : isStamped ? <LogOut size={15} /> : <LogIn size={15} />
  const showCheck   = isStamped && !isLoading
  const bgColor     = isStamped ? 'from-emerald-500 to-teal-600' : 'from-indigo-500 to-violet-600'

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      style={{
        touchAction: 'none',
        width: '100%',
        height: '60px',
        cursor: isDisabled ? 'not-allowed' : 'grab',
      }}
      className={cn(
        'relative rounded-2xl overflow-hidden',
        'flex items-center justify-center',
        `bg-gradient-to-r ${bgColor}`,
        'transition-opacity',
        isDisabled && 'opacity-60 cursor-not-allowed'
      )}
      onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDisabled) pointerHandlers.onPointerDown(e.nativeEvent)
      }}
      onPointerMove={(e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDisabled) pointerHandlers.onPointerMove(e.nativeEvent)
      }}
      onPointerUp={(e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDisabled) pointerHandlers.onPointerUp(e.nativeEvent)
      }}
      onPointerCancel={() => reset()}
    >
      {/* Fill */}
      <div
        ref={fillRef}
        className="absolute inset-0 bg-white/20"
        style={{ width: `${fillPercent}%` }}
      />

      {/* Thumb */}
      <div
        ref={thumbRef}
        className="absolute left-0 top-0 bottom-0 flex items-center"
        style={{ left: `${thumbPosition}%`, pointerEvents: 'none' }}
      >
        <div className="w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center ml-1.5">
          {showCheck ? (
            <Check size={20} className="text-emerald-600" />
          ) : (
            icon && <span className="text-indigo-600">{icon}</span>
          )}
        </div>
      </div>

      {/* Text */}
      <div className="relative z-10 flex items-center gap-2 text-white font-medium text-sm">
        <span>{text}</span>
        {!isStamped && !isLoading && <span>→</span>}
      </div>
    </div>
  )
}
```

**Wichtige Änderungen gegenüber vorher:**
- `maxWidth: '280px'` — entfernt
- `fillRef` + `thumbRef` — direkte DOM-Refs für CSS-Transition-Steuerung
- `useEffect` auf `isSnapBack` — aktiviert/deaktiviert Transition-Property
- `useEffect` auf `fillPercent` — ruft `onProgress` auf
- CSS-Variablen `--fill-percent` / `--thumb-position` — durch direkte `style`-Props ersetzt (einfacher für Transition-Steuerung)

- [ ] **Schritt 4: Test laufen lassen**

```bash
cd /Users/ronnybeckmann/Projects/times/mitarbeiter-app
npm test -- --run src/components/__tests__/SwipeButton.test.tsx 2>&1 | tail -20
```

Erwartetes Ergebnis: Neuer Test ✅ — alle SwipeButton-Tests grün

- [ ] **Schritt 5: Build prüfen**

```bash
cd /Users/ronnybeckmann/Projects/times/mitarbeiter-app && npm run build 2>&1 | tail -5
```

Erwartetes Ergebnis: `✓ built in ...ms`

- [ ] **Schritt 6: Commit**

```bash
cd /Users/ronnybeckmann/Projects/times
git add mitarbeiter-app/src/components/SwipeButton.tsx mitarbeiter-app/src/components/__tests__/SwipeButton.test.tsx
git commit -m "feat(swipe): full-width button, snap-back animation, onProgress callback"
```

---

## Task 3: Dashboard — Live Widget-Farb-Interpolation

**Dateien:**
- Modify: `mitarbeiter-app/src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `onProgress?: (percent: number) => void` aus SwipeButton (Task 2)

**Was das löst:** Die Stempeluhr-Card interpoliert beim Swipen live von Weiß/Indigo zu Smaragd-Grün. Bei Snap-Back kehrt die Farbe synchron zurück (da `stampProgress` auf 0 gesetzt wird). Der bestehende `isStamped`-Zustand bleibt vollständig erhalten.

**Farb-Logik:**
- `stampProgress = 0`: Card weiß (Standard — Tailwind-Klassen übernehmen)
- `stampProgress = 0.0–1.0`: sanfter grüner Schimmer wächst
- `stampProgress = 1` / `isStamped = true`: vollständig emerald (bestehend)

- [ ] **Schritt 1: `stampProgress` State und Handler hinzufügen**

In `Dashboard.tsx`, direkt nach dem `const [showAntrag, setShowAntrag] = useState(false)` Block (ca. Zeile 81), einfügen:

```tsx
const [stampProgress, setStampProgress] = useState(0)
```

- [ ] **Schritt 2: `getCardStyle` Hilfsfunktion hinzufügen**

Direkt vor dem `return (` Statement in `Dashboard()` (ca. Zeile 237), einfügen:

```tsx
function getStampCardStyle(): React.CSSProperties {
  if (isStamped || stampProgress === 0) return {}
  const p = stampProgress / 100
  return {
    background: `linear-gradient(135deg,
      rgba(16,185,129,${p * 0.12}) 0%,
      rgba(5,150,105,${p * 0.08}) 100%),
      #ffffff`,
    borderColor: `rgba(16,185,129,${0.1 + p * 0.25})`,
    boxShadow: `0 ${Math.round(p * 4)}px ${Math.round(p * 16)}px rgba(16,185,129,${p * 0.12})`,
  }
}
```

- [ ] **Schritt 3: Card-Klassen und SwipeButton-Props anpassen**

Suche den Stempeluhr-Card-Block (ca. Zeile 255–290) und ersetze ihn:

```tsx
{/* Stempeluhr */}
<div
  className={cn(
    'rounded-2xl p-6 transition-colors duration-75',
    isStamped
      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200'
      : 'bg-white border border-[#E5E7EB] shadow-sm'
  )}
  style={getStampCardStyle()}
>
```

Und den SwipeButton-Aufruf (ca. Zeile 285–289) ersetzen:

```tsx
<SwipeButton
  isStamped={isStamped}
  isLoading={stamping}
  onSwipeComplete={handleStempel}
  onSwipeFailed={() => setStampProgress(0)}
  onProgress={(p) => setStampProgress(p)}
/>
```

**Wichtig:** Die bestehenden Klassen `from-emerald-500 to-teal-600` bei `isStamped` bleiben unverändert. `getStampCardStyle()` gibt `{}` zurück wenn `isStamped === true` — die Tailwind-Klassen übernehmen dann vollständig.

- [ ] **Schritt 4: Import prüfen**

Stelle sicher, dass `useState` bereits in den React-Imports enthalten ist (ist es bereits — Zeile 1).

- [ ] **Schritt 5: Build prüfen**

```bash
cd /Users/ronnybeckmann/Projects/times/mitarbeiter-app && npm run build 2>&1 | tail -5
```

Erwartetes Ergebnis: `✓ built in ...ms`

- [ ] **Schritt 6: Manuell testen**

Dev-Server starten (läuft ggf. bereits auf Port 5174):

```bash
cd /Users/ronnybeckmann/Projects/times/mitarbeiter-app && npm run dev
```

Browser → `http://localhost:5174` → DevTools → iPhone SE (375px):

1. Dashboard öffnen → Stempeluhr-Card ist weiß, Button füllt volle Breite
2. Thumb nach rechts ziehen → Card wird leicht grüner während des Ziehens
3. Thumb bei ~50% loslassen → Card und Thumb gleiten sanft (350ms) zurück zu Weiß
4. Thumb bis zum Ende ziehen → Card wechselt zu vollem Emerald-Grün, "Eingestempelt" erscheint
5. Desktop (1024px) → gleiche Animationen, Button füllt volle 2-spaltige Card-Breite

- [ ] **Schritt 7: Commit**

```bash
cd /Users/ronnybeckmann/Projects/times
git add mitarbeiter-app/src/pages/Dashboard.tsx
git commit -m "feat(dashboard): live color interpolation of stamp card during swipe"
```

---

## Verifikations-Checkliste

Nach allen 3 Tasks:

| Prüfpunkt | Erwartet |
|---|---|
| Button-Breite auf iPhone SE | Füllt volle Card-Breite ohne Lücke rechts |
| Button-Breite auf Desktop | Füllt volle Kachel-Breite (2-spaltiges Grid) |
| Drag Thumb 50%, loslassen | Snap-Back in 350ms, sanfte Ease-Kurve |
| Drag Thumb 50%, Card-Farbe | Leicht grünlicher Schimmer während des Ziehens |
| Snap-Back Card-Farbe | Kehrt synchron zu Weiß zurück |
| Drag Thumb bis Ende | Erfolg: Card wird vollständig Emerald, Checkmark im Thumb |
| `npm run build` | ✓ built ohne Fehler |
