import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { BerichtRow } from '@/lib/exportUtils'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  rows: BerichtRow[]
  year: number
  monthlyData: Record<string, number[]> // empName → 12 Δ-Werte Jan–Dez
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtH(h: number) {
  if (Math.abs(h) < 0.05) return '0 h'
  const sign = h < 0 ? '-' : ''
  const abs = Math.abs(h)
  const hrs = Math.floor(abs)
  const mins = Math.round((abs - hrs) * 60)
  return `${sign}${hrs}${mins > 0 ? `:${String(mins).padStart(2, '0')}` : ''} h`
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values.map(Math.abs), 1)
  const BAR_W = 5
  const GAP = 1
  const H = 24
  const totalW = values.length * (BAR_W + GAP) - GAP

  return (
    <svg width={totalW} height={H} className="inline-block align-middle">
      {values.map((v, i) => {
        const barH = Math.max((Math.abs(v) / max) * (H - 4), 2)
        const y = v >= 0 ? H - barH : H / 2
        return (
          <rect
            key={i}
            x={i * (BAR_W + GAP)}
            y={y}
            width={BAR_W}
            height={v >= 0 ? barH : barH / 2}
            fill={v >= 0.05 ? '#6EE7B7' : v <= -0.05 ? '#FCA5A5' : '#E5E7EB'}
            rx={1}
          />
        )
      })}
    </svg>
  )
}

// ─── DetailPanel ──────────────────────────────────────────────────────────────

