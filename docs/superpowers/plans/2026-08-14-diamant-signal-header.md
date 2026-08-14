# Diamant-Signal im Header — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Diamant im mobilen Header der Mitarbeiter-App ruht grau und funkelt indigo, sobald es eine neue Aufgabe, eine neue Prämie, ein Ergebnis der eigenen Einreichung oder eine Frist unter 60 Minuten gibt.

**Architecture:** Ein Hook `useGamificationSignal` bündelt die vier Signalquellen und gibt der Kopfleiste nur `{ sparkle, markSeen }`. Die drei ereignisbasierten Quellen laufen als reine Zähl-Abfragen gegen einen Zeitstempel im Nutzerprofil (`users.gam_seen_at`) und werden über Subscriptions frisch gehalten; die Fristwarnung kommt aus dem bestehenden `useAssignments` plus einem Minuten-Ticker. Das Icon wird ein eigenes SVG, weil der Glanzstrich ein zusätzlicher Pfad über der Kontur ist.

**Tech Stack:** React 19, TypeScript (strict), Vite, Tailwind CSS 3.4, Vitest + Testing Library (jsdom), PocketBase SDK 0.26, PocketBase-Migrationen in `pb_migrations/`.

**Spec:** `docs/superpowers/specs/2026-08-14-diamant-signal-header-design.md`

## Global Constraints

- Ruhefarbe `#6B7280` (Tailwind `text-gray-500`), Signalfarbe `#4F46E5`, Glanzstrich `#C7D2FE`.
- Fristgrenze: 60 Minuten. Animationsdauer: 2,6 s, `cubic-bezier(.4,0,.5,1)`, endlos.
- Jede PocketBase-Abfrage und jede Subscription bekommt `requestKey: null`.
- Jeder `catch`-Block prüft zuerst auf `isAbort` und kehrt bei einem Abbruch **still** zurück — kein `console.error`, kein Fehlerzustand. Abbrüche sind Normalbetrieb des SDK. Echte Fehler dürfen protokolliert werden, wo sonst jede Spur fehlt (`markSeen`); in den Lesepfaden bleibt es beim stillen Rückfall auf „kein Signal".
- Zeitstempel, die in einen PocketBase-Filter oder in ein `date`-Feld geschrieben werden, nutzen das Format des Servers (`2026-08-14 15:50:00.000Z`), nicht das ISO-`T`-Format. Bei reinem String-Vergleich sortiert `T` hinter dem Leerzeichen, wodurch ein neuerer Datensatz als älter gälte.
- Bei `prefers-reduced-motion: reduce` entfällt die Animation; der Farbwechsel bleibt.
- Ein Fehler darf nie zu einer sichtbaren Fehlermeldung im Header führen. Im Zweifel kein Signal.
- Alle Arbeit findet in `mitarbeiter-app/` statt, ausgenommen die Migration in `pb_migrations/`.
- Tests laufen mit `npm run test:run` aus `mitarbeiter-app/`.
- Der Alias `@` zeigt auf `mitarbeiter-app/src`.

---

### Task 1: Feld `users.gam_seen_at` per Migration anlegen

**Files:**
- Create: `pb_migrations/1786719834_add_gam_seen_at_users.js`

**Interfaces:**
- Consumes: nichts
- Produces: Feld `gam_seen_at` (Typ `date`, optional) auf der Collection `users`. Ab Task 3 gelesen über `pb.authStore.record?.gam_seen_at` und geschrieben über `pb.collection('users').update(id, { gam_seen_at })`.

Der Feldtyp heißt in PocketBase `date` und speichert einen vollständigen ISO-8601-Zeitstempel mit Uhrzeit — derselbe Typ, den `time_entries.start_time` nutzt. Die `updateRule` der `users`-Collection lautet bereits `@request.auth.role = 'gf' || id = @request.auth.id`, ein Mitarbeiter darf seinen eigenen Datensatz also schreiben. Es braucht **keine** Rule-Änderung.

Die Spalte existiert in SQLite noch nicht. Die Sonderbehandlung aus der CLAUDE.md (Werte sichern → Spalte droppen → Feld anlegen → Werte zurückschreiben) ist hier **nicht** nötig — die galt nur für die `created`/`updated`-Felder, deren Spalten bereits per direktem `ALTER TABLE` existierten.

- [ ] **Step 1: Migration schreiben**

Datei `pb_migrations/1786719834_add_gam_seen_at_users.js`:

```js
/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users")

  // add field
  collection.fields.add(new Field({
    "hidden": false,
    "id": "date1786719834",
    "max": "",
    "min": "",
    "name": "gam_seen_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("users")

  // remove field
  collection.fields.removeById("date1786719834")

  return app.save(collection)
})
```

- [ ] **Step 2: Migration anwenden**

Aus dem Projektstamm:

```bash
./pocketbase migrate up
```

Erwartet: eine Zeile, die `1786719834_add_gam_seen_at_users.js` als angewendet meldet. Läuft PocketBase gerade, genügt auch ein Neustart — Migrationen werden beim Start automatisch angewendet.

- [ ] **Step 3: Feld im Schema verifizieren**

```bash
sqlite3 pb_data/data.db "SELECT fields FROM _collections WHERE name='users';" | python3 -m json.tool | grep -A2 gam_seen_at
```

Erwartet: ein Treffer mit `"name": "gam_seen_at"` und `"type": "date"`. Findet sich nichts, wurde die Migration nicht angewendet — dann Step 2 wiederholen und die PocketBase-Ausgabe lesen.

