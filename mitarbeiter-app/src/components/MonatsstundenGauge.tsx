// mitarbeiter-app/src/components/MonatsstundenGauge.tsx
import { useState } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ArrowLeftRight } from 'lucide-react'

interface Props {
  actualMins: number
  targetMins: number
  month: Date
  actualWeekMins: number
  targetWeekMins: number
  calendarWeek: number
}

function formatHM(mins: number) {
  const h = Math.floor(Math.abs(mins) / 60)
  const m = Math.abs(mins) % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

const R_MINI = 32
const HALF_CIRC = Math.PI * R_MINI

export default function MonatsstundenGauge({
  actualMins, targetMins, month,
  actualWeekMins, targetWeekMins, calendarWeek
}: Props) {
  const [mode, setMode] = useState<'month' | 'week'>('month')

  const isWeek = mode === 'week'
  const displayActual = isWeek ? actualWeekMins : actualMins
  const displayTarget = isWeek ? targetWeekMins : targetMins
  const headerLabel = isWeek
    ? `KW ${calendarWeek}`
    : format(month, 'MMMM yyyy', { locale: de })
  const pct = displayTarget > 0 ? Math.min(displayActual / displayTarget, 1) : 0
  const dashOffset = (1 - pct) * HALF_CIRC

  return (
    <div
      className="rounded-xl bg-white border border-[#E5E7EB] shadow-sm p-3 cursor-pointer select-none active:border-indigo-300"
      onClick={() => setMode(m => m === 'month' ? 'week' : 'month')}
    >
      {/* Header */}
      <div className="flex items-center justify-center mb-3 relative">
        <span className="text-xs font-semibold text-[#374151] capitalize">
          {headerLabel}
        </span>
        <ArrowLeftRight size={11} className="text-[#9CA3AF] absolute right-0" />
      </div>

      {/* Body: Gauge links, Zahlen rechts */}
      <div className="flex items-center gap-3">
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
            strokeDasharray={HALF_CIRC}
            strokeDashoffset={dashOffset}
          />
        </svg>

        <div>
          <div className="flex items-center gap-1">
            <div className="text-sm font-bold text-[#111827] tabular-nums">{formatHM(displayActual)}</div>
            <span className="text-sm font-bold text-[#111827]">/</span>
            <div className="text-sm font-bold text-[#111827] tabular-nums">{formatHM(displayTarget)} h</div>
          </div>
        </div>
      </div>
    </div>
  )
}
