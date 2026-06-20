// mitarbeiter-app/src/components/MonatsstundenGauge.tsx
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface Props {
  actualMins: number
  targetMins: number
  month: Date
}

function formatHM(mins: number) {
  const h = Math.floor(Math.abs(mins) / 60)
  const m = Math.abs(mins) % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

const R_MINI = 32
const HALF_CIRC = Math.PI * R_MINI

export default function MonatsstundenGauge({ actualMins, targetMins, month }: Props) {
  const pct = targetMins > 0 ? Math.min(actualMins / targetMins, 1) : 0
  const dashOffset = (1 - pct) * HALF_CIRC
  const monthLabel = format(month, 'MMMM yyyy', { locale: de })

  return (
    <div className="rounded-xl bg-white border border-[#E5E7EB] shadow-sm p-3">
      <div className="flex items-center gap-3">
        {/* Mini-Ring SVG */}
        <svg width={64} height={36} viewBox="0 0 88 52" style={{ overflow: 'visible', flexShrink: 0 }}>
          <defs>
            <linearGradient id="gaugeGradStunden" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
          <path
            d={`M ${44 - R_MINI} 44 A ${R_MINI} ${R_MINI} 0 0 1 ${44 + R_MINI} 44`}
            fill="none" stroke="#E5E7EB" strokeWidth="8" strokeLinecap="round"
          />
          <path
            d={`M ${44 - R_MINI} 44 A ${R_MINI} ${R_MINI} 0 0 1 ${44 + R_MINI} 44`}
            fill="none" stroke="url(#gaugeGradStunden)" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={HALF_CIRC} strokeDashoffset={dashOffset}
          />
        </svg>

        {/* Numbers + Month label */}
        <div>
          <div className="text-base font-bold text-[#111827] tabular-nums leading-tight">
            {formatHM(actualMins)}
          </div>
          <div className="text-xs text-[#6B7280] leading-tight">
            von {formatHM(targetMins)} h
          </div>
          <div className="text-xs text-[#9CA3AF] capitalize leading-tight mt-0.5">
            {monthLabel}
          </div>
        </div>
      </div>
    </div>
  )
}