Wichtig ist die Prüfung gegen `_collections` (das Schema) und nicht gegen die Tabelle: PocketBase validiert `filter` und `sort` gegen das Schema. Genau diese Lücke war die Ursache der `400 invalid sort field "created"`-Fehler, die in der CLAUDE.md dokumentiert sind.

- [ ] **Step 4: Commit**

```bash
git add pb_migrations/1786719834_add_gam_seen_at_users.js
git commit -m "feat(db): Add users.gam_seen_at for the gamification seen marker"
```

---

### Task 2: Icon-Komponente `GemSignal` mit Glanzstrich

**Files:**
- Create: `mitarbeiter-app/src/components/Gamification/GemSignal.tsx`
- Modify: `mitarbeiter-app/src/index.css`
- Test: `mitarbeiter-app/src/components/Gamification/__tests__/GemSignal.test.tsx`

**Interfaces:**
- Consumes: nichts
- Produces: `GemSignal({ sparkle }: { sparkle: boolean })` — rendert ein 20×20-SVG. Bei `sparkle = true` trägt es die Klasse `text-[#4F46E5]` und enthält einen zusätzlichen Pfad mit der Klasse `gem-sweep`; bei `false` trägt es `text-gray-500` und der Zusatzpfad fehlt. Task 5 rendert diese Komponente.

Die lucide-Komponente `<Gem>` kann hier nicht bleiben: Sie akzeptiert keine Kinder in ihrem SVG, der Glanzstrich ist aber genau das — eine zweite Kopie des Umriss-Pfades, über den ersten gelegt. Die drei Pfade werden aus lucide `gem` übernommen.

Das Verzeichnis `src/components/Gamification/__tests__/` existiert noch nicht und wird mit der Testdatei angelegt.

- [ ] **Step 1: Failing test schreiben**

Datei `mitarbeiter-app/src/components/Gamification/__tests__/GemSignal.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { GemSignal } from '../GemSignal'

describe('GemSignal', () => {
  it('ruht grau und ohne Glanzstrich', () => {
    const { container } = render(<GemSignal sparkle={false} />)

    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg?.getAttribute('class')).toContain('text-gray-500')
    expect(container.querySelector('.gem-sweep')).not.toBeInTheDocument()
  })

  it('faerbt sich indigo und zeigt den Glanzstrich', () => {
    const { container } = render(<GemSignal sparkle={true} />)

    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('class')).toContain('text-[#4F46E5]')

    const sweep = container.querySelector('.gem-sweep')
    expect(sweep).toBeInTheDocument()
    expect(sweep?.getAttribute('stroke-dasharray')).toBe('18 82')
  })

  it('behaelt die drei Grundpfade des Diamanten in beiden Zustaenden', () => {
    const ruhig = render(<GemSignal sparkle={false} />).container
    const aktiv = render(<GemSignal sparkle={true} />).container

    expect(ruhig.querySelectorAll('path')).toHaveLength(3)
    expect(aktiv.querySelectorAll('path')).toHaveLength(4)
  })
})
```

- [ ] **Step 2: Test laufen lassen und Fehlschlag bestätigen**

```bash
cd mitarbeiter-app && npx vitest run src/components/Gamification/__tests__/GemSignal.test.tsx
```

Erwartet: FAIL mit `Failed to resolve import "../GemSignal"`.

- [ ] **Step 3: Komponente schreiben**

Datei `mitarbeiter-app/src/components/Gamification/GemSignal.tsx`:

```tsx
const OUTLINE =
  'M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z'

interface GemSignalProps {
  sparkle: boolean
}

export function GemSignal({ sparkle }: GemSignalProps) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`transition-colors ${sparkle ? 'text-[#4F46E5]' : 'text-gray-500'}`}
    >
      <path d="M10.5 3 8 9l4 13 4-13-2.5-6" />
      <path d={OUTLINE} />
      <path d="M2 9h20" />
      {sparkle && (
        <path
          className="gem-sweep"
          d={OUTLINE}
          pathLength={100}
          strokeDasharray="18 82"
          stroke="#C7D2FE"
          strokeWidth="2.6"
        />
      )}
    </svg>
  )
}
```

- [ ] **Step 4: Keyframes ergänzen**

In `mitarbeiter-app/src/index.css` direkt hinter dem vorhandenen `.blink`-Block (nach Zeile 11) einfügen:

```css
/* Glanzstrich des Gamification-Diamanten: ein Lichtpunkt wandert die Kontur
   entlang. Bei reduzierter Bewegung wird der Pfad ausgeblendet statt
   eingefroren — ein stehender Lichtpunkt sieht aus wie ein Rendering-Fehler. */
@keyframes gem-sweep {
  0%        { stroke-dashoffset: 100; }
  55%, 100% { stroke-dashoffset: -20; }
}
.gem-sweep {
  animation: gem-sweep 2.6s cubic-bezier(.4,0,.5,1) infinite;
}

@media (prefers-reduced-motion: reduce) {
  .gem-sweep {
    animation: none;
    opacity: 0;
  }
}
```

- [ ] **Step 5: Test laufen lassen und Erfolg bestätigen**

```bash
cd mitarbeiter-app && npx vitest run src/components/Gamification/__tests__/GemSignal.test.tsx
```

Erwartet: PASS, 3 Tests.

- [ ] **Step 6: Commit**

```bash
git add mitarbeiter-app/src/components/Gamification/GemSignal.tsx mitarbeiter-app/src/components/Gamification/__tests__/GemSignal.test.tsx mitarbeiter-app/src/index.css
git commit -m "feat(mitarbeiter-app): Add the gem icon with its travelling highlight"
```

