# Meine Zeiten: Wöchentlich- & Monatlich-Ansicht Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Erweitert die Seite „Meine Zeiten" (mitarbeiter-app) um eine Wöchentlich- und eine Monatlich-Ansicht, dargestellt als wischbares 3-Karten-Karussell neben der bestehenden Täglich-Ansicht.

**Architecture:** Die bestehende Tages-Logik aus `Zeiten.tsx` wird unverändert in eine eigene `TaeglichCard`-Komponente extrahiert (nur ohne Soll-Hinweiszeile). Zwei neue Geschwister-Komponenten (`WoechentlichCard`, `MonatlichCard`) implementieren die Aggregations-Tabellen mit derselben Card-Optik. Eine neue, wiederverwendbare `ZeitenCarousel`-Komponente (auf Basis von `embla-carousel-react`) bindet alle drei als Slides ein, mit Titel-Leiste und Dot-Indikatoren. Gemeinsame Berechnungslogik (Netto-Minuten, Formatierung, Soll-Berechnung) wandert in `lib/zeitenCalc.ts`, damit alle drei Karten dieselbe Basis nutzen und nicht divergieren.

**Tech Stack:** React 19, TypeScript (strict), date-fns, embla-carousel-react ^8.6.0, Tailwind CSS, Vitest + React Testing Library, PocketBase SDK.

## Global Constraints

