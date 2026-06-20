// mitarbeiter-app/src/components/UrlaubsCard.tsx

interface Props {
  taken: number       // genehmigte Urlaubstage
  planned: number     // ausstehende (pending) Urlaubstage
  entitlement: number // Gesamtanspruch
}

export default function UrlaubsCard({ taken, planned, entitlement }: Props) {
  const R_MINI = 32
  const HALF_CIRC = Math.PI * R_MINI
  const open = Math.max(0, entitlement - taken - planned)
  const takenPct = entitlement > 0 ? (taken / entitlement) * 100 : 0
  const plannedPct = entitlement > 0 ? (planned / entitlement) * 100 : 0
  const takenDash = (takenPct / 100) * HALF_CIRC
  const plannedDash = (plannedPct / 100) * HALF_CIRC
  const takenOffset = 0
  const plannedOffset = -takenDash

  return (
    <div className="rounded-xl bg-white border border-[#E5E7EB] shadow-sm p-3 flex items-center gap-3">
      {/* Mini-ring SVG gauge */}
      <svg width={64} height={36} viewBox="0 0 88 52" style={{ overflow: 'visible', flexShrink: 0 }}>
        <defs>
          <linearGradient id="gaugeGradUrlaub" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        {/* Background */}
        <path
          d={`M ${44 - R_MINI} 44 A ${R_MINI} ${R_MINI} 0 0 1 ${44 + R_MINI} 44`}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Approved (Indigo gradient) */}
        {takenDash > 0 && (
          <path
            d={`M ${44 - R_MINI} 44 A ${R_MINI} ${R_MINI} 0 0 1 ${44 + R_MINI} 44`}
            fill="none"
            stroke="url(#gaugeGradUrlaub)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={takenDash}
            strokeDashoffset={takenOffset}
          />
        )}
        {/* Planned (Amber) */}
        {plannedDash > 0 && (
          <path
            d={`M ${44 - R_MINI} 44 A ${R_MINI} ${R_MINI} 0 0 1 ${44 + R_MINI} 44`}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={plannedDash}
            strokeDashoffset={plannedOffset}
          />
        )}
      </svg>

      {/* Offen count + label */}
      <div className="text-right">
        <div className="text-2xl font-bold text-[#111827]">{open}</div>
        <div className="text-xs text-[#6B7280]">Offen</div>
      </div>
    </div>
  )
}