---

### Task 3: Hook `useGamificationSignal` — die drei Merker-Quellen

**Files:**
- Create: `mitarbeiter-app/src/hooks/useGamificationSignal.ts`
- Test: `mitarbeiter-app/src/hooks/__tests__/useGamificationSignal.test.ts`

**Interfaces:**
- Consumes: `useGamificationEnabled()` aus `@/hooks/useGamificationEnabled` — liefert `{ enabled: boolean, loading: boolean }`. Feld `users.gam_seen_at` aus Task 1.
- Produces: `useGamificationSignal(): { sparkle: boolean, markSeen: () => Promise<void> }`. Task 4 erweitert denselben Hook um die Fristwarnung, Task 5 verdrahtet ihn im Header.

Diese Task baut die drei ereignisbasierten Quellen. Die Fristwarnung folgt in Task 4, die Subscriptions ebenfalls — hier zählt erst einmal der korrekte Zustand nach dem Laden.

Die Quellen laufen als reine Zähl-Abfragen: `getList(1, 1, …)` lädt höchstens einen Datensatz, ausgewertet wird nur `totalItems`. Es landet nichts davon im State.

Ein leeres `gam_seen_at` bedeutet „noch nie gesehen". Statt den Filter dann wegzulassen, wird gegen den Unix-Nullpunkt gefiltert — so bleibt für alle vier Fälle genau ein Codepfad.

- [ ] **Step 1: Failing test schreiben**

Datei `mitarbeiter-app/src/hooks/__tests__/useGamificationSignal.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

vi.mock('../../lib/pb', () => ({
  pb: {
    authStore: { record: { id: 'user-1', gam_seen_at: '2026-08-14 08:00:00.000Z' } },
    collection: vi.fn(),
  },
}))

let mockEnabled = true
vi.mock('../useGamificationEnabled', () => ({
  useGamificationEnabled: () => ({ enabled: mockEnabled, loading: false }),
}))

vi.mock('../useAssignments', () => ({
  useAssignments: () => ({ assignments: [], loading: false }),
}))

import { pb } from '../../lib/pb'
import { useGamificationSignal } from '../useGamificationSignal'

/**
 * Zeitpunkt, zu dem die fiktiven Datensaetze angelegt wurden: nach dem
 * Merker im Testprofil (08:00), aber vor "jetzt". Der Mock wertet den
 * `created > "…"`-Teil des Filters wirklich aus — ein Mock, der den Filter
 * ignoriert, wuerde nach markSeen weiterhin Treffer melden und damit genau
 * das Verhalten unterschlagen, das der Test beweisen soll.
 */
const RECORD_CREATED = '2026-08-14T09:00:00.000Z'

/** Liest den Merker aus dem Filterstring und normalisiert ihn auf ISO. */
function seitWann(filter: string): number {
  const treffer = filter.match(/created > "([^"]+)"/)
  if (!treffer) return 0
  return new Date(treffer[1].replace(' ', 'T')).getTime()
}

/** Zaehlt pro Collection, wieviele Treffer die Existenzpruefung melden soll. */
function mockCounts(counts: { tasks?: number; rewards?: number; events?: number }) {
  const update = vi.fn().mockResolvedValue({})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(pb.collection as any).mockImplementation((name: string) => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getList: vi.fn().mockImplementation(async (_p: number, _n: number, opts: any) => {
      const konfiguriert =
        name === 'gam_tasks' ? counts.tasks ?? 0
        : name === 'gam_rewards' ? counts.rewards ?? 0
        : name === 'gam_events' ? counts.events ?? 0
        : 0
      const sichtbar = seitWann(opts?.filter ?? '') < new Date(RECORD_CREATED).getTime()
      return { totalItems: sichtbar ? konfiguriert : 0, items: [] }
    }),
    subscribe: vi.fn().mockResolvedValue(() => {}),
    update,
  }))
  return { update }
}

describe('useGamificationSignal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnabled = true
    pb.authStore.record = { id: 'user-1', gam_seen_at: '2026-08-14 08:00:00.000Z' }
  })

  it('funkelt nicht, wenn alle Quellen leer sind', async () => {
    mockCounts({})

    const { result } = renderHook(() => useGamificationSignal())

    await waitFor(() => expect(pb.collection).toHaveBeenCalledWith('gam_tasks'))
    expect(result.current.sparkle).toBe(false)
  })

  it('funkelt bei einer neuen Aufgabe', async () => {
    mockCounts({ tasks: 1 })

    const { result } = renderHook(() => useGamificationSignal())

    await waitFor(() => expect(result.current.sparkle).toBe(true))
  })

  it('funkelt bei einer neuen Praemie', async () => {
    mockCounts({ rewards: 1 })

    const { result } = renderHook(() => useGamificationSignal())

    await waitFor(() => expect(result.current.sparkle).toBe(true))
  })

  it('funkelt bei einem neuen Ereignis zur eigenen Einreichung', async () => {
    mockCounts({ events: 1 })

    const { result } = renderHook(() => useGamificationSignal())

    await waitFor(() => expect(result.current.sparkle).toBe(true))
  })

  it('filtert gegen den Merker aus dem Nutzerprofil', async () => {
    mockCounts({})

    renderHook(() => useGamificationSignal())

    await waitFor(() => expect(pb.collection).toHaveBeenCalledWith('gam_tasks'))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = (pb.collection as any).mock.results
      .map((r: any) => r.value.getList.mock.calls[0])
      .find((c: any) => c && c[2]?.filter?.includes('active = true'))
    expect(call[2].filter).toContain('created > "2026-08-14 08:00:00.000Z"')
    expect(call[2].requestKey).toBeNull()
  })

  it('behandelt einen leeren Merker als "noch nie gesehen"', async () => {
    pb.authStore.record = { id: 'user-1', gam_seen_at: '' }
    mockCounts({})

    renderHook(() => useGamificationSignal())

    await waitFor(() => expect(pb.collection).toHaveBeenCalledWith('gam_tasks'))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = (pb.collection as any).mock.results
      .map((r: any) => r.value.getList.mock.calls[0])
      .find((c: any) => c && c[2]?.filter?.includes('active = true'))
    expect(call[2].filter).toContain('created > "1970-01-01 00:00:00.000Z"')
  })

  it('markSeen schreibt den Zeitstempel und beendet das Funkeln', async () => {
    const { update } = mockCounts({ tasks: 1 })

    const { result } = renderHook(() => useGamificationSignal())
    await waitFor(() => expect(result.current.sparkle).toBe(true))

    await act(async () => {
      await result.current.markSeen()
    })

    expect(result.current.sparkle).toBe(false)
    expect(update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ gam_seen_at: expect.any(String) }),
      { requestKey: null },
    )
  })

  it('ignoriert abgebrochene Anfragen ohne Konsolenausgabe', async () => {
    const fehler = vi.spyOn(console, 'error').mockImplementation(() => {})
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(pb.collection as any).mockImplementation(() => ({
      getList: vi.fn().mockRejectedValue({ isAbort: true }),
      subscribe: vi.fn().mockResolvedValue(() => {}),
      update: vi.fn(),
    }))

    const { result } = renderHook(() => useGamificationSignal())

    await waitFor(() => expect(pb.collection).toHaveBeenCalledWith('gam_tasks'))
    expect(result.current.sparkle).toBe(false)
    expect(fehler).not.toHaveBeenCalled()
    fehler.mockRestore()
  })

  it('fragt nichts ab, solange Gamification abgeschaltet ist', async () => {
    mockEnabled = false
    mockCounts({ tasks: 5 })

    const { result } = renderHook(() => useGamificationSignal())

    expect(pb.collection).not.toHaveBeenCalled()
    expect(result.current.sparkle).toBe(false)
  })
})
```

