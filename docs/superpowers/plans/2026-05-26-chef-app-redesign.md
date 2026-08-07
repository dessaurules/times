# Chef-App Redesign — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chef-App erhält dasselbe visuelle Design wie die Mitarbeiter-App: Indigo-Palette, cleane weiße Karten, neutraler Hintergrund — ausschließlich Farb- und Stiländerungen, keine Logik.

**Architecture:** Amber-Farben (#BA7517 etc.) werden überall durch Indigo-Werte (#4F46E5 etc.) ersetzt. Die GlassCard-Komponente wird durch eine neue Card-Komponente ersetzt. Der glassUI-Feature-Flag wird vollständig entfernt. Alle Änderungen sind rein visuell — keine Logik, kein Datenabruf, kein Routing wird geändert.

**Tech Stack:** React 19, TypeScript strict, Tailwind v3, Vite 8, shadcn-Muster, react-grid-layout (bleibt)

---

## Farb-Mapping (Referenz für alle Tasks)

| Alt (Amber) | Neu (Indigo) |
|---|---|
| `#BA7517` | `#4F46E5` |
| `#9E6312` | `#4338CA` |
| `rgba(186,117,23,0.12)` | `rgba(79,70,229,0.10)` |
| `rgba(186,117,23,0.10)` | `rgba(79,70,229,0.08)` |
| `rgba(186,117,23,0.05)` | `rgba(79,70,229,0.05)` |
| `#EDE7DC` | `#E5E7EB` |
| `#F5F2EE` | `#F3F4F6` |
| `#FAF7F2` | `#F9FAFB` |
| `#FDFCFB` | `#F9FAFB` |
| `#FDF8F0` | `#EEF2FF` |
| `#FFF9F0` | `#EEF2FF` |
| `#F5F0EA` | `#F3F4F6` |
| `#1A1917` | `#111827` |
| `#706D6A` | `#6B7280` |
| `#B0A898` | `#9CA3AF` |
| `#BBBBBB` | `#9CA3AF` |
| `#AAAAAA` | `#9CA3AF` |
| `#D0CBC2` | `#D1D5DB` |
| `#C8BFB2` | `#D1D5DB` |
| `#FAFAF8` | `#F9FAFB` |

---

## Task 1: UI-Basiskomponenten auf Indigo umstellen

**Files:**
- Modify: `chef-app/src/components/ui/button.tsx`
- Modify: `chef-app/src/components/ui/badge.tsx`
- Modify: `chef-app/src/components/ui/input.tsx`
- Modify: `chef-app/src/components/ui/select.tsx`
- Modify: `chef-app/src/components/ui/dialog.tsx`

- [ ] **Step 1: TypeScript-Check Baseline sicherstellen**

```bash
cd /Users/ronnybeckmann/Projects/times/chef-app
npx tsc --noEmit
```

Expected: keine Fehler (oder nur bestehende Fehler, die nicht durch diesen Task entstehen).

- [ ] **Step 2: button.tsx ersetzen**

Datei `chef-app/src/components/ui/button.tsx` komplett ersetzen:

```tsx
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:     'bg-[#4F46E5] text-white hover:bg-[#4338CA]',
        outline:     'border border-[#E5E7EB] bg-white hover:bg-[#F3F4F6] text-[#111827]',
        ghost:       'hover:bg-[rgba(79,70,229,0.08)] text-[#111827]',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        link:        'text-[#4F46E5] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm:      'h-8 px-3 text-xs',
        lg:      'h-10 px-6',
        icon:    'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

- [ ] **Step 3: badge.tsx ersetzen**

Datei `chef-app/src/components/ui/badge.tsx` komplett ersetzen:

```tsx
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:     'border-transparent bg-[#4F46E5] text-white',
        secondary:   'border-transparent bg-[#F3F4F6] text-[#6B7280]',
        destructive: 'border-transparent bg-red-600 text-white',
        outline:     'border-[#E5E7EB] text-[#111827]',
        success:     'border-transparent bg-green-100 text-green-800',
        warning:     'border-transparent bg-amber-100 text-amber-800',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
```

- [ ] **Step 4: input.tsx ersetzen**

Datei `chef-app/src/components/ui/input.tsx` komplett ersetzen:

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-9 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] outline-none transition-colors placeholder:text-[#6B7280] focus-visible:border-[#4F46E5] focus-visible:ring-2 focus-visible:ring-[#4F46E5]/20 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
```

- [ ] **Step 5: select.tsx ersetzen**

Datei `chef-app/src/components/ui/select.tsx` komplett ersetzen:

```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-9 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] outline-none transition-colors focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
)
Select.displayName = 'Select'

export { Select }
```

- [ ] **Step 6: dialog.tsx ersetzen**

Datei `chef-app/src/components/ui/dialog.tsx` komplett ersetzen:

```tsx
import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

function Dialog({ open, onClose, children }: DialogProps) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-lg shadow-lg border border-[#E5E7EB] w-full max-w-sm mx-4">
        {children}
      </div>
    </div>,
    document.body
  )
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-between px-5 pt-5 pb-3', className)} {...props} />
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-base font-semibold text-[#111827]', className)} {...props} />
}

function DialogClose({ onClose }: { onClose: () => void }) {
  return (
    <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827] transition-colors">
      <X size={16} />
    </button>
  )
}

function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-3 text-sm text-[#6B7280]', className)} {...props} />
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex justify-end gap-2 px-5 py-4 border-t border-[#E5E7EB]', className)} {...props} />
  )
}

export { Dialog, DialogHeader, DialogTitle, DialogClose, DialogBody, DialogFooter }
```

- [ ] **Step 7: TypeScript-Check**

```bash
cd /Users/ronnybeckmann/Projects/times/chef-app
npx tsc --noEmit
```

Expected: keine neuen Fehler.

- [ ] **Step 8: Commit**

```bash
cd /Users/ronnybeckmann/Projects/times
git add chef-app/src/components/ui/button.tsx chef-app/src/components/ui/badge.tsx chef-app/src/components/ui/input.tsx chef-app/src/components/ui/select.tsx chef-app/src/components/ui/dialog.tsx
git commit -m "feat: Chef-App UI-Basiskomponenten auf Indigo umgestellt"
```

---

## Task 2: Card-Komponente anlegen, GlassCard löschen

**Files:**
- Create: `chef-app/src/components/ui/card.tsx`
- Delete: `chef-app/src/components/ui/glass-card.tsx`

- [ ] **Step 1: Neue card.tsx anlegen**

Datei `chef-app/src/components/ui/card.tsx` erstellen:

```tsx
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('bg-white rounded-2xl border border-[#E5E7EB] shadow-sm h-full overflow-hidden', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-5 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('text-xs text-[#6B7280]', className)} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-5 py-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2', className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'default'
}

export function CardButton({ variant = 'default', className, children, ...props }: CardButtonProps) {
  return (
    <button
      className={cn(
        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
        variant === 'primary'
          ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
          : 'border border-[#E5E7EB] text-[#6B7280] hover:bg-[#E5E7EB]',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 2: TypeScript-Check**

```bash
cd /Users/ronnybeckmann/Projects/times/chef-app
npx tsc --noEmit
```

Expected: keine neuen Fehler.

- [ ] **Step 3: Commit**

```bash
cd /Users/ronnybeckmann/Projects/times
git add chef-app/src/components/ui/card.tsx
git commit -m "feat: neue Card-Komponente für Chef-App Redesign"
```

Hinweis: `glass-card.tsx` wird erst in Task 4 gelöscht, wenn alle Imports darauf umgestellt sind.

---

## Task 3: AppLayout, Sidebar und NotificationBell

**Files:**
- Modify: `chef-app/src/components/Layout/AppLayout.tsx`
- Modify: `chef-app/src/components/Layout/Sidebar.tsx`
- Modify: `chef-app/src/components/NotificationBell.tsx`

- [ ] **Step 1: AppLayout.tsx ersetzen**

Datei `chef-app/src/components/Layout/AppLayout.tsx` komplett ersetzen:

```tsx
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F3F4F6' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Sidebar.tsx ersetzen**

Datei `chef-app/src/components/Layout/Sidebar.tsx` komplett ersetzen:

```tsx
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarOff, Clock, BarChart2, Settings, LogOut,
} from 'lucide-react'
import { useAuthStore } from '../../stores/auth'
import { cn } from '@/lib/utils'
import NotificationBell from '../NotificationBell'

const NAV = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard',     end: true,  gfOnly: false },
  { to: '/mitarbeiter',   icon: Users,           label: 'Mitarbeiter',               gfOnly: true  },
  { to: '/abwesenheiten', icon: CalendarOff,     label: 'Abwesenheiten',             gfOnly: false },
  { to: '/zeiterfassung', icon: Clock,           label: 'Zeiterfassung',             gfOnly: false },
  { to: '/berichte',      icon: BarChart2,       label: 'Berichte',                  gfOnly: false },
  { to: '/einstellungen', icon: Settings,        label: 'Einstellungen',             gfOnly: true  },
]

export default function Sidebar() {
  const logout   = useAuthStore(s => s.logout)
  const user     = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const isGF     = user?.role === 'gf'

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="w-[220px] shrink-0 flex flex-col h-full bg-white border-r border-[#E5E7EB]">
      <div className="flex items-center gap-2 px-5 py-[18px] font-bold text-[15px] border-b border-[#E5E7EB] text-[#4F46E5]">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        Schicht &amp; Plan
        <div className="ml-auto">
          <NotificationBell />
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.filter(n => !n.gfOnly || isGF).map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-[rgba(79,70,229,0.10)] text-[#4F46E5] font-medium'
                  : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]'
              )
            }
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pt-3 pb-4 border-t border-[#E5E7EB]">
        {user && (
          <div className="px-3 py-2 mb-1 text-xs">
            <div className="font-medium truncate text-[#111827]">{user.name}</div>
            <div className="text-[11px] text-[#6B7280]">{user.role === 'gf' ? 'Geschäftsführung' : 'Schichtleitung'}</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm transition-colors text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
        >
          <LogOut size={16} />
          <span>Abmelden</span>
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: NotificationBell.tsx Farben anpassen**

Datei `chef-app/src/components/NotificationBell.tsx` — folgende Änderungen vornehmen:

Zeile 117 (Button-Klassen):
```tsx
// Alt:
className="relative flex items-center justify-center w-7 h-7 rounded-md hover:bg-[rgba(186,117,23,0.10)] text-[#706D6A] hover:text-[#BA7517] transition-colors"
// Neu:
className="relative flex items-center justify-center w-7 h-7 rounded-md hover:bg-[rgba(79,70,229,0.08)] text-[#6B7280] hover:text-[#4F46E5] transition-colors"
```

Zeile 134–135 (Panel-Header):
```tsx
// Alt:
className="w-80 bg-white rounded-xl border border-[#EDE7DC] shadow-xl overflow-hidden"
// Neu:
className="w-80 bg-white rounded-xl border border-[#E5E7EB] shadow-xl overflow-hidden"
```

Zeile 134 (Trennlinie im Header):
```tsx
// Alt:
<div className="flex items-center justify-between px-4 py-3 border-b border-[#EDE7DC]">
// Neu:
<div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
```

Zeile 137 (Button "Alle gelesen"):
```tsx
// Alt:
<button onClick={markAllRead} className="text-xs text-[#BA7517] hover:underline">
// Neu:
<button onClick={markAllRead} className="text-xs text-[#4F46E5] hover:underline">
```

Zeile 148 (Liste):
```tsx
// Alt:
<ul className="max-h-[320px] overflow-y-auto divide-y divide-[#F5F2EE]">
// Neu:
<ul className="max-h-[320px] overflow-y-auto divide-y divide-[#F3F4F6]">
```

Zeile 153–155 (Listen-Item):
```tsx
// Alt:
className={cn(
  'px-4 py-3 cursor-pointer hover:bg-[#F5F2EE] transition-colors',
  !n.read && 'bg-[rgba(186,117,23,0.05)]',
)}
// Neu:
className={cn(
  'px-4 py-3 cursor-pointer hover:bg-[#F3F4F6] transition-colors',
  !n.read && 'bg-[rgba(79,70,229,0.05)]',
)}
```

Zeile 159–161 (Punkt-Indikator):
```tsx
// Alt:
className={cn(
  'mt-1.5 w-1.5 h-1.5 rounded-full shrink-0',
  n.read ? 'bg-transparent' : 'bg-[#BA7517]',
)}
// Neu:
className={cn(
  'mt-1.5 w-1.5 h-1.5 rounded-full shrink-0',
  n.read ? 'bg-transparent' : 'bg-[#4F46E5]',
)}
```

- [ ] **Step 4: TypeScript-Check**

```bash
cd /Users/ronnybeckmann/Projects/times/chef-app
npx tsc --noEmit
```

Expected: keine neuen Fehler.

- [ ] **Step 5: Commit**

```bash
cd /Users/ronnybeckmann/Projects/times
git add chef-app/src/components/Layout/AppLayout.tsx chef-app/src/components/Layout/Sidebar.tsx chef-app/src/components/NotificationBell.tsx
git commit -m "feat: Chef-App Layout und Navigation auf Indigo umgestellt"
```

---

## Task 4: Dashboard auf Card-Komponente + Indigo

**Files:**
- Modify: `chef-app/src/pages/Dashboard.tsx`
- Delete: `chef-app/src/components/ui/glass-card.tsx`

- [ ] **Step 1: Dashboard.tsx komplett ersetzen**

Datei `chef-app/src/pages/Dashboard.tsx` komplett ersetzen. Die Änderungen gegenüber dem Original:
- Import `GlassCard, GlassCardHeader, ...` → `Card, CardHeader, CardTitle, CardDescription, CardContent`
- `glassUI`-Konstante und alle `glass={glassUI}` Props entfernen
- Alle Amber-Farbwerte durch Indigo ersetzen (siehe Farb-Mapping)
- `StatCard` und `WidgetStub` Hilfsfunktionen angepasst

```tsx
import { useState, useEffect, useMemo } from 'react'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { de } from 'date-fns/locale'
import { Check, XCircle, Plus, X, LogOut, SlidersHorizontal } from 'lucide-react'
import GridLayout, { WidthProvider } from 'react-grid-layout/legacy'
import type { Layout, LayoutItem } from 'react-grid-layout/legacy'
import { pb } from '../lib/pb'
import { useAuthStore } from '../stores/auth'
import type { Employee, Absence, TimeEntry } from '@shared/types'
import { ABSENCE_COLORS } from '@shared/types'
import { cn } from '@/lib/utils'
import { notifyEmployee } from '../lib/notifications'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

const RGL = WidthProvider(GridLayout)

// ── Widget-Definitionen ────────────────────────────────────────────────────
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

const DEFAULT_LAYOUT: LayoutItem[] = [
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
  const [layout, setLayout] = useState<LayoutItem[]>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as LayoutItem[]
        const valid = parsed.filter(l => (WIDGET_IDS as readonly string[]).includes(l.i))
        const missing = DEFAULT_LAYOUT.filter(d => !valid.some(v => v.i === d.i))
        return [...valid, ...missing]
      }
    } catch {}
    return DEFAULT_LAYOUT
  })

  const visible = layout.map(l => l.i as WidgetId).filter(id => (WIDGET_IDS as readonly string[]).includes(id))
  const hidden = WIDGET_IDS.filter(id => !visible.includes(id))

  function saveLayout(next: LayoutItem[] | Layout) {
    const arr = Array.isArray(next) ? next : [...next]
    setLayout(arr as LayoutItem[])
    localStorage.setItem(LS_KEY, JSON.stringify(arr))
  }

  function removeWidget(id: WidgetId) {
    setLayout(prev => {
      const next = prev.filter(l => l.i !== id)
      localStorage.setItem(LS_KEY, JSON.stringify(next))
      return next
    })
  }

  function addWidget(id: WidgetId) {
    setLayout(prev => {
      const stub: LayoutItem = { i: id, x: 0, y: Infinity, w: 2, h: 2 }
      const next = [...prev, stub]
      localStorage.setItem(LS_KEY, JSON.stringify(next))
      return next
    })
  }

  return { layout, visible, hidden, saveLayout, removeWidget, addWidget }
}

