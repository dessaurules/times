# Swipe-to-Confirm Button für Zeiterfassung

**Datum:** 2026-06-02  
**Projekt:** Mitarbeiter-App (times)  
**Komponente:** Dashboard Einstempeln/Ausstempeln

## Context

Aktuell sind Ein- und Ausstempeln einfache Buttons. Die Anforderung: einen **Fill-Swipe-Button** implementieren, der:
- Intuitiver wirkt (Swipe-Geste statt Klick)
- Fehler reduziert (kontinuierliches visuelles Feedback, flexibles Triggering)
- Moderne Mobile-UX bietet (Bounce-Animation, Haptic Feedback)

Dies erhöht die Gewissheit beim Zeitstempel-Protokoll und verbessert das Gefühl von Kontrolle.

## Design-Spezifikation

### Visual Style

**Option: Fill Swipe** (nicht Slider, nicht Hold)
- Der Button füllt sich von links nach rechts
- Die Füllfarbe ist `rgba(255, 255, 255, 0.2)` (Weiß mit Transparenz)
- Basis-Farbe: Indigo Gradient (`from-indigo-500 to-violet-600`) im Idle-State
- Button-Breite: 280px, Höhe: 60px, Border-Radius: 16px

### Interaktions-States

#### 1. **Idle** (Kein Swipe in Progress)
- Fill-Prozentsatz: 0%
- Button-Opazität: 100%
- Text: "Einstempeln →" oder "Ausstempeln →"
- Cursor: `grab`
- Hintergrund: Indigo Gradient (bestehend)

#### 2. **Mid-Swipe** (Nutzer swiped aktiv)
- Fill-Prozentsatz: Abhängig von Finger-Position (0–100%)
- Button-Opazität: 100%
- Cursor: `grabbing`
- Feedback: Echtzeit-Fill-Animation (linear, kein Easing während Swipe)
- Vibration: Keine (nur bei Success)

#### 3. **Success** (Swipe erfolgreich)
- Fill-Prozentsatz: 100% + **Bounce-Animation** zurück zu 95%, dann wieder 100%
- Bounce-Dauer: 400ms (motion library)
- Kartenfarbe: Wechsel zu Grün (`from-emerald-500 to-teal-600`)
- Text: "✓ Einstempelt" oder "✓ Ausgestempelt"
- Icon: Checkmark (statt Arrow)
- **Vibration:** 1x 15ms Medium (navigator.vibrate, mit Fallback)
- Keine zusätzliche Toast/Notification nötig — Kartenfarbe ist die Bestätigung

#### 4. **Loading** (PocketBase API läuft)
- Fill-Prozentsatz: Bleibt bei 100% (vom Success-State)
- Button-Opazität: 60% (`opacity-60`)
- Text: "Bitte warten…"
- Cursor: `not-allowed`
- Interaktion: Deaktiviert (keine neuen Swipes möglich)
- Dauer: Typisch 500–1000ms (API-Latenz)

#### 5. **Error/Reset** (Swipe nicht erfolgreich)
- Fill-Prozentsatz: 0% (Reset-Animation)
- Reset-Animation: Bounce-Out (400ms), zurück zum Idle-State
- Visuelles Signal: Fill fährt schnell zurück (sagt "nicht genug")
- Keine Vibration, nur Animation

### Trigger-Logik (Flexible Swipe-Geschwindigkeit)

Das Swipe triggert **erfolgreich**, wenn:
- **`distance * (2 - normalize(velocity))` ≥ 200px**

Wobei:
- `distance` = tatsächliche Swipe-Distanz in Pixeln
- `velocity` = (aktuelle Distanz / Zeit seit pointerdown)
- `normalize(velocity)` = min(velocity / 1500, 1.0) — capped bei schnellsten Swipes

**Beispiele:**
- Langsamer Swipe: Muss ~250–280px durchswipen
- Mittlerer Swipe (1500px/s): ~200px nötig
- Sehr schneller Swipe: ~140px reichen schon

### Animation Details

**Alle Animationen nutzen `motion` (bereits installed):**

1. **Fill-Progression während Swipe:**
   - Type: `spring` mit `damping: 25, stiffness: 150` (reaktiv, aber smooth)
   - Folgt Finger-Position in Echtzeit (pointerMove)

2. **Bounce-Animation nach Success:**
   - Type: `spring` mit `damping: 10, stiffness: 200` (bouncy)
   - Ziel: 95% → 100% → 95% (kurz) → 100% (final)
   - Duration: ~400ms gesamt

3. **Reset-Animation bei Error:**
   - Type: `spring` mit `damping: 15, stiffness: 180`
   - Von aktueller Position → 0% (Idle)
   - Duration: ~300ms

### Accessibility & Error Handling

- **Pointer Events:** Unterstützt Touch, Pen, Maus (via W3C Pointer Events API)
- **Fallback ohne Vibration:** `navigator.vibrate()` mit try-catch, kein Error wenn nicht unterstützt
- **Network Error:** Falls API-Call fehlschlägt, Button zurücksetzen und Error-Message im bestehenden Error-State anzeigen
- **Keyboard:** Aktuell nicht unterstützt (Swipe ist mobile-only), aber "Einstempeln" bleibt auch als Tab-Taste erreichbar (bestehender Button)

