# SwipeButton Redesign — Design-Spec

**Datum:** 2026-06-20  
**Status:** Approved  
**App:** mitarbeiter-app

---

## Kontext

Der aktuelle SwipeButton auf der Dashboard-Seite hat drei Probleme:
1. **Feste Breite** (`maxWidth: 280px`) — auf großen Cards wirkt er schwebend und unbalanciert
2. **Kein Snap-Back** — beim Loslassen springt der Thumb hart auf 0 ohne Animation
3. **Kein Live-Feedback auf Widget-Ebene** — die Card ändert ihre Farbe erst nach Abschluss, nicht während des Swipens

---

## Design-Entscheidung

**Stil:** Variante A — Clean, professionell, kein Glasmorphism, kein Dark-Mode  
**Integration:** Passt nahtlos in den bestehenden Light-Mode der Mitarbeiter-App

---

## Verhalten im Detail

### 1. Fluid-Breite
- Button: `width: 100%` — keine `maxWidth`-Begrenzung
- Der Button füllt immer die volle Innenbreite des Stempeluhr-Widgets

### 2. Snap-Back Animation
- Beim Loslassen **vor** dem Trigger (< 65% der Buttonbreite): Thumb und Fill gleiten mit `cubic-bezier(0.25, 0.46, 0.45, 0.94)` über `350ms` zurück zu 0
- Während des aktiven Ziehens: keine Transition (sofortige Reaktion auf Finger)
- Nach erfolgreichem Swipe: keine Snap-Back-Animation nötig

### 3. Live Widget-Farbübergang
- Während des Swipens: Stempeluhr-Card interpoliert **live** von Weiß/Indigo → Smaragd-Grün
- Der Fortschritt (`0.0 – 1.0`) bestimmt die Farb-Interpolation
- Bei Snap-Back: Farbe kehrt synchron mit dem Thumb zurück
- Bei Erfolg: Farbe bleibt auf Grün (bestehender `isStamped`-Zustand)

**Farb-Interpolation der Card:**
```
0%  → background: white, border: #E5E7EB, shadow: leicht
65% → Übergang beginnt (Trigger-Zone)
100% → from-emerald-500 to-teal-600 (identisch mit bisherigem isStamped-Zustand)
```

### 4. Thumb-Glow während Drag (optional, leicht)
- Thumb-Box-Shadow verstärkt sich leicht proportional zur Swipe-Distanz
- Indigo-Glow bei 0%, Emerald-Glow bei 100%

---

## Technische Architektur

### Datenfluss

```
useSwipeGesture (Hook)
  └─ fillPercent (0–100)
  └─ isSnapBack (bool)

SwipeButton (Component)
  ├─ Props: onProgress?: (pct: number) => void   ← NEU
  └─ ruft onProgress auf bei jedem pointermove

Dashboard (Page)
  ├─ stampProgress state (0–1)
  ├─ <SwipeButton onProgress={(p) => setStampProgress(p/100)} ... />
  └─ interpoliert Card-Stil basierend auf stampProgress
```

### Dateien

| Datei | Änderung |
|---|---|
| `src/hooks/useSwipeGesture.ts` | Snap-Back-Animation: `isAnimatingBack` Flag, Transition-Steuerung |
| `src/components/SwipeButton.tsx` | `maxWidth` entfernen, `onProgress` Prop, Transition-Logik |
| `src/pages/Dashboard.tsx` | `stampProgress` State, `onProgress` + `onSwipeFailed` Handler, Card-Interpolation |

---

## useSwipeGesture — Änderungen

**Neu:** `isAnimatingBack` im Return-Objekt  
Der Hook signalisiert der Komponente, wann er zurückgleitet (damit die Komponente die CSS-Transition aktiviert).

**Snap-Back-Sequenz:**
1. Pointer wird losgelassen → Trigger nicht erreicht
2. Hook setzt `isAnimatingBack = true`
3. SwipeButton aktiviert CSS-Transition auf Thumb + Fill
4. Hook setzt `fillPercent = 0`
5. Nach 400ms: `isAnimatingBack = false`, Transition deaktiviert

---

## SwipeButton — Änderungen

```tsx
// Neues Prop:
onProgress?: (percent: number) => void

// Entfernt:
maxWidth: '280px'  →  nur width: '100%' bleibt

// Transition-Logik:
// - Während Drag: keine Transition (immediat)
// - Snap-Back: 'left 350ms cubic-bezier(0.25,0.46,0.45,0.94)'
//              'transform 350ms cubic-bezier(0.25,0.46,0.45,0.94)'

// onProgress aufrufen bei pointermove:
onProgress?.(percent)
```

---

## Dashboard — Änderungen

```tsx
const [stampProgress, setStampProgress] = useState(0)

// Card-Hintergrund interpolieren
function getCardStyle(progress: number): React.CSSProperties {
  if (isStamped) return {}  // isStamped übernimmt die grüne Darstellung
  if (progress === 0) return {}  // Standard: Tailwind-Klassen übernehmen
  // Interpolation 0→1: weiß/border → leicht grünlicher Schimmer
  const alpha = progress * 0.08
  return {
    background: `linear-gradient(135deg,
      rgba(16,185,129,${alpha}) 0%,
      rgba(5,150,105,${alpha * 0.6}) 100%)`,
    borderColor: `rgba(16,185,129,${0.1 + progress * 0.2})`,
    boxShadow: `0 ${Math.round(progress * 8)}px ${Math.round(progress * 24)}px rgba(16,185,129,${progress * 0.12})`,
    transition: stampProgress === 0 ? 'all 350ms cubic-bezier(0.25,0.46,0.45,0.94)' : 'none',
  }
}

// SwipeButton-Props:
<SwipeButton
  isStamped={isStamped}
  isLoading={stamping}
  onSwipeComplete={handleStempel}
  onSwipeFailed={() => setStampProgress(0)}  // NEU
  onProgress={(p) => setStampProgress(p / 100)}  // NEU
/>
```

---

## Kein Änderungsbedarf

- `MonthModal`, `AntragDialog`, `NotificationBell` — unberührt
- Ausstempeln-Zustand (`isStamped=true`) — unberührt, funktioniert wie bisher
- Tests in `useSwipeGesture.test.ts` — müssen auf `getWidth`-Callback aktualisiert werden (war bereits geändert)

---

## Verifikation

1. **Browser DevTools → iPhone SE (375px):**
   - Button füllt die volle Card-Breite (keine Lücke rechts)
   - Thumb nach rechts ziehen → Card wird leicht grüner während Drag
   - Loslassen bei < 65%: Thumb gleitet sanft zurück, Card wird wieder weiß
   - Loslassen bei > 65%: Erfolg, Card vollständig grün

2. **Desktop:**
   - Button füllt die volle Card-Breite (Desktop-Grid ist 2-spaltig)
   - Gleiche Animationen

3. **Build:**
   - `npm run build` fehlerfrei
