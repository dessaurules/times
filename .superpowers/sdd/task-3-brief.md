# Task 3: Responsive Design für Abwesenheiten-Seite

**Goal:** Abwesenheiten-Seite responsive auf iPhone machen mit mobile-first padding und Grid-Anpassung

**Project Context:**
- Abwesenheiten-Seite zeigt Urlaubsanträge und Monatsgrid
- Mobile: Zu dichter Grid, padding zu großzügig
- Breakpoint: `sm:640px`

**Files to modify:**
- `mitarbeiter-app/src/pages/Abwesenheiten/Abwesenheiten.tsx`

**Interfaces:**
- Consumes: Existing absence data, month rendering
- Produces: Responsive Abwesenheiten-Seite mit mobile-first layout

**Key Changes:**

1. **Top-Level Padding** - Add responsive padding:
   - Alle `<div>` auf top-level sollten `px-4 sm:px-6 md:px-0` haben
   - Suche nach divs ohne px-padding und füge mobile-first padding ein

2. **Grid Layout** - Falls Month-Grid vorhanden:
   - Change: `grid-cols-4` → `grid-cols-2 sm:grid-cols-4`
   - Change: `gap-2` → `gap-1 sm:gap-2`

3. **Modal/Dialog** - AntragDialog für mobile:
   - Wrapper sollte responsive sein: `w-full sm:max-w-lg p-6 sm:p-8`
   - Button heights: consistent `h-10`

**Implementation Steps:**

### Step 1: Scan für top-level divs ohne responsive padding
Lese Abwesenheiten.tsx durch (ca. Zeile 100+) und finde:
- Hauptcontainer `<div className="px-6">` oder `<div>` ohne padding
- Update zu: `<div className="px-4 sm:px-6 md:px-0">`

### Step 2: Update Grid falls vorhanden
Suche nach `grid-cols-4` und `gap-2`:
- Change: `grid-cols-2 sm:grid-cols-4` (mobile 2 columns, tablet+ 4 columns)
- Change: `gap-1 sm:gap-2`

### Step 3: Prüfe AntragDialog (in Abwesenheiten/AntragDialog.tsx)
Falls Modal vorhanden:
- Find: `className="... fixed inset-0 ... z-50"` wrapper
- Update Dialog content width/padding

### Step 4: Manual Test
- Mobile (375px): Compact padding, 2-column grid
- Desktop (≥640px): Larger padding, 4-column grid

### Step 5: Commit
When done, commit with message:
`fix: responsive abwesenheiten-seite mit mobile-first padding`

**Global Constraints:**
- Breakpoint: `sm:640px`
- No breaking changes
- TypeScript strict mode

**Acceptance:**
- ✅ Mobile padding applied (px-4 sm:px-6)
- ✅ Grid responsive if present (grid-cols-2 sm:grid-cols-4)
- ✅ Manual test 375px and 640px+
- ✅ Commit created
- ✅ No TypeScript errors