- [ ] **Step 2: Test laufen lassen und Fehlschlag bestätigen**

```bash
cd mitarbeiter-app && npx vitest run src/hooks/__tests__/useGamificationSignal.test.ts
```

Erwartet: FAIL mit `Failed to resolve import "../useGamificationSignal"`.

- [ ] **Step 3: Hook schreiben**

Datei `mitarbeiter-app/src/hooks/useGamificationSignal.ts`:

```ts
import { useState, useEffect, useCallback } from 'react'
import { pb } from '@/lib/pb'
import { useGamificationEnabled } from './useGamificationEnabled'

/** Merker-Ersatz fuer "noch nie gesehen" — so bleibt der Filter in einem Codepfad. */
const EPOCH = '1970-01-01 00:00:00.000Z'

interface UseGamificationSignalReturn {
  sparkle: boolean
  markSeen: () => Promise<void>
}

/**
 * Auto-Cancellation des PocketBase-SDK ist kein Fehlerfall: ueberlappende
 * Anfragen brechen die aeltere ab. Wird das als echter Fehler behandelt,
 * entsteht derselbe Schaden wie beim Auth-Bug in Commit c74d7f4.
 */
function isAbort(err: unknown): boolean {
  return Boolean(
    err && typeof err === 'object' && 'isAbort' in err && (err as { isAbort?: boolean }).isAbort,
  )
}

export function useGamificationSignal(): UseGamificationSignalReturn {
  const { enabled } = useGamificationEnabled()
  const [seenAt, setSeenAt] = useState<string>(
    () => (pb.authStore.record?.gam_seen_at as string | undefined) ?? '',
  )
  const [hasNew, setHasNew] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const userId = pb.authStore.record?.id
    if (!userId) return

    let cancelled = false
    const since = seenAt || EPOCH

    const check = async () => {
      try {
        const [tasks, rewards, events] = await Promise.all([
          pb.collection('gam_tasks').getList(1, 1, {
            filter: `active = true && (expires_at = "" || expires_at > @now) && created > "${since}"`,
            requestKey: null,
          }),
          pb.collection('gam_rewards').getList(1, 1, {
            filter: `status = "active" && created > "${since}"`,
            requestKey: null,
          }),
          pb.collection('gam_events').getList(1, 1, {
            filter: `user_id = "${userId}" && (type = "submission_approved" || type = "reward_redeemed") && created > "${since}"`,
            requestKey: null,
          }),
        ])

        if (cancelled) return
        setHasNew(tasks.totalItems > 0 || rewards.totalItems > 0 || events.totalItems > 0)
      } catch (err) {
        if (cancelled || isAbort(err)) return
        // Ein verpasstes Funkeln ist harmlos, ein Fehler in der Kopfleiste nicht.
        setHasNew(false)
      }
    }

    check()

    return () => {
      cancelled = true
    }
  }, [enabled, seenAt])

  const markSeen = useCallback(async () => {
    // Format des Servers, nicht ISO mit "T": PocketBase speichert
    // "2026-08-14 15:50:00.000Z", und bei einem String-Vergleich sortiert
    // "T" hinter dem Leerzeichen — ein neuerer Datensatz gaelte als aelter.
    const jetzt = new Date().toISOString().replace('T', ' ')
    setSeenAt(jetzt)
    setHasNew(false)

    const userId = pb.authStore.record?.id
    if (!userId) return

    try {
      await pb.collection('users').update(userId, { gam_seen_at: jetzt }, { requestKey: null })
    } catch (err) {
      if (isAbort(err)) return
      // Der lokale Merker bleibt trotzdem gesetzt. Beim naechsten Laden kehrt
      // das Signal zurueck — lieber einmal zu viel als eine verschluckte Meldung.
      console.error('[useGamificationSignal] markSeen', err)
    }
  }, [])

  return {
    sparkle: hasNew,
    markSeen,
  }
}
```

