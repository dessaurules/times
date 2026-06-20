# Schicht & Plan – Aktuelles Design-System (2026-06-19)

**Status:** Live in Production  
**Letzte Aktualisierung:** 2026-06-19  
**Gültig für:** Chef-App + Mitarbeiter-App

---

## 1. Farbpalette (INDIGO-THEME)

### Primäre Farben

| Name | Hex | RGB | Verwendung |
|------|-----|-----|-----------|
| **Primary** | `#4F46E5` | rgb(79, 70, 229) | Buttons, Links, aktive Navigation, Akzente |
| **Primary-Hover** | `#4338CA` | rgb(67, 56, 202) | Hover-Zustand für Primary-Buttons |
| **Primary-Light** | `rgba(79,70,229,0.10)` | - | Aktiver Nav-Hintergrund, leichte Hervorhebung |

### Neutrale Farben

| Name | Hex | RGB | Verwendung |
|------|-----|-----|-----------|
| **Background** | `#F3F4F6` | rgb(243, 244, 246) | Seiten-Hintergrund |
| **Card-Background** | `#FFFFFF` | rgb(255, 255, 255) | Karten, Panels, modale Dialoge |
| **Border** | `#E5E7EB` | rgb(229, 231, 235) | Linien, Trennzeichen, Card-Borders |
| **Foreground (Text)** | `#111827` | rgb(17, 24, 39) | Primär-Text, Überschriften |
| **Text-Muted** | `#6B7280` | rgb(107, 114, 128) | Sekundär-Text, Metadaten, Labels |

### Semantische Farben

| Name | Hex | Verwendung |
|------|-----|-----------|
| **Success** | `#10B981` | Bestätigte Abwesenheiten, erfolgreiche Aktionen |
| **Danger/Error** | `#DC2626` | Fehler, Validierungsfehler, abgelehnte Anträge |
| **Warning** | `#F59E0B` | Ausstehende Anträge, Warnmeldungen |
| **Info** | `#0EA5E9` | Informationen, neutrale Hinweise |

---

## 2. Farbersetzungs-Map (für zukünftige Änderungen)

Falls die Farben nochmal gewechselt werden, diese Mapping verwenden:

```
OLD → NEW (bei Änderungen immer BEIDE replacen)

#4F46E5 (Indigo-Primary) → [NEUE_PRIMARY]
#4338CA (Indigo-Hover) → [NEUE_HOVER]
rgba(79,70,229,0.10) → rgba([RGB], 0.10)
rgba(79,70,229,0.08) → rgba([RGB], 0.08)

#F3F4F6 (Bg-Gray) → [NEUE_BG]
#E5E7EB (Border-Gray) → [NEUE_BORDER]
#111827 (Text-Dark) → [NEUER_TEXT]
#6B7280 (Text-Muted) → [NEUER_MUTED]
```

---

## 3. Konfigurationsdateien (MÜSSEN ZUSAMMENPASSEN)

### Chef-App
- **`chef-app/tailwind.config.ts`** – Primary-Farben im `theme.extend.colors`
- **`chef-app/src/index.css`** – CSS-Variablen (`--primary`, `--border`, etc.)
- **`chef-app/src/**/*.tsx`** – Alle Hardcoded-Hex-Werte müssen Indigo sein

### Mitarbeiter-App
- **`mitarbeiter-app/tailwind.config.ts`** – Primary-Farben im `theme.extend.colors`
- **`mitarbeiter-app/src/index.css`** – CSS-Variablen (`--primary`, `--border`, etc.)
- **`mitarbeiter-app/src/**/*.tsx`** – Alle Hardcoded-Hex-Werte müssen Indigo sein

**WICHTIG:** Wenn du einen dieser drei Orte änderst, müssen ALLE drei aktualisiert werden!

---

## 4. Komponenten-Katalog

### Chef-App Komponenten

#### Widgets (Dashboard)
- **StatCard** – Zeigt Metriken mit Statussymbol
  - Farben: Primary für Titles, Text-Muted für Subtitles
  - Borders: `border-[#E5E7EB]`
  - Semantische Farben für Status (grün=aktiv, rot=error, amber=pending)

- **Dienstplan-Grid** (react-grid-layout)
  - Schicht-Kacheln: Weiße Cards mit Indigo-Border
  - Drag-Over-Animation: `outline: 2px dashed #4F46E5`

