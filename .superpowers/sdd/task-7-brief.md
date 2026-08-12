# Task 7: Fix Auto-Refresh der Minutenzeit beim Stempeln

**Goal:** Minutenzeit beim Stempeln aktualisiert live jede Sekunde (nicht nur alle 10 Sekunden)

**Problem:** Timer-Update ist auf 10 Sekunden gesetzt → Benutzer sieht keine Live-Änderungen beim Stempel, Uhr läuft sehr träge

**Files to modify:**
1. `mitarbeiter-app/src/pages/Dashboard.tsx` (line 86)
2. `mitarbeiter-app/src/pages/Zeiten/Zeiten.tsx` (line 60)

**Changes:**

**File 1: Dashboard.tsx Line 86**
Old:
```tsx
timerRef.current = setInterval(() => setNow(new Date()), 10_000)
```

New:
```tsx
timerRef.current = setInterval(() => setNow(new Date()), 1_000)
```

Change: `10_000` → `1_000` (10 seconds → 1 second)

**File 2: Zeiten.tsx Line 60**
Old:
```tsx
timerRef.current = setInterval(() => setNow(new Date()), 10_000)
```

New:
```tsx
timerRef.current = setInterval(() => setNow(new Date()), 1_000)
```

Change: `10_000` → `1_000` (10 seconds → 1 second)

**Why 1 second instead of 10?**
- Standard für Live-Zähler/Uhren
- Benutzer sieht "live" Minuten-Updates: 1:23, 1:24, 1:25 jede Sekunde
- Mit 10s: 1:23, dann 10s warten, dann 1:33 — sieht aus wie hängende App

**Implementation Steps:**

### Step 1: Update Dashboard.tsx Line 86
Find: `setInterval(() => setNow(new Date()), 10_000)`
Replace with: `setInterval(() => setNow(new Date()), 1_000)`

### Step 2: Update Zeiten.tsx Line 60
Find: same pattern
Replace with: `1_000`

### Step 3: Test on iPhone + Server
- Open Dashboard, stempel Einstempeln
- Watch Minutenzeit: should tick every second (not every 10 seconds)
- Go to Zeiten page, watch running entry: should tick every second
- Verify no performance issues (CPU, battery)

### Step 4: Commit
`fix: reduziere timer-interval auf 1s für live minutenzeit-updates`

**Acceptance:**
- ✅ Dashboard.tsx: 10_000 → 1_000
- ✅ Zeiten.tsx: 10_000 → 1_000
- ✅ Manual test: Minutenzeit ticks jede Sekunde
- ✅ No performance issues observed
- ✅ Commit created
- ✅ No TypeScript errors
