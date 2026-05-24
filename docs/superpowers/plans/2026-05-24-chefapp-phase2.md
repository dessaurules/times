# Chef-App Phase 2 – Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dashboard auf react-grid-layout umstellen (freies Widget-Grid), Mitarbeiter-Detailansicht als Modal, Glass UI Prototyp und Kalender-Animationen.

**Architecture:** `react-grid-layout` ersetzt `@dnd-kit` komplett auf dem Dashboard. `MitarbeiterDetail.tsx` wird zu `MitarbeiterModal.tsx` umgebaut und per State in `Mitarbeiterliste.tsx` gesteuert. Glass UI per Feature-Flag. Animationen via CSS-Keyframes + Klassen-Toggle.

**Tech Stack:** React 19, TypeScript, react-grid-layout, @einui/glass-card (shadcn registry), Tailwind CSS, Vitest

---

## Dateistruktur

| Datei | Änderung | Zweck |
|---|---|---|
| `chef-app/package.json` | modify | react-grid-layout hinzufügen, @dnd-kit entfernen |
| `chef-app/src/pages/Dashboard.tsx` | rewrite | react-grid-layout, neue Widget-IDs, Edit-Modus |
| `chef-app/src/pages/MitarbeiterModal.tsx` | create | MitarbeiterDetail als Modal-Wrapper |
| `chef-app/src/pages/MitarbeiterDetail.tsx` | delete | Inhalt zieht nach MitarbeiterModal.tsx um |
| `chef-app/src/pages/Mitarbeiterliste.tsx` | modify | selectedId-State + Modal öffnen |
| `chef-app/src/App.tsx` | modify | Route /mitarbeiter/:id entfernen |
| `chef-app/src/index.css` | modify | Keyframes + Animationsklassen |
| `chef-app/src/components/Abwesenheiten/KalenderTable.tsx` | modify | Animationsklassen auf Zellen |
| `chef-app/src/pages/Abwesenheiten.tsx` | modify | justFilled/justCleared State + Callbacks |
| `chef-app/.env` | modify | VITE_GLASS_UI=true Flag |
| `chef-app/src/components/ui/glass-card.tsx` | create (via shadcn) | Glass UI Komponente |

---

## Task 1: Abhängigkeiten aktualisieren

**Files:**
- Modify: `chef-app/package.json`

- [ ] **Schritt 1: react-grid-layout installieren**

```bash
cd /Users/ronnybeckmann/Projects/times/chef-app
npm install react-grid-layout
npm install --save-dev @types/react-grid-layout
```

Erwartete Ausgabe: `added X packages`

- [ ] **Schritt 2: @dnd-kit entfernen**

```bash
npm uninstall @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Schritt 3: Sicherstellen dass der Build noch funktioniert**

```bash
npm run build 2>&1 | tail -20
```

Erwartete Ausgabe: Fehler wegen fehlender dnd-kit-Imports in Dashboard.tsx – das ist OK, wird in Task 2 behoben.

- [ ] **Schritt 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: replace @dnd-kit with react-grid-layout"
```

---

## Task 2: Dashboard – react-grid-layout Grundgerüst

**Files:**
- Rewrite: `chef-app/src/pages/Dashboard.tsx`

Die gesamte `@dnd-kit`-Infrastruktur (DndContext, SortableContext, useSortable, DragOverlay, SortableWidget) wird entfernt. `react-grid-layout` übernimmt.

- [ ] **Schritt 1: CSS-Importe für react-grid-layout in main.tsx eintragen**

Öffne `chef-app/src/main.tsx` und füge oben hinzu:

```tsx
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
```

- [ ] **Schritt 2: Dashboard.tsx – Imports ersetzen**

Ersetze alle `@dnd-kit`-Imports durch:

```tsx
import GridLayout, { WidthProvider } from 'react-grid-layout'
import type { Layout } from 'react-grid-layout'

const RGL = WidthProvider(GridLayout)
```

