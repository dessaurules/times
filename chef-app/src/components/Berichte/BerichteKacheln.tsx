import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { BerichtRow } from '@/lib/exportUtils'

interface Props {
  rows: BerichtRow[]
}

function fmtH(h: number) {
  if (Math.abs(h) < 0.05) return '0 h'
  const sign = h < 0 ? '-' : ''
  const abs = Math.abs(h)
  const hrs = Math.floor(abs)
  const mins = Math.round((abs - hrs) * 60)
  return `${sign}${hrs}${mins > 0 ? `:${String(mins).padStart(2, '0')}` : ''} h`
}

export default function BerichteKacheln({ rows }: Props) {
  const [deptFilter, setDeptFilter] = useState('all')

  const totalIst = useMemo(() => rows.reduce((s, r) => s + r.ist, 0), [rows])
  const totalUeberst = useMemo(() => rows.reduce((s, r) => s + r.differenz, 0), [rows])
  const totalKrank = useMemo(() => rows.reduce((s, r) => s + r.krank, 0), [rows])
  const totalUrlaub = useMemo(() => rows.reduce((s, r) => s + r.urlaub_genommen, 0), [rows])

  const depts = useMemo(
    () => ['all', ...Array.from(new Set(rows.map(r => r.abteilung)))],
    [rows],
  )

  const filtered = useMemo(
    () => (deptFilter === 'all' ? rows : rows.filter(r => r.abteilung === deptFilter)),
    [rows, deptFilter],
  )

  return (
    <div>
      {/* 4 KPI-Karten */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {/* Ist-Stunden gesamt */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg flex overflow-hidden">
          <div className="w-1 bg-indigo-500 flex-shrink-0" />
          <div className="p-3 flex-1">
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Ist gesamt</p>
            <p className="text-xl font-bold text-gray-800 mt-0.5">{fmtH(totalIst)}</p>
          </div>
        </div>

        {/* Überstunden */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg flex overflow-hidden">
          <div className={cn('w-1 flex-shrink-0', totalUeberst >= 0 ? 'bg-emerald-500' : 'bg-red-500')} />
          <div className="p-3 flex-1">
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Überstunden</p>
            <p className={cn('text-xl font-bold mt-0.5', totalUeberst >= 0 ? 'text-emerald-600' : 'text-red-600')}>
              {totalUeberst > 0.05 ? '+' : ''}{fmtH(totalUeberst)}
            </p>
          </div>
        </div>

        {/* Kranktage */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg flex overflow-hidden">
          <div className="w-1 bg-rose-500 flex-shrink-0" />
          <div className="p-3 flex-1">
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Kranktage</p>
            <p className="text-xl font-bold text-gray-800 mt-0.5">{totalKrank}</p>
          </div>
        </div>

        {/* Urlaubstage */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg flex overflow-hidden">
          <div className="w-1 bg-amber-500 flex-shrink-0" />
          <div className="p-3 flex-1">
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Urlaubstage</p>
            <p className="text-xl font-bold text-gray-800 mt-0.5">{totalUrlaub}</p>
          </div>
        </div>
      </div>

      {/* Abteilungs-Filter-Tabs */}
      <div className="flex gap-1 flex-wrap mb-4">
        {depts.map(d => (
          <button
            key={d}
            onClick={() => setDeptFilter(d)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border transition-colors',
              deptFilter === d
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-[#E5E7EB] hover:border-indigo-400 hover:text-indigo-600',
            )}
          >
            {d === 'all' ? 'Alle' : d}
          </button>
        ))}
      </div>

      {/* Mitarbeiter-Kacheln */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((row, i) => {
          const stundPct = row.soll > 0 ? Math.min(100, Math.round((row.ist / row.soll) * 100)) : 0
          const urlaubPct =
            row.urlaub_gesamt > 0
              ? Math.min(100, Math.round((row.urlaub_genommen / row.urlaub_gesamt) * 100))
              : 0
          const deltaPos = row.differenz > 0.05
          const deltaNeg = row.differenz < -0.05

          return (
            <div
              key={i}
              className="bg-white border border-[#E5E7EB] rounded-xl p-4 hover:shadow-sm transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {row.name
                    .split(' ')
                    .map(n => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium ml-2 flex-1 text-right truncate">
                  {row.abteilung}
                </span>
              </div>
              <p className="font-semibold text-gray-800 text-sm mb-3 leading-tight">{row.name}</p>

              {/* Metriken */}
              <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                <div>
                  <p className="text-xs text-gray-500">Ist</p>
                  <p className="text-sm font-bold text-gray-800">{fmtH(row.ist)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Δ</p>
                  <p
                    className={cn(
                      'text-sm font-bold',
                      deltaPos ? 'text-emerald-600' : deltaNeg ? 'text-red-600' : 'text-gray-400',
                    )}
                  >
                    {!deltaPos && !deltaNeg ? '–' : (deltaPos ? '+' : '') + fmtH(row.differenz)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Urlaub</p>
                  <p className="text-sm font-bold text-gray-800">{row.urlaub_genommen}d</p>
                </div>
              </div>

              {/* Fortschrittsbalken Stunden */}
              <div className="mb-2">
                <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                  <span>Stunden</span>
                  <span>{stundPct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      stundPct > 100 ? 'bg-amber-500' : 'bg-indigo-500',
                    )}
                    style={{ width: `${Math.min(stundPct, 100)}%` }}
                  />
                </div>
              </div>

              {/* Fortschrittsbalken Urlaub */}
              {row.urlaub_gesamt > 0 && (
                <div>
                  <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                    <span>Urlaub</span>
                    <span>
                      {row.urlaub_genommen}/{row.urlaub_gesamt} Tage
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${urlaubPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-gray-400 text-sm py-8">
            Keine Daten für diesen Filter.
          </p>
        )}
      </div>
    </div>
  )
}
