# Dienstplan – Kachel-Design-Spezifikation

**Dokument:** Design-System für Schicht-Kacheln im Dienstplan (WeekGrid)  
**Datum:** 2026-06-18  
**Status:** Genehmigt

---

## Kachel-Höhen-Regel

Die Höhe einer Schicht-Kachel hängt von der Anzahl der Schichten an diesem Tag ab:

### Einzelne Schicht / Abwesenheit

**Höhe:** `h-full` (volle Zellenhöhe)

Betrifft:
- Eine reguläre Schicht (z. B. 08:00–16:00)
- Abwesenheit: **k** (krank)
- Abwesenheit: **u** (Urlaub)
- Abwesenheit: **RU** (Resturlaub)
- Abwesenheit: **U3** (Urlaub 3 Tage)
- Abwesenheit: **SU** (Sonderurlaub)
- Freier Tag: **F**

**Visualisierung:**
```
┌─────────────────┐
│                 │
│   08:00–16:00   │  ← volle Höhe (h-full)
│                 │
└─────────────────┘
```

### Doppelschicht (Split)

**Höhe:** Beide Schichten teilen sich die Zellenhöhe (`flex-1` jeweils)

Wenn an einem Tag zwei Schichten eingetragen sind (z. B. Früh + Spät):

**Visualisierung:**
```
┌─────────────────┐
│   08:00–12:00   │  ← Schicht 1: flex-1 (~50%)
├─────────────────┤
│   16:00–20:00   │  ← Schicht 2: flex-1 (~50%)
└─────────────────┘
```

---

## Implementierung (Tailwind)

**Kachel-Container:**
```tsx
className="flex flex-col h-full gap-0.5"  // ← Container nimmt volle Zellenhöhe
```

**Schicht 1 (conditional):**
```tsx
className={cn(
  'text-[11px] px-1.5 rounded text-center flex flex-col justify-center',
  entry.start_time2 ? 'flex-1' : 'h-full',  // ← KEY: wenn Split, dann flex-1, sonst h-full
)}
```

**Schicht 2 (falls vorhanden):**
```tsx
className="text-[11px] px-1.5 flex-1 flex items-center justify-center rounded"
```

**Abwesenheit:**
```tsx
className="text-[11px] px-1.5 h-full rounded text-center flex flex-col justify-center"
```

**Freier Tag (F):**
```tsx
className="text-[11px] px-1.5 h-full rounded text-center flex flex-col justify-center"
```

---

## Validierung

✅ **Regel 1:** Jede Schicht-Kachel ohne Doppelschicht nutzt `h-full`  
✅ **Regel 2:** Bei Doppelschicht nutzt jede Schicht `flex-1`  
✅ **Regel 3:** Abwesenheiten (k, u, RU, etc.) nutzen immer `h-full`  
✅ **Regel 4:** Freie Tage (F) nutzen immer `h-full`  

Alle Kacheln sollen **visuell gleich groß sein**, solange es sich um:
- Eine Schicht ODER
- Eine Abwesenheit ODER
- Einen freien Tag

handelt. Nur bei **zwei Schichten pro Tag** werden die Kacheln kleiner.