type AbsenceExp   = Absence   & { expand?: { employee?: Employee } }
type TimeEntryExp = TimeEntry & { expand?: { employee?: Employee } }

interface StempelRow {
  employee:    Employee
  sinceLabel:  string
  totalMins:   number
  isActive:    boolean
  openEntryId: string | undefined
}

interface DashData {
  activeTotal:    number
  absentToday:    AbsenceExp[]
  pending:        AbsenceExp[]
  carryOverCount: number
}

function fmtMins(mins: number) {
  const h = Math.floor(Math.abs(mins) / 60)
  const m = Math.abs(mins) % 60
  return `${h}:${String(m).padStart(2, '0')} h`
}

export default function Dashboard() {
  const user       = useAuthStore(s => s.user)
  const canApprove = user?.role === 'gf'
  const today      = format(new Date(), 'yyyy-MM-dd')

  const { layout, visible, hidden, saveLayout, removeWidget, addWidget } = useGridLayout()
  const [editMode,  setEditMode]  = useState(false)

  const [data,    setData]    = useState<DashData>({ activeTotal: 0, absentToday: [], pending: [], carryOverCount: 0 })
  const [loading, setLoading] = useState(true)
  const [timeEntries,  setTimeEntries]  = useState<TimeEntryExp[]>([])
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [now,          setNow]          = useState(new Date())

  const [showClockInForm, setShowClockInForm] = useState(false)
  const [clockInEmpId,    setClockInEmpId]    = useState('')
  const [clockInBusy,     setClockInBusy]     = useState(false)

  const [antragTab,      setAntragTab]      = useState<'pending' | 'verlauf'>('pending')
  const [verlauf,        setVerlauf]        = useState<AbsenceExp[]>([])
  const [verlaufFilter,  setVerlaufFilter]  = useState('')
  const [verlaufLoading, setVerlaufLoading] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const from = `${today} 00:00:00`
        const to   = `${today} 23:59:59`
        const [empList, absentList, pendingList, carryList, timeList, empFullList] = await Promise.all([
          pb.collection('employees').getList(1, 1, { filter: 'active = true', requestKey: null }),
          pb.collection('absences').getFullList<AbsenceExp>({
            filter: `date_from <= "${today}" && date_to >= "${today}" && status = "approved"`,
            expand: 'employee', requestKey: null,
          }),
          pb.collection('absences').getFullList<AbsenceExp>({
            filter: 'status = "pending"', sort: 'date_from', expand: 'employee', requestKey: null,
          }),
          pb.collection('vacation_accounts').getList(1, 1, {
            filter: `year = ${new Date().getFullYear()} && carry_over > 0`, requestKey: null,
          }).catch(() => ({ totalItems: 0 })),
          pb.collection('time_entries').getFullList<TimeEntryExp>({
            filter: `start_time >= "${from}" && start_time <= "${to}"`,
            sort: 'employee,start_time', expand: 'employee', requestKey: null,
          }),
          pb.collection('employees').getFullList<Employee>({
            filter: 'active = true', sort: 'last_name,first_name', requestKey: null,
          }),
        ])
        setData({
          activeTotal:    empList.totalItems,
          absentToday:    absentList,
          pending:        pendingList,
          carryOverCount: carryList.totalItems,
        })
        setTimeEntries(timeList)
        setAllEmployees(empFullList)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [today])

  useEffect(() => {
    if (antragTab !== 'verlauf') return
    setVerlaufLoading(true)
    pb.collection('absences').getList<AbsenceExp>(1, 50, {
      filter: 'status = "approved" || status = "rejected"',
      sort: '-updated', expand: 'employee', requestKey: null,
    }).then(r => setVerlauf(r.items))
      .catch(console.error)
      .finally(() => setVerlaufLoading(false))
  }, [antragTab])

  const stempel = useMemo(() => {
    const byEmp = new Map<string, { emp: Employee; entries: TimeEntryExp[] }>()
    for (const e of timeEntries) {
      const emp = e.expand?.employee
      if (!emp) continue
      if (!byEmp.has(e.employee)) byEmp.set(e.employee, { emp, entries: [] })
      byEmp.get(e.employee)!.entries.push(e)
    }
    const rows: StempelRow[] = []
    for (const { emp, entries } of byEmp.values()) {
      const open  = entries.find(e => !e.end_time)
      const first = entries[0]
      const last  = entries[entries.length - 1]
      const total = entries.reduce((sum, e) => {
        const end   = e.end_time ? parseISO(e.end_time) : now
        const gross = differenceInMinutes(end, parseISO(e.start_time))
        return sum + Math.max(0, gross - (e.break_minutes ?? 0))
      }, 0)
      rows.push({
        employee:    emp,
        sinceLabel:  open
          ? `seit ${format(parseISO(open.start_time), 'HH:mm')} Uhr`
          : `${format(parseISO(first.start_time), 'HH:mm')} – ${format(parseISO(last.end_time!), 'HH:mm')} Uhr`,
        totalMins:   total,
        isActive:    !!open,
        openEntryId: open?.id,
      })
    }
    rows.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      return a.employee.last_name.localeCompare(b.employee.last_name)
    })
    return rows
  }, [timeEntries, now])

  function absDateLabel(abs: Absence) {
    return abs.date_from === abs.date_to
      ? format(parseISO(abs.date_from), 'dd.MM.yyyy', { locale: de })
      : `${format(parseISO(abs.date_from), 'dd.MM.', { locale: de })} – ${format(parseISO(abs.date_to), 'dd.MM.yyyy', { locale: de })}`
  }

  async function handleApprove(absenceId: string) {
    const abs = data.pending.find(a => a.id === absenceId)
    await pb.collection('absences').update(absenceId, {
      status: 'approved', approved_by: user!.id, approved_at: new Date().toISOString(),
    })
    setData(prev => {
      const a          = prev.pending.find(x => x.id === absenceId)
      const newPending = prev.pending.filter(x => x.id !== absenceId)
      const isToday    = a && a.date_from <= today && a.date_to >= today
      return {
        ...prev,
        pending:     newPending,
        absentToday: isToday && a ? [...prev.absentToday, { ...a, status: 'approved' }] : prev.absentToday,
      }
    })
    if (abs) {
      notifyEmployee(abs.employee, 'absence_approved', 'Antrag genehmigt',
        `Dein ${abs.type}-Antrag (${absDateLabel(abs)}) wurde genehmigt.`, abs.id)
    }
  }

  async function handleReject(absenceId: string) {
    const abs = data.pending.find(a => a.id === absenceId)
    await pb.collection('absences').update(absenceId, { status: 'rejected' })
    setData(prev => ({ ...prev, pending: prev.pending.filter(a => a.id !== absenceId) }))
    if (abs) {
      notifyEmployee(abs.employee, 'absence_rejected', 'Antrag abgelehnt',
        `Dein ${abs.type}-Antrag (${absDateLabel(abs)}) wurde leider abgelehnt.`, abs.id)
    }
  }

  async function handleClockOut(entryId: string) {
    const endTime = new Date().toISOString()
    await pb.collection('time_entries').update(entryId, { end_time: endTime })
    setTimeEntries(prev => prev.map(e => e.id === entryId ? { ...e, end_time: endTime } : e))
  }

  async function handleClockIn(employeeId: string) {
    setClockInBusy(true)
    try {
      const created = await pb.collection('time_entries').create<TimeEntryExp>({
        employee: employeeId, start_time: new Date().toISOString(),
      }, { expand: 'employee', requestKey: null })
      setTimeEntries(prev => [...prev, created])
      setShowClockInForm(false)
      setClockInEmpId('')
    } finally {
      setClockInBusy(false)
    }
  }

  const presentToday    = stempel.length
  const absentBreakdown = data.absentToday.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1; return acc
  }, {} as Record<string, number>)
  const absentSub = Object.entries(absentBreakdown).map(([t, n]) => `${t}: ${n}`).join(' · ') || '–'

  const verlaufEmployees = [...new Map(
    verlauf.map(a => a.expand?.employee).filter((e): e is Employee => !!e).map(e => [e.id, e])
  ).values()]
  const filteredVerlauf = verlaufFilter ? verlauf.filter(a => a.employee === verlaufFilter) : verlauf

  function renderAntraege() {
    return (
      <Card className="h-full">
        <CardHeader className="p-0 border-b-0">
          <div className="flex w-full">
            <button
              onClick={() => setAntragTab('pending')}
              className={cn(
                'flex-1 py-3 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                antragTab === 'pending'
                  ? 'text-[#4F46E5] border-b-2 border-[#4F46E5] bg-[#EEF2FF]'
                  : 'text-[#6B7280] hover:bg-[#F9FAFB]'
              )}
            >
              Ausstehend{data.pending.length > 0 ? ` (${data.pending.length})` : ''}
            </button>
            <button
              onClick={() => setAntragTab('verlauf')}
              className={cn(
                'flex-1 py-3 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                antragTab === 'verlauf'
                  ? 'text-[#4F46E5] border-b-2 border-[#4F46E5] bg-[#EEF2FF]'
                  : 'text-[#6B7280] hover:bg-[#F9FAFB]'
              )}
            >
              Verlauf
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {antragTab === 'pending' ? (
            <>
              {data.pending.length === 0 ? (
                <p className="text-sm text-[#6B7280]">Keine offenen Genehmigungen.</p>
              ) : data.pending.map(abs => {
                const emp    = abs.expand?.employee
                const colors = ABSENCE_COLORS[abs.type]
                const days   = calcDays(abs.date_from, abs.date_to)
                const dateLabel = abs.date_from === abs.date_to
                  ? format(parseISO(abs.date_from), 'dd.MM.yyyy', { locale: de })
                  : `${format(parseISO(abs.date_from), 'dd.MM.', { locale: de })}–${format(parseISO(abs.date_to), 'dd.MM.yyyy', { locale: de })}`
                return (
                  <div key={abs.id} className="flex items-center gap-2 py-2.5 border-b border-[#E5E7EB] last:border-0 text-sm">
                    <span className="font-semibold text-[#111827] min-w-[130px] truncate">
                      {emp ? `${emp.last_name}, ${emp.first_name}` : '—'}
                    </span>
                    <span className="text-[#6B7280] flex-1 text-xs whitespace-nowrap">
                      {dateLabel} · {days} T
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded shrink-0"
                      style={{ backgroundColor: colors.bg, color: colors.text }}>
                      {abs.type}
                    </span>
                    {canApprove && (
                      <>
                        <button onClick={() => handleApprove(abs.id)} title="Genehmigen"
                          className="p-1 rounded text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 shrink-0">
                          <Check size={13} />
                        </button>
                        <button onClick={() => handleReject(abs.id)} title="Ablehnen"
                          className="p-1 rounded text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 shrink-0">
                          <XCircle size={13} />
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
            </>
          ) : (
            <>
              {verlaufLoading ? (
                <p className="text-sm text-[#6B7280]">Lade…</p>
              ) : (
                <>
                  {verlaufEmployees.length > 1 && (
                    <div className="mb-3">
                      <select
                        value={verlaufFilter}
                        onChange={e => setVerlaufFilter(e.target.value)}
                        className="text-xs border border-[#E5E7EB] rounded px-2 py-1.5 text-[#6B7280] outline-none focus:border-[#4F46E5] bg-white"
                      >
                        <option value="">Alle Mitarbeiter</option>
                        {verlaufEmployees.map(e => (
                          <option key={e.id} value={e.id}>{e.last_name}, {e.first_name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {filteredVerlauf.length === 0 ? (
                    <p className="text-sm text-[#6B7280]">Kein Verlauf vorhanden.</p>
                  ) : (
                    <div>
                      {filteredVerlauf.map(abs => {
                        const emp      = abs.expand?.employee
                        const colors   = ABSENCE_COLORS[abs.type]
                        const approved = abs.status === 'approved'
                        const dateLabel = abs.date_from === abs.date_to
                          ? format(parseISO(abs.date_from), 'dd.MM.yyyy', { locale: de })
                          : `${format(parseISO(abs.date_from), 'dd.MM.', { locale: de })}–${format(parseISO(abs.date_to), 'dd.MM.yyyy', { locale: de })}`
                        return (
                          <div key={abs.id} className="flex items-center gap-2 py-2 border-b border-[#F3F4F6] last:border-0">
                            <span className="font-medium text-[#111827] text-xs min-w-[100px] truncate">
                              {emp ? `${emp.last_name}, ${emp.first_name}` : '—'}
                            </span>
                            <span className="text-[#6B7280] flex-1 text-xs whitespace-nowrap">{dateLabel}</span>
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0"
                              style={{ backgroundColor: colors.bg, color: colors.text }}>
                              {abs.type}
                            </span>
                            <span className={cn(
                              'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                              approved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            )}>
                              {approved ? '✓ Genehmigt' : '✕ Abgelehnt'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  function renderAbwesend() {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Heute abwesend · {format(new Date(), 'dd.MM.yyyy')}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.absentToday.length === 0 ? (
            <p className="text-sm text-[#6B7280]">Alle Mitarbeiter anwesend.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.absentToday.map(abs => {
                const emp    = abs.expand?.employee
                const colors = ABSENCE_COLORS[abs.type]
                return (
                  <span key={abs.id}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: colors.bg, color: colors.text }}>
                    {emp ? `${emp.first_name} ${emp.last_name}` : '—'} · {abs.type}
                  </span>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  function renderArbeitszeiten() {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Arbeitszeiten heute · {format(new Date(), 'dd.MM.yyyy')}</CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-[#111827]">{stempel.filter(r => r.isActive).length}</span>
              <span className="text-xs text-[#6B7280]">eingestempelt</span>
            </div>
            <button
              onClick={() => { setShowClockInForm(v => !v); setClockInEmpId('') }}
              className={cn(
                'p-1 rounded transition-colors',
                showClockInForm ? 'bg-[#E5E7EB] text-[#111827]' : 'text-[#6B7280] hover:bg-[#E5E7EB]'
              )}
              title="Mitarbeiter einstempeln"
            >
              <Plus size={15} />
            </button>
          </div>
        </CardHeader>

        {showClockInForm && (
          <div className="px-5 py-3 border-b border-[#E5E7EB] bg-white flex items-center gap-2">
            <select
              value={clockInEmpId}
              onChange={e => setClockInEmpId(e.target.value)}
              className="flex-1 text-sm border border-[#E5E7EB] rounded px-2 py-1.5 text-[#111827] outline-none focus:border-[#4F46E5] bg-white"
            >
              <option value="">Mitarbeiter wählen…</option>
              {allEmployees.map(e => (
                <option key={e.id} value={e.id}>{e.last_name}, {e.first_name}</option>
              ))}
            </select>
            <button
              disabled={!clockInEmpId || clockInBusy}
              onClick={() => handleClockIn(clockInEmpId)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Plus size={12} />{clockInBusy ? 'Bitte warten…' : 'Einstempeln'}
            </button>
            <button
              onClick={() => setShowClockInForm(false)}
              className="p-1.5 rounded text-[#6B7280] hover:bg-[#E5E7EB] transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <CardContent className="p-0">
          {stempel.length === 0 ? (
            <p className="px-5 py-4 text-sm text-[#6B7280]">Heute noch keine Buchungen.</p>
          ) : (
            <div className="divide-y divide-[#F3F4F6]">
              {stempel.map((row, i) => {
                const prevWasActive = i > 0 && stempel[i - 1].isActive
                const showSeparator = !row.isActive && prevWasActive
                return (
                  <div key={row.employee.id}>
                    {showSeparator && (
                      <div className="px-5 py-1.5 bg-[#F9FAFB]">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                          Ausgestempelt
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 px-5 py-2.5">
                      <span className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        row.isActive ? 'bg-green-500' : 'bg-[#D1D5DB]'
                      )} />
                      <span className="text-sm font-semibold text-[#111827] flex-1">
                        {row.employee.last_name}, {row.employee.first_name}
                      </span>
                      <span className="text-xs text-[#6B7280]">{row.sinceLabel}</span>
                      {row.isActive ? (
                        <span className="text-xs font-bold tabular-nums w-16 text-right text-green-700">
                          {Math.floor(row.totalMins / 60)}
                          <span className="blink">:</span>
                          {String(row.totalMins % 60).padStart(2, '0')} h
                        </span>
                      ) : (
                        <span className="text-xs font-bold tabular-nums w-16 text-right text-[#6B7280]">
                          {fmtMins(row.totalMins)}
                        </span>
                      )}
                      <button
                        onClick={() => row.isActive && row.openEntryId ? handleClockOut(row.openEntryId) : undefined}
                        className={cn(
                          'flex items-center gap-1 text-xs px-2 py-1 rounded border border-[#E5E7EB] text-[#6B7280] hover:bg-[#E5E7EB] transition-colors shrink-0',
                          (!row.isActive || !row.openEntryId) && 'invisible pointer-events-none'
                        )}
                        title="Ausstempeln"
                      >
                        <LogOut size={11} /> Ausstempeln
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const year = new Date().getFullYear()

  function renderWidget(id: WidgetId) {
    switch (id) {
      case 'stat-eingestempelt':
        return <StatCard label="Eingestempelt heute" value={presentToday}            sub={`von ${data.activeTotal} aktiven MA`}     color="green"  />
      case 'stat-abwesend':
        return <StatCard label="Abwesend heute"       value={data.absentToday.length} sub={absentSub}                                color={data.absentToday.length > 0 ? 'amber' : 'default'} />
      case 'stat-genehmigungen':
        return <StatCard label="Offene Genehmigungen" value={data.pending.length}     sub="Warten auf Freigabe"                      color={data.pending.length > 0 ? 'red' : 'default'} />
      case 'stat-resturlaub':
        return <StatCard label="Resturlaub-Verfall"   value={data.carryOverCount}     sub={`Resturlaub ${year}`}                     color={data.carryOverCount > 0 ? 'amber' : 'default'} />
      case 'antraege':      return renderAntraege()
      case 'abwesend':      return renderAbwesend()
      case 'arbeitszeiten': return renderArbeitszeiten()
      case 'stat-ueberstunden':
        return <StatCard label="Überstunden diese Woche" value={0} sub="Demnächst verfügbar" color="default" />
      case 'stat-krankmeldungen':
        return <StatCard label="Krankmeldungen" value={data.absentToday.filter(a => a.type === 'K' || a.type === 'KK').length} sub="Aktuelle K/KK-Einträge" color={data.absentToday.some(a => a.type === 'K' || a.type === 'KK') ? 'red' : 'default'} />
      case 'geburtstage':
        return <WidgetStub label="Geburtstage im Monat" />
      case 'dokumente-ablauf':
        return <WidgetStub label="Ablaufende Verträge" />
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Dashboard</h1>
          <p className="text-sm capitalize text-[#6B7280]">
            {format(new Date(), 'EEEE, dd. MMMM yyyy', { locale: de })}
          </p>
        </div>
        {editMode ? (
          <button
            onClick={() => setEditMode(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-[#4338CA] transition-colors"
          >
            Fertig
          </button>
        ) : (
          <button
            onClick={() => setEditMode(true)}
            className="p-2 rounded-lg transition-colors border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
            title="Layout anpassen"
          >
            <SlidersHorizontal size={16} />
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-[#6B7280]">Lade…</p>
      ) : (
        <>
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

          {editMode && hidden.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 p-4 border border-dashed border-[#E5E7EB] rounded-xl bg-[#F9FAFB]">
              <p className="text-xs text-[#6B7280] w-full mb-1 font-medium">Widget hinzufügen:</p>
              {hidden.map(id => (
                <button
                  key={id}
                  onClick={() => addWidget(id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] text-sm text-[#6B7280] hover:border-[#4F46E5] hover:text-[#4F46E5] transition-colors"
                >
                  <Plus size={13} /> {WIDGET_META[id].label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function calcDays(from: string, to: string): number {
  return Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 86_400_000) + 1
}

function StatCard({ label, value, sub, color }: {
  label: string; value: number; sub: string; color: 'green' | 'amber' | 'red' | 'default'
}) {
  const cls = { green: 'text-green-600', amber: 'text-amber-600', red: 'text-red-600', default: 'text-[#111827]' }[color]
  return (
    <Card className="h-full">
      <CardContent>
        <CardTitle className="mb-2">{label}</CardTitle>
        <div className={`text-3xl font-bold my-2 ${cls}`}>{value}</div>
        <CardDescription>{sub}</CardDescription>
      </CardContent>
    </Card>
  )
}

function WidgetStub({ label }: { label: string }) {
  return (
    <Card className="h-full">
      <CardContent className="flex items-center justify-center h-full">
        <CardDescription>{label} – demnächst verfügbar</CardDescription>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: glass-card.tsx löschen**

```bash
rm /Users/ronnybeckmann/Projects/times/chef-app/src/components/ui/glass-card.tsx
```

- [ ] **Step 3: TypeScript-Check**

```bash
cd /Users/ronnybeckmann/Projects/times/chef-app
npx tsc --noEmit
```

Expected: keine neuen Fehler, insbesondere keine Restimporte von `glass-card`.

- [ ] **Step 4: Commit**

```bash
cd /Users/ronnybeckmann/Projects/times
git add chef-app/src/pages/Dashboard.tsx
git rm chef-app/src/components/ui/glass-card.tsx
git commit -m "feat: Dashboard auf Card-Komponente + Indigo-Palette umgestellt"
```

---

## Task 5: Abwesenheiten-Subkomponenten

**Files:**
- Modify: `chef-app/src/components/Abwesenheiten/ApprovalPopover.tsx`
- Modify: `chef-app/src/components/Abwesenheiten/KalenderTable.tsx`

- [ ] **Step 1: ApprovalPopover.tsx Farben aktualisieren**

Folgende Änderungen in `chef-app/src/components/Abwesenheiten/ApprovalPopover.tsx`:

Zeile 54 (Container):
```tsx
// Alt:
className="w-52 bg-white border border-[#EDE7DC] rounded-lg shadow-lg p-3"
// Neu:
className="w-52 bg-white border border-[#E5E7EB] rounded-lg shadow-lg p-3"
```

Zeile 58 (Mitarbeiter-Name):
```tsx
// Alt:
<div className="text-xs text-[#706D6A]">
// Neu:
<div className="text-xs text-[#6B7280]">
```

Zeile 59 (Datum):
```tsx
// Alt:
<div className="text-xs font-medium text-[#1A1917] mt-0.5">
// Neu:
<div className="text-xs font-medium text-[#111827] mt-0.5">
```

Zeile 61 (Schließen-Button):
```tsx
// Alt:
<button onClick={onClose} className="text-[#706D6A] hover:text-[#1A1917] ml-1">
// Neu:
<button onClick={onClose} className="text-[#6B7280] hover:text-[#111827] ml-1">
```

- [ ] **Step 2: KalenderTable.tsx Farben aktualisieren**

Folgende Änderungen in `chef-app/src/components/Abwesenheiten/KalenderTable.tsx`:

Zeile 31 (`<tr className>`):
```tsx
// Alt:
<tr className="bg-[#F5F2EE]">
// Neu:
<tr className="bg-[#F3F4F6]">
```

Zeile 32 (sticky th):
```tsx
// Alt:
className="sticky left-0 z-10 bg-[#F5F2EE] text-left text-xs font-semibold text-[#1A1917] px-3 py-2 min-w-[160px] border-b border-r border-[#EDE7DC]"
// Neu:
className="sticky left-0 z-10 bg-[#F3F4F6] text-left text-xs font-semibold text-[#111827] px-3 py-2 min-w-[160px] border-b border-r border-[#E5E7EB]"
```

Zeile 39 (Tagesspalten-Header):
```tsx
// Alt:
className={cn('w-6 min-w-[24px] text-center font-normal border-b border-r border-[#EDE7DC] py-1', ...)}
// Neu:
className={cn('w-6 min-w-[24px] text-center font-normal border-b border-r border-[#E5E7EB] py-1', ...)}
```

Zeilen 47–49 (Zusammenfassungsspalten-Header — AT, U, K):
```tsx
// Alt: border-[#EDE7DC] border-l-[#C8BFB2] bg-[#F5F2EE] ... text-[#706D6A]
// Neu: border-[#E5E7EB] border-l-[#D1D5DB] bg-[#F3F4F6] ... text-[#6B7280]
```

Zeile 57 (Mitarbeiter-Name-Zelle):
```tsx
// Alt:
className="sticky left-0 z-10 bg-white border-b border-r border-[#EDE7DC] px-3 py-1 font-medium text-[#1A1917] whitespace-nowrap group-hover:bg-[#FDFCFB]"
// Neu:
className="sticky left-0 z-10 bg-white border-b border-r border-[#E5E7EB] px-3 py-1 font-medium text-[#111827] whitespace-nowrap group-hover:bg-[#F9FAFB]"
```

Zeile 75 (Datumszellen):
```tsx
// Alt:
'w-6 min-w-[24px] h-7 border-b border-r border-[#EDE7DC] text-center align-middle cursor-default',
!isBlocked && !absence && 'group-hover:bg-[#FDFCFB] hover:bg-[#F5F2EE] cursor-pointer',
// Neu:
'w-6 min-w-[24px] h-7 border-b border-r border-[#E5E7EB] text-center align-middle cursor-default',
!isBlocked && !absence && 'group-hover:bg-[#F9FAFB] hover:bg-[#F3F4F6] cursor-pointer',
```

Zeile 87 (aktive Zell-Outline):
```tsx
// Alt:
outline: '2px solid #BA7517',
// Neu:
outline: '2px solid #4F46E5',
```

Zeile 107 (Eingabe-Text in aktiver Zelle):
```tsx
// Alt:
<span className="text-[#BA7517] font-medium">{inputValue}</span>
// Neu:
<span className="text-[#4F46E5] font-medium">{inputValue}</span>
```

Zeilen 112–114 (Zusammenfassungsspalten rechts):
```tsx
// Alt: border-[#EDE7DC] border-l-[#C8BFB2] bg-white text-[#1A1917]/text-[#706D6A] group-hover:bg-[#FDFCFB]
// Neu: border-[#E5E7EB] border-l-[#D1D5DB] bg-white text-[#111827]/text-[#6B7280] group-hover:bg-[#F9FAFB]
```

- [ ] **Step 3: TypeScript-Check**

```bash
cd /Users/ronnybeckmann/Projects/times/chef-app
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd /Users/ronnybeckmann/Projects/times
git add chef-app/src/components/Abwesenheiten/ApprovalPopover.tsx chef-app/src/components/Abwesenheiten/KalenderTable.tsx
git commit -m "feat: Abwesenheiten-Subkomponenten auf Indigo umgestellt"
```

---

## Task 6: Seiten — Login, Mitarbeiterliste, Abwesenheiten

**Files:**
- Modify: `chef-app/src/pages/Login.tsx`
- Modify: `chef-app/src/pages/Mitarbeiterliste.tsx`
- Modify: `chef-app/src/pages/Abwesenheiten.tsx`

- [ ] **Step 1: Login.tsx ersetzen**

Datei `chef-app/src/pages/Login.tsx` komplett ersetzen:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { Button } from '../components/ui/button'
import { Input }  from '../components/ui/input'
import { Label }  from '../components/ui/label'

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const navigate = useNavigate()
  const login = useAuthStore(s => s.login)
  const isLoading = useAuthStore(s => s.isLoading)
  const user = useAuthStore(s => s.user)

  if (user && (user.role === 'gf' || user.role === 'sl')) {
    navigate('/', { replace: true })
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await login(email, password)
    } catch {
      setError('E-Mail oder Passwort falsch.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6]">
      <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-8 w-full max-w-sm shadow-sm">

        <div className="flex items-center gap-2 mb-8 text-[#4F46E5] font-bold text-[15px]">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          Schicht &amp; Plan
        </div>

        <h1 className="text-xl font-bold mb-1 text-[#111827]">Anmelden</h1>
        <p className="text-sm text-[#6B7280] mb-6">Chef-App · Verwaltung</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Anmelden …' : 'Anmelden'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Mitarbeiterliste.tsx Farben aktualisieren**

Folgende Änderungen in `chef-app/src/pages/Mitarbeiterliste.tsx`:

Zeile 67 (Überschrift):
```tsx
// Alt: text-[#1A1917]  →  Neu: text-[#111827]
// Alt: text-[#706D6A]  →  Neu: text-[#6B7280]
```

Zeile 78 (Search-Icon):
```tsx
// Alt: text-[#706D6A]  →  Neu: text-[#6B7280]
```

Zeile 106 (Filter-Reset):
```tsx
// Alt: text-[#706D6A] hover:text-[#1A1917]
// Neu: text-[#6B7280] hover:text-[#111827]
```

Zeile 112 (Tabellen-Container):
```tsx
// Alt: className="bg-white border border-[#EDE7DC] rounded-lg overflow-hidden"
// Neu: className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden"
```

Zeile 134 (Mitarbeiter-Name in Zelle):
```tsx
// Alt: className="font-medium text-[#1A1917]"
// Neu: className="font-medium text-[#111827]"
```

Zeile 170–177 (`FilterSelect`-Komponente):
```tsx
// Alt:
className="h-9 rounded-md border border-[#EDE7DC] bg-white px-3 text-sm text-[#1A1917] outline-none focus:border-[#BA7517] focus:ring-2 focus:ring-[#BA7517]/20"
// Neu:
className="h-9 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
```

- [ ] **Step 3: Abwesenheiten.tsx — nur Amber-Farbwerte ersetzen**

In `chef-app/src/pages/Abwesenheiten.tsx` alle Vorkommen der alten Amber-Werte durch Indigo-Werte ersetzen (siehe Farb-Mapping). Die Semantikfarben (pending=Amber, approved=Grün, rejected=Rot) bleiben unverändert, da sie über `ABSENCE_COLORS` aus dem shared-Paket kommen.

Suchen und ersetzen (für alle Vorkommen):
- `#BA7517` → `#4F46E5`
- `#9E6312` → `#4338CA`
- `#EDE7DC` → `#E5E7EB`
- `#F5F2EE` → `#F3F4F6`
- `#1A1917` → `#111827`
- `#706D6A` → `#6B7280`
- `#FAF7F2` → `#F9FAFB`
- `rgba(186,117,23` → `rgba(79,70,229`

- [ ] **Step 4: TypeScript-Check**

```bash
cd /Users/ronnybeckmann/Projects/times/chef-app
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd /Users/ronnybeckmann/Projects/times
git add chef-app/src/pages/Login.tsx chef-app/src/pages/Mitarbeiterliste.tsx chef-app/src/pages/Abwesenheiten.tsx
git commit -m "feat: Login, Mitarbeiterliste und Abwesenheiten auf Indigo"
```

---

## Task 7: Seiten — Zeiterfassung, Berichte, MitarbeiterModal, DruckModal, Einstellungen

**Files:**
- Modify: `chef-app/src/pages/Zeiterfassung.tsx`
- Modify: `chef-app/src/pages/Berichte.tsx`
- Modify: `chef-app/src/pages/MitarbeiterModal.tsx`
- Modify: `chef-app/src/pages/DruckModal.tsx`
- Modify: `chef-app/src/pages/Einstellungen.tsx`

- [ ] **Step 1: Zeiterfassung.tsx Farben aktualisieren**

In `chef-app/src/pages/Zeiterfassung.tsx` alle Amber-Werte durch Indigo ersetzen (siehe Farb-Mapping). Besondere Stellen:

Zeile 150 (Department-Select):
```tsx
// Alt:
className="h-9 rounded-md border border-[#EDE7DC] bg-white px-3 text-sm text-[#1A1917] outline-none focus:border-[#BA7517] focus:ring-2 focus:ring-[#BA7517]/20"
// Neu:
className="h-9 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
```

Zeile 176 (Tabellen-Container):
```tsx
// Alt: className="bg-white border border-[#EDE7DC] rounded-lg overflow-hidden"
// Neu: className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden"
```

Zeile 179 (Tabellen-Header):
```tsx
// Alt: <tr className="bg-[#F5F2EE]">
// Neu: <tr className="bg-[#F3F4F6]">
```

Zeile 187 (Wochentag-Header — heute markiert):
```tsx
// Alt: isToday(day) && 'text-[#BA7517]'
// Neu: isToday(day) && 'text-[#4F46E5]'
```

Zeile 225 (aktive Zelle):
```tsx
// Alt: isActive && 'bg-[#FDF8F0]'
// Neu: isActive && 'bg-[#EEF2FF]'
```

Zeile 228 (laufende Stempelung):
```tsx
// Alt: <span className="text-xs font-medium text-[#BA7517]">
// Neu: <span className="text-xs font-medium text-[#4F46E5]">
```

Zeile 251 (Detail-Panel Hintergrund):
```tsx
// Alt: className="bg-[#FDFCFB] border-b border-[#EDE7DC] px-4 py-3"
// Neu: className="bg-[#F9FAFB] border-b border-[#E5E7EB] px-4 py-3"
```

Zeile 395 (aktive Bearbeitungs-Zeile):
```tsx
// Alt: className="flex items-center gap-2 px-3 py-2 bg-white border border-[#BA7517]/30 rounded-md"
// Neu: className="flex items-center gap-2 px-3 py-2 bg-white border border-[#4F46E5]/30 rounded-md"
```

Zeile 412 (Save-Button):
```tsx
// Alt: className="p-1.5 rounded bg-[#BA7517] hover:bg-[#9E6312] text-white"
// Neu: className="p-1.5 rounded bg-[#4F46E5] hover:bg-[#4338CA] text-white"
```

Zeile 426 (läuft-Anzeige):
```tsx
// Alt: <span className="text-[#BA7517]">läuft</span>
// Neu: <span className="text-[#4F46E5]">läuft</span>
```

Zeile 500 (Neuer-Eintrag-Box):
```tsx
// Alt: className="border border-dashed border-[#BA7517]/40 rounded-md p-3 bg-[#FDF8F0]"
// Neu: className="border border-dashed border-[#4F46E5]/40 rounded-md p-3 bg-[#EEF2FF]"
```

Zeile 501 (Neuer Eintrag Titel):
```tsx
// Alt: <div className="text-xs font-medium text-[#BA7517] mb-2">Neuer Eintrag</div>
// Neu: <div className="text-xs font-medium text-[#4F46E5] mb-2">Neuer Eintrag</div>
```

Zeile 323 (DayDetailPanel — Eintrag hinzufügen):
```tsx
// Alt: className="flex items-center gap-1.5 text-sm text-[#BA7517] hover:text-[#9E6312] font-medium mt-1"
// Neu: className="flex items-center gap-1.5 text-sm text-[#4F46E5] hover:text-[#4338CA] font-medium mt-1"
```

Restliche Vorkommen: alle weiteren `#EDE7DC` → `#E5E7EB`, `#F5F2EE` → `#F3F4F6`, `#706D6A` → `#6B7280`, `#1A1917` → `#111827`.

- [ ] **Step 2: Berichte.tsx Farben aktualisieren**

In `chef-app/src/pages/Berichte.tsx` alle Amber-Werte durch Indigo ersetzen. Besondere Stellen:

Zeile 196–209 (Monat/Jahr-Toggle):
```tsx
// Alt:
view === 'monat' ? 'bg-[#BA7517] text-white font-medium' : 'bg-white text-[#706D6A] hover:bg-[#F5F2EE]'
view === 'jahr'  ? 'bg-[#BA7517] text-white font-medium' : 'bg-white text-[#706D6A] hover:bg-[#F5F2EE]'
// Neu:
view === 'monat' ? 'bg-[#4F46E5] text-white font-medium' : 'bg-white text-[#6B7280] hover:bg-[#F3F4F6]'
view === 'jahr'  ? 'bg-[#4F46E5] text-white font-medium' : 'bg-white text-[#6B7280] hover:bg-[#F3F4F6]'
```

Zeile 317 (Drucker-Button):
```tsx
// Alt: className="p-1 rounded text-[#BBBBBB] hover:text-[#BA7517] hover:bg-[#F5F2EE] transition-colors"
// Neu: className="p-1 rounded text-[#9CA3AF] hover:text-[#4F46E5] hover:bg-[#F3F4F6] transition-colors"
```

Zeile 191 (Toggle-Border):
```tsx
// Alt: className="flex rounded-md border border-[#EDE7DC] overflow-hidden text-sm"
// Neu: className="flex rounded-md border border-[#E5E7EB] overflow-hidden text-sm"
```

Restliche Vorkommen: `#EDE7DC` → `#E5E7EB`, `#F5F2EE` → `#F3F4F6`, `#706D6A` → `#6B7280`, `#1A1917` → `#111827`, `#FAFAF8` → `#F9FAFB`.

- [ ] **Step 3: MitarbeiterModal.tsx und DruckModal.tsx Farben aktualisieren**

In beiden Dateien alle Vorkommen der alten Amber-Werte durch Indigo ersetzen (siehe Farb-Mapping). Keine strukturellen Änderungen nötig — nur Farb-Strings.

- [ ] **Step 4: Einstellungen.tsx Farben aktualisieren**

In `chef-app/src/pages/Einstellungen.tsx` alle Amber-Werte ersetzen. Besondere Stellen:

Zeile 75 (aktiver Nav-Eintrag):
```tsx
// Alt: 'border-[#BA7517] text-[#BA7517] bg-[#FDF8F0] font-medium'
// Neu: 'border-[#4F46E5] text-[#4F46E5] bg-[#EEF2FF] font-medium'
```

Zeile 437 (Neue Abteilung Link):
```tsx
// Alt: className="flex items-center gap-1.5 text-sm text-[#BA7517] hover:text-[#9E6312] font-medium"
// Neu: className="flex items-center gap-1.5 text-sm text-[#4F46E5] hover:text-[#4338CA] font-medium"
```

Zeile 563 (Regel hinzufügen):
```tsx
// Alt: className="flex items-center gap-1.5 text-sm text-[#BA7517] hover:text-[#9E6312] font-medium"
// Neu: className="flex items-center gap-1.5 text-sm text-[#4F46E5] hover:text-[#4338CA] font-medium"
```

Restliche Vorkommen: alle `#EDE7DC` → `#E5E7EB`, `#F5F2EE` → `#F3F4F6`, `#706D6A` → `#6B7280`, `#1A1917` → `#111827`.

- [ ] **Step 5: TypeScript-Check**

```bash
cd /Users/ronnybeckmann/Projects/times/chef-app
npx tsc --noEmit
```

Expected: keine Fehler.

- [ ] **Step 6: Bestehende Tests ausführen**

```bash
cd /Users/ronnybeckmann/Projects/times/chef-app
npm run test:run
```

Expected: alle Tests bestehen (Login- und ProtectedRoute-Tests).

- [ ] **Step 7: Commit**

```bash
cd /Users/ronnybeckmann/Projects/times
git add chef-app/src/pages/Zeiterfassung.tsx chef-app/src/pages/Berichte.tsx chef-app/src/pages/MitarbeiterModal.tsx chef-app/src/pages/DruckModal.tsx chef-app/src/pages/Einstellungen.tsx
git commit -m "feat: restliche Seiten der Chef-App auf Indigo-Palette umgestellt"
```

---

## Abschluss: Visuelle Überprüfung

Nach allen Tasks sicherstellen, dass der Dev-Server läuft und die App im Browser korrekt aussieht:

```bash
cd /Users/ronnybeckmann/Projects/times/chef-app
npm run dev
```

Checkliste im Browser:
- [ ] Login-Seite: Logo und Button in Indigo
- [ ] Sidebar: Logo und aktiver Nav-Eintrag in Indigo
- [ ] Dashboard: alle Widgets in weißen Karten, kein Glaseffekt
- [ ] Mitarbeiterliste: Tabelle mit Indigo-Rahmen
- [ ] Abwesenheiten: Kalender-Tabelle mit Indigo-Akzenten
- [ ] Zeiterfassung: aktive Zellen und Buttons in Indigo
- [ ] Berichte: Monat/Jahr-Toggle in Indigo
- [ ] Einstellungen: Nav-Punkte und Links in Indigo
- [ ] kein `glassUI`-Feature mehr sichtbar
