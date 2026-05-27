import { useState } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SHIFT_COLOR_BG, type ShiftColor } from '@shared/types'

const SHIFT_COLORS: ShiftColor[] = ['blue', 'green', 'amber', 'purple', 'rose']

export interface ShiftEditorData {
  start_time:   string
  end_time:     string
  color:        ShiftColor
  start_time2?: string
  end_time2?:   string
  color2?:      ShiftColor
  note?:        string
  note2?:       string
}

interface Props {
  open:          boolean
  onClose:       () => void
  onSave:        (data: ShiftEditorData) => void
  onDelete?:     () => void
  employeeName:  string
  dayLabel:      string       // z.B. 'Mo 25.05.'
  initial?:      Partial<ShiftEditorData>
  isEdit?:       boolean
}

export default function ShiftEditor({
  open, onClose, onSave, onDelete,
  employeeName, dayLabel, initial, isEdit = false,
}: Props) {
  const [startTime,  setStartTime]  = useState(initial?.start_time  ?? '08:00')
  const [endTime,    setEndTime]    = useState(initial?.end_time     ?? '16:00')
  const [color,      setColor]      = useState<ShiftColor>(initial?.color ?? 'blue')
  const [note,       setNote]       = useState(initial?.note         ?? '')
  const [showSplit,  setShowSplit]  = useState(!!(initial?.start_time2))
  const [startTime2, setStartTime2] = useState(initial?.start_time2 ?? '18:00')
  const [endTime2,   setEndTime2]   = useState(initial?.end_time2   ?? '23:00')
  const [color2,     setColor2]     = useState<ShiftColor>(initial?.color2 ?? 'purple')
  const [note2,      setNote2]      = useState(initial?.note2        ?? '')

  function handleSave() {
    const data: ShiftEditorData = {
      start_time: startTime,
      end_time:   endTime,
      color,
      note:       note || undefined,
    }
    if (showSplit) {
      data.start_time2 = startTime2
      data.end_time2   = endTime2
      data.color2      = color2
      data.note2       = note2 || undefined
    }
    onSave(data)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Schicht bearbeiten' : 'Schicht eintragen'}</DialogTitle>
      </DialogHeader>

      <DialogBody>
        <div className="space-y-3">
          {/* Readonly info */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-gray-500 uppercase tracking-wide">Mitarbeiter</Label>
              <p className="text-sm font-medium text-gray-700 mt-0.5">{employeeName}</p>
            </div>
            <div>
              <Label className="text-[11px] text-gray-500 uppercase tracking-wide">Tag</Label>
              <p className="text-sm font-medium text-gray-700 mt-0.5">{dayLabel}</p>
            </div>
          </div>

          {/* Schicht 1 */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-gray-500 uppercase tracking-wide">Beginn</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="mt-0.5" />
            </div>
            <div>
              <Label className="text-[11px] text-gray-500 uppercase tracking-wide">Ende</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="mt-0.5" />
            </div>
          </div>

          <div>
            <Label className="text-[11px] text-gray-500 uppercase tracking-wide">Hinweis</Label>
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="z.B. Springer, Vertretung…"
              className="mt-0.5"
            />
          </div>

          <div>
            <Label className="text-[11px] text-gray-500 uppercase tracking-wide">Farbe</Label>
            <div className="flex gap-2 mt-1">
              {SHIFT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-6 h-6 rounded-full border-2 transition-transform',
                    color === c ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105',
                  )}
                  style={{ background: SHIFT_COLOR_BG[c] }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Split-Schicht Toggle */}
          <div className="border-t border-gray-100 pt-2">
            <button
              type="button"
              onClick={() => setShowSplit(v => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
            >
              <span className={cn('transition-transform', showSplit ? 'rotate-90' : '')}>&rsaquo;</span>
              {showSplit ? 'Zweite Teilschicht entfernen' : 'Zweite Teilschicht hinzufügen'}
            </button>
          </div>

          {/* Schicht 2 */}
          {showSplit && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 space-y-3">
              <p className="text-xs font-semibold text-indigo-700">&#x2702; Zweite Teilschicht</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-gray-500 uppercase tracking-wide">Beginn</Label>
                  <Input type="time" value={startTime2} onChange={e => setStartTime2(e.target.value)} className="mt-0.5" />
                </div>
                <div>
                  <Label className="text-[11px] text-gray-500 uppercase tracking-wide">Ende</Label>
                  <Input type="time" value={endTime2} onChange={e => setEndTime2(e.target.value)} className="mt-0.5" />
                </div>
              </div>
              <div>
                <Label className="text-[11px] text-gray-500 uppercase tracking-wide">Hinweis</Label>
                <Input
                  value={note2}
                  onChange={e => setNote2(e.target.value)}
                  placeholder="Abenddienst…"
                  className="mt-0.5"
                />
              </div>
              <div>
                <Label className="text-[11px] text-gray-500 uppercase tracking-wide">Farbe</Label>
                <div className="flex gap-2 mt-1">
                  {SHIFT_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor2(c)}
                      className={cn(
                        'w-6 h-6 rounded-full border-2 transition-transform',
                        color2 === c ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105',
                      )}
                      style={{ background: SHIFT_COLOR_BG[c] }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Aktionen */}
        <div className="flex justify-between mt-2">
          <div>
            {isEdit && onDelete && (
              <Button variant="destructive" size="sm" onClick={() => { onDelete(); onClose() }}>
                Löschen
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Abbrechen</Button>
            <Button size="sm" onClick={handleSave}>Speichern</Button>
          </div>
        </div>
      </DialogBody>
    </Dialog>
  )
}
