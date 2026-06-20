// mitarbeiter-app/src/components/UrlaubsCard.tsx

interface Props {
  taken: number       // genehmigte Urlaubstage
  planned: number     // ausstehende (pending) Urlaubstage
  entitlement: number // Gesamtanspruch
}

const R_MINI = 32
const HALF_CIRC = Math.PI * R_MINI

export default function UrlaubsCard({ taken, planned, entitlement }: Props) {
  const open = Math.max(0, entitlement - taken - planned)
  const year = new Date().getFullYear()

  const redDash = entitlement > 0 ? (taken / entitlement) * HALF_CIRC : 0
  const greenDash = entitlement > 0 ? ((open + planned) / entitlement) * HALF_CIRC : 0
  const greenOffset = -redDash

  return (
    <div className="rounded-xl bg-white border border-[#E5E7EB] shadow-sm p-3 flex items-start gap-3">
      {/* Mini-ring SVG gauge */}
      <svg width={64} height={36} viewBox="0 0 88 52" style={{ overflow: 'visible', flexShrink: 0 }}>
        <defs>
          <linearGradient id="gRed" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#DC2626" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>
        {/* Hintergrund */}
        <path
          d={`M ${44 - R_MINI} 44 A ${R_MINI} ${R_MINI} 0 0 1 ${44 + R_MINI} 44`}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Rot: genehmigt (taken) */}
        {redDash > 0 && (
          <path
            d={`M ${44 - R_MINI} 44 A ${R_MINI} ${R_MINI} 0 0 1 ${44 + R_MINI} 44`}
            fill="none"
            stroke="url(#gRed)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={redDash}
            strokeDashoffset={0}
          />
        )}
        {/* Grün: frei (open + planned) */}
        {greenDash > 0 && (
          <path
            d={`M ${44 - R_MINI} 44 A ${R_MINI} ${R_MINI} 0 0 1 ${44 + R_MINI} 44`}
            fill="none"
            stroke="#10B981"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={greenDash}
            strokeDashoffset={greenOffset}
          />
        )}
      </svg>

      {/* Header + Zahl rechts */}
      <div className="flex-1">
        {/* Header oben */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-[#374151]">Urlaub {year}</span>
          <span className="text-xs">🌴</span>
        </div>
        {/* Zahl unten */}
        <div className="text-2xl font-bold text-[#111827]">{open}</div>
        <div className="text-xs text-[#6B7280]">Tage offen</div>
      </div>
    </div>
  )
}