- Neue Abhängigkeit: `embla-carousel-react` ^8.6.0 (offiziell React-19-kompatibel) — keine weitere Carousel-Bibliothek.
- Karten-Reihenfolge im Karussell: Täglich, Wöchentlich, Monatlich (links→rechts); aktive Karte beim Laden der Seite: **Täglich**.
- Design-Konsistenz: alle drei Karten nutzen dieselbe Card-Optik wie die bestehende Täglich-Karte (weiß, `rounded-2xl`, `border-[#E5E7EB]`, `shadow-sm`, grauer Header `bg-[#F9FAFB]`, aktuelle Periode indigo hervorgehoben — `text-indigo-600` / `bg-indigo-50/40`).
- Die Soll-Hinweiszeile („Soll X h · Y h/Woche Vertrag") entfällt überall, auch bei Täglich. Der Hinweis „Korrekturen werden vom Betrieb vorgenommen." bleibt bestehen — nicht verwechseln, nicht entfernen.
- Wöchentlich: 7 Zeilen (aktuelle Woche oben + 6 vorherige, absteigend chronologisch), Spalten WOCHE/IST/SOLL/DIFFERENZ, Pfeile paginieren blockweise um 7 Wochen (nicht rollierend), keine Gesamt-Fußzeile.
- Monatlich: immer 12 Zeilen (Januar–Dezember, aufsteigend), Spalten MONAT/IST/SOLL/DIFFERENZ, Zukunftsmonate ausgegraut ohne Werte und aus der Berechnung ausgeschlossen, Pfeile wechseln jahresweise, keine Gesamt-Fußzeile.
- Soll-Formel für Woche/Monat: Tages-Soll (`weeklyHours / 5 * 60` Minuten) × Anzahl Werktage (kein Wochenende, kein Feiertag lt. `feiertagejs`) im Zeitraum — auch für den laufenden Monat über den vollen Monat, nicht anteilig bis heute.
- Die „Überstunden {Jahr}"-Kachel im Seiten-Header bleibt unverändert und unabhängig von der aktiven Karussell-Karte.
- TypeScript strict mode, `noUnusedLocals`/`noUnusedParameters` aktiv — keine toten Imports. `mitarbeiter-app` hat kein `lint`-Script; Verifikation läuft über `npm run build` (tsc + vite build) und `npm run test:run`.
- Tests: Vitest + React Testing Library. PocketBase wird per `vi.mock('../../lib/pb', ...)` bzw. `vi.mock('../../../lib/pb', ...)` gemockt (Pfadtiefe je nach Testdatei-Ordner), kein echter Server in Tests. Wo eine feste „aktuelle Zeit" benötigt wird: `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime(...)` verwenden — **nicht** volles `vi.useFakeTimers()` ohne `toFake`, da das auch `setTimeout` faked und `findBy*`/`waitFor` von React Testing Library dadurch hängen bleiben.

---

### Task 1: Gemeinsame Berechnungs-Helfer (`lib/zeitenCalc.ts`)

**Files:**
- Create: `mitarbeiter-app/src/lib/zeitenCalc.ts`
- Test: `mitarbeiter-app/src/lib/__tests__/zeitenCalc.test.ts`

**Interfaces:**
- Produces: `netMins(entry: TimeEntry, now?: Date): number`, `fmtDuration(mins: number, signed?: boolean): string`, `fmtHHMM(iso: string): string`, `dailySollMins(weeklyHours: number): number`, `periodSollMins(weeklyHours: number, days: Date[], holidays: Set<string>): number`

- [ ] **Step 1: Write the failing test**

```typescript
// mitarbeiter-app/src/lib/__tests__/zeitenCalc.test.ts
import { describe, it, expect } from 'vitest'
import { netMins, fmtDuration, fmtHHMM, dailySollMins, periodSollMins } from '../zeitenCalc'
import type { TimeEntry } from '@shared/types'

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 't1',
    created: '2026-08-03T00:00:00Z',
    updated: '2026-08-03T00:00:00Z',
    employee: 'emp1',
    start_time: '2026-08-03T08:00:00',
    end_time: '2026-08-03T16:30:00',
    break_minutes: 30,
    ...overrides,
  }
}

describe('netMins', () => {
  it('berechnet Netto-Minuten (Ende − Start − Pause)', () => {
    expect(netMins(makeEntry())).toBe(480) // 8:30h − 0:30h Pause = 8:00h
  })

  it('nutzt den now-Parameter für laufende Einträge ohne end_time', () => {
    const entry = makeEntry({ end_time: undefined, break_minutes: 0 })
    const now = new Date('2026-08-03T10:00:00')
    expect(netMins(entry, now)).toBe(120)
  })

  it('geht nie unter 0, selbst wenn die Pause die Bruttozeit übersteigt', () => {
    const entry = makeEntry({ start_time: '2026-08-03T08:00:00', end_time: '2026-08-03T08:10:00', break_minutes: 30 })
    expect(netMins(entry)).toBe(0)
  })
})

describe('fmtDuration', () => {
  it('formatiert Minuten als H:MM h', () => {
    expect(fmtDuration(480)).toBe('8:00 h')
    expect(fmtDuration(90)).toBe('1:30 h')
  })

  it('zeigt bei signed=true ein + für positive Werte', () => {
    expect(fmtDuration(90, true)).toBe('+1:30 h')
  })

  it('zeigt bei signed=true ein − (Minuszeichen) für negative Werte', () => {
    expect(fmtDuration(-90, true)).toBe('−1:30 h')
  })
})

describe('fmtHHMM', () => {
  it('formatiert einen ISO-Zeitstempel als HH:mm', () => {
    expect(fmtHHMM('2026-08-03T08:05:00')).toBe('08:05')
  })
})

describe('dailySollMins', () => {
  it('berechnet das Tages-Soll aus der Wochenarbeitszeit', () => {
    expect(dailySollMins(40)).toBe(480) // 40h / 5 Tage = 8h = 480min
    expect(dailySollMins(35)).toBe(420)
  })
})

describe('periodSollMins', () => {
  it('zählt nur Werktage (kein Wochenende, kein Feiertag)', () => {
    // Mo 3.8. – So 9.8.2026 (5 Werktage, kein Feiertag in dieser Woche)
    const days = [
      new Date(2026, 7, 3), // Mo
      new Date(2026, 7, 4), // Di
      new Date(2026, 7, 5), // Mi
      new Date(2026, 7, 6), // Do
      new Date(2026, 7, 7), // Fr
      new Date(2026, 7, 8), // Sa
      new Date(2026, 7, 9), // So
    ]
    expect(periodSollMins(40, days, new Set())).toBe(2400) // 5 × 480min
  })

  it('schließt Feiertage aus der Berechnung aus', () => {
    const days = [
      new Date(2026, 7, 3), // Mo
      new Date(2026, 7, 4), // Di (Feiertag)
    ]
    expect(periodSollMins(40, days, new Set(['2026-08-04']))).toBe(480) // nur Montag zählt
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mitarbeiter-app && npx vitest run src/lib/__tests__/zeitenCalc.test.ts`
Expected: FAIL with "Cannot find module '../zeitenCalc'" (Datei existiert noch nicht)

- [ ] **Step 3: Write minimal implementation**

```typescript
// mitarbeiter-app/src/lib/zeitenCalc.ts
import { format, isWeekend, differenceInMinutes, parseISO } from 'date-fns'
import type { TimeEntry } from '@shared/types'

export function netMins(entry: TimeEntry, now: Date = new Date()): number {
  const end   = entry.end_time ? parseISO(entry.end_time) : now
  const gross = differenceInMinutes(end, parseISO(entry.start_time))
  return Math.max(0, gross - (entry.break_minutes ?? 0))
}

export function fmtDuration(mins: number, signed = false): string {
  const neg = mins < 0
  const abs = Math.abs(Math.round(mins))
  const h   = Math.floor(abs / 60)
  const m   = abs % 60
  const str = `${h}:${String(m).padStart(2, '0')} h`
  if (!signed) return str
  return neg ? `−${str}` : `+${str}`
}

export function fmtHHMM(iso: string): string {
  return format(parseISO(iso), 'HH:mm')
}

export function dailySollMins(weeklyHours: number): number {
  return (weeklyHours / 5) * 60
}

export function periodSollMins(weeklyHours: number, days: Date[], holidays: Set<string>): number {
  const workdays = days.filter(d => !isWeekend(d) && !holidays.has(format(d, 'yyyy-MM-dd')))
  return dailySollMins(weeklyHours) * workdays.length
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mitarbeiter-app && npx vitest run src/lib/__tests__/zeitenCalc.test.ts`
Expected: PASS (10 Tests)

- [ ] **Step 5: Commit**

```bash
git add mitarbeiter-app/src/lib/zeitenCalc.ts mitarbeiter-app/src/lib/__tests__/zeitenCalc.test.ts
git commit -m "feat(zeiten): gemeinsame Berechnungs-Helfer für Meine Zeiten extrahieren"
```

---

### Task 2: Karussell-Wrapper (`ZeitenCarousel`) + `embla-carousel-react`

**Files:**
- Modify: `mitarbeiter-app/package.json` (neue Abhängigkeit)
- Create: `mitarbeiter-app/src/components/ZeitenCarousel.tsx`
- Test: `mitarbeiter-app/src/components/__tests__/ZeitenCarousel.test.tsx`

**Interfaces:**
- Consumes: keine (eigenständige, generische Komponente)
- Produces: `export interface ZeitenCarouselSlide { key: string; label: string; content: ReactNode }`, `export default function ZeitenCarousel({ slides: ZeitenCarouselSlide[]; initialIndex?: number }): JSX.Element` — spätere Tasks importieren `ZeitenCarousel` (default) und `ZeitenCarouselSlide` (named) aus `../../components/ZeitenCarousel`.

- [ ] **Step 1: Install embla-carousel-react**

Run: `cd mitarbeiter-app && npm install embla-carousel-react@^8.6.0`
Expected: `embla-carousel-react` erscheint unter `dependencies` in `mitarbeiter-app/package.json`

- [ ] **Step 2: Write the failing test**

```typescript
// mitarbeiter-app/src/components/__tests__/ZeitenCarousel.test.tsx
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const emblaApiMock = {
  scrollTo: vi.fn(),
  selectedScrollSnap: vi.fn(() => 0),
  on: vi.fn(),
  off: vi.fn(),
}

vi.mock('embla-carousel-react', () => ({
  default: () => [vi.fn(), emblaApiMock],
}))

import ZeitenCarousel from '../ZeitenCarousel'

describe('ZeitenCarousel', () => {
  const slides = [
    { key: 'a', label: 'Täglich', content: <div>Tagesinhalt</div> },
    { key: 'b', label: 'Wöchentlich', content: <div>Wocheninhalt</div> },
    { key: 'c', label: 'Monatlich', content: <div>Monatsinhalt</div> },
  ]

  beforeEach(() => {
    emblaApiMock.scrollTo.mockClear()
    emblaApiMock.selectedScrollSnap.mockReturnValue(0)
    emblaApiMock.on.mockClear()
    emblaApiMock.off.mockClear()
  })

  it('rendert alle drei Titel und Karteninhalte', () => {
    render(<ZeitenCarousel slides={slides} />)
    expect(screen.getByText('Täglich')).toBeInTheDocument()
    expect(screen.getByText('Wöchentlich')).toBeInTheDocument()
    expect(screen.getByText('Monatlich')).toBeInTheDocument()
    expect(screen.getByText('Tagesinhalt')).toBeInTheDocument()
    expect(screen.getByText('Wocheninhalt')).toBeInTheDocument()
    expect(screen.getByText('Monatsinhalt')).toBeInTheDocument()
  })

  it('hebt standardmäßig den ersten Titel hervor', () => {
    render(<ZeitenCarousel slides={slides} />)
    expect(screen.getByText('Täglich')).toHaveClass('text-indigo-600')
    expect(screen.getByText('Wöchentlich')).not.toHaveClass('text-indigo-600')
  })

  it('startet bei initialIndex, falls gesetzt', () => {
    render(<ZeitenCarousel slides={slides} initialIndex={1} />)
    expect(screen.getByText('Wöchentlich')).toHaveClass('text-indigo-600')
  })

  it('scrollt zur geklickten Karte', () => {
    render(<ZeitenCarousel slides={slides} />)
    fireEvent.click(screen.getByText('Monatlich'))
    expect(emblaApiMock.scrollTo).toHaveBeenCalledWith(2)
  })

  it('hebt den Titel hervor, wenn embla eine neue Karte meldet (z.B. nach Wisch-Geste)', () => {
    render(<ZeitenCarousel slides={slides} />)
    const selectCb = emblaApiMock.on.mock.calls.find(([evt]) => evt === 'select')?.[1] as () => void
    emblaApiMock.selectedScrollSnap.mockReturnValue(2)
    act(() => selectCb())
    expect(screen.getByText('Monatlich')).toHaveClass('text-indigo-600')
  })

  it('rendert einen Dot pro Karte, aktiver Dot ist breiter', () => {
    render(<ZeitenCarousel slides={slides} />)
    const dots = screen.getAllByRole('button', { name: /wechseln/i })
    expect(dots).toHaveLength(3)
    expect(dots[0]).toHaveClass('w-4')
    expect(dots[1]).not.toHaveClass('w-4')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd mitarbeiter-app && npx vitest run src/components/__tests__/ZeitenCarousel.test.tsx`
Expected: FAIL with "Cannot find module '../ZeitenCarousel'"

- [ ] **Step 4: Write minimal implementation**

```typescript
// mitarbeiter-app/src/components/ZeitenCarousel.tsx
import { useState, useEffect, useCallback, type ReactNode } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { cn } from '@/lib/utils'

export interface ZeitenCarouselSlide {
  key: string
  label: string
  content: ReactNode
}

interface Props {
  slides: ZeitenCarouselSlide[]
  initialIndex?: number
}

export default function ZeitenCarousel({ slides, initialIndex = 0 }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    loop: false,
    startIndex: initialIndex,
    containScroll: 'trimSnaps',
  })
  const [selectedIndex, setSelectedIndex] = useState(initialIndex)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    return () => { emblaApi.off('select', onSelect) }
  }, [emblaApi, onSelect])

  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi])

  return (
    <div>
      {/* Titel-Leiste */}
      <div className="flex items-center justify-center gap-4 mb-3">
        {slides.map((slide, i) => (
          <button
            key={slide.key}
            onClick={() => scrollTo(i)}
            className={cn(
              'text-sm font-semibold px-1 py-1 transition-colors',
              i === selectedIndex ? 'text-indigo-600' : 'text-[#9CA3AF]'
            )}
          >
            {slide.label}
          </button>
        ))}
      </div>

      {/* Karussell */}
      <div className="overflow-hidden -mx-4 px-4" ref={emblaRef}>
        <div className="flex gap-3">
          {slides.map(slide => (
            <div key={slide.key} className="flex-[0_0_88%] min-w-0">
              {slide.content}
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {slides.map((slide, i) => (
          <button
            key={slide.key}
            aria-label={`Zu ${slide.label} wechseln`}
            onClick={() => scrollTo(i)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === selectedIndex ? 'w-4 bg-indigo-600' : 'w-1.5 bg-[#D1D5DB]'
            )}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd mitarbeiter-app && npx vitest run src/components/__tests__/ZeitenCarousel.test.tsx`
Expected: PASS (6 Tests)

- [ ] **Step 6: Commit**

```bash
git add mitarbeiter-app/package.json mitarbeiter-app/package-lock.json mitarbeiter-app/src/components/ZeitenCarousel.tsx mitarbeiter-app/src/components/__tests__/ZeitenCarousel.test.tsx
git commit -m "feat(zeiten): ZeitenCarousel-Komponente auf Basis von embla-carousel-react"
```

---

### Task 3: `TaeglichCard` extrahieren (ohne Soll-Hinweiszeile)

**Files:**
- Create: `mitarbeiter-app/src/pages/Zeiten/TaeglichCard.tsx`
- Test: `mitarbeiter-app/src/pages/Zeiten/__tests__/TaeglichCard.test.tsx`

**Interfaces:**
- Consumes: `netMins, fmtDuration, fmtHHMM, dailySollMins, periodSollMins` aus `../../lib/zeitenCalc` (Task 1)
- Produces: `export default function TaeglichCard({ employeeId: string; fedState: string; weeklyHours: number }): JSX.Element` — wird in Task 6 von `Zeiten.tsx` importiert

- [ ] **Step 1: Write the failing test**

```typescript
// mitarbeiter-app/src/pages/Zeiten/__tests__/TaeglichCard.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { TimeEntry } from '@shared/types'

const mockGetFullList = vi.fn()

vi.mock('../../../lib/pb', () => ({
  pb: {
    collection: () => ({
      getFullList: mockGetFullList,
    }),
  },
}))

import TaeglichCard from '../TaeglichCard'

function entry(overrides: Partial<TimeEntry>): TimeEntry {
  return {
    id: 'e1',
    created: '2026-08-03T00:00:00Z',
    updated: '2026-08-03T00:00:00Z',
    employee: 'emp1',
    start_time: '2026-08-03T08:00:00',
    break_minutes: 0,
    ...overrides,
  }
}

describe('TaeglichCard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-04T12:00:00'))
    mockGetFullList.mockReset()
    mockGetFullList.mockResolvedValue([
      entry({ id: 'mo', start_time: '2026-08-03T08:00:00', end_time: '2026-08-03T16:30:00', break_minutes: 30 }),
      entry({ id: 'di', start_time: '2026-08-04T09:00:00', end_time: undefined, break_minutes: 0 }),
    ])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('zeigt die aktuelle Kalenderwoche und die Tage-Tabelle', async () => {
    render(<TaeglichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    expect(await screen.findByText('KW 32')).toBeInTheDocument()
    expect(screen.getByText('Kommt')).toBeInTheDocument()
    expect(screen.getByText('08:00')).toBeInTheDocument() // Kommt Montag
  })

  it('zeigt eine laufende Session als "läuft…"', async () => {
    render(<TaeglichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    expect(await screen.findByText('läuft…')).toBeInTheDocument()
  })

  it('summiert Ist-Zeiten der Woche in der Fußzeile', async () => {
    render(<TaeglichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    await screen.findByText('Woche gesamt')
    // Mo 8:00h + Di (09:00–12:00 laufend) 3:00h = 11:00h
    expect(screen.getByText('11:00 h')).toBeInTheDocument()
    // Soll 40:00h − Ist 11:00h = −29:00h
    expect(screen.getByText('−29:00 h')).toBeInTheDocument()
  })

  it('zeigt keine Soll-Hinweiszeile mehr', async () => {
    render(<TaeglichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    await screen.findByText('Woche gesamt')
    expect(screen.queryByText(/Vertrag/)).not.toBeInTheDocument()
  })

  it('lädt die Vorwoche beim Klick auf den linken Pfeil', async () => {
    const { container } = render(<TaeglichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    await screen.findByText('KW 32')
    mockGetFullList.mockClear()
    mockGetFullList.mockResolvedValue([])
    const [prevButton] = container.querySelectorAll('button')
    fireEvent.click(prevButton)
    expect(await screen.findByText('KW 31')).toBeInTheDocument()
    expect(mockGetFullList).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mitarbeiter-app && npx vitest run src/pages/Zeiten/__tests__/TaeglichCard.test.tsx`
Expected: FAIL with "Cannot find module '../TaeglichCard'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// mitarbeiter-app/src/pages/Zeiten/TaeglichCard.tsx
import { useState, useEffect, useRef } from 'react'
import {
  startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks,
  format, isWeekend, getISOWeek, isToday, endOfDay,
} from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { pb } from '../../lib/pb'
import { getHolidayMap } from '../../lib/holidays'
import type { TimeEntry } from '@shared/types'
import { cn } from '@/lib/utils'
import { netMins, fmtDuration, fmtHHMM, dailySollMins, periodSollMins } from '../../lib/zeitenCalc'

interface Props {
  employeeId: string
  fedState: string
  weeklyHours: number
}

export default function TaeglichCard({ employeeId, fedState, weeklyHours }: Props) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading]  = useState(true)
  const [now, setNow]          = useState(new Date())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 10_000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  useEffect(() => {
    if (!employeeId) return
    setLoading(true)
    const from = format(weekStart, "yyyy-MM-dd HH:mm:ss")
    const to   = format(endOfDay(endOfWeek(weekStart, { weekStartsOn: 1 })), "yyyy-MM-dd HH:mm:ss")

    pb.collection('time_entries').getFullList<TimeEntry>({
      filter: `employee = "${employeeId}" && start_time >= "${from}" && start_time <= "${to}"`,
      sort:   'start_time',
      requestKey: null,
    }).then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [employeeId, weekStart])

  const weekDays   = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) })
  const holidays   = getHolidayMap(weekStart.getFullYear(), fedState)
  const sollPerDay = dailySollMins(weeklyHours)

  function entriesForDay(day: Date): TimeEntry[] {
    const ds = format(day, 'yyyy-MM-dd')
    return entries.filter(e => e.start_time.startsWith(ds))
  }

  const weekSollMins = periodSollMins(weeklyHours, weekDays, new Set(holidays.keys()))
  const weekIstMins  = entries.reduce((sum, e) => sum + netMins(e, now), 0)

  const kw = getISOWeek(weekStart)

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setWeekStart(w => subWeeks(w, 1))}
          className="p-2 rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 text-center">
          <div className="text-base font-bold text-[#111827]">KW {kw}</div>
          <div className="text-xs text-[#6B7280]">
            {format(weekStart, 'd. MMM', { locale: de })} – {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'd. MMM yyyy', { locale: de })}
          </div>
        </div>
        <button
          onClick={() => setWeekStart(w => addWeeks(w, 1))}
          className="p-2 rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden min-w-[480px]">
        <div className="grid grid-cols-[80px_1fr_1fr_80px_80px_90px] px-4 py-2.5 border-b border-[#E5E7EB] bg-[#F9FAFB]">
          {['Tag', 'Kommt', 'Geht', 'Pause', 'Ist', 'Status'].map(h => (
            <div key={h} className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">{h}</div>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-[#6B7280]">Lade…</div>
        ) : (
          <>
            {weekDays.map(day => {
              const ds        = format(day, 'yyyy-MM-dd')
              const isWE      = isWeekend(day)
              const isHoliday = holidays.has(ds)
              const isCurrent = isToday(day)
              const dayEntries = entriesForDay(day)
              const runningE  = dayEntries.find(e => !e.end_time)
              const istMins   = dayEntries.reduce((s, e) => s + netMins(e, now), 0)
              const hasSoll   = !isWE && !isHoliday

              return (
                <div
                  key={ds}
                  className={cn(
                    'grid grid-cols-[80px_1fr_1fr_80px_80px_90px] px-4 py-3 border-b border-[#F3F4F6] last:border-0',
                    (isWE || isHoliday) && 'bg-[#F9FAFB]',
                    isCurrent && !isWE && 'bg-indigo-50/40'
                  )}
                >
                  <div className={cn(
                    'text-sm font-medium',
                    (isWE || isHoliday) ? 'text-[#9CA3AF]' : isCurrent ? 'text-indigo-600' : 'text-[#111827]'
                  )}>
                    <div>{format(day, 'EEE', { locale: de })}</div>
                    <div className="text-xs text-[#6B7280]">{format(day, 'd. MMM', { locale: de })}</div>
                    {isHoliday && (
                      <div className="text-[10px] text-[#9CA3AF] leading-tight mt-0.5 truncate" title={holidays.get(ds)}>
                        {holidays.get(ds)}
                      </div>
                    )}
                  </div>

                  {dayEntries.length === 0 ? (
                    <>
                      <Cell muted>—</Cell>
                      <Cell muted>—</Cell>
                      <Cell muted>—</Cell>
                      <Cell muted>—</Cell>
                    </>
                  ) : (
                    <>
                      <Cell>{fmtHHMM(dayEntries[0].start_time)}</Cell>
                      <Cell>
                        {runningE
                          ? <span className="text-emerald-600 text-xs font-medium">läuft…</span>
                          : fmtHHMM(dayEntries[dayEntries.length - 1].end_time!)
                        }
                      </Cell>
                      <Cell>
                        {dayEntries[0].break_minutes
                          ? `${dayEntries[0].break_minutes} min`
                          : '—'
                        }
                      </Cell>
                      <Cell>
                        <span className={cn(
                          'font-semibold tabular-nums text-sm',
                          runningE ? 'text-emerald-600' : 'text-[#111827]'
                        )}>
                          {fmtDuration(istMins)}
                        </span>
                      </Cell>
                    </>
                  )}

                  <div className="flex items-center">
                    {isWE || isHoliday ? (
                      <span className="text-xs text-[#D1D5DB]">WE</span>
                    ) : runningE ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <Clock size={11} className="animate-pulse" /> läuft
                      </span>
                    ) : dayEntries.length > 0 ? (
                      <span className="flex items-center gap-1 text-xs text-[#6B7280]">
                        {hasSoll && istMins >= sollPerDay - 5
                          ? <span className="text-emerald-500 font-bold">✓</span>
                          : <span className="text-amber-500 font-bold">~</span>
                        }
                        {hasSoll && <span className={istMins >= sollPerDay ? 'text-emerald-600' : 'text-amber-600'}>
                          {fmtDuration(istMins - sollPerDay, true)}
                        </span>}
                      </span>
                    ) : hasSoll ? (
                      <span className="text-xs text-[#D1D5DB]">—</span>
                    ) : null}
                  </div>
                </div>
              )
            })}

            <div className="grid grid-cols-[80px_1fr_1fr_80px_80px_90px] px-4 py-3 bg-[#F9FAFB] border-t-2 border-[#E5E7EB]">
              <div className="text-xs font-semibold text-[#6B7280] col-span-4">Woche gesamt</div>
              <div className="text-sm font-bold text-[#111827] tabular-nums">
                {fmtDuration(weekIstMins)}
              </div>
              <div className={cn(
                'text-sm font-bold tabular-nums',
                weekIstMins - weekSollMins >= 0 ? 'text-emerald-600' : 'text-red-500'
              )}>
                {fmtDuration(weekIstMins - weekSollMins, true)}
              </div>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  )
}

