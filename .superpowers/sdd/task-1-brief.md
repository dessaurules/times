# Task 1: Responsive Design für Login-Seite

**Goal:** Login-Seite responsive auf iPhone (375px–414px) machen mit optimalen Abständen und Text-Größen

**Project Context:** Mitarbeiter-App wird live auf iPhone 14/Pro genutzt. Login ist entry point, muss gut aussehen auf kleinen Screens.

**Files to modify:**
- `mitarbeiter-app/src/pages/Login.tsx` (lines 26–87)

**Interfaces:**
- Consumes: Keine neuen Abhängigkeiten
- Produces: Vollständig responsive Login-Seite mit Tailwind mobile-first Breakpoints (`sm:` prefix)

**Problems to Fix:**
1. Card-Padding aktuell `p-8` — zu groß auf kleinen Screens
2. Heading `text-2xl` — könnte auf mobil `text-xl` sein
3. Input/Button Höhen sollten konsistent sein

**Implementation Details:**

**Step 1:** Ändere Card-Padding (Zeile 38)
- Old: `className="bg-white rounded-2xl shadow-xl shadow-gray-100 border border-[#E5E7EB] p-8"`
- New: `className="bg-white rounded-2xl shadow-xl shadow-gray-100 border border-[#E5E7EB] p-6 sm:p-8"`

**Step 2:** Ändere Heading-Größe (Zeile 33)
- Old: `className="text-2xl font-bold text-[#111827]"`
- New: `className="text-xl sm:text-2xl font-bold text-[#111827]"`

**Step 3:** Manual Test auf iPhone 375px und 414px
- Öffne DevTools: Device Emulation → iPhone SE (375px) und iPhone 14 Pro (430px)
- Prüfe: Card passt auf Screen? Text lesbar? Keine Overflow?
- Expected: Responsive, Padding angepasst, alles sichtbar

**Global Constraints:**
- Tailwind mobile-first: `sm:640px` (andere Screens sind `md:768px`, `lg:1024px`)
- Keine Breaking Changes
- iOS 14+ Browser-Kompatibilität

**Acceptance:**
- ✅ Responsive Login auf 375px–430px
- ✅ Padding `p-6 sm:p-8` appliziert
- ✅ Heading `text-xl sm:text-2xl` appliziert
- ✅ Manual test auf beide Screen-Größen
- ✅ Commit erstellt
