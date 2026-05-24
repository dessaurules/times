# Chef-App Phase 2 – Design-Dokument

**Projekt:** Schicht & Plan  
**Datum:** 2026-05-24  
**Status:** Genehmigt

---

## 1. Überblick

Diese Phase erweitert die Chef-App um vier unabhängige Bereiche:

1. **Freies Widget-Grid** – Dashboard mit react-grid-layout, freie Anordnung und Größe
2. **Mitarbeiter-Modal** – Detailansicht als Modal mit Blur-Hintergrund statt Seiten-Navigation
3. **Glass UI Prototyp** – Alle Dashboard-Widgets als Glas-Karten
4. **Kalender-Animationen** – Drag-Animationen im Abwesenheiten-Kalender aus dem Prototyp

---

## 2. Widget-Grid (react-grid-layout)

### Technologie

`react-grid-layout` ersetzt das bisherige `@dnd-kit`-Setup auf dem Dashboard vollständig. `@dnd-kit/core`, `@dnd-kit/sortable` und `@dnd-kit/utilities` werden aus den Abhängigkeiten entfernt.

### Grid-Konfiguration

- **Spalten:** 4
- **Row-Height:** 160px (Stat-Kacheln), Panels wachsen über mehrere Rows
- **Breakpoints:** Nur Desktop (keine responsive Umschaltung in dieser Phase)
- **Persistenz:** Layout wird als JSON in `localStorage` unter `chef-dashboard-layout-v2` gespeichert

### Standard-Layout

| Widget | x | y | w | h |
|---|---|---|---|---|
| stat-eingestempelt | 0 | 0 | 1 | 1 |
| stat-abwesend | 1 | 0 | 1 | 1 |
| stat-genehmigungen | 2 | 0 | 1 | 1 |
| stat-resturlaub | 3 | 0 | 1 | 1 |
| antraege | 0 | 1 | 2 | 3 |
| abwesend | 2 | 1 | 2 | 2 |
| arbeitszeiten | 0 | 4 | 4 | 3 |

### Edit-Modus

- Aktivierung per Zahnrad/Slider-Button oben rechts im Dashboard-Header (wie bisher)
- Im Edit-Modus: Jedes Widget zeigt **nur ein kleines X** (`size={14}`) oben rechts (absolut positioniert, `z-10`)
- Das **gesamte Widget** ist die Drag-Fläche – kein separates Grip-Symbol
- Größe ändern per Resize-Handle (unten rechts, von react-grid-layout bereitgestellt)
- Fertig-Button beendet den Edit-Modus

### Neue Widgets

Zusätzlich zu den bestehenden 7 Widgets werden folgende IDs definiert:

| ID | Label | Inhalt |
|---|---|---|
| `stat-ueberstunden` | Überstunden diese Woche | Summe Überstunden aller aktiven MA |
| `stat-krankmeldungen` | Krankmeldungen | Anzahl laufender Krankmeldungen (Abwesenheitstyp K/KK heute) |
| `geburtstage` | Geburtstage im Monat | Liste MA mit Geburtstag im aktuellen Monat |
| `dokumente-ablauf` | Ablaufende Verträge | Dokumente/Verträge, die in 30 Tagen ablaufen |

Nicht implementierte Widgets (Platzhalter) zeigen einen grauen Inhalts-Stub mit dem Label.

---

## 3. Mitarbeiter-Modal

### Trigger

- Klick auf eine Zeile in `Mitarbeiterliste.tsx` setzt `selectedEmployeeId: string | null`
- „Neuer Mitarbeiter"-Button setzt `selectedEmployeeId = 'new'`
- Navigation zu `/mitarbeiter/:id` entfällt

### Overlay

```
fixed inset-0 z-50 flex items-center justify-center p-6
bg-black/40 backdrop-blur-sm
```

Klick auf den Overlay-Hintergrund schließt das Modal.

### Modal-Fenster

- Breite: `w-[90vw] max-w-[860px]`
- Höhe: `max-h-[90vh] overflow-y-auto`
- Border-Radius: `rounded-2xl`
- Hintergrund: `bg-white`
- X-Button oben rechts (`absolute top-4 right-4`)

### Inhalt

Identisch zu `MitarbeiterDetail.tsx`:
- Tab **Stammdaten**: alle Felder (Name, Kontakt, Adresse, Abteilung, Vertrag, Urlaub, Status)
- Tab **Urlaubskonto**: Jahresübersicht, Bearbeitung
- Tab **Dokumente**: Upload, Download, Löschen

### Implementierung

`MitarbeiterDetail.tsx` wird zu `MitarbeiterModal.tsx` umgebaut:
- Props: `employeeId: string | 'new' | null`, `onClose: () => void`
- Rendert `null` wenn `employeeId === null`
- Bestehende Logik (Laden, Speichern, Löschen) bleibt unverändert

---

## 4. Glass UI Prototyp

### Paket

```bash
npx shadcn@latest add @einui/glass-card
```

### Dashboard-Hintergrund

Der AppLayout-Wrapper (oder die Dashboard-Seite selbst) erhält einen Farbverlauf:

```
bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100
```

### Widget-Wrapper

Alle Dashboard-Widgets werden in `<GlassCard>` eingewickelt. Die bisherigen Klassen `bg-white border border-[#EDE7DC] rounded-lg` werden entfernt. Widget-Inhalte bleiben unverändert.

### Feature-Flag

`VITE_GLASS_UI=true` in `.env` aktiviert den Glass-Modus. Ohne das Flag bleibt das bisherige Design aktiv. So kann der Prototyp schnell verglichen werden.

---

## 5. Kalender-Animationen (Abwesenheiten)

### Keyframes (in `chef-app/src/index.css`)

```css
@keyframes cell-pop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.05); }
  100% { transform: scale(1); }
}

@keyframes cell-clear {
  0%   { opacity: 1; }
  40%  { opacity: 0.3; }
  100% { opacity: 1; }
}

@keyframes pulse-cell {
  0%   { box-shadow: 0 0 0 0 rgba(186, 117, 23, 0.4); }
  70%  { box-shadow: 0 0 0 6px rgba(186, 117, 23, 0); }
  100% { box-shadow: 0 0 0 0 rgba(186, 117, 23, 0); }
}
```

### CSS-Klassen

```css
.just-filled  { animation: cell-pop   280ms cubic-bezier(0.34,1.56,0.64,1) forwards; }
.just-cleared { animation: cell-clear 200ms ease-out forwards; }
.drag-over    { animation: pulse-cell 400ms ease-out forwards; }
```

### Logik in `KalenderTable.tsx`

- Nach dem Eintragen eines Kürzels: Klasse `just-filled` auf die betroffene Zelle setzen, nach `animationend` entfernen
- Nach dem Löschen eines Kürzels: Klasse `just-cleared` setzen, nach `animationend` entfernen
- Beim Drag über eine Zelle: Klasse `drag-over` setzen, beim Verlassen entfernen

---

## 6. Nicht im Scope dieser Phase

- E-Mail-Einladung für neue Mitarbeiter
- Push-Notifications
- Mobile Optimierung des Dashboards
- Dienstplan-Widget (Daten noch nicht vorhanden)