function Cell({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div className={cn('text-sm flex items-center', muted ? 'text-[#D1D5DB]' : 'text-[#374151]')}>
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mitarbeiter-app && npx vitest run src/pages/Zeiten/__tests__/TaeglichCard.test.tsx`
Expected: PASS (5 Tests)

- [ ] **Step 5: Commit**

```bash
git add mitarbeiter-app/src/pages/Zeiten/TaeglichCard.tsx mitarbeiter-app/src/pages/Zeiten/__tests__/TaeglichCard.test.tsx
git commit -m "feat(zeiten): TaeglichCard extrahieren, Soll-Hinweiszeile entfernen"
```

---

### Task 4: `WoechentlichCard` (neu)

**Files:**
- Create: `mitarbeiter-app/src/pages/Zeiten/WoechentlichCard.tsx`
- Test: `mitarbeiter-app/src/pages/Zeiten/__tests__/WoechentlichCard.test.tsx`

**Interfaces:**
- Consumes: `netMins, fmtDuration, periodSollMins` aus `../../lib/zeitenCalc` (Task 1)
- Produces: `export default function WoechentlichCard({ employeeId: string; fedState: string; weeklyHours: number }): JSX.Element` — wird in Task 6 von `Zeiten.tsx` importiert

- [ ] **Step 1: Write the failing test**

```typescript
// mitarbeiter-app/src/pages/Zeiten/__tests__/WoechentlichCard.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import type { TimeEntry } from '@shared/types'

const mockGetFullList = vi.fn()

vi.mock('../../../lib/pb', () => ({
  pb: {
    collection: () => ({
      getFullList: mockGetFullList,
    }),
  },
}))

import WoechentlichCard from '../WoechentlichCard'

function entry(overrides: Partial<TimeEntry>): TimeEntry {
  return {
    id: 'e1',
    created: '2026-08-03T00:00:00Z',
    updated: '2026-08-03T00:00:00Z',
    employee: 'emp1',
    start_time: '2026-08-03T08:00:00',
    break_minutes: 0,
    ...overrides,
  }
}

describe('WoechentlichCard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-05T10:00:00'))
    mockGetFullList.mockReset()
    mockGetFullList.mockResolvedValue([
      entry({ id: 'kw32', start_time: '2026-08-03T08:00:00', end_time: '2026-08-03T16:30:00', break_minutes: 30 }), // KW32, Ist 8:00h
      entry({ id: 'kw31', start_time: '2026-07-27T08:00:00', end_time: '2026-07-27T15:00:00', break_minutes: 0 }),  // KW31, Ist 7:00h
    ])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('zeigt 7 Wochen-Zeilen mit der aktuellen Woche oben', async () => {
    render(<WoechentlichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    const kwLabels = await screen.findAllByText(/^KW \d+$/)
    expect(kwLabels).toHaveLength(7)
    expect(kwLabels[0]).toHaveTextContent('KW 32')
    expect(kwLabels[6]).toHaveTextContent('KW 26')
  })

  it('hebt die aktuelle Woche hervor und zeigt ihre Ist/Soll/Differenz-Werte', async () => {
    render(<WoechentlichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    const kw32 = await screen.findByText('KW 32')
    expect(kw32.parentElement).toHaveClass('text-indigo-600')
    const row = kw32.closest('div.grid')!
    expect(within(row).getByText('8:00 h')).toBeInTheDocument()
    expect(within(row).getByText('40:00 h')).toBeInTheDocument()
    expect(within(row).getByText('−32:00 h')).toBeInTheDocument()
  })

  it('zeigt die Ist-Werte einer vorherigen Woche', async () => {
    render(<WoechentlichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    const kw31 = await screen.findByText('KW 31')
    const row = kw31.closest('div.grid')!
    expect(within(row).getByText('7:00 h')).toBeInTheDocument()
  })

  it('der rechte Pfeil ist deaktiviert, solange der aktuelle Block sichtbar ist', async () => {
    render(<WoechentlichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    await screen.findByText('KW 32')
    const buttons = screen.getAllByRole('button')
    expect(buttons[1]).toBeDisabled()
  })

  it('paginiert beim Klick auf den linken Pfeil blockweise um 7 Wochen', async () => {
    render(<WoechentlichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    await screen.findByText('KW 32')
    mockGetFullList.mockClear()
    mockGetFullList.mockResolvedValue([])
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    expect(await screen.findByText('KW 25')).toBeInTheDocument()
    expect(mockGetFullList).toHaveBeenCalledTimes(1)
    expect(screen.getAllByRole('button')[1]).not.toBeDisabled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mitarbeiter-app && npx vitest run src/pages/Zeiten/__tests__/WoechentlichCard.test.tsx`
Expected: FAIL with "Cannot find module '../WoechentlichCard'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// mitarbeiter-app/src/pages/Zeiten/WoechentlichCard.tsx
import { useState, useEffect } from 'react'
import {
  startOfWeek, endOfWeek, eachDayOfInterval, subWeeks,
  format, parseISO, getISOWeek, endOfDay,
} from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pb } from '../../lib/pb'
import { getHolidayDates } from '../../lib/holidays'
import type { TimeEntry } from '@shared/types'
import { cn } from '@/lib/utils'
import { netMins, fmtDuration, periodSollMins } from '../../lib/zeitenCalc'

interface Props {
  employeeId: string
  fedState: string
  weeklyHours: number
}

const BLOCK_SIZE = 7

export default function WoechentlichCard({ employeeId, fedState, weeklyHours }: Props) {
  const [blockOffset, setBlockOffset] = useState(0)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [now] = useState(() => new Date())

  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const anchor = subWeeks(currentWeekStart, blockOffset * BLOCK_SIZE)
  const weeks = Array.from({ length: BLOCK_SIZE }, (_, i) => subWeeks(anchor, i))
  const oldestWeekStart = weeks[weeks.length - 1]
  const newestWeekEnd   = endOfWeek(anchor, { weekStartsOn: 1 })

  useEffect(() => {
    if (!employeeId) return
    setLoading(true)
    const from = format(oldestWeekStart, "yyyy-MM-dd HH:mm:ss")
    const to   = format(endOfDay(newestWeekEnd), "yyyy-MM-dd HH:mm:ss")

    pb.collection('time_entries').getFullList<TimeEntry>({
      filter: `employee = "${employeeId}" && start_time >= "${from}" && start_time <= "${to}"`,
      sort:   'start_time',
      requestKey: null,
    }).then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, blockOffset])

  const years = Array.from(new Set(weeks.flatMap(w => [
    w.getFullYear(),
    endOfWeek(w, { weekStartsOn: 1 }).getFullYear(),
  ])))
  const holidays = new Set<string>()
  years.forEach(y => getHolidayDates(y, fedState).forEach(d => holidays.add(d)))

  const rows = weeks.map(weekStart => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
    const weekEntries = entries.filter(e => {
      const s = parseISO(e.start_time)
      return s >= weekStart && s <= weekEnd
    })
    const ist  = weekEntries.reduce((sum, e) => sum + netMins(e, now), 0)
    const soll = periodSollMins(weeklyHours, days, holidays)
    return {
      weekStart, weekEnd, ist, soll,
      diff: ist - soll,
      kw: getISOWeek(weekStart),
      isCurrent: format(weekStart, 'yyyy-MM-dd') === format(currentWeekStart, 'yyyy-MM-dd'),
    }
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setBlockOffset(o => o + 1)}
          className="p-2 rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 text-center">
          <div className="text-base font-bold text-[#111827]">
            KW {getISOWeek(oldestWeekStart)} – KW {getISOWeek(anchor)}
          </div>
          <div className="text-xs text-[#6B7280]">
            {format(oldestWeekStart, 'd. MMM', { locale: de })} – {format(newestWeekEnd, 'd. MMM yyyy', { locale: de })}
          </div>
        </div>
        <button
          onClick={() => setBlockOffset(o => Math.max(0, o - 1))}
          disabled={blockOffset === 0}
          className="p-2 rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden min-w-[480px]">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr] px-4 py-2.5 border-b border-[#E5E7EB] bg-[#F9FAFB]">
          {['Woche', 'Ist', 'Soll', 'Differenz'].map(h => (
            <div key={h} className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">{h}</div>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-[#6B7280]">Lade…</div>
        ) : (
          rows.map(row => (
            <div
              key={`${row.kw}-${row.weekStart.getFullYear()}`}
              className={cn(
                'grid grid-cols-[1fr_1fr_1fr_1fr] px-4 py-3 border-b border-[#F3F4F6] last:border-0',
                row.isCurrent && 'bg-indigo-50/40'
              )}
            >
              <div className={cn('text-sm font-medium', row.isCurrent ? 'text-indigo-600' : 'text-[#111827]')}>
                <div>KW {row.kw}</div>
                <div className="text-xs text-[#6B7280]">
                  {format(row.weekStart, 'd. MMM', { locale: de })} – {format(row.weekEnd, 'd. MMM', { locale: de })}
                </div>
              </div>
              <div className="text-sm font-semibold tabular-nums text-[#111827] flex items-center">
                {fmtDuration(row.ist)}
              </div>
              <div className="text-sm tabular-nums text-[#6B7280] flex items-center">
                {fmtDuration(row.soll)}
              </div>
              <div className={cn(
                'text-sm font-bold tabular-nums flex items-center',
                row.diff >= 0 ? 'text-emerald-600' : 'text-red-500'
              )}>
                {fmtDuration(row.diff, true)}
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mitarbeiter-app && npx vitest run src/pages/Zeiten/__tests__/WoechentlichCard.test.tsx`
Expected: PASS (5 Tests)

- [ ] **Step 5: Commit**

```bash
git add mitarbeiter-app/src/pages/Zeiten/WoechentlichCard.tsx mitarbeiter-app/src/pages/Zeiten/__tests__/WoechentlichCard.test.tsx
git commit -m "feat(zeiten): WoechentlichCard mit 7-Wochen-Blockpaginierung"
```

---

### Task 5: `MonatlichCard` (neu)

**Files:**
- Create: `mitarbeiter-app/src/pages/Zeiten/MonatlichCard.tsx`
- Test: `mitarbeiter-app/src/pages/Zeiten/__tests__/MonatlichCard.test.tsx`

**Interfaces:**
- Consumes: `netMins, fmtDuration, periodSollMins` aus `../../lib/zeitenCalc` (Task 1)
- Produces: `export default function MonatlichCard({ employeeId: string; fedState: string; weeklyHours: number }): JSX.Element` — wird in Task 6 von `Zeiten.tsx` importiert

- [ ] **Step 1: Write the failing test**

```typescript
// mitarbeiter-app/src/pages/Zeiten/__tests__/MonatlichCard.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import type { TimeEntry } from '@shared/types'

const mockGetFullList = vi.fn()

vi.mock('../../../lib/pb', () => ({
  pb: {
    collection: () => ({
      getFullList: mockGetFullList,
    }),
  },
}))

import MonatlichCard from '../MonatlichCard'

function entry(overrides: Partial<TimeEntry>): TimeEntry {
  return {
    id: 'e1',
    created: '2026-08-03T00:00:00Z',
    updated: '2026-08-03T00:00:00Z',
    employee: 'emp1',
    start_time: '2026-07-10T08:00:00',
    break_minutes: 0,
    ...overrides,
  }
}

describe('MonatlichCard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-05T10:00:00'))
    mockGetFullList.mockReset()
    mockGetFullList.mockResolvedValue([
      entry({ id: 'jul', start_time: '2026-07-10T08:00:00', end_time: '2026-07-10T16:00:00', break_minutes: 0 }),  // Juli, Ist 8:00h
      entry({ id: 'aug', start_time: '2026-08-03T08:00:00', end_time: '2026-08-03T17:00:00', break_minutes: 30 }), // August, Ist 8:30h
    ])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('zeigt alle 12 Monate von Januar bis Dezember', async () => {
    render(<MonatlichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    await screen.findByText('Januar')
    expect(screen.getByText('Dezember')).toBeInTheDocument()
    const text = document.body.textContent ?? ''
    expect(text.indexOf('Januar')).toBeLessThan(text.indexOf('Dezember'))
  })

  it('zeigt Ist/Soll/Differenz für vergangene und den aktuellen Monat', async () => {
    render(<MonatlichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    const juli = await screen.findByText('Juli')
    const juliRow = juli.closest('div.grid')!
    expect(within(juliRow).getByText('8:00 h')).toBeInTheDocument()

    const august = screen.getByText('August')
    expect(august).toHaveClass('text-indigo-600')
    const augustRow = august.closest('div.grid')!
    expect(within(augustRow).getByText('8:30 h')).toBeInTheDocument()
  })

  it('graut zukünftige Monate aus und zeigt keine Werte', async () => {
    render(<MonatlichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    const september = await screen.findByText('September')
    expect(september).toHaveClass('text-[#D1D5DB]')
    const row = september.closest('div.grid')!
    expect(within(row).getAllByText('—')).toHaveLength(3)
  })

  it('zeigt beim Wechsel in ein vergangenes Jahr alle 12 Monate mit Werten (keine grauen Monate)', async () => {
    render(<MonatlichCard employeeId="emp1" fedState="NW" weeklyHours={40} />)
    await screen.findByText('2026')
    mockGetFullList.mockClear()
    mockGetFullList.mockResolvedValue([])
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(await screen.findByText('2025')).toBeInTheDocument()
    const dezember = screen.getByText('Dezember')
    expect(dezember).not.toHaveClass('text-[#D1D5DB]')
    const row = dezember.closest('div.grid')!
    expect(within(row).getByText('0:00 h')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mitarbeiter-app && npx vitest run src/pages/Zeiten/__tests__/MonatlichCard.test.tsx`
Expected: FAIL with "Cannot find module '../MonatlichCard'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// mitarbeiter-app/src/pages/Zeiten/MonatlichCard.tsx
import { useState, useEffect } from 'react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  format, parseISO, endOfDay,
} from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pb } from '../../lib/pb'
import { getHolidayDates } from '../../lib/holidays'
import type { TimeEntry } from '@shared/types'
import { cn } from '@/lib/utils'
import { netMins, fmtDuration, periodSollMins } from '../../lib/zeitenCalc'

interface Props {
  employeeId: string
  fedState: string
  weeklyHours: number
}

const MONTH_NAMES = Array.from({ length: 12 }, (_, m) =>
  format(new Date(2000, m, 1), 'MMMM', { locale: de })
)

export default function MonatlichCard({ employeeId, fedState, weeklyHours }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!employeeId) return
    setLoading(true)
    const from = format(new Date(year, 0, 1), "yyyy-MM-dd HH:mm:ss")
    const to   = format(endOfDay(new Date(year, 11, 31)), "yyyy-MM-dd HH:mm:ss")

    pb.collection('time_entries').getFullList<TimeEntry>({
      filter: `employee = "${employeeId}" && start_time >= "${from}" && start_time <= "${to}"`,
      sort:   'start_time',
      requestKey: null,
    }).then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [employeeId, year])

  const holidays = getHolidayDates(year, fedState)

  const rows = MONTH_NAMES.map((name, m) => {
    const isFuture = year > today.getFullYear() ||
      (year === today.getFullYear() && m > today.getMonth())
    const isCurrent = year === today.getFullYear() && m === today.getMonth()

    if (isFuture) {
      return { name, m, isFuture, isCurrent, ist: null, soll: null, diff: null }
    }

    const monthStart = startOfMonth(new Date(year, m, 1))
    const monthEnd   = endOfMonth(monthStart)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
    const monthEntries = entries.filter(e => {
      const s = parseISO(e.start_time)
      return s >= monthStart && s <= monthEnd
    })
    const ist  = monthEntries.reduce((sum, e) => sum + netMins(e), 0)
    const soll = periodSollMins(weeklyHours, days, holidays)
    return { name, m, isFuture, isCurrent, ist, soll, diff: ist - soll }
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setYear(y => y - 1)}
          className="p-2 rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 text-center">
          <div className="text-base font-bold text-[#111827]">{year}</div>
        </div>
        <button
          onClick={() => setYear(y => y + 1)}
          className="p-2 rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden min-w-[480px]">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr] px-4 py-2.5 border-b border-[#E5E7EB] bg-[#F9FAFB]">
          {['Monat', 'Ist', 'Soll', 'Differenz'].map(h => (
            <div key={h} className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">{h}</div>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-[#6B7280]">Lade…</div>
        ) : (
          rows.map(row => (
            <div
              key={row.m}
              className={cn(
                'grid grid-cols-[1fr_1fr_1fr_1fr] px-4 py-3 border-b border-[#F3F4F6] last:border-0',
                row.isFuture && 'bg-[#F9FAFB]',
                row.isCurrent && 'bg-indigo-50/40'
              )}
            >
              <div className={cn(
                'text-sm font-medium',
                row.isFuture ? 'text-[#D1D5DB]' : row.isCurrent ? 'text-indigo-600' : 'text-[#111827]'
              )}>
                {row.name}
              </div>
              {row.isFuture ? (
                <>
                  <div className="text-sm text-[#D1D5DB] flex items-center">—</div>
                  <div className="text-sm text-[#D1D5DB] flex items-center">—</div>
                  <div className="text-sm text-[#D1D5DB] flex items-center">—</div>
                </>
              ) : (
                <>
                  <div className="text-sm font-semibold tabular-nums text-[#111827] flex items-center">
                    {fmtDuration(row.ist!)}
                  </div>
                  <div className="text-sm tabular-nums text-[#6B7280] flex items-center">
                    {fmtDuration(row.soll!)}
                  </div>
                  <div className={cn(
                    'text-sm font-bold tabular-nums flex items-center',
                    row.diff! >= 0 ? 'text-emerald-600' : 'text-red-500'
                  )}>
                    {fmtDuration(row.diff!, true)}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mitarbeiter-app && npx vitest run src/pages/Zeiten/__tests__/MonatlichCard.test.tsx`
Expected: PASS (4 Tests)

- [ ] **Step 5: Commit**

```bash
git add mitarbeiter-app/src/pages/Zeiten/MonatlichCard.tsx mitarbeiter-app/src/pages/Zeiten/__tests__/MonatlichCard.test.tsx
git commit -m "feat(zeiten): MonatlichCard mit Jahresnavigation und ausgegrauten Zukunftsmonaten"
```

---

### Task 6: `Zeiten.tsx` auf Karussell umstellen

**Files:**
- Modify: `mitarbeiter-app/src/pages/Zeiten/Zeiten.tsx` (kompletter Ersatz des bisherigen Inhalts)
- Test: `mitarbeiter-app/src/pages/Zeiten/__tests__/Zeiten.test.tsx`

**Interfaces:**
- Consumes: `ZeitenCarousel` (Task 2), `TaeglichCard` (Task 3), `WoechentlichCard` (Task 4), `MonatlichCard` (Task 5), `netMins, fmtDuration, dailySollMins` aus `../../lib/zeitenCalc` (Task 1)
- Produces: `export default function Zeiten(): JSX.Element` (unveränderte Signatur, Route `/zeiten` bleibt bestehen)

- [ ] **Step 1: Write the failing test**

```typescript
// mitarbeiter-app/src/pages/Zeiten/__tests__/Zeiten.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('embla-carousel-react', () => ({
  default: () => [vi.fn(), { scrollTo: vi.fn(), selectedScrollSnap: () => 0, on: vi.fn(), off: vi.fn() }],
}))

const mockGetFirstListItem = vi.fn()
const mockGetOne = vi.fn()
const mockGetFullList = vi.fn()

vi.mock('../../../lib/pb', () => ({
  pb: {
    collection: (name: string) => {
      if (name === 'settings')     return { getFirstListItem: mockGetFirstListItem }
      if (name === 'employees')    return { getOne: mockGetOne }
      if (name === 'time_entries') return { getFullList: mockGetFullList }
      throw new Error(`unerwartete Collection: ${name}`)
    },
  },
}))

vi.mock('../../../stores/auth', () => ({
  useAuthStore: (selector: (s: { user: { id: string; employee: string } }) => unknown) =>
    selector({ user: { id: 'u1', employee: 'emp1' } }),
}))

import Zeiten from '../Zeiten'

describe('Zeiten (Seiten-Rahmen)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-04T12:00:00'))
    mockGetFirstListItem.mockResolvedValue({ value: 'NW' })
    mockGetOne.mockResolvedValue({ id: 'emp1', weekly_hours: 40 })
    mockGetFullList.mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('zeigt Titel, Überstunden-Kachel und alle drei Karussell-Titel', async () => {
    render(<Zeiten />)
    expect(screen.getByText('Meine Zeiten')).toBeInTheDocument()
    expect(await screen.findByText(/Überstunden 2026/)).toBeInTheDocument()
    expect(screen.getByText('Täglich')).toBeInTheDocument()
    expect(screen.getByText('Wöchentlich')).toBeInTheDocument()
    expect(screen.getByText('Monatlich')).toBeInTheDocument()
  })

  it('behält den Korrekturhinweis, zeigt aber keine Soll-Hinweiszeile mehr', async () => {
    render(<Zeiten />)
    await screen.findByText(/Überstunden 2026/)
    expect(screen.getByText(/Korrekturen werden vom Betrieb vorgenommen/)).toBeInTheDocument()
    expect(screen.queryByText(/Vertrag/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mitarbeiter-app && npx vitest run src/pages/Zeiten/__tests__/Zeiten.test.tsx`
Expected: FAIL — die Titel „Täglich"/„Wöchentlich"/„Monatlich" existieren im bisherigen `Zeiten.tsx` noch nicht

- [ ] **Step 3: Replace Zeiten.tsx**

```typescript
// mitarbeiter-app/src/pages/Zeiten/Zeiten.tsx
import { useState, useEffect } from 'react'
import { format, endOfDay, isWeekend, startOfYear, parseISO } from 'date-fns'
import { pb } from '../../lib/pb'
import { useAuthStore } from '../../stores/auth'
import { getHolidayDates } from '../../lib/holidays'
import type { TimeEntry, Employee } from '@shared/types'
import { cn } from '@/lib/utils'
import { netMins, fmtDuration, dailySollMins } from '../../lib/zeitenCalc'
import ZeitenCarousel from '../../components/ZeitenCarousel'
import TaeglichCard from './TaeglichCard'
import WoechentlichCard from './WoechentlichCard'
import MonatlichCard from './MonatlichCard'

export default function Zeiten() {
  const user       = useAuthStore(s => s.user)
  const employeeId = user?.employee ?? ''

  const [employee,        setEmployee]        = useState<Employee | null>(null)
  const [fedState,        setFedState]        = useState('ST')
  const [allEntries,      setAllEntries]      = useState<TimeEntry[]>([])
  const [loadingOvertime, setLoadingOvertime] = useState(true)

  useEffect(() => {
    pb.collection('settings')
      .getFirstListItem<{ value: string }>('key = "federal_state"', { requestKey: null })
      .then(s => setFedState(s.value))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!employeeId) return
    pb.collection('employees').getOne<Employee>(employeeId, { requestKey: null })
      .then(setEmployee)
      .catch(console.error)
  }, [employeeId])

  useEffect(() => {
    if (!employeeId) return
    setLoadingOvertime(true)
    const from = format(startOfYear(new Date()), "yyyy-MM-dd HH:mm:ss")
    const to   = format(endOfDay(new Date()), "yyyy-MM-dd HH:mm:ss")
    pb.collection('time_entries').getFullList<TimeEntry>({
      filter: `employee = "${employeeId}" && start_time >= "${from}" && start_time <= "${to}" && end_time != ""`,
      sort:   'start_time',
      requestKey: 'zeiten-all',
    }).then(setAllEntries)
      .catch(console.error)
      .finally(() => setLoadingOvertime(false))
  }, [employeeId])

  const weeklyHours = employee?.weekly_hours ?? 40
  const sollPerDay  = dailySollMins(weeklyHours)

  const holidaysYear = getHolidayDates(new Date().getFullYear(), fedState)
  const overtimeMins = (() => {
    const dayMap = new Map<string, number>()
    for (const e of allEntries) {
      if (!e.end_time) continue
      const ds = e.start_time.slice(0, 10)
      dayMap.set(ds, (dayMap.get(ds) ?? 0) + netMins(e))
    }
    let total = 0
    for (const [ds, mins] of dayMap) {
      const d = parseISO(ds)
      if (!isWeekend(d) && !holidaysYear.has(ds)) {
        total += mins - sollPerDay
      }
    }
    return total
  })()

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-y-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-[#111827]">Meine Zeiten</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Deine Arbeitszeitnachweise</p>
        </div>

        {/* Überstunden-Kachel */}
        {!loadingOvertime && (
          <div className={cn(
            'px-4 py-2.5 rounded-xl text-right border',
            overtimeMins >= 0
              ? 'bg-emerald-50 border-emerald-100'
              : 'bg-red-50 border-red-100'
          )}>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] mb-0.5">
              Überstunden {new Date().getFullYear()}
            </div>
            <div className={cn(
              'text-lg font-bold tabular-nums',
              overtimeMins >= 0 ? 'text-emerald-700' : 'text-red-600'
            )}>
              {fmtDuration(overtimeMins, true)}
            </div>
          </div>
        )}
      </div>

      <ZeitenCarousel
        slides={[
          { key: 'taeglich',     label: 'Täglich',     content: <TaeglichCard employeeId={employeeId} fedState={fedState} weeklyHours={weeklyHours} /> },
          { key: 'woechentlich', label: 'Wöchentlich', content: <WoechentlichCard employeeId={employeeId} fedState={fedState} weeklyHours={weeklyHours} /> },
          { key: 'monatlich',    label: 'Monatlich',   content: <MonatlichCard employeeId={employeeId} fedState={fedState} weeklyHours={weeklyHours} /> },
        ]}
        initialIndex={0}
      />

      {/* Hinweis */}
      <p className="mt-4 text-xs text-[#9CA3AF] text-center">
        Korrekturen werden vom Betrieb vorgenommen.
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mitarbeiter-app && npx vitest run src/pages/Zeiten/__tests__/Zeiten.test.tsx`
Expected: PASS (2 Tests)

- [ ] **Step 5: Commit**

```bash
git add mitarbeiter-app/src/pages/Zeiten/Zeiten.tsx mitarbeiter-app/src/pages/Zeiten/__tests__/Zeiten.test.tsx
git commit -m "feat(zeiten): Zeiten.tsx auf Täglich/Wöchentlich/Monatlich-Karussell umstellen"
```

---

### Task 7: Gesamtverifikation

**Files:**
- Keine neuen Dateien — reine Verifikation, ggf. kleine Korrekturen an zuvor erstellten Dateien.

- [ ] **Step 1: Vollständige Test-Suite ausführen**

Run: `cd mitarbeiter-app && npm run test:run`
Expected: Alle Tests (bestehende + die 6 neuen Testdateien aus Task 1–6) sind grün, keine Fehlschläge.

- [ ] **Step 2: TypeScript-Check + Build ausführen**

Run: `cd mitarbeiter-app && npm run build`
Expected: `tsc -b` läuft ohne Fehler durch, `vite build` erzeugt erfolgreich einen Produktions-Build in `dist/`.

- [ ] **Step 3: Gefundene Probleme beheben (falls vorhanden)**

Falls Schritt 1 oder 2 fehlschlägt: Fehler lesen, betroffene Datei aus Task 1–6 korrigieren, Schritt 1/2 erneut ausführen, bis beide grün sind. Keine Platzhalter oder `@ts-ignore` verwenden — echte Ursache beheben.

- [ ] **Step 4: Manuelle Prüfung im Browser (dev server)**

Run: `./pocketbase serve --http="127.0.0.1:8091"` (Terminal 1, falls nicht bereits aktiv), `cd mitarbeiter-app && npm run dev` (Terminal 2)
Öffne `http://localhost:5174/` (bzw. über den Chef-App-Proxy `http://localhost:5173/ma/`), navigiere zu „Meine Zeiten": Karussell startet bei Täglich, seitliche Karten sind angeschnitten sichtbar, Wischen/Klick auf Titel wechselt die Karte, Wöchentlich zeigt 7 Wochen mit Blockpaginierung, Monatlich zeigt 12 Monate mit ausgegrauten Zukunftsmonaten und Jahresnavigation, keine Soll-Hinweiszeile mehr sichtbar, „Korrekturen werden vom Betrieb vorgenommen." ist weiterhin vorhanden.

- [ ] **Step 5: Commit (nur falls Korrekturen in Schritt 3 nötig waren)**

```bash
git add -A
git commit -m "fix(zeiten): Korrekturen aus Verifikationslauf"
```
