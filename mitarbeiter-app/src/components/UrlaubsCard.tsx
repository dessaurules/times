// mitarbeiter-app/src/components/UrlaubsCard.tsx
import { cn } from '@/lib/utils'

interface Props {
  taken: number       // genehmigte Urlaubstage
  planned: number     // ausstehende (pending) Urlaubstage
  entitlement: number // Gesamtanspruch
  monthDeltaMins: number // Ist - Soll des ausgewählten Monats (für Überstunden-Badge)
}

function formatHM(mins: number) {
  const h = Math.floor(Math.abs(mins) / 60)
  const m = Math.abs(mins) % 60
  return `${mins >= 0 ? '+' : '-'}${h}:${String(m).padStart(2, '0')}`
}

export default function UrlaubsCard({ taken, planned, entitlement, monthDeltaMins }: Props) {
  const used    = taken + planned
  const open    = Math.max(0, entitlement - used)
  const takenPct   = entitlement > 0 ? (taken   / entitlement) * 100 : 0
  const plannedPct = entitlement > 0 ? (planned / entitlement) * 100 : 0

  return (
    <div className="rounded-2xl bg-white border border-[#E5E7EB] shadow-sm p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🌴</span>
          <span className="text-sm font-semibold text-[#111827]">Urlaubstage</span>
        </div>
        <span className="text-xs text-[#6B7280]">{used} von {entitlement} benutzt</span>
      </div>

      {/* Fortschrittsbalken */}
      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-[#E5E7EB]">
        {takenPct > 0 && (
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-l-full"
            style={{ width: `${takenPct}%` }}
          />
        )}
        {plannedPct > 0 && (
          <div
            className="h-full bg-amber-400"
            style={{ width: `${plannedPct}%` }}
          />
        )}
      </div>

      {/* Legende + Offen-Zahl */}
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-[#374151]">
            <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
            {taken} Verbraucht
          </div>
          {planned > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-[#374151]">
              <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              {planned} Verplant
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[#111827]">{open}</div>
          <div className="text-xs text-[#6B7280]">Offen</div>
        </div>
      </div>

      {/* Überstunden-Badge */}
      {monthDeltaMins !== 0 && (
        <div className={cn(
          'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full',
          monthDeltaMins > 0
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            : 'bg-red-50 text-red-700 border border-red-100'
        )}>
          {formatHM(monthDeltaMins)} Std. im Monat
        </div>
      )}
    </div>
  )
}