- [ ] **Step 4: Test laufen lassen und Erfolg bestätigen**

```bash
cd mitarbeiter-app && npx vitest run src/hooks/__tests__/useGamificationSignal.test.ts
```

Erwartet: PASS, 9 Tests.

- [ ] **Step 5: Commit**

```bash
git add mitarbeiter-app/src/hooks/useGamificationSignal.ts mitarbeiter-app/src/hooks/__tests__/useGamificationSignal.test.ts
git commit -m "feat(mitarbeiter-app): Signal new tasks, rewards and verdicts on the gem"
```

---

### Task 4: Fristwarnung und Minuten-Ticker

**Files:**
- Modify: `mitarbeiter-app/src/hooks/useGamificationSignal.ts`
- Modify: `mitarbeiter-app/src/hooks/__tests__/useGamificationSignal.test.ts`

**Interfaces:**
- Consumes: `useAssignments()` aus `@/hooks/useAssignments` — liefert `{ assignments: Assignment[], loading: boolean }`. Ein `Assignment` trägt `status: 'active' | 'completed' | 'rejected' | 'expired'` und `expires_at: string`. Der Hook wertet `expired` bereits selbst aus, ein abgelaufener Auftrag kommt also nie mit `status: 'active'` zurück.
- Produces: dieselbe Signatur wie Task 3. `sparkle` ist jetzt `hasNew || deadlineNear`.

Die Fristwarnung ist die einzige Quelle, die `markSeen()` überlebt: Sie ist ein Zustand, kein Ereignis. Die Frist läuft weiter, egal wie oft man nachsieht.

Der Ticker ist nötig, weil die 60-Minuten-Grenze sonst erst beim nächsten Re-Render überschritten würde — ein Auftrag könnte auf einem offen liegenden Bildschirm stumm ablaufen.

- [ ] **Step 1: Failing tests ergänzen**

In `mitarbeiter-app/src/hooks/__tests__/useGamificationSignal.test.ts` den `useAssignments`-Mock durch eine steuerbare Variante ersetzen. Den bestehenden Block

```ts
vi.mock('../useAssignments', () => ({
  useAssignments: () => ({ assignments: [], loading: false }),
}))
```

ersetzen durch:

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockAssignments: any[] = []
vi.mock('../useAssignments', () => ({
  useAssignments: () => ({ assignments: mockAssignments, loading: false }),
}))
```

Im `beforeEach` ergänzen:

```ts
    mockAssignments = []
```

Und am Ende der `describe`-Blocks diese Tests anhängen:

```ts
  it('funkelt, wenn ein eigener Auftrag in unter 60 Minuten ablaeuft', async () => {
    mockCounts({})
    mockAssignments = [
      {
        id: 'a1',
        status: 'active',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      },
    ]

    const { result } = renderHook(() => useGamificationSignal())

    await waitFor(() => expect(result.current.sparkle).toBe(true))
  })

  it('funkelt nicht bei einer Frist jenseits der 60 Minuten', async () => {
    mockCounts({})
    mockAssignments = [
      {
        id: 'a1',
        status: 'active',
        expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      },
    ]

    const { result } = renderHook(() => useGamificationSignal())

    await waitFor(() => expect(pb.collection).toHaveBeenCalledWith('gam_tasks'))
    expect(result.current.sparkle).toBe(false)
  })

  it('ignoriert Auftraege, die nicht mehr aktiv sind', async () => {
    mockCounts({})
    mockAssignments = [
      {
        id: 'a1',
        status: 'completed',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      },
    ]

    const { result } = renderHook(() => useGamificationSignal())

    await waitFor(() => expect(pb.collection).toHaveBeenCalledWith('gam_tasks'))
    expect(result.current.sparkle).toBe(false)
  })

  it('laesst die Fristwarnung markSeen ueberleben', async () => {
    mockCounts({ tasks: 1 })
    mockAssignments = [
      {
        id: 'a1',
        status: 'active',
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
    ]

    const { result } = renderHook(() => useGamificationSignal())
    await waitFor(() => expect(result.current.sparkle).toBe(true))

    await act(async () => {
      await result.current.markSeen()
    })

    // Die Aufgabe ist abgehakt, die Frist laeuft weiter.
    expect(result.current.sparkle).toBe(true)
  })

  it('erkennt eine ablaufende Frist beim Minuten-Ticker', async () => {
    vi.useFakeTimers()
    mockCounts({})
    mockAssignments = [
      {
        id: 'a1',
        status: 'active',
        expires_at: new Date(Date.now() + 61 * 60 * 1000).toISOString(),
      },
    ]

    const { result } = renderHook(() => useGamificationSignal())
    expect(result.current.sparkle).toBe(false)

    await act(async () => {
      vi.advanceTimersByTime(2 * 60 * 1000)
    })

    expect(result.current.sparkle).toBe(true)
    vi.useRealTimers()
  })
```

- [ ] **Step 2: Tests laufen lassen und Fehlschlag bestätigen**

```bash
cd mitarbeiter-app && npx vitest run src/hooks/__tests__/useGamificationSignal.test.ts
```

Erwartet: die fünf neuen Tests scheitern (`expected false to be true` bzw. beim Ticker-Test), die neun aus Task 3 bleiben grün.

- [ ] **Step 3: Fristwarnung implementieren**

In `mitarbeiter-app/src/hooks/useGamificationSignal.ts` den Import ergänzen:

```ts
import { useAssignments } from './useAssignments'
```

Unter die `EPOCH`-Konstante:

```ts
/** Ab hier gilt eine Frist als knapp. Auftraege laufen 8 Stunden. */
const EXPIRY_WARNING_MS = 60 * 60 * 1000
const TICK_MS = 60 * 1000
```

Im Hook nach `const [hasNew, setHasNew] = useState(false)`:

```ts
  const { assignments } = useAssignments()
  const [, tick] = useState(0)

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => tick((n) => n + 1), TICK_MS)
    return () => clearInterval(id)
  }, [enabled])
