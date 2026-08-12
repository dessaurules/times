# Task 5: Responsive Design für Dashboard/Start-Seite

**Goal:** Dashboard responsive auf iPhone machen mit optimalen Abständen und Spacing

**Files to modify:**
- `mitarbeiter-app/src/pages/Dashboard.tsx`

**Key Changes from Plan:**

**Line 149** (Header section):
- Old: `<div className="mb-6">`
- New: `<div className="px-4 sm:px-6 md:px-0 mb-4 sm:mb-6">`
- Adds mobile padding + responsive margins

**Line 162** (Grid gap and margin):
- Old: `<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">`
- New: `<div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">`
- Responsive gap (3 mobile, 4 tablet+) and margins

**Line 165** (Card padding):
- Old: `'rounded-2xl p-6 transition-all',`
- New: `'rounded-2xl p-4 sm:p-6 transition-all',`
- Responsive card padding (4 mobile, 6 tablet+)

**Line 151** (Heading size):
- Old: `<h1 className="text-2xl font-bold text-[#111827]">`
- New: `<h1 className="text-xl sm:text-2xl font-bold text-[#111827]">`
- Responsive heading (text-xl mobile, text-2xl tablet+)

**Implementation Steps:**

### Step 1: Apply padding to header section (Line 149)
Find the header `<div>` after "export default function Dashboard() {"
Update className to include responsive padding

### Step 2: Update grid (Line 162)
Find `<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">`
Update to: `gap-3 sm:gap-4 mb-4 sm:mb-6`

### Step 3: Update card padding (Line 165)
Find the cn() call for the Stempeluhr card
Update padding from `p-6` to `p-4 sm:p-6`

### Step 4: Update heading (Line 151)
Find the `<h1>` with "text-2xl"
Update to: `text-xl sm:text-2xl`

### Step 5: Test
- Mobile (375px): Compact spacing, small heading
- Desktop (≥640px): Generous spacing, large heading

### Step 6: Commit
`fix: responsive padding und spacing für dashboard`

**Acceptance:**
- ✅ Header padding: px-4 sm:px-6 md:px-0
- ✅ Grid gap: gap-3 sm:gap-4
- ✅ Card padding: p-4 sm:p-6
- ✅ Heading: text-xl sm:text-2xl
- ✅ Manual test 375px + 640px
- ✅ Commit created
- ✅ No TypeScript errors
