# Task 6: Fix Swipe-Button Animation (Snap zurück)

**Goal:** Stempel-Button springt nach Tap sofort (aber smooth) zurück - kein Hängenbleiben

**Problem:** Button bleibt nach Tap in Press-State (`active:scale-95`), springt nicht sofort zurück auf normale Größe

**File to modify:**
- `mitarbeiter-app/src/pages/Dashboard.tsx` (lines 194–206)

**Root Cause:** 
- Button hat `transition-all` aber keine explizite `duration`
- Default duration kann zu lang sein
- Need: `transition-all duration-150` für schnelles snap-back

**Implementation:**

### Step 1: Find button className (Line 194)
Located in Dashboard.tsx Stempeluhr section

**Old:**
```tsx
className={cn(
  'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-60',
```

**New:**
```tsx
className={cn(
  'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 active:scale-95 disabled:opacity-60',
```

Change: Add `duration-150` after `transition-all`

### Step 2: Test on iPhone
- Open Dashboard on real iPhone or DevTools emulation (iPhone 375px)
- Tap Einstempel button repeatedly
- Expected: Button scales down on press, scales back up immediately on release (smooth animation, ~150ms)
- Not expected: Button stays in scaled-down state, or very slow snap-back

### Step 3: Verify handleStempel logic
The `handleStempel()` function (lines 93–115) should be correct:
```tsx
async function handleStempel() {
  if (!employeeId || stamping) return
  setStamping(true)    // Button disables while API call
  setError(null)
  try {
    // ... API call ...
  } finally {
    setStamping(false)  // Button enables again
  }
}
```

This is already correct. The button will re-enable after API call, allowing the scale animation to reset.

### Step 4: Commit
`fix: button snap-back animation mit expliziter transition-duration`

**Acceptance:**
- ✅ `duration-150` added to button className
- ✅ Manual test on iPhone 375px: button snaps back smoothly
- ✅ No other changes to button behavior
- ✅ Commit created
- ✅ No TypeScript errors
