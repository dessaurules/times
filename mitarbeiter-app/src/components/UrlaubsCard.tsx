// mitarbeiter-app/src/components/UrlaubsCard.tsx

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  taken: number       // genehmigte Urlaubstage
  planned: number     // ausstehende (pending) Urlaubstage
  entitlement: number // Gesamtanspruch
}

const R_MINI = 32
const THREE_QUARTER_CIRC = Math.PI * 1.5 * R_MINI

export default function UrlaubsCard({ taken, planned, entitlement }: Props) {
  const [mode, setMode] = useState<'available' | 'taken'>('available')

  const open = Math.max(0, entitlement - taken - planned)
  const year = new Date().getFullYear()

  const redDash = entitlement > 0 ? (taken / entitlement) * THREE_QUARTER_CIRC : 0
  const greenDash = entitlement > 0 ? ((open + planned) / entitlement) * THREE_QUARTER_CIRC : 0
  const greenOffset = -redDash

  const displayNum = mode === 'taken' ? taken : open
  const displayLabel = mode === 'taken' ? 'genommen' : 'verfügbar'

  return (
    <div
      className="rounded-xl bg-white border border-[#E5E7EB] shadow-sm p-3 flex items-start gap-3 cursor-pointer select-none active:border-indigo-300"
      onClick={() => setMode(m => m === 'available' ? 'taken' : 'available')}
    >
      {/* Dreiviertelkreis SVG gauge */}
      <svg width={64} height={56} viewBox="0 0 88 64" style={{ overflow: 'visible', flexShrink: 0 }}>
        <defs>
          <linearGradient id="gRed" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#DC2626" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>
        {/* Hintergrund-Dreiviertelkreis (Öffnung nach unten) */}
        <path
          d="M 76 32 A 32 32 0 1 0 12 32"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Rot: genehmigt (taken) */}
        {redDash > 0 && (
          <path
            d="M 76 32 A 32 32 0 1 0 12 32"
            fill="none"
            stroke="url(#gRed)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={redDash}
            strokeDashoffset={0}
          />
        )}
        {/* Grün: verfügbar (open + planned) */}
        {greenDash > 0 && (
          <path
            d="M 76 32 A 32 32 0 1 0 12 32"
            fill="none"
            stroke="#10B981"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={greenDash}
            strokeDashoffset={greenOffset}
          />
        )}
      </svg>

      {/* Header + Zahlen rechts */}
      <div className="flex-1">
        {/* Header oben */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-[#374151]">Urlaub {year}</span>
          {mode === 'available' ? (
            <ChevronRight size={11} className="text-[#9CA3AF]" />
          ) : (
            <ChevronLeft size={11} className="text-[#9CA3AF]" />
          )}
        </div>
        {/* Zahlen unten */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-[#111827] tabular-nums">{displayNum}</span>
            <span className="text-sm font-bold text-[#111827]">/</span>
            <span className="text-sm font-bold text-[#111827] tabular-nums">{entitlement} Tage</span>
          </div>
          <div className="text-xs text-[#6B7280]">{displayLabel}</div>
        </div>
      </div>
    </div>
  )
}
