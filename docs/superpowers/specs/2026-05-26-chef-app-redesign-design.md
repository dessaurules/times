# Chef-App Redesign — Design Spec

## Ziel

Die Chef-App erhält dasselbe visuelle Design wie die Mitarbeiter-App: Indigo/Violett-Palette, cleane weiße Karten, neutraler Hintergrund. Keine Logik-, Layout- oder Funktionsänderungen — ausschließlich Farben und Kartenstil.

## Entscheidungen

| Thema | Entscheidung |
|---|---|
| Farbpalette | Indigo (#4F46E5) — identisch mit Mitarbeiter-App |
| Dashboard-Layout | react-grid-layout mit Drag & Drop bleibt |
| Kartenstil | Clean & modern (weiß, Border, Shadow) — kein Glaseffekt |
| glassUI-Flag | Wird vollständig entfernt |
| Semantische Farben | Bleiben (Grün = aktiv, Rot = Fehler, Amber = pending) |

---

## 1. Farbpalette

Alle hardcodierten Amber-Hex-Werte werden durch Indigo-Äquivalente ersetzt:

| Alt | Neu | Rolle |
|---|---|---|
| `#BA7517` | `#4F46E5` | Primärfarbe, aktiver Nav-Eintrag, Buttons |
| `rgba(186,117,23,0.12)` | `rgba(79,70,229,0.10)` | Aktiver Nav-Hintergrund |
| `rgba(186,117,23,0.10)` | `rgba(79,70,229,0.08)` | Hover-Hintergrund Nav |
| `#EDE7DC` | `#E5E7EB` | Borders, Trennlinien |
| `#F5F2EE` | `#F3F4F6` | Seitenhintergrund, Hover-Flächen |
| `#1A1917` | `#111827` | Primärtext |
| `#706D6A` | `#6B7280` | Sekundärtext, Metadaten |

Die Variante `VITE_GLASS_UI=true` und alle `glassUI ? ... : ...` Bedingungen werden entfernt. Es gibt nur noch den Clean-Pfad.

---

## 2. Komponenten

### 2a. `glass-card.tsx` → `card.tsx`

Die bestehende `GlassCard`-Komponente wird durch eine neue `Card`-Komponente ersetzt:

```tsx
// chef-app/src/components/ui/card.tsx
import { cn } from '@/lib/utils'

interface CardProps {
  className?: string
  children: React.ReactNode
}

export function Card({ className, children }: CardProps) {
  return (
    <div className={cn(
      'bg-white rounded-2xl border border-[#E5E7EB] shadow-sm',
      className
    )}>
      {children}
    </div>
  )
}
```

Alle Stellen die `GlassCard` importieren (Dashboard.tsx und weitere) werden auf `Card` umgestellt. `glass-card.tsx` wird gelöscht.

### 2b. `AppLayout.tsx`

- Hintergrund: `{ background: '#F3F4F6' }` (fix, kein glassUI-Branch)
- `GLASS_BG`-Konstante und `glassUI`-Import entfernen

### 2c. `Sidebar.tsx`

- glassUI-Import und alle ternären `glassUI ? ... : ...` Ausdrücke entfernen
- Amber-Werte durch Indigo ersetzen (siehe Farbtabelle)
- Struktur bleibt identisch: Logo + NotificationBell, Nav, User-Footer + Logout

---

## 3. Seiten

Nur Farb- und Kartenstil-Anpassungen, keine Logik- oder Strukturänderungen:

### Dashboard.tsx
- `GlassCard` → `Card` (neue Komponente)
- Widget-Stat-Akzentlinien: Amber → Indigo (`#4F46E5`)
- react-grid-layout, alle 11 Widget-Typen und Drag & Drop bleiben unverändert

### Mitarbeiterliste.tsx
- Primäre Action-Buttons: Amber → Indigo
- Badge-Farben für Rollen-Tags: Amber → Indigo

### Abwesenheiten.tsx
- Primäre Buttons: Indigo
- `pending`-Status-Badge bleibt Amber (semantische Warnung)
- `approved` → Grün, `rejected` → Rot (unverändert)

### Zeiterfassung.tsx
- Primärfarbe für aktive Zustände und Buttons: Indigo
- Tabellen-Akzente: Indigo

### Berichte.tsx
- Chart-Primärfarbe: Indigo
- Export-/Action-Buttons: Indigo

### Einstellungen.tsx
- Submit-/Save-Buttons: Indigo
- Formular-Fokusringe: Indigo

### Login.tsx
- Logo/Marken-Akzent: Indigo
- Submit-Button: Indigo

---

## 4. Was nicht geändert wird

- Alle semantischen Farben (Grün, Rot, Amber für Status)
- Logik, Datenabruf, PocketBase-Integration
- react-grid-layout und Widget-Struktur
- shadcn/ui-Basiskomponenten (badge, button, input, select, table, dialog)
- Routing, Auth, Stores

---

## Betroffene Dateien

**Löschen:**
- `chef-app/src/components/ui/glass-card.tsx`

**Neu anlegen:**
- `chef-app/src/components/ui/card.tsx`

**Ändern:**
- `chef-app/src/components/Layout/AppLayout.tsx`
- `chef-app/src/components/Layout/Sidebar.tsx`
- `chef-app/src/components/NotificationBell.tsx`
- `chef-app/src/components/Abwesenheiten/ApprovalPopover.tsx`
- `chef-app/src/components/Abwesenheiten/KalenderTable.tsx`
- `chef-app/src/components/ui/badge.tsx`
- `chef-app/src/components/ui/button.tsx`
- `chef-app/src/components/ui/dialog.tsx`
- `chef-app/src/components/ui/input.tsx`
- `chef-app/src/components/ui/select.tsx`
- `chef-app/src/pages/Dashboard.tsx`
- `chef-app/src/pages/Mitarbeiterliste.tsx`
- `chef-app/src/pages/MitarbeiterModal.tsx`
- `chef-app/src/pages/Abwesenheiten.tsx`
- `chef-app/src/pages/Zeiterfassung.tsx`
- `chef-app/src/pages/Berichte.tsx`
- `chef-app/src/pages/DruckModal.tsx`
- `chef-app/src/pages/Einstellungen.tsx`
- `chef-app/src/pages/Login.tsx`