Entferne alle Importe von `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
Entferne `GripVertical` aus dem `lucide-react`-Import.

- [ ] **Schritt 3: Widget-IDs und Standard-Layout definieren**

Ersetze den bisherigen `WIDGET_IDS`-Block und `useDashboardWidgets`-Hook durch:

```tsx
const WIDGET_IDS = [
  'stat-eingestempelt', 'stat-abwesend', 'stat-genehmigungen', 'stat-resturlaub',
  'antraege', 'abwesend', 'arbeitszeiten',
  'stat-ueberstunden', 'stat-krankmeldungen', 'geburtstage', 'dokumente-ablauf',
] as const
type WidgetId = typeof WIDGET_IDS[number]

const WIDGET_META: Record<WidgetId, { label: string }> = {
  'stat-eingestempelt':  { label: 'Eingestempelt heute' },
  'stat-abwesend':       { label: 'Abwesend heute' },
  'stat-genehmigungen':  { label: 'Offene Genehmigungen' },
  'stat-resturlaub':     { label: 'Resturlaub-Verfall' },
  'antraege':            { label: 'Anträge' },
  'abwesend':            { label: 'Heute abwesend' },
  'arbeitszeiten':       { label: 'Arbeitszeiten heute' },
  'stat-ueberstunden':   { label: 'Überstunden diese Woche' },
  'stat-krankmeldungen': { label: 'Krankmeldungen' },
  'geburtstage':         { label: 'Geburtstage im Monat' },
  'dokumente-ablauf':    { label: 'Ablaufende Verträge' },
}

const DEFAULT_LAYOUT: Layout[] = [
  { i: 'stat-eingestempelt',  x: 0, y: 0, w: 1, h: 1 },
  { i: 'stat-abwesend',       x: 1, y: 0, w: 1, h: 1 },
  { i: 'stat-genehmigungen',  x: 2, y: 0, w: 1, h: 1 },
  { i: 'stat-resturlaub',     x: 3, y: 0, w: 1, h: 1 },
  { i: 'antraege',            x: 0, y: 1, w: 2, h: 3 },
  { i: 'abwesend',            x: 2, y: 1, w: 2, h: 2 },
  { i: 'arbeitszeiten',       x: 0, y: 4, w: 4, h: 3 },
]

const LS_KEY = 'chef-dashboard-layout-v2'

function useGridLayout() {
  const [layout, setLayout] = useState<Layout[]>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) return JSON.parse(saved) as Layout[]
    } catch {}
    return DEFAULT_LAYOUT
  })

  const [visible, setVisible] = useState<WidgetId[]>(() =>
    layout.map(l => l.i as WidgetId).filter(id => WIDGET_IDS.includes(id))
  )

  function saveLayout(next: Layout[]) {
    setLayout(next)
    localStorage.setItem(LS_KEY, JSON.stringify(next))
  }

  function removeWidget(id: WidgetId) {
    const next = layout.filter(l => l.i !== id)
    saveLayout(next)
    setVisible(v => v.filter(x => x !== id))
  }

  function addWidget(id: WidgetId) {
    const stub: Layout = { i: id, x: 0, y: Infinity, w: 2, h: 2 }
    const next = [...layout, stub]
    saveLayout(next)
    setVisible(v => [...v, id])
  }

  const hidden = WIDGET_IDS.filter(id => !visible.includes(id))

  return { layout, visible, hidden, saveLayout, removeWidget, addWidget }
}
```

- [ ] **Schritt 4: Dashboard-State anpassen**

Im `Dashboard()`-Funktionskörper:
- Ersetze `const { order, hidden, reorder, remove, add } = useDashboardWidgets()` durch `const { layout, visible, hidden, saveLayout, removeWidget, addWidget } = useGridLayout()`
- Entferne `activeId` und `setActiveId` State
- Entferne `handleDragStart`, `handleDragEnd`, `sensors`
- Entferne `visibleStats`, `visiblePanels`, `hiddenStats`, `hiddenPanels`

- [ ] **Schritt 5: JSX – Grid ersetzen**

Ersetze den gesamten `<DndContext>...</DndContext>`-Block durch:

```tsx
<RGL
  layout={layout}
  cols={4}
  rowHeight={160}
  isDraggable={editMode}
  isResizable={editMode}
  onLayoutChange={saveLayout}
  margin={[16, 16]}
  containerPadding={[0, 0]}
  draggableCancel=".widget-no-drag"
