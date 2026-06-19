# Task 4: Responsive Design für Dienstplan-Seite

**Goal:** Dienstplan-Seite responsive auf iPhone machen mit mobile-first layout

**Files to modify:**
- `mitarbeiter-app/src/pages/Dienstplan.tsx`

**Key Changes:**

1. **Top-level padding:** Add `px-4 sm:px-6 md:px-0`
2. **Grid layouts:** Update gap responsive:
   - Change: `gap-2` → `gap-1 sm:gap-2`
   - Change: `grid-cols-7 gap-2` → `grid-cols-7 gap-1 sm:gap-2` (weekday grid)
   - For any multi-row grids: `grid-cols-4` → `grid-cols-2 sm:grid-cols-4` (if applicable)
3. **Typography:** Check for `text-lg` → `text-base sm:text-lg` or similar

**Implementation Steps:**

### Step 1: Read Dienstplan.tsx and identify structure
- Find main container
- Find all grid layouts (likely weekday grid with 7 columns, possibly shift grid)
- Note padding/gap/text-size classes

### Step 2: Add responsive padding to main containers
- Look for `<div>` without responsive padding
- Update to: `px-4 sm:px-6 md:px-0`

### Step 3: Update grid gaps
- All `gap-2` → `gap-1 sm:gap-2`
- `grid-cols-7` stays as is (7-column weekday layout)
- Check for other grids (2 col → `grid-cols-2 sm:grid-cols-4` if found)

### Step 4: Check typography
- If headings are `text-lg`, update to `text-base sm:text-lg`
- If buttons/text are `text-sm`, keep as is (already small)

### Step 5: Manual Test
- Mobile (375px): Compact, gaps smaller, readable
- Desktop (≥640px): Spacious, gaps larger

### Step 6: Commit
`fix: responsive dienstplan-seite mit mobile-first padding`

**Acceptance:**
- ✅ Padding added (px-4 sm:px-6)
- ✅ Gap responsive (gap-1 sm:gap-2)
- ✅ Typography checked (if needed)
- ✅ Manual test 375px + 640px
- ✅ Commit created
- ✅ No TypeScript errors