function DetailPanel({
  row,
  monthlyData,
  year,
}: {
  row: BerichtRow
  monthlyData: number[]
  year: number
}) {
  const delta = row.ueberst_kumuliert
  const max = Math.max(...monthlyData.map(Math.abs), 1)

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
          {row.name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 text-sm truncate">{row.name}</p>
          <p className="text-[11px] text-indigo-600">{row.abteilung}</p>
        </div>
      </div>

      {/* Jahressaldo */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Jahressaldo {year}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded p-2">
            <p className="text-[10px] text-gray-500">Soll YTD</p>
            <p className="text-sm font-bold text-gray-800">{fmtH(row.soll)}</p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <p className="text-[10px] text-gray-500">Ist YTD</p>
            <p className="text-sm font-bold text-gray-800">{fmtH(row.ist)}</p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <p className="text-[10px] text-gray-500">Überstd. kum.</p>
            <p
              className={cn(
                'text-sm font-bold',
                delta > 0.05
                  ? 'text-emerald-600'
                  : delta < -0.05
                    ? 'text-red-600'
                    : 'text-gray-400',
              )}
            >
              {Math.abs(delta) < 0.05 ? '–' : (delta > 0 ? '+' : '') + fmtH(delta)}
            </p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <p className="text-[10px] text-gray-500">Resturlaub</p>
            <p className="text-sm font-bold text-gray-800">
              {row.urlaub_gesamt > 0 ? `${row.urlaub_gesamt - row.urlaub_genommen} d` : '–'}
            </p>
          </div>
        </div>
      </div>

      {/* Monatsverlauf-Balkendiagramm */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Monatsverlauf (Δ)
        </p>
        <div className="flex items-end gap-1 h-16">
          {monthlyData.map((v, i) => {
            const barH = Math.max((Math.abs(v) / max) * 52, 2)
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-0.5"
                title={`${MONTH_LABELS[i]}: ${fmtH(v)}`}
              >
                <div
                  className={cn(
                    'w-full rounded-sm',
                    v > 0.05 ? 'bg-emerald-400' : v < -0.05 ? 'bg-red-400' : 'bg-gray-200',
                  )}
                  style={{ height: `${barH}px` }}
                />
                <span className="text-[8px] text-gray-400">{MONTH_LABELS[i][0]}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Urlaub + Krank */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-amber-50 rounded p-2">
          <p className="text-[10px] text-amber-600">Urlaub gen.</p>
          <p className="text-sm font-bold text-amber-700">{row.urlaub_genommen} d</p>
        </div>
        <div className="bg-rose-50 rounded p-2">
          <p className="text-[10px] text-rose-600">Krank</p>
          <p className="text-sm font-bold text-rose-700">{row.krank} d</p>
        </div>
      </div>
    </div>
  )
}

// ─── BerichteJahr (default export) ───────────────────────────────────────────

export default function BerichteJahr({ rows, year, monthlyData }: Props) {
  const [selected, setSelected] = useState<BerichtRow | null>(null)

  // Abteilungen gruppieren
  const depts = useMemo(() => {
    const map = new Map<string, BerichtRow[]>()
    rows.forEach((r) => {
      if (!map.has(r.abteilung)) map.set(r.abteilung, [])
      map.get(r.abteilung)!.push(r)
    })
    return Array.from(map.entries()) // [deptName, rows[]]
  }, [rows])

  return (
    <div className="flex gap-4 items-start">
      {/* Linke Tabellen */}
      <div className="flex-1 min-w-0 space-y-4">
        {depts.map(([deptName, deptRows]) => {
          const deptSoll = deptRows.reduce((s, r) => s + r.soll, 0)
          const deptIst = deptRows.reduce((s, r) => s + r.ist, 0)
          const deptDelta = deptIst - deptSoll

          return (
            <div
              key={deptName}
              className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden"
            >
              {/* Abteilungs-Header */}
              <div className="bg-indigo-50 px-4 py-2.5 flex items-center gap-3">
                <span className="text-sm font-bold text-indigo-700 uppercase tracking-wide">
                  {deptName}
                </span>
                <span className="ml-auto text-xs text-gray-500">
                  Soll: {fmtH(deptSoll)} · Ist: {fmtH(deptIst)} · Δ:
                  <span
                    className={cn(
                      'ml-1 font-semibold',
                      deptDelta > 0.05
                        ? 'text-emerald-600'
                        : deptDelta < -0.05
                          ? 'text-red-600'
                          : 'text-gray-400',
                    )}
                  >
                    {Math.abs(deptDelta) < 0.05
                      ? '–'
                      : (deptDelta > 0 ? '+' : '') + fmtH(deptDelta)}
                  </span>
                </span>
              </div>

              {/* Mitarbeiter-Tabelle */}
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                      Mitarbeiter
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">
                      Soll YTD
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">
                      Ist YTD
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">
                      Δ gesamt
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">
                      Urlaub
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">
                      Krank
                    </th>
                    <th className="px-3 py-2 text-xs font-medium text-gray-500">Verlauf</th>
                  </tr>
                </thead>
                <tbody>
                  {deptRows.map((row, i) => {
                    const spark = monthlyData[row.name] ?? Array(12).fill(0)
                    const delta = row.ueberst_kumuliert // Jahressaldo
                    return (
                      <tr
                        key={i}
                        className={cn(
                          'border-b border-[#E5E7EB] last:border-0 cursor-pointer transition-colors',
                          selected?.name === row.name ? 'bg-indigo-50' : 'hover:bg-gray-50/70',
                        )}
                        onClick={() => setSelected(row)}
                      >
                        <td className="px-4 py-2.5 font-medium text-gray-800">{row.name}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums">
                          {fmtH(row.soll)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-800 font-medium tabular-nums">
                          {fmtH(row.ist)}
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2.5 text-right font-medium tabular-nums',
                            delta > 0.05
                              ? 'text-emerald-600'
                              : delta < -0.05
                                ? 'text-red-600'
                                : 'text-gray-400',
                          )}
                        >
                          {Math.abs(delta) < 0.05
                            ? '–'
                            : (delta > 0 ? '+' : '') + fmtH(delta)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums">
                          {row.urlaub_genommen}
                          {row.urlaub_gesamt > 0 ? `/${row.urlaub_gesamt}` : ''} d
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums">
                          {row.krank > 0 ? `${row.krank} d` : '–'}
                        </td>
                        <td className="px-3 py-2.5">
                          <Sparkline values={spark} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })}
        {rows.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-12">Keine Daten für {year}.</p>
        )}
      </div>

      {/* Rechtes Detail-Panel */}
      <div className="w-72 flex-shrink-0 sticky top-4">
        {selected ? (
          <DetailPanel
            row={selected}
            monthlyData={monthlyData[selected.name] ?? Array(12).fill(0)}
            year={year}
          />
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 text-center text-gray-400 text-sm">
            Mitarbeiter anklicken für Details
          </div>
        )}
      </div>
    </div>
  )
}
