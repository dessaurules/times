# Schicht-Vorlagen & Schnell-Tasten im Dienstplan

**Datum**: 2026-06-24  
**Status**: Design approved

## Übersicht

Mitarbeiter sollen Schichten und Abwesenheiten schnell über vordefinierte Vorlagen eintragen können. Statt zeitaufwendiger manueller Eingabe klicken sie auf eine Schnell-Taste (z.B. „K" für Krank, „15–22" für eine häufige Schicht) und die Schicht wird sofort gespeichert.

## Anforderungen

### Schnell-Tasten (QuickTemplates)
- **4 vordefinierte Absence-Shortcuts**: K (Krank), U (Urlaub), S (Schule), F (Frei)
  - Mit korrekten Farben aus `ABSENCE_COLORS` (Rot für K, Beige für U, Blau für S, Grün für F)
  - Speichern sofort ohne weitere Bestätigung
- **4 Custom Shift-Templates pro Abteilung**: Admin-definiert (z.B. „10–19", „15–22", „18–23", „20–06")
  - Gespeichert in neuer PocketBase-Tabelle `shift_templates`
  - Pro Department, nicht global
  - Speichern sofort ohne weitere Bestätigung

### UI-Integration

#### ShiftEditor Dialog (Mitarbeiter-Sicht)
- **Oben im Dialog**: Zwei Gruppen von Schnell-Tasten:
  1. **Abwesenheiten** (4 Buttons: K, U, S, F) — mit Absence-Farben
  2. **Schicht-Vorlagen** (bis zu 4 Custom Templates) — grau, + Plus-Button zum Verwalten
- **Verhalten**: Klick auf eine Taste → Schicht wird sofort gespeichert, Dialog schließt, Green Toast zeigt Bestätigung
- **Plus-Button** (`+`): Öffnet Admin-Panel für Vorlagen-Verwaltung (Shortcut für Admins)

#### Admin-Bereich (Admin-Sicht)
- **Neue Admin-Seite**: „Schicht-Vorlagen" unter Settings/Admin
  - Tabelle mit allen aktiven Vorlagen der eigenen Abteilung
  - Spalten: Name (z.B. „10–19"), Startzeit, Endzeit, Farbe
  - Actions: „Bearbeiten", „Löschen"
  - Button: „+ Neue Vorlage"
- **Vorlage erstellen/bearbeiten Modal**:
  - Eingaben: Name (text), Startzeit (time), Endzeit (time), Farbe (color picker)
  - Validierung: Name unique pro Abteilung, Zeiten plausibel

### Daten-Struktur (PocketBase)

**Neue Tabelle**: `shift_templates`
```
- id (primary key)
- department (relation zu Department)
- name (text, unique per department)
- start_time (time, HH:mm)
- end_time (time, HH:mm)
- color (ShiftColor: blue|green|amber|purple|rose)
- sort_order (number, für UI-Reihenfolge)
- created (datetime)
- updated (datetime)
```

### User Stories

1. **Mitarbeiter fügt Schicht ein (Absence)**
   - Klickt auf WeekGrid-Zelle → ShiftEditor öffnet
   - Sieht 4 Absence-Buttons (K, U, S, F)
   - Klickt „K" → Schicht als „Krank" sofort eingetragen, Toast „✓ Krank eingetragen!", Dialog schließt

2. **Mitarbeiter fügt Schicht ein (Custom-Vorlage)**
   - Klickt auf WeekGrid-Zelle → ShiftEditor öffnet
   - Sieht Custom Templates seiner Abteilung (z.B. „10–19", „15–22")
   - Klickt „15–22" → Schicht mit 15:00–22:00 sofort eingetragen, Toast „✓ 15–22 eingetragen!", Dialog schließt

3. **Admin verwaltet Vorlagen**
   - Navigiert zu Settings → „Schicht-Vorlagen"
   - Sieht alle bestehenden Vorlagen seiner Abteilung
   - Klickt „+ Neue Vorlage" → Modal öffnet
   - Trägt ein: Name „08–16", Startzeit „08:00", Endzeit „16:00", Farbe „Blau"
   - Klickt Speichern → Vorlage ist sofort in allen ShiftEditoren sichtbar

4. **Admin kann schnell Vorlage erstellen (aus Dialog)**
   - Öffnet ShiftEditor und klickt Plus-Button neben Templates
   - Admin-Panel öffnet → kann neue Vorlage direkt erstellen
   - Nach Speichern bleibt Panel offen für weitere Vorlagen oder zum Bearbeiten bestehender

### Technische Architektur

#### PocketBase/Datenbank
- Migration: Neue `shift_templates` Tabelle mit Abteilungs-Relation
- Permissions: Nur Admins dürfen `shift_templates` bearbeiten (CRUD), alle dürfen lesen

#### Chef-App Frontend
- **Komponenten**:
  - `ShiftTemplateQuickButtons.tsx` — Rendert 2 Gruppen (Absences + Custom)
  - `ShiftTemplateManager.tsx` — Admin-Verwaltung (Liste, Edit Modal, Delete)
  - Update `ShiftEditor.tsx` — Integriert QuickButtons oben, Plus-Button-Handler
  
- **Hooks**:
  - `useShiftTemplates()` — Lädt Templates für aktuelle Abteilung, Refetch nach Änderung
  
- **API-Integration**:
  - ShiftEntry-Save-Logik anpassen: Wenn Template geklickt → mit vordefinierten Zeiten speichern
  - Absence-Save: Mit `is_free_day=true` (für Frei) oder Absence-Type (würde zukünftig in ShiftEntry abgebildet)

#### Fehlerbehandlung
- Template nicht gefunden (gelöscht während Dialog offen) → Fallback zu manueller Eingabe
- Speichern fehlgeschlagen → Toast mit Fehlermeldung, Dialog bleibt offen
- Permissions-Error (nicht-Admin auf Admin-Panel) → Redirect oder Toast

### Success Criteria

- ✅ Absences (K, U, S, F) speichern sofort mit Klick
- ✅ Custom Templates speichern sofort mit Klick
- ✅ Admin-Panel zeigt und verwaltet Vorlagen pro Abteilung
- ✅ Toast bestätigt jede erfolgreiche Eintragung
- ✅ Plus-Button öffnet Admin-Panel
- ✅ Permissions korrekt (nur Admin kann Vorlagen editieren)
- ✅ Keine manuelle Eingabe nötig für vordefinierte Schichten

### Open Questions (Resolved)

- ✅ Wo konfigurieren? → Admin-Panel im Chef-App (Approach 2)
- ✅ Pro Abteilung? → Ja, `shift_templates.department`
- ✅ Speichern nach Klick? → Ja, sofort, kein Extra-Button
- ✅ Anzahl Custom Templates? → 4 zum Start
- ✅ Absence-Typen? → K, U, S, F (fest, nicht änderbar)