#### Navigation
- **Sidebar** – Logo, Nav-Items, User-Footer
  - Aktiver Nav-Item: Primary (#4F46E5) Hintergrund mit Indigo-Text
  - Hover: Primary-Light (`rgba(79,70,229,0.10)`)

#### Buttons
- **Primary Button** – `bg-[#4F46E5] hover:bg-[#4338CA]`
- **Secondary Button** – `border border-[#E5E7EB] text-[#111827]`

### Mitarbeiter-App Komponenten

#### Stempeluhr (Dashboard)
- **SwipeButton** – Animiert, snapt zurück nach rechts
  - Colors: Primary für Track, Indigo-Hover für Active
  - **WICHTIG:** Hat eigenen Hook `useSwipeGesture` mit 150ms snap-back Transition

#### Zeiterfassung (Zeiten)
- **Responsive Design:** Mobile Cards + Desktop Table
  - Mobile: `md:hidden` für Card-Layout
  - Desktop: `hidden md:block` für Tabelle
- **Timer-Refresh:** Update-Interval = **1 Sekunde** (NICHT 10 Sekunden!)

#### Abwesenheiten
- **Responsive Grid:**
  - Mobile: 2 Spalten (`grid-cols-2`)
  - Tablet+: 4 Spalten (`grid-cols-4`)
- **Monats-Modal:** Horizontales Scrolling mit Day-Kacheln

---

## 5. Build-Prozess (KRITISCH!)

**Bei Farbänderungen IMMER:**

1. Ändere die Quelldateien (tailwind.config.ts, index.css, .tsx)
2. **RUN:** `cd chef-app && npm run build`
3. **RUN:** `cd ../mitarbeiter-app && npm run build`
4. Starte Server neu: `npm run dev` (im Root)

**OHNE Build siehst du die Änderungen nicht!** Der serve.mjs serviiert `dist/`-Dateien, nicht die Quelldateien.

---

## 6. Testing-Checklist (Nach Farbänderungen)

- [ ] Chef-App Dashboard: Alle Kacheln haben Indigo-Akzente
- [ ] Chef-App Navigation: Aktive Nav-Items sind Indigo
- [ ] Mitarbeiter-App Dashboard: Stempeluhr-Button ist Indigo
- [ ] Mitarbeiter-App Buttons: Alle Primary-Buttons sind Indigo
- [ ] Borders: Alle Card-Borders sind `#E5E7EB` (grau)
- [ ] Text: Primärtext ist `#111827`, Sekundär ist `#6B7280`
- [ ] Mobile: Responsive Design funktioniert noch (2-Col Mobile, 4-Col Tablet)
- [ ] Timer: Live-Updates alle 1 Sekunde auf Zeiten-Seite

---

## 7. Häufige Fehler (Lessons Learned)

### Fehler 1: Quellcode ändern, Build vergessen
❌ FALSCH:
```bash
sed -i 's/#BA7517/#4F46E5/g' chef-app/src/**/*.tsx
npm run dev  # Zeigt alte Farben!
```

✅ RICHTIG:
```bash
sed -i 's/#BA7517/#4F46E5/g' chef-app/src/**/*.tsx
cd chef-app && npm run build  # Neuer Build mit neuen Farben
cd .. && npm run dev  # Serviiert neue dist/ Dateien
```

### Fehler 2: Nur eine App updaten
❌ FALSCH: Nur Chef-App zu Indigo, Mitarbeiter-App bleibt orange

✅ RICHTIG: BEIDE Apps müssen die gleiche Farbpalette haben

### Fehler 3: Tailwind.config UND index.css nicht synchron halten
❌ FALSCH: tailwind.config.ts hat `#4F46E5`, aber index.css hat noch `#BA7517`

✅ RICHTIG: Beide Dateien aktualisieren + alle .tsx Hardcodes

### Fehler 4: Browser-Cache nicht löschen
❌ FALSCH: Alt-Tab zum Browser, F5 drücken, sieht noch alte Farben

✅ RICHTIG: Neue Build hat neuen CSS-Hash, Browser lädt automatisch neu

---

## 8. Kontakt & Updates

Wenn du die Farben nochmal änderst:
1. Update diese Datei
2. Update die Konfigurationsdateien (tailwind.config.ts, index.css)
3. Run Build für beide Apps
4. Test die Testing-Checklist
5. Commit mit Message: `fix: update colors to [NEW_COLOR]`

**Letzte Person, die das aktualisiert hat:** Claude Haiku (2026-06-19)  
**Nächster Review:** Nach nächster Farbänderung oder 2026-07-19

