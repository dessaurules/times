# Gamification Settings-Seite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Neue Admin-Seite `/admin/gamification/settings` hinzufügen, auf der Geschäftsführer das Gamification-System per Toggle ein- und ausschalten können. Die Änderung wird automatisch in der Mitarbeiter-App via Real-Time-Subscription sichtbar.

**Architecture:** Wrapper-Pattern: Neue Page-Komponente bindet die existierende `GamificationSettings` Komponente ein. Keine neuen Komponenten oder Hooks nötig — nur Routing-Integration in `App.tsx`. Die bestehende Real-Time-Subscription in `GamificationSettings` handhabt Updates automatisch.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, shadcn/ui (Switch, Card, Label), PocketBase SDK, Zustand (für Auth-Check)

## Global Constraints

- TypeScript strict mode erforderlich — alle Props und Rückgabewerte typisieren
- Tailwind CSS für Styling, keine inline styles
- Shadcn/ui-Komponenten verwenden (Switch, Card, Label bereits verfügbar)
- GFRoute-Guard schützt die Seite (nur Geschäftsführer können zugreifen)
- Real-Time-Updates via PocketBase Subscription müssen funktionieren
- Kompatibilität mit bestehenden Admin-Pages (gleiche Header-Struktur)

---

## Task 1: Neue Page-Komponente erstellen

**Files:**
- Create: `chef-app/src/pages/Admin/GameSettings.tsx`

**Interfaces:**
- Consumes: `GamificationSettings` Komponente (aus `chef-app/src/components/Gamification/GamificationSettings.tsx`)
- Produces: `GameSettings` Page-Komponente (default export)

- [ ] **Step 1: Neue Datei erstellen und Komponente schreiben**

```typescript
// chef-app/src/pages/Admin/GameSettings.tsx
import GamificationSettings from '@/components/Gamification/GamificationSettings'

export default function GameSettings() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gamification Einstellungen</h1>
      <GamificationSettings />
    </div>
  )
}
```

- [ ] **Step 2: Datei speichern und TypeScript-Fehler prüfen**

```bash
# Sollte keine Fehler anzeigen
cd /Users/ronnybeckmann/Projects/times/chef-app
npm run build 2>&1 | grep -i error
```

Expected: Keine TypeScript-Fehler

---

## Task 2: Route in App.tsx hinzufügen

**Files:**
- Modify: `chef-app/src/App.tsx` (import + route)

**Interfaces:**
- Consumes: `GameSettings` Page-Komponente aus Task 1
- Produces: Neue Route `/admin/gamification/settings` im GFRoute-Bereich

- [ ] **Step 1: Import hinzufügen**

Öffne `chef-app/src/App.tsx` und füge den Import neben den anderen Admin-Imports ein:

```typescript
import GameSettings from './pages/Admin/GameSettings'
```

Beachte: Die Imports sollten zusammen sein mit den anderen Admin-Page-Imports (`GameTasks`, `GameRewards`, `GameApprovals`).

- [ ] **Step 2: Route hinzufügen**

Finde die GFRoute-Section in `App.tsx` (ungefähr Zeile 40-50, wo `<Route path="/admin/gamification/tasks"` definiert ist).

Füge diese Route NACH den anderen Gamification-Routes hinzu:

```typescript
<Route path="/admin/gamification/settings" element={<GameSettings />} />
```

Die Reihenfolge sollte sein:
```typescript
<Route path="/admin/gamification/tasks"    element={<GameTasks />} />
<Route path="/admin/gamification/rewards"  element={<GameRewards />} />
<Route path="/admin/gamification/approvals" element={<GameApprovals />} />
<Route path="/admin/gamification/settings" element={<GameSettings />} /> {/* NEU */}
```

- [ ] **Step 3: TypeScript-Fehler prüfen**

```bash
cd /Users/ronnybeckmann/Projects/times/chef-app
npm run build 2>&1 | head -20
```

Expected: Keine Fehler, möglicherweise Warnungen (ignorieren)

- [ ] **Step 4: Dev-Server starten und Route testen**

```bash
cd /Users/ronnybeckmann/Projects/times/chef-app
npm run dev
```

Öffne Browser: `http://localhost:5173/admin/gamification/settings`

Expected: Seite lädt, zeigt "Gamification Einstellungen" Überschrift + Toggle UI

- [ ] **Step 5: Toggle-Funktionalität testen**

1. Klicke auf den Toggle (an- oder ausschalten)
2. Beobachte: Status ändert sich, kein Error
3. Öffne PocketBase Admin unter `http://localhost:8091/_/`
4. Navigiere zu `gam_settings` Collection
5. Prüfe: `enabled`-Feld zeigt den korrekten Wert (true/false)

Expected: Toggle speichert sich in der Datenbank

- [ ] **Step 6: Real-Time-Subscription testen (optional aber empfohlen)**

Öffne die Settings-Seite in **zwei verschiedenen Browser-Tabs**:
- Tab 1: `http://localhost:5173/admin/gamification/settings`
- Tab 2: `http://localhost:5173/admin/gamification/settings`

In Tab 1: Klicke Toggle
In Tab 2: Beobachte, dass sich der Toggle auch dort ändert (ohne Seite zu aktualisieren)

Expected: Real-Time-Update funktioniert

- [ ] **Step 7: Mitarbeiter-App-Integration testen**

Starte auch die Mitarbeiter-App (`http://localhost:5173/ma/`):

1. Settings-Seite: Toggle auf OFF
2. Mitarbeiter-App: Gamification-Komponenten sollten verschwinden
3. Settings-Seite: Toggle auf ON
4. Mitarbeiter-App: Gamification-Komponenten sollten wieder erscheinen

Expected: Gamification-Features folgen dem Toggle-Status

- [ ] **Step 8: Commit**

```bash
cd /Users/ronnybeckmann/Projects/times
git add chef-app/src/pages/Admin/GameSettings.tsx chef-app/src/App.tsx
git commit -m "feat(gamification): Add settings page for toggling system on/off"
```

---

## Spec Coverage Check ✓

- ✅ **Neue Route** `/admin/gamification/settings` → Task 2
- ✅ **Toggle-Funktionalität** → Task 1 (GamificationSettings Komponente)
- ✅ **Real-Time Updates** → Task 1 (existierende Subscription)
- ✅ **GFRoute-Guard** → App.tsx routing
- ✅ **Mitarbeiter-App-Sichtbarkeit** → Bestehender `useGamificationEnabled` Hook
- ✅ **Konsistentes Styling** → Task 1 mit h1 + GamificationSettings
