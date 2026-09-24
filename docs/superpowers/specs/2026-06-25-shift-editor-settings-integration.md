# ShiftEditor: Settings & Template Integration

**Date:** 2026-06-25  
**Project:** Schicht & Plan (times) - Chef-App  
**Component:** ShiftEditor Dialog + Settings Modal  

---

## Overview

Refactor the ShiftEditor to integrate shift template management and absence configuration into a unified dialog experience via a settings gear icon (⚙️). Remove the separate Admin page for template management and bring template + absence management directly into the shift planning workflow.

---

## Current Problems

1. **Template Management Scattered**: Templates are managed on a separate Admin page, requiring context-switching
2. **Absence Handling Unclear**: Absence information is shown as a warning but can't be managed from ShiftEditor
3. **Two-Shift Entry Confusing**: Split-shift UI ("zweite Teilschicht") is cramped at the bottom and hard to discover

---

## Solution Architecture

### 1. **Main ShiftEditor Dialog** (unchanged structure, enhanced header)

**Dialog Header (Enhanced)**
- **Title Area**: 
  - Line 1: "Schicht eintragen" (dialog action)
  - Line 2: "{Mitarbeitername} · {Wochentag}, {Datum}" (context)
  - Right side: ⚙️ Icon (opens settings), ✕ Close

**Dialog Body**
- **Quick Select Section 1** (Templates):
  - Buttons: 🌴 Frei | Frühdienst | Spätdienst | Nachtschicht | [other department-specific templates]
  - Label: "Quick Select"

- **Quick Select Section 2** (Absences):
  - Buttons: 🏥 Krank | ✈️ Urlaub | 📚 Schulung | 🩺 Arzttermin | [other absence types per ABSENCE_LABELS]
  - Label: "Abwesenheiten"

- **Shift 1 Fields** (existing):
  - Beginn (time input)
  - Ende (time input)
  - Farbe (color picker)
  - Notiz (optional text)

- **Shift 2 (Expandable Section)**:
  - Link/Button: "➕ Zweite Schicht hinzufügen"
  - When clicked, expands to show:
    - Beginn (time input)
    - Ende (time input)
    - Farbe (color picker)
    - 🗑️ Entfernen button (removes shift 2 and collapses section)
  - Label: "✂️ Zweite Schicht"

**Footer**
- Speichern button (saves both shifts + any template changes)
- Abbrechen button

---

### 2. **Settings Modal** (new, modal overlay)

Opens when ⚙️ icon is clicked. Appears as a modal on top of the main dialog.

**Modal Header**
- Title: "Einstellungen & Verwaltung"
- Subtitle: "{Mitarbeitername} · {Wochentag}, {Datum}" (same context as parent)
- ✕ Close button

**Tabs (sticky at top of modal)**

#### **Tab 1: Templates verwalten** (default tab)

**Existing Templates Section**
- List all shift templates for this department
- For each template:
  - Display: Name, Start Time – End Time
  - Actions: "Bearbeiten" button, "Löschen" button
  - Styling: Light background card

**New Template Form**
- Fields:
  - Name (text input)
  - Beginn (time input)
  - Ende (time input)
  - Farbe (color picker: blue, green, amber, purple, rose)
- Submit: "Template erstellen" button

**Behavior**
- Changes are saved immediately (async)
- If user creates/edits template and returns to Shift 1 form, new templates appear in Quick Select buttons

#### **Tab 2: Abwesenheiten**

**Display Only**
- Show all absences that overlap with the selected date
- For each absence:
  - Display: Type (icon + label), Date range, Status (Genehmigt/Ausstehend)
  - Info text: "Diese Abwesenheit überschneidet sich mit der Schicht. Die Schicht kann trotzdem eingetragen werden."

**Scope**: View only (no editing in this tab — absences are managed elsewhere)

---

## Data Flow & Scope

