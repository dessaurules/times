import { useEffect, useRef } from 'react'
import { X, Check, XCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import type { Absence, Employee } from '@shared/types'
import { ABSENCE_COLORS } from '@shared/types'
import { Button } from '../ui/button'

interface ApprovalPopoverProps {
  absence: Absence
  employee: Employee
  anchorRect: DOMRect
  onApprove: () => void
  onReject: () => void
  onClose: () => void
}

export default function ApprovalPopover({
  absence, employee, anchorRect, onApprove, onReject, onClose,
}: ApprovalPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [onClose])

  const colors = ABSENCE_COLORS[absence.type]
  const dateLabel = absence.date_from === absence.date_to
    ? format(parseISO(absence.date_from), 'dd. MMM yyyy', { locale: de })
    : `${format(parseISO(absence.date_from), 'dd.MM.', { locale: de })} – ${format(parseISO(absence.date_to), 'dd. MMM yyyy', { locale: de })}`

  const style: React.CSSProperties = {
    position: 'fixed',
    top: anchorRect.bottom + 4,
    left: Math.min(anchorRect.left, window.innerWidth - 220),
    zIndex: 50,
  }

  return (
    <div
      ref={ref}
      style={style}
      className="w-52 bg-white border border-[#EDE7DC] rounded-lg shadow-lg p-3"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-xs text-[#706D6A]">{employee.last_name}, {employee.first_name}</div>
          <div className="text-xs font-medium text-[#1A1917] mt-0.5">{dateLabel}</div>
        </div>
        <button onClick={onClose} className="text-[#706D6A] hover:text-[#1A1917] ml-1">
          <X size={14} />
        </button>
      </div>
      <div
        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold mb-2"
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        {absence.type}
      </div>
      {absence.note && (
        <p className="text-xs text-[#706D6A] mb-2 italic">"{absence.note}"</p>
      )}
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={onApprove}>
          <Check size={12} /> Ja
        </Button>
        <Button size="sm" variant="destructive" className="flex-1 h-7 text-xs" onClick={onReject}>
          <XCircle size={12} /> Nein
        </Button>
      </div>
    </div>
  )
}