```

Vor dem `return` des Hooks:

```ts
  // Zustand, kein Ereignis: die Warnung ueberlebt markSeen und endet erst,
  // wenn der Auftrag eingereicht oder abgelaufen ist.
  const jetzt = Date.now()
  const deadlineNear = assignments.some((a) => {
    if (a.status !== 'active' || !a.expires_at) return false
    const rest = new Date(a.expires_at).getTime() - jetzt
    return rest > 0 && rest < EXPIRY_WARNING_MS
  })
```

Und den Rückgabewert ändern:

```ts
  return {
    sparkle: hasNew || deadlineNear,
    markSeen,
  }
```

- [ ] **Step 4: Tests laufen lassen und Erfolg bestätigen**

```bash
cd mitarbeiter-app && npx vitest run src/hooks/__tests__/useGamificationSignal.test.ts
```

Erwartet: PASS, 14 Tests.

- [ ] **Step 5: Commit**

```bash
git add mitarbeiter-app/src/hooks/useGamificationSignal.ts mitarbeiter-app/src/hooks/__tests__/useGamificationSignal.test.ts
git commit -m "feat(mitarbeiter-app): Warn on the gem when a job's deadline nears"
```

---

### Task 5: Live-Aktualisierung über Subscriptions

**Files:**
- Modify: `mitarbeiter-app/src/hooks/useGamificationSignal.ts`
- Modify: `mitarbeiter-app/src/hooks/__tests__/useGamificationSignal.test.ts`

**Interfaces:**
- Consumes: `check()` aus dem Effekt in Task 3
- Produces: unveränderte Signatur. Neu ist, dass ein `create` in `gam_tasks`, `gam_rewards` oder `gam_events` die Prüfung ohne Reload erneut anstößt.

Ohne diese Task erfährt der Header erst beim nächsten Laden von einer neuen Aufgabe. `useAssignments` bringt seine Subscription schon mit, deshalb geht es hier nur um die drei Zähl-Quellen.

Es werden nur `create`-Ereignisse ausgewertet: Eine bestehende Aufgabe zu bearbeiten ändert deren `created` nicht und ist damit kein neues Signal.

- [ ] **Step 1: Failing test ergänzen**

In `mitarbeiter-app/src/hooks/__tests__/useGamificationSignal.test.ts` `mockCounts` um einen Emitter erweitern. Die bestehende Funktion ersetzen durch:

```ts
/** Zaehlt pro Collection, wieviele Treffer die Existenzpruefung melden soll. */
function mockCounts(counts: { tasks?: number; rewards?: number; events?: number }) {
  const update = vi.fn().mockResolvedValue({})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emitters: Record<string, (e: any) => void> = {}
  const zaehler = { ...counts }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(pb.collection as any).mockImplementation((name: string) => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getList: vi.fn().mockImplementation(async (_p: number, _n: number, opts: any) => {
      const konfiguriert =
        name === 'gam_tasks' ? zaehler.tasks ?? 0
        : name === 'gam_rewards' ? zaehler.rewards ?? 0
        : name === 'gam_events' ? zaehler.events ?? 0
        : 0
      const sichtbar = seitWann(opts?.filter ?? '') < new Date(RECORD_CREATED).getTime()
      return { totalItems: sichtbar ? konfiguriert : 0, items: [] }
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscribe: vi.fn().mockImplementation(async (_topic: string, cb: (e: any) => void) => {
      emitters[name] = cb
      return () => {}
    }),
    update,
  }))

  return { update, emitters, zaehler }
}
```

Die bestehenden Tests bleiben unverändert lauffähig — `zaehler` startet mit denselben Werten wie zuvor. Diesen Test anhängen:

```ts
  it('prueft erneut, wenn eine neue Aufgabe eintrifft', async () => {
    const { emitters, zaehler } = mockCounts({})

    const { result } = renderHook(() => useGamificationSignal())

    await waitFor(() => expect(emitters['gam_tasks']).toBeDefined())
    expect(result.current.sparkle).toBe(false)

    zaehler.tasks = 1
    await act(async () => {
      emitters['gam_tasks']({ action: 'create', record: { id: 'task-neu' } })
    })

    await waitFor(() => expect(result.current.sparkle).toBe(true))
  })

  it('ignoriert Aenderungen an bestehenden Datensaetzen', async () => {
    const { emitters, zaehler } = mockCounts({})

    const { result } = renderHook(() => useGamificationSignal())

    await waitFor(() => expect(emitters['gam_tasks']).toBeDefined())

    zaehler.tasks = 1
    await act(async () => {
      emitters['gam_tasks']({ action: 'update', record: { id: 'task-alt' } })
    })

    expect(result.current.sparkle).toBe(false)
  })