### **Scope: Department-Bound**
- All templates shown/managed are for the current employee's department
- Department is determined by `editorEmp?.department` (employee's dept, not UI selection)
- No admin override; scope is clear and isolated

### **Template Quick Buttons**
- Populated from `useShiftTemplates` hook (existing)
- Layout: 
  - Row 1: Frei + 3-4 most recent templates
  - Row 2: Absence types (K, U, S, AT)
- Clicking a template button populates Shift 1 fields or marks as "Frei"
- Clicking an absence button marks the day as that absence type (note: "K", "U", etc.)

### **Saving Behavior**
1. User sets Shift 1 and optionally Shift 2
2. User clicks "Speichern" in main dialog
3. ShiftEntry is created/updated with both shifts
4. Any template edits in the Settings Modal are saved immediately (don't depend on "Speichern" in main dialog)

### **Absence Display in Modal**
- Query absences for the selected date
- Filter to show only approved + those with status != rejected
- Purely informational; user can still create a shift that conflicts with an absence

---

## Component Structure

### **Files Affected**

1. **chef-app/src/components/Dienstplan/ShiftEditor.tsx** (refactor + enhance)
   - Add state: `showSettings` (boolean)
   - Restructure header to show employee + date
   - Add ⚙️ button to toggle `showSettings`
   - Move template management UI into new modal component
   - Restructure body: 
     - Separate "Quick Select" sections (templates vs absences)
     - Extract shift 2 into expandable component
   
2. **chef-app/src/components/Dienstplan/ShiftEditorSettings.tsx** (new)
   - Modal wrapper (dark overlay + dialog)
   - Tab logic (Templates | Absences)
   - Tab 1: Existing template list + new template form
   - Tab 2: Absence display
   - Reuse `ShiftTemplateManager` logic or integrate directly

3. **chef-app/src/components/Dienstplan/ShiftTemplateManager.tsx** (refactor)
   - Extract template list + form into reusable sub-components
   - Used by both the Admin page (if kept) and ShiftEditorSettings

4. **chef-app/src/pages/Admin/ShiftTemplates.tsx** (deprecate or keep as fallback)
   - Consider: remove entirely (workflow is now in ShiftEditor) or keep as bulk-edit tool

---

## UI/Styling Details

### **Colors & Tokens**
- Modal overlay: `rgba(0, 0, 0, 0.5)`
- Header: `#f9fafb` background, `#111` text
- Buttons: Primary `#4f46e5`, Hover `#4338ca`, Secondary `#e5e7eb`
- Quick buttons: Template buttons = light blue (`#dbeafe`), Absence buttons = light red/yellow/blue (per ABSENCE_COLORS)

### **Responsive**
- Desktop: Dialog `max-width: 500px`, Settings Modal `max-width: 600px`
- Mobile: Full-width, stack modals vertically if needed (but Settings Modal should work fine as overlay)

---

## User Workflows

### **Workflow 1: Quick Schedule a Shift**
1. Click on grid cell (employee + date)
2. ShiftEditor opens
3. Click "Frühdienst" quick button
4. Fields populate, user adjusts if needed
5. Click "Speichern" → shift created

### **Workflow 2: Add Second Shift**
1. ShiftEditor open with Shift 1 filled
2. Click "➕ Zweite Schicht hinzufügen"
3. Section expands, user enters Beginn/Ende/Farbe
4. Click "Speichern" → both shifts created

### **Workflow 3: Create New Template**
1. ShiftEditor open
2. Click ⚙️ → Settings Modal opens
3. In "Templates" tab, fill "Neue Template" form
4. Click "Template erstellen"
5. Template appears in Quick Select buttons immediately
6. Close modal, use new template if desired

### **Workflow 4: Check Absences**
1. ShiftEditor open (user sees date context in header)
2. Click ⚙️ → Settings Modal
3. Click "Abwesenheiten" tab
4. See all overlapping absences for this date
5. Decide to shift anyway or cancel
6. Close modal

---

## Testing Considerations

### **Unit Tests**
- ShiftTemplateManager: template CRUD operations
- ShiftEditor: state management (showSettings toggle, expandable shift 2)
- Absence display: filter & rendering

### **Integration Tests**
- Create template in modal → appears in Quick Select
- Click quick button → populates shift fields
- Create/edit shift with absence overlap → shows warning
- Save shift 1 + shift 2 together → both saved to database

### **E2E / Manual**
- Full workflow: create template, use it to schedule shifts, verify in grid
- Responsive design: test modal on mobile, tablet, desktop

---

## Open Questions / Deferred

- **Admin page (ShiftTemplates.tsx)**: Keep for bulk-edit, or remove entirely? → Defer to implementation review
- **Quick button limit**: Show 3-4 templates max, or all? → Current: all, may paginate later
- **Absence edit/approve**: Out of scope for this iteration (view only)
- **Undo/Cancel**: If user edits template in modal and doesn't hit Speichern, is the template change lost? → Clarify behavior: templates save immediately, shifts save on Speichern

---

## Success Criteria

✓ ⚙️ icon opens Settings Modal with Templates + Absences tabs  
✓ Template management is visible + usable from within ShiftEditor  
✓ New templates appear in Quick Select immediately  
✓ Absence info is visible for the selected date  
✓ Shift 2 is manageable via expandable section  
✓ Department scoping is preserved (no cross-dept leaks)  
✓ All existing ShiftEditor workflows still work  
✓ Component is responsive (desktop + mobile)
