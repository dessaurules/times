import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BerichtRow } from '@/lib/exportUtils'

interface Props {
  rows: BerichtRow[]
  onExportPdf?: (empName?: string) => void
}

function fmtH(h: number) {
  if (Math.abs(h) < 0.05) return '0 h'
  const sign = h < 0 ? '-' : ''
  const abs = Math.abs(h)
  const hrs = Math.floor(abs)
  const mins = Math.round((abs - hrs) * 60)
  return `${sign}${hrs}${mins > 0 ? `:${String(mins).padStart(2, '0')}` : ''} h`
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    indigo:  'border-l-indigo-500 bg-indigo-50',
    blue:    'border-l-blue-500 bg-blue-50',
    emerald: 'border-l-emerald-500 bg-emerald-50',
    red:     'border-l-red-500 bg-red-50',
    rose:    'border-l-rose-500 bg-rose-50',
    amber:   'border-l-amber-500 bg-amber-50',
  }
  return (
    <div className={cn('border-l-4 rounded-r-lg p-3', colors[color] ?? colors.indigo)}>
      <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}

export default function BerichteTabelle({ rows, onExportPdf }: Props) {
  const totalSoll    = rows.reduce((s, r) => s + r.soll, 0)
  const totalIst     = rows.reduce((s, r) => s + r.ist, 0)
  const totalUeberst = rows.reduce((s, r) => s + r.ueberst_kumuliert, 0)
  const totalKrank   = rows.reduce((s, r) => s + r.krank, 0)
  const totalUrlaub  = rows.reduce((s, r) => s + r.urlaub_genommen, 0)

  return (
    <div>
      {/* KPI-Kacheln */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <KpiCard label="Soll gesamt"  value={fmtH(totalSoll)}    color="indigo" />
        <KpiCard label="Ist gesamt"   value={fmtH(totalIst)}     color="blue" />
        <KpiCard label="Überstunden"  value={fmtH(totalUeberst)} color={totalUeberst >= 0 ? 'emerald' : 'red'} />
        <KpiCard label="Kranktage"    value={String(totalKrank)}  color="rose" />
        <KpiCard label="Urlaubstage"  value={String(totalUrlaub)} color="amber" />
      </div>

      {/* Tabelle */}
      <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-gray-50">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Mitarbeiter
              </th>
              <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Soll
              </th>
              <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Ist
              </th>
              <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Δ
              </th>
              <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                Überstd. kum.
              </th>
              <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Urlaub
              </th>
              <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Krank
              </th>
              {onExportPdf && <th className="px-3 py-2.5 w-16" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-[#E5E7EB] last:border-0 hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{row.name}</div>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium">
                    {row.abteilung}
                  </span>
                </td>
                <td className="px-3 py-3 text-right text-gray-600 tabular-nums">{fmtH(row.soll)}</td>
                <td className="px-3 py-3 text-right font-medium text-gray-800 tabular-nums">{fmtH(row.ist)}</td>
                <td
                  className={cn(
                    'px-3 py-3 text-right font-medium tabular-nums',
                    row.differenz > 0.05
                      ? 'text-emerald-600'
                      : row.differenz < -0.05
                        ? 'text-red-600'
                        : 'text-gray-400',
                  )}
                >
                  {Math.abs(row.differenz) < 0.05
                    ? '–'
                    : (row.differenz > 0 ? '+' : '') + fmtH(row.differenz)}
                </td>
                <td
                  className={cn(
                    'px-3 py-3 text-right tabular-nums',
                    row.ueberst_kumuliert > 0.05
                      ? 'text-emerald-600'
                      : row.ueberst_kumuliert < -0.05
                        ? 'text-red-600'
                        : 'text-gray-400',
                  )}
                >
                  {Math.abs(row.ueberst_kumuliert) < 0.05
                    ? '–'
                    : (row.ueberst_kumuliert > 0 ? '+' : '') + fmtH(row.ueberst_kumuliert)}
                </td>
                <td className="px-3 py-3 text-right text-gray-600 tabular-nums">
                  {row.urlaub_genommen}
                  {row.urlaub_gesamt > 0 ? `/${row.urlaub_gesamt}` : ''} Tage
                </td>
                <td className="px-3 py-3 text-right text-gray-600 tabular-nums">
                  {row.krank > 0 ? `${row.krank} Tage` : '–'}
                </td>
                {onExportPdf && (
                  <td className="px-3 py-3">
                    <button
                      onClick={() => onExportPdf(row.name)}
                      className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                      title="PDF drucken"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {rows.length > 1 && (
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-[#E5E7EB]">
                <td className="px-4 py-2.5 text-xs font-semibold text-gray-600">
                  Gesamt ({rows.length} MA)
                </td>
                <td className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 tabular-nums">
                  {fmtH(totalSoll)}
                </td>
                <td className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 tabular-nums">
                  {fmtH(totalIst)}
                </td>
                <td
                  className={cn(
                    'px-3 py-2.5 text-right text-xs font-semibold tabular-nums',
                    totalIst - totalSoll > 0.05
                      ? 'text-emerald-600'
                      : totalIst - totalSoll < -0.05
                        ? 'text-red-600'
                        : 'text-gray-400',
                  )}
                >
                  {Math.abs(totalIst - totalSoll) < 0.05
                    ? '–'
                    : (totalIst - totalSoll > 0 ? '+' : '') + fmtH(totalIst - totalSoll)}
                </td>
                <td className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 tabular-nums">
                  {fmtH(totalUeberst)}
                </td>
                <td className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 tabular-nums">
                  {totalUrlaub} Tage
                </td>
                <td className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 tabular-nums">
                  {totalKrank} Tage
                </td>
                {onExportPdf && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
