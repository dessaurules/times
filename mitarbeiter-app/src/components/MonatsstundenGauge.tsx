// mitarbeiter-app/src/components/MonatsstundenGauge.tsx
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  actualMins: number
  targetMins: number
  month: Date
  onPrev: () => void
  onNext: () => void
}

function formatHM(mins: number) {
  const h = Math.floor(Math.abs(mins) / 60)
  const m = Math.abs(mins) % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

const R = 84
const HALF_CIRC = Math.PI * R // ≈ 263.9

export default function MonatsstundenGauge({ actualMins, targetMins, month, onPrev, onNext }: Props) {
  const pct = targetMins > 0 ? Math.min(actualMins / targetMins, 1) : 0
  const dashOffset = (1 - pct) * HALF_CIRC
  const monthLabel = format(month, 'MMMM yyyy', { locale: de })

  return (
    <div className="rounded-2xl bg-white border border-[#E5E7EB] shadow-sm p-5">
      {/* Monatsnavigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onPrev}
          className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280] transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-[#374151] capitalize">{monthLabel}</span>
        <button
          onClick={onNext}
          className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280] transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Halbkreis */}
      <div className="flex flex-col items-center">
        <svg width="200" height="110" viewBox="0 0 200 110" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
          {/* Hintergrund-Bogen */}
          <path
            d={`M ${100 - R} 100 A ${R} ${R} 0 0 1 ${100 + R} 100`}
            fill="none" stroke="#E5E7EB" strokeWidth="16" strokeLinecap="round"
          />
          {/* Fortschritts-Bogen */}
          <path
            d={`M ${100 - R} 100 A ${R} ${R} 0 0 1 ${100 + R} 100`}
            fill="none" stroke="url(#gaugeGrad)" strokeWidth="16" strokeLinecap="round"
            strokeDasharray={HALF_CIRC}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="text-center -mt-3">
          <div className="text-3xl font-bold text-[#111827] tabular-nums">{formatHM(actualMins)}</div>
          <div className="text-sm text-[#6B7280] mt-0.5">
            von {formatHM(targetMins)} Stunden
          </div>
        </div>
      </div>
    </div>
  )
}