>
  {visible.map(id => (
    <div key={id} className="relative">
      {editMode && (
        <button
          onClick={() => removeWidget(id)}
          className="widget-no-drag absolute top-2 right-2 z-10 w-5 h-5 flex items-center justify-center rounded-full bg-black/20 hover:bg-red-500 text-white transition-colors"
          title="Widget entfernen"
        >
          <X size={12} />
        </button>
      )}
      {renderWidget(id)}
    </div>
  ))}
</RGL>
```

Ersetze den „Widget hinzufügen"-Block:

```tsx
{editMode && hidden.length > 0 && (
  <div className="mt-4 flex flex-wrap gap-2 p-4 border border-dashed border-[#EDE7DC] rounded-xl bg-[#FAF7F2]">
    <p className="text-xs text-[#706D6A] w-full mb-1 font-medium">Widget hinzufügen:</p>
    {hidden.map(id => (
      <button
        key={id}
        onClick={() => addWidget(id)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#EDE7DC] text-sm text-[#706D6A] hover:border-[#BA7517] hover:text-[#BA7517] transition-colors"
      >
        <Plus size={13} /> {WIDGET_META[id].label}
      </button>
    ))}
  </div>
)}
```

- [ ] **Schritt 6: `renderWidget` für neue IDs erweitern**

Füge in der `renderWidget`-Switch-Anweisung die neuen Fälle hinzu:

```tsx
case 'stat-ueberstunden':
  return <StatCard label="Überstunden diese Woche" value={0} sub="Noch nicht implementiert" color="default" />
case 'stat-krankmeldungen':
  return <StatCard label="Krankmeldungen" value={data.absentToday.filter(a => a.type === 'K' || a.type === 'KK').length} sub="Aktuelle K/KK-Einträge" color={data.absentToday.some(a => a.type === 'K' || a.type === 'KK') ? 'red' : 'default'} />
case 'geburtstage':
  return <WidgetStub label="Geburtstage im Monat" />
case 'dokumente-ablauf':
  return <WidgetStub label="Ablaufende Verträge" />
```

Füge die `WidgetStub`-Komponente am Ende der Datei hinzu:

```tsx
function WidgetStub({ label }: { label: string }) {
  return (
    <div className="h-full bg-white border border-[#EDE7DC] rounded-lg p-5 flex items-center justify-center">
      <span className="text-sm text-[#B0A898]">{label} – demnächst verfügbar</span>
    </div>
  )
}
```

- [ ] **Schritt 7: SortableWidget-Komponente entfernen**

Lösche die gesamte `SortableWidget`-Funktion (Zeilen 80–120 in der alten Datei). Sie wird nicht mehr benötigt.

- [ ] **Schritt 8: Build prüfen**

```bash
npm run build 2>&1 | tail -30
```

Erwartete Ausgabe: erfolgreich, keine TypeScript-Fehler.

- [ ] **Schritt 9: Commit**

```bash
git add src/pages/Dashboard.tsx src/main.tsx
git commit -m "feat: replace @dnd-kit with react-grid-layout on dashboard

- Freies Grid mit 4 Spalten, Widgets frei verschiebbar und skalierbar
- Edit-Modus zeigt nur X-Button pro Widget (kein Grip-Symbol)
- Neue Widget-IDs: stat-ueberstunden, stat-krankmeldungen, geburtstage, dokumente-ablauf
- Layout-Persistenz unter chef-dashboard-layout-v2 in localStorage"
```

---

## Task 3: Mitarbeiter-Modal erstellen

**Files:**
- Create: `chef-app/src/pages/MitarbeiterModal.tsx`
- Modify: `chef-app/src/pages/Mitarbeiterliste.tsx`
- Modify: `chef-app/src/App.tsx`

- [ ] **Schritt 1: MitarbeiterModal.tsx erstellen**

Erstelle `chef-app/src/pages/MitarbeiterModal.tsx`. Der Inhalt ist der gesamte bisherige Inhalt von `MitarbeiterDetail.tsx`, mit folgenden Änderungen:

**Statt:**
```tsx
export default function MitarbeiterDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const isNew    = !id
```

**Schreibe:**
```tsx
interface Props {
  employeeId: string | 'new' | null
  onClose: () => void
}

export default function MitarbeiterModal({ employeeId, onClose }: Props) {
  const id    = employeeId === 'new' ? undefined : employeeId ?? undefined
  const isNew = employeeId === 'new'
```

Entferne alle `useParams()` und `useNavigate()` Aufrufe.

Ersetze alle `navigate(-1)` und `navigate('/mitarbeiter')` durch `onClose()`.

Wrape den gesamten Return-Wert in das Modal-Overlay:

```tsx
if (!employeeId) return null

return (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
    onClick={e => { if (e.target === e.currentTarget) onClose() }}
  >
    <div className="relative bg-white rounded-2xl w-[90vw] max-w-[860px] max-h-[90vh] overflow-y-auto shadow-2xl">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-[#706D6A] hover:bg-[#EDE7DC] transition-colors"
      >
        <X size={18} />
      </button>
      {/* bisheriger JSX-Inhalt der MitarbeiterDetail-Seite hier */}
    </div>
  </div>
)
```

Füge `X` zum `lucide-react`-Import hinzu. Entferne `ArrowLeft` (wird nicht mehr gebraucht).

- [ ] **Schritt 2: MitarbeiterDetail.tsx löschen**

```bash
rm chef-app/src/pages/MitarbeiterDetail.tsx
```

- [ ] **Schritt 3: Mitarbeiterliste.tsx – Modal-State hinzufügen**

Füge oben in der Komponente hinzu:

```tsx
const [selectedId, setSelectedId] = useState<string | 'new' | null>(null)
```

Ändere den onClick auf der Tabellenzeile:

```tsx
// Vorher:
onClick={() => navigate(`/mitarbeiter/${emp.id}`)}

// Nachher:
onClick={() => setSelectedId(emp.id)}
```

Ändere den „Neuer Mitarbeiter"-Button:

```tsx
// Vorher:
<Button onClick={() => navigate('/mitarbeiter/neu')}>

// Nachher:
<Button onClick={() => setSelectedId('new')}>
```

Füge das Modal am Ende des JSX-Returns ein (vor dem schließenden `</div>`):

```tsx
<MitarbeiterModal
  employeeId={selectedId}
  onClose={() => setSelectedId(null)}
/>
```

Füge den Import hinzu:

```tsx
import MitarbeiterModal from './MitarbeiterModal'
```

Entferne `useNavigate` und `navigate`-Aufrufe aus `Mitarbeiterliste.tsx`.

- [ ] **Schritt 4: App.tsx – Route entfernen**

Öffne `chef-app/src/App.tsx` und entferne die Zeilen für die Route `/mitarbeiter/:id` und `/mitarbeiter/neu` sowie den Import von `MitarbeiterDetail`.

- [ ] **Schritt 5: Build prüfen**

```bash
npm run build 2>&1 | tail -20
```

Erwartete Ausgabe: keine Fehler.

- [ ] **Schritt 6: Manuell testen**

```bash
npm run dev
```

- Öffne `http://localhost:5173` und navigiere zu „Mitarbeiter"
- Klicke auf eine Zeile → Modal öffnet sich mit Blur-Hintergrund
- Klicke auf Overlay oder X → Modal schließt sich
- Klicke auf „Neuer Mitarbeiter" → Modal öffnet sich im Neu-Anlegen-Modus
- Speichern eines Mitarbeiters → Modal schließt sich, Liste aktualisiert

- [ ] **Schritt 7: Commit**

```bash
git add src/pages/MitarbeiterModal.tsx src/pages/Mitarbeiterliste.tsx src/App.tsx
git commit -m "feat: Mitarbeiter-Detailansicht als Modal mit Blur-Hintergrund

- MitarbeiterDetail.tsx → MitarbeiterModal.tsx (Props: employeeId, onClose)
- Mitarbeiterliste öffnet Modal per selectedId-State statt Navigation
- Overlay: bg-black/40 backdrop-blur-sm, Klick schließt Modal
- Route /mitarbeiter/:id entfernt"
```

---

## Task 4: Glass UI Prototyp

**Files:**
- Create: `chef-app/src/components/ui/glass-card.tsx` (via shadcn)
- Modify: `chef-app/.env`
- Modify: `chef-app/src/pages/Dashboard.tsx`

- [ ] **Schritt 1: Glass-Card-Komponente hinzufügen**

```bash
cd /Users/ronnybeckmann/Projects/times/chef-app
npx shadcn@latest add @einui/glass-card
```

Falls der Befehl fehlschlägt (Paket nicht im Registry), erstelle die Komponente manuell:

```bash
cat > src/components/ui/glass-card.tsx << 'EOF'
import { cn } from '@/lib/utils'

export function GlassCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/30 bg-white/40 backdrop-blur-md shadow-lg',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
EOF
```

- [ ] **Schritt 2: Feature-Flag in .env setzen**

Öffne `chef-app/.env` (oder erstelle sie falls nicht vorhanden) und füge hinzu:

```
VITE_GLASS_UI=true
```

- [ ] **Schritt 3: Dashboard-Hintergrund hinzufügen**

Öffne `chef-app/src/pages/Dashboard.tsx`. Der äußerste `<div>`-Wrapper der Seite bekommt keinen Gradient direkt – stattdessen wird `AppLayout.tsx` angepasst.

Öffne `chef-app/src/components/Layout/AppLayout.tsx`. Finde das `<main>`-Element und füge den Gradient-Hintergrund hinzu wenn das Flag aktiv ist:

```tsx
const glassUI = import.meta.env.VITE_GLASS_UI === 'true'

// Im JSX:
<main className={cn(
  'flex-1 overflow-auto p-6',
  glassUI && 'bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100'
)}>
```

- [ ] **Schritt 4: Dashboard-Widgets in GlassCard wrapen**

Öffne `chef-app/src/pages/Dashboard.tsx`. Füge oben hinzu:

```tsx
import { GlassCard } from '@/components/ui/glass-card'

const glassUI = import.meta.env.VITE_GLASS_UI === 'true'
```

Wrape in `renderWidget` jeden Rückgabewert in `GlassCard` falls `glassUI` aktiv ist. Erstelle dafür eine Hilfsfunktion:

```tsx
function maybeGlass(node: React.ReactNode): React.ReactNode {
  if (!glassUI) return node
  return <GlassCard className="h-full">{node}</GlassCard>
}
```

Und in der Switch-Anweisung:

```tsx
function renderWidget(id: WidgetId) {
  switch (id) {
    case 'stat-eingestempelt':
      return maybeGlass(<StatCard label="Eingestempelt heute" value={presentToday} sub={`von ${data.activeTotal} aktiven MA`} color="green" />)
    // ... alle anderen Fälle ebenso
  }
}
```

Entferne bei den internen Widget-Komponenten (`StatCard`, `renderAntraege`, etc.) die `bg-white border border-[#EDE7DC] rounded-lg`-Klassen wenn `glassUI` aktiv ist – oder belasse sie, da `GlassCard` sie optisch überdeckt.

- [ ] **Schritt 5: Visuell prüfen**

```bash
npm run dev
```

- Dashboard öffnen: Widgets sollten als Glas-Karten erscheinen
- `VITE_GLASS_UI=false` setzen → klassisches weißes Design
- `VITE_GLASS_UI=true` setzen → Glass-Design

- [ ] **Schritt 6: Commit**

```bash
git add src/components/ui/glass-card.tsx src/pages/Dashboard.tsx src/components/Layout/AppLayout.tsx .env
git commit -m "feat: Glass UI Prototyp für Dashboard-Widgets

- GlassCard-Komponente (backdrop-blur + transparenter Hintergrund)
- Dashboard-Hintergrund: Amber/Orange/Stone Gradient
- Feature-Flag VITE_GLASS_UI=true aktiviert Glass-Modus
- Alle Widgets werden in GlassCard gewrappt wenn Flag aktiv"
```

---

## Task 5: Kalender-Animationen

**Files:**
- Modify: `chef-app/src/index.css`
- Modify: `chef-app/src/components/Abwesenheiten/KalenderTable.tsx`
- Modify: `chef-app/src/pages/Abwesenheiten.tsx`

- [ ] **Schritt 1: Keyframes in index.css eintragen**

Öffne `chef-app/src/index.css` und füge am Ende hinzu:

```css
@keyframes cell-pop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.07); }
  100% { transform: scale(1); }
}

@keyframes cell-clear {
  0%   { opacity: 1; }
  40%  { opacity: 0.25; }
  100% { opacity: 1; }
}

@keyframes pulse-cell {
  0%   { box-shadow: 0 0 0 0 rgba(186, 117, 23, 0.5); }
  70%  { box-shadow: 0 0 0 5px rgba(186, 117, 23, 0); }
  100% { box-shadow: 0 0 0 0 rgba(186, 117, 23, 0); }
}

.just-filled  { animation: cell-pop   280ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
.just-cleared { animation: cell-clear 200ms ease-out forwards; }
.drag-over-anim { animation: pulse-cell 400ms ease-out infinite; }
```

- [ ] **Schritt 2: KalenderTable-Props erweitern**

Öffne `chef-app/src/components/Abwesenheiten/KalenderTable.tsx`.

Füge zum `KalenderTableProps`-Interface hinzu:

```tsx
animatingCells?: Map<string, 'filled' | 'cleared'>
```

Füge den neuen Prop in die Destrukturierung ein:

```tsx
export default function KalenderTable({
  employees, absenceMap, calendarDays, summaries,
  activeCell, inputValue, dragRange,
  onCellClick, onCellMouseDown, onCellMouseEnter,
  animatingCells = new Map(),
}: KalenderTableProps) {
```

- [ ] **Schritt 3: Animationsklassen auf Zellen anwenden**

In der `<td>`-Zelle innerhalb der `calendarDays.map`-Schleife, ergänze den `cn()`-Aufruf:

```tsx
const animState = animatingCells.get(key)
const inDragOver = dragRange?.empId === emp.id &&
  day.date >= dragRange.start && day.date <= dragRange.end

// Im cn()-Aufruf:
className={cn(
  'w-6 min-w-[24px] h-7 border-b border-r border-[#EDE7DC] text-center align-middle cursor-default',
  isBlocked && 'bg-gray-50',
  !isBlocked && !absence && 'group-hover:bg-[#FDFCFB] hover:bg-[#F5F2EE] cursor-pointer',
  !isBlocked && absence && 'cursor-grab',
  isActive && 'z-20',
  inDragOver && !isBlocked && 'bg-amber-100 drag-over-anim',
  animState === 'filled'  && 'just-filled',
  animState === 'cleared' && 'just-cleared',
)}
```

Entferne die bisherige `inDrag`-Variable (sie heißt jetzt `inDragOver`) oder benenne sie um.

- [ ] **Schritt 4: Abwesenheiten.tsx – Animations-State hinzufügen**

Öffne `chef-app/src/pages/Abwesenheiten.tsx`. Füge zum State hinzu:

```tsx
const [animatingCells, setAnimatingCells] = useState<Map<string, 'filled' | 'cleared'>>(new Map())
```

Erstelle eine Hilfsfunktion:

```tsx
function triggerCellAnim(key: string, type: 'filled' | 'cleared') {
  setAnimatingCells(prev => new Map(prev).set(key, type))
  setTimeout(() => {
    setAnimatingCells(prev => {
      const next = new Map(prev)
      next.delete(key)
      return next
    })
  }, 350)
}
```

- [ ] **Schritt 5: triggerCellAnim nach Schreib-/Löschoperationen aufrufen**

Suche in `Abwesenheiten.tsx` die Stellen, an denen eine Abwesenheit gespeichert wird (nach `pb.collection('absences').create(...)`) und rufe auf:

```tsx
triggerCellAnim(`${empId}_${date}`, 'filled')
```

Suche die Stellen, an denen eine Abwesenheit gelöscht wird (nach `pb.collection('absences').delete(...)`) und rufe auf:

```tsx
triggerCellAnim(`${empId}_${date}`, 'cleared')
```

- [ ] **Schritt 6: animatingCells-Prop an KalenderTable übergeben**

Im JSX von `Abwesenheiten.tsx`, beim `<KalenderTable>`-Aufruf:

```tsx
<KalenderTable
  employees={employees}
  absenceMap={absenceMap}
  calendarDays={calendarDays}
  summaries={summaries}
  activeCell={activeCell}
  inputValue={inputValue}
  dragRange={dragRange}
  animatingCells={animatingCells}
  onCellClick={handleCellClick}
  onCellMouseDown={handleMouseDown}
  onCellMouseEnter={handleMouseEnter}
/>
```

- [ ] **Schritt 7: Manuell testen**

```bash
npm run dev
```

- Abwesenheiten-Seite öffnen
- Einen Kalender-Eintrag eingeben: Zelle sollte kurz „poppen"
- Einen Eintrag löschen: Zelle sollte kurz „verblassen"
- Über Zellen ziehen: Puls-Animation sollte aktiv sein

- [ ] **Schritt 8: Commit**

```bash
git add src/index.css src/components/Abwesenheiten/KalenderTable.tsx src/pages/Abwesenheiten.tsx
git commit -m "feat: Kalender-Drag-Animationen aus dem Prototyp implementiert

- cell-pop (280ms spring): Zelle springt beim Eintragen
- cell-clear (200ms): Zelle verblasst beim Löschen  
- pulse-cell (400ms): Goldener Puls beim Drag-over
- animatingCells-State in Abwesenheiten.tsx mit 350ms TTL"
```

---

## Self-Review

**Spec-Coverage:**
- ✅ react-grid-layout mit 4-Spalten-Grid → Task 2
- ✅ Edit-Modus mit X-Button, ganzes Widget als Drag-Fläche → Task 2 Schritt 5
- ✅ Standard-Layout mit korrekten x/y/w/h-Werten → Task 2 Schritt 3
- ✅ Neue Widget-IDs (stat-ueberstunden, stat-krankmeldungen, geburtstage, dokumente-ablauf) → Task 2 Schritt 3+6
- ✅ Persistenz unter `chef-dashboard-layout-v2` → Task 2 Schritt 3
- ✅ @dnd-kit entfernt → Task 1
- ✅ Mitarbeiter-Modal mit Blur-Hintergrund → Task 3
- ✅ Alle 3 Tabs im Modal → Task 3 Schritt 1
- ✅ Overlay schließt Modal → Task 3 Schritt 1
- ✅ Route /mitarbeiter/:id entfernt → Task 3 Schritt 4
- ✅ Glass UI per Feature-Flag → Task 4
- ✅ GlassCard für alle Widgets → Task 4 Schritt 4
- ✅ Dashboard-Hintergrund Gradient → Task 4 Schritt 3
- ✅ cell-pop Keyframe → Task 5 Schritt 1
- ✅ cell-clear Keyframe → Task 5 Schritt 1
- ✅ pulse-cell Keyframe → Task 5 Schritt 1
- ✅ animatingCells-State mit TTL → Task 5 Schritt 4+5