## Technical Architecture

### New Component: `<SwipeButton />`

**Location:** `mitarbeiter-app/src/components/SwipeButton.tsx`

**Props:**
```typescript
interface SwipeButtonProps {
  isStamped: boolean
  isLoading: boolean
  onSwipeComplete: () => void
  onSwipeFailed?: () => void
}
```

**State:**
- `fillPercent: number` (0–100)
- `isAnimating: boolean`
- `error: string | null`

**Key Methods:**
- `handlePointerDown(e: PointerEvent)` — Start tracking
- `handlePointerMove(e: PointerEvent)` — Update fill %, check velocity
- `handlePointerUp(e: PointerEvent)` — Evaluate if swipe successful, trigger or reset
- `triggerSuccess()` — Bounce animation + vibration + call onSwipeComplete()
- `resetWithBounce()` — Error animation, reset to idle
- `vibrate(duration: number)` — Safe vibration with fallback

### New Hook: `useSwipeGesture()`

**Location:** `mitarbeiter-app/src/hooks/useSwipeGesture.ts`

**Returns:**
```typescript
{
  fillPercent: number
  isAnimating: boolean
  pointerHandlers: {
    onPointerDown: (e: PointerEvent) => void
    onPointerMove: (e: PointerEvent) => void
    onPointerUp: (e: PointerEvent) => void
  }
  reset: () => void
}
```

**Responsibilities:**
- Manage pointer event lifecycle
- Calculate swipe distance & velocity
- Determine success/failure
- Delegate animations to motion library

### Integration in Dashboard

**File:** `mitarbeiter-app/src/pages/Dashboard.tsx`

**Changes:**
1. Replace existing button (lines 284–296) with `<SwipeButton />`
2. Pass `isStamped`, `stamping` (as `isLoading`), and `handleStempel` (as `onSwipeComplete`)
3. Existing card color change logic remains (already reactive to `isStamped`)

### Dependencies

- ✅ `motion` (v12.40.0 — already installed)
- ✅ `clsx` + `cn()` helper (already available)
- ✅ `lucide-react` for icons (Arrow, Checkmark)
- ❌ **Not needed:** dnd-kit (pure Pointer Events instead)
- ❌ **Not needed:** shadcn/ui (raw Tailwind only)

## Data Flow

```
User pointer down
  ↓
useSwipeGesture starts tracking
  ↓
User pointer move (multiple events)
  ↓
Fill % updates in real-time (motion animation)
  ↓
User pointer up
  ↓
Calculate: distance + velocity → success?
  ├─ YES → triggerSuccess() → onSwipeComplete() → Dashboard calls handleStempel()
  │         ↓ → PocketBase API call → setLoading(true)
  │         ↓ → API response → Dashboard updates isStamped → card color changes
  │         ↓ → Loading state clears → Button returns to Idle
  │
  └─ NO  → resetWithBounce() → fill goes back to 0%
```

## Testing & Verification

### Manual Testing (before commit)
1. **Touch Device Simulation (DevTools):** Emulate touch swipes at various speeds
   - Slow swipe (expected: ~280px needed)
   - Fast swipe (expected: ~140px needed)
   - Incomplete swipe (expected: reset animation)

2. **Visual States:**
   - Idle → Mid-Swipe → Success (green card, bounce, checkmark)
   - Idle → Mid-Swipe → Incomplete → Reset animation
   - Success → Loading (disabled, "Bitte warten…") → Idle (when API done)

3. **Haptic Feedback:**
   - Check console for vibration API calls (should log success)
   - On actual device: Feel 15ms vibration on successful swipe

4. **Error Handling:**
   - Simulate network error in Dashboard → should reset button and show error message
   - Rapid clicks/swipes → loading state should prevent multiple submissions

### Automated Testing (Vitest)
- `useSwipeGesture()` hook tests:
  - Velocity calculation correctness
  - Trigger threshold logic
  - Event handler binding
- `<SwipeButton />` component tests:
  - Renders with correct props
  - Animation classes applied correctly
  - onSwipeComplete called when threshold met

### End-to-End (if applicable)
- Open Dashboard in browser dev tools (touch emulation)
- Perform swipe on button
- Verify card changes color, time updates in display
- Verify API call happened (network tab)

## Success Criteria

✅ Button fills smoothly during swipe  
✅ Flexible velocity-based triggering works (slow: full width, fast: partial)  
✅ Success state shows bounce, green card, checkmark, vibration  
✅ Error state resets with bounce-back animation  
✅ Loading state prevents duplicate submissions  
✅ Accessibility: Pointer Events work on touch, pen, mouse  
✅ No new dependencies added (only uses motion, already there)  
✅ Code is reusable Hook + Component (can be used elsewhere later)  

## Rollout Plan

1. **Phase 1:** Implement SwipeButton component + useSwipeGesture hook
2. **Phase 2:** Integrate into Dashboard, test on device with touch
3. **Phase 3:** (Optional) Add to Chef-App if needed later
4. **Phase 4:** Monitor user feedback in production (swipe intuitiveness)

---

**Design approved by:** ronny.beckmann@googlemail.com  
**Implementation target:** Summer 2026