```

- [ ] **Step 2: Tests laufen lassen und Fehlschlag bestätigen**

```bash
cd mitarbeiter-app && npx vitest run src/hooks/__tests__/useGamificationSignal.test.ts
```

Erwartet: `prueft erneut, wenn eine neue Aufgabe eintrifft` scheitert, weil `emitters['gam_tasks']` nie gesetzt wird — der Hook abonniert noch nichts.

- [ ] **Step 3: Subscriptions implementieren**

In `mitarbeiter-app/src/hooks/useGamificationSignal.ts` im bestehenden Effekt hinter dem `check()`-Aufruf einfügen:

```ts
    const unsubs: Array<() => void> = []

    const abonniere = async () => {
      for (const name of ['gam_tasks', 'gam_rewards', 'gam_events'] as const) {
        try {
          const unsub = await pb.collection(name).subscribe(
            '*',
            (e) => {
              // Nur neue Datensaetze sind ein Signal: eine bestehende Aufgabe
              // zu bearbeiten aendert ihr `created` nicht.
              if (e.action === 'create') check()
            },
            { requestKey: null },
          )
          if (cancelled) {
            unsub()
            return
          }
          unsubs.push(unsub)
        } catch (err) {
          if (isAbort(err)) return
          // Ohne Subscription bleibt der Stand von `check()` stehen — das ist
          // schlechter als Live, aber besser als ein Fehler in der Kopfleiste.
        }
      }
    }

    abonniere()
```

Und die Aufräumfunktion des Effekts ersetzen durch:

```ts
    return () => {
      cancelled = true
      unsubs.forEach((unsub) => unsub())
    }
```

- [ ] **Step 4: Tests laufen lassen und Erfolg bestätigen**

```bash
cd mitarbeiter-app && npx vitest run src/hooks/__tests__/useGamificationSignal.test.ts
```

Erwartet: PASS, 16 Tests.

- [ ] **Step 5: Commit**

```bash
git add mitarbeiter-app/src/hooks/useGamificationSignal.ts mitarbeiter-app/src/hooks/__tests__/useGamificationSignal.test.ts
git commit -m "feat(mitarbeiter-app): Keep the gem signal live without a reload"
```

---

### Task 6: Header verdrahten

**Files:**
- Modify: `mitarbeiter-app/src/components/Gamification/GamificationHeader.tsx`
- Modify: `mitarbeiter-app/__tests__/gamification/user-integration.test.tsx`

**Interfaces:**
- Consumes: `GemSignal` aus Task 2, `useGamificationSignal` aus den Tasks 3 bis 5
- Produces: nichts — dies ist das letzte Glied

Der Header ist nach dieser Task 30 Zeilen lang und enthält keine Abfragelogik. Er reicht `sparkle` an das Icon durch und ruft `markSeen()`, wenn das Sheet aufgeht.

`markSeen()` wird bewusst beim Öffnen aufgerufen und nicht beim Schließen: Wer das Sheet öffnet, hat die Meldung zur Kenntnis genommen. Beim Schließen zu markieren, würde ein weggewischtes Sheet als ungesehen zählen.

- [ ] **Step 1: Failing tests ergänzen**

In `mitarbeiter-app/__tests__/gamification/user-integration.test.tsx` den Mock-Block ergänzen. Nach dem bestehenden `useActivityFeed`-Mock einfügen:

```tsx
const markSeenSpy = vi.fn().mockResolvedValue(undefined)
let mockSparkle = false
vi.mock('@/hooks/useGamificationSignal', () => ({
  useGamificationSignal: () => ({ sparkle: mockSparkle, markSeen: markSeenSpy }),
}))
```

Im `beforeEach` des äußeren `describe` ergänzen:

```tsx
    mockSparkle = false
    markSeenSpy.mockClear()
```

Den bestehenden `describe('GamificationHeader', …)`-Block um diese Tests erweitern:

```tsx
    it('zeigt den Diamanten grau, solange nichts Neues vorliegt', async () => {
      const { container } = render(<GamificationHeader />)

      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument()
      })
      expect(container.querySelector('.gem-sweep')).not.toBeInTheDocument()
    })

    it('laesst den Diamanten funkeln, wenn es Neues gibt', async () => {
      mockSparkle = true

      const { container } = render(<GamificationHeader />)

      await waitFor(() => {
        expect(container.querySelector('.gem-sweep')).toBeInTheDocument()
      })
    })

    it('markiert als gesehen, sobald das Sheet geoeffnet wird', async () => {
      const { container } = render(<GamificationHeader />)

      const button = container.querySelector('button')
      await waitFor(() => expect(button).toBeInTheDocument())

      fireEvent.click(button!)

      expect(markSeenSpy).toHaveBeenCalledTimes(1)
    })
```

- [ ] **Step 2: Tests laufen lassen und Fehlschlag bestätigen**

```bash
cd mitarbeiter-app && npx vitest run __tests__/gamification/user-integration.test.tsx
```

Erwartet: `laesst den Diamanten funkeln` und `markiert als gesehen` scheitern — der Header rendert noch die lucide-Komponente und ruft `markSeen` nicht.

- [ ] **Step 3: Header umbauen**

`mitarbeiter-app/src/components/Gamification/GamificationHeader.tsx` vollständig ersetzen durch:

```tsx
import { useState } from 'react'
import { useGamificationEnabled } from '@/hooks/useGamificationEnabled'
import { useGamificationSignal } from '@/hooks/useGamificationSignal'
import { Button } from '../ui/button'
import { GamificationSheet } from './GamificationSheet'
import { GemSignal } from './GemSignal'

export function GamificationHeader() {
  const { enabled } = useGamificationEnabled()
  const { sparkle, markSeen } = useGamificationSignal()
  const [open, setOpen] = useState(false)

  if (!enabled) {
    return null
  }

  // Beim Oeffnen markieren, nicht beim Schliessen: Wer nachsieht, hat die
  // Meldung zur Kenntnis genommen.
  const handleOpen = () => {
    setOpen(true)
    markSeen()
  }

  return (
    <>
      <div className="relative">
        <Button variant="ghost" size="icon" onClick={handleOpen} className="relative">
          <GemSignal sparkle={sparkle} />
        </Button>
      </div>
      <GamificationSheet open={open} onOpenChange={setOpen} />
    </>
  )
}
```

- [ ] **Step 4: Gesamte Suite laufen lassen**

```bash
cd mitarbeiter-app && npm run test:run
```

Erwartet: alle Testdateien grün, darunter `user-integration.test.tsx` mit 15 Tests.

- [ ] **Step 5: TypeScript prüfen**

```bash
cd mitarbeiter-app && npx tsc -b
```

Erwartet: keine Ausgabe.

- [ ] **Step 6: Commit**

```bash
git add mitarbeiter-app/src/components/Gamification/GamificationHeader.tsx mitarbeiter-app/__tests__/gamification/user-integration.test.tsx
git commit -m "feat(mitarbeiter-app): Wire the signalling gem into the header"
```

---

### Task 7: Im Browser verifizieren und aufräumen

**Files:**
- Delete: `mitarbeiter-app/public/diamant-prototyp.html`

**Interfaces:**
- Consumes: das fertige Feature aus den Tasks 1 bis 6
- Produces: nichts

Tests beweisen die Logik, nicht die Erscheinung. Der Glanzstrich lebt in CSS, das jsdom nicht auswertet — er muss einmal im Browser gesehen werden.

- [ ] **Step 1: Dev-Server starten und einloggen**

Chef-App und Mitarbeiter-App laufen über denselben Origin. `http://localhost:5173/ma/` aufrufen — **nicht** `5174` direkt, sonst greift das SSO nicht, weil `localStorage` an den Port gebunden ist.

- [ ] **Step 2: Ruhezustand prüfen**

Als Mitarbeiter mit leerem Posteingang anmelden, das Gamification-Sheet einmal öffnen und schließen. Der Diamant muss danach grau sein (`#6B7280`) und stillstehen — optisch nicht von der Glocke daneben zu unterscheiden.

- [ ] **Step 3: Signal auslösen**

In der Chef-App unter `/admin/gamification/tasks` eine neue Aufgabe anlegen. Ohne Reload muss der Diamant in der Mitarbeiter-App binnen weniger Sekunden auf Indigo wechseln und der Lichtpunkt die Kontur entlanglaufen.

- [ ] **Step 4: Verstummen prüfen**

Das Sheet in der Mitarbeiter-App öffnen. Der Diamant wird grau. In den PocketBase-Logs darf dabei kein 404 auf `users` erscheinen — ein 404 statt 403 wäre das bekannte Zeichen für eine fehlgeschlagene Rule-Prüfung, wie sie in der CLAUDE.md für die `gam_*`-Collections beschrieben ist.

- [ ] **Step 5: Merker in der Datenbank prüfen**

```bash
sqlite3 pb_data/data.db "SELECT id, gam_seen_at FROM users WHERE gam_seen_at != '';"
```

Erwartet: eine Zeile mit dem eben angemeldeten Nutzer und einem Zeitstempel von gerade.

- [ ] **Step 6: Bewegungsreduktion prüfen**

In den Systemeinstellungen „Bewegung reduzieren" aktivieren (macOS: Systemeinstellungen → Bedienungshilfen → Anzeige) und die Seite neu laden. Der Diamant muss indigo bleiben und stillstehen — kein eingefrorener Lichtpunkt auf der Kante.

- [ ] **Step 7: Prototyp löschen**

```bash
rm mitarbeiter-app/public/diamant-prototyp.html
```

- [ ] **Step 8: Commit**

```bash
git add -A mitarbeiter-app/public
git commit -m "chore(mitarbeiter-app): Remove the gem prototype page"
```

---

## Offene Punkte nach Abschluss

Diese Dinge gehören **nicht** in diesen Plan, sind aber beim Umsetzen sichtbar geworden und verdienen eine eigene Runde:

- **Der Punktestand ist nirgends mehr sichtbar.** Er verschwand mit dem Badge. Der Shop zeigt nur „X Punkte mehr nötig". Wenn der Stand sichtbar bleiben soll, gehört er ins Sheet.
- **TODO 5 der CLAUDE.md bleibt offen.** `useGamificationSignal` folgt dem richtigen `isAbort`-Muster, aber `useGamificationEnabled`, `useAssignments`, `useActivityFeed` und `useUserPoints` tun das weiterhin nicht.
- **`users.updateRule` erlaubt Selbst-Updates auf allen Feldern.** Ein Mitarbeiter kann damit auch sein eigenes `points`-Feld schreiben. Das ist Bestand und wird von diesem Plan weder verursacht noch verschlimmert, aber es ist eine echte Lücke.
