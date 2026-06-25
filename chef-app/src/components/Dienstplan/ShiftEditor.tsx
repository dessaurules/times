import { useState, useEffect } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SHIFT_COLOR_BG, ABSENCE_LABELS, ABSENCE_COLORS, type ShiftColor, type AbsenceType } from '@shared/types'
import type { Absence } from '@shared/types'
import ShiftTemplateManager from './ShiftTemplateManager'
import ShiftEditorSettings from './ShiftEditorSettings'
import QuickSelectSections from './QuickSelectSections'
import { useShiftTemplates } from '@/hooks/useShiftTemplates'

const SHIFT_COLORS: ShiftColor[] = ['blue', 'green', 'amber', 'purple', 'rose']

const VALID_ABSENCE_TYPES = ['K', 'U', 'S'] as const

export interface ShiftEditorData {
  start_time:   string
  end_time:     string
  color:        ShiftColor
  start_time2?: string
  end_time2?:   string
  color2?:      ShiftColor
  note?:        string
  note2?:       string
  is_free_day?: boolean
}

interface Props {
  open:          boolean
  onClose:       () => void
  onSave:        (data: ShiftEditorData) => void
  onDelete?:     () => void
  employeeName:  string
  dayLabel:      string
  initial?:      Partial<ShiftEditorData>
  isEdit?:       boolean
  absence?:      Absence
  department?:   string
  date?:         string
  employeeId?:   string
}

export default function ShiftEditor({
  open, onClose, onSave, onDelete,
  employeeName, dayLabel, initial, isEdit = false, absence, department, date, employeeId,
}: Props) {
  const [isFreeDay,  setIsFreeDay]  = useState(!!(initial?.is_free_day))
  const [startTime,  setStartTime]  = useState(initial?.start_time  ?? '08:00')
  const [endTime,    setEndTime]    = useState(initial?.end_time     ?? '16:00')
  const [color,      setColor]      = useState<ShiftColor>(initial?.color ?? 'blue')
  const [note,       setNote]       = useState(initial?.note         ?? '')
  const [showSplit,  setShowSplit]  = useState(!!(initial?.start_time2))
  const [startTime2, setStartTime2] = useState(initial?.start_time2 ?? '18:00')
  const [endTime2,   setEndTime2]   = useState(initial?.end_time2   ?? '23:00')
  const [color2,     setColor2]     = useState<ShiftColor>(initial?.color2 ?? 'purple')
  const [note2,      setNote2]      = useState(initial?.note2        ?? '')
  const [autoEnd,    setAutoEnd]    = useState(false)
  const [jobModel,   setJobModel]   = useState<'40h' | '30h'>('40h')
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const { templates, loading: templatesLoading, save: saveTemplate, update: updateTemplate, deleteTemplate } = useShiftTemplates(department ?? 'dept_default')

  function handleTemplateSelect(_id: string, data: QuickSelectData) {
    if (data.is_free_day) {
      onSave({ start_time: '00:00', end_time: '00:00', color: 'blue', is_free_day: true })
    } else if (data.absence_type && (VALID_ABSENCE_TYPES as readonly string[]).includes(data.absence_type)) {
      const label = ABSENCE_LABELS[data.absence_type as AbsenceType] ?? data.absence_type
      onSave({ start_time: '00:00', end_time: '00:00', color: 'blue', is_free_day: false, note: label })
    } else {
      onSave({ start_time: data.start_time ?? '08:00', end_time: data.end_time ?? '16:00', color: data.color ?? 'blue', is_free_day: false })
    }
    onClose()
  }

  async function handleManageTemplates() {
    setShowTemplateManager(true)
  }

  async function handleSaveTemplate(data: { name: string; start_time: string; end_time: string; color: ShiftColor; id?: string }) {
    const deptId = department ?? 'dept_default'
    if (data.id) {
      // Update existing template
      const { id, ...updateData } = data
      await updateTemplate(id, { ...updateData, department: deptId } as any)
    } else {
      // Create new template
      const { id, ...createData } = data
      await saveTemplate({ ...createData, department: deptId } as any)
    }
  }

  async function handleDeleteTemplate(id: string) {
    await deleteTemplate(id)
  }

  function calcEndTime(start: string, hoursPerDay: number): string {
    const [h, m] = start.split(':').map(Number)
    const totalMins = h * 60 + m + hoursPerDay * 60
    const endH = Math.floor(totalMins / 60) % 24
    const endM = totalMins % 60
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
  }

  useEffect(() => {
    if (!autoEnd) return
    const hours = jobModel === '40h' ? 8 : 7
    setEndTime(calcEndTime(startTime, hours))
  }, [autoEnd, jobModel, startTime])

  function handleSave() {
    if (isFreeDay) {
      onSave({ start_time: '00:00', end_time: '00:00', color: 'blue', is_free_day: true })
    } else {
      const data: ShiftEditorData = {
        start_time: startTime,
        end_time:   endTime,
        color,
        note:       note || undefined,
        is_free_day: false,
      }
      if (showSplit) {
        data.start_time2 = startTime2
        data.end_time2   = endTime2
        data.color2      = color2
        data.note2       = note2 || undefined
      }
      onSave(data)
    }
    onClose()
  }

  return (
    <>
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <div className="flex items-start justify-between w-full">
          <div>
            <DialogTitle>{isEdit ? 'Schicht bearbeiten' : 'Schicht eintragen'}</DialogTitle>
            <p className="text-xs text-gray-600 mt-1 font-medium">
              {employeeName} · {dayLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Gear icon for settings */}
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="p-2 rounded hover:bg-gray-100 text-gray-600 transition-colors flex-shrink-0"
              title="Einstellungen"
              aria-label="Einstellungen"
            >
              ⚙️
            </button>
            {/* Freier Tag Checkbox */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none flex-shrink-0">
              <input
                type="checkbox"
                checked={isFreeDay}
                onChange={e => setIsFreeDay(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-medium text-gray-600">Freier Tag</span>
            </label>
          </div>
        </div>
      </DialogHeader>

      <DialogBody onKeyDown={e => e.key === 'Enter' && handleSave()}>
        {/* Quick-Buttons: Templates + Absences */}
        {!templatesLoading && (
          <QuickSelectSections
            templates={templates}
            onSelectTemplate={(id, data) => {
              if (data.is_free_day) {
                onSave({ start_time: '00:00', end_time: '00:00', color: 'blue', is_free_day: true })
              } else {
                onSave({ start_time: data.start_time, end_time: data.end_time, color: data.color, is_free_day: false })
              }
              onClose()
            }}
            onSelectAbsence={(absence_type) => {
              const label = ABSENCE_LABELS[absence_type as AbsenceType] ?? absence_type
              onSave({ start_time: '00:00', end_time: '00:00', color: 'blue', is_free_day: false, note: label })
              onClose()
            }}
          />
        )}

        <div className="border-t border-gray-100 my-3" />

        <div className="space-y-3">
          {/* Freier Tag Anzeige */}
          {isFreeDay && (
            <div className="flex items-center justify-center py-6">
              <div className="text-center">
                <div className="text-5xl font-black text-emerald-600 leading-none">F</div>
                <div className="text-sm font-semibold text-emerald-700 mt-2">Freier Tag</div>
              </div>
            </div>
          )}

          {/* Abwesenheits-Warnung */}
          {!isFreeDay && absence && (
            <div
              className="rounded-lg p-3 border"
              style={{
                background: ABSENCE_COLORS[absence.type].bg,
                borderColor: ABSENCE_COLORS[absence.type].text + '44',
              }}
            >
              <p className="text-sm font-semibold" style={{ color: ABSENCE_COLORS[absence.type].text }}>
                ⚠ Abwesenheit an diesem Tag
              </p>
              <p className="text-xs mt-0.5" style={{ color: ABSENCE_COLORS[absence.type].text }}>
                {ABSENCE_LABELS[absence.type]} · {absence.date_from} – {absence.date_to}
              </p>
              <p className="text-xs mt-1 opacity-75" style={{ color: ABSENCE_COLORS[absence.type].text }}>
                Die Schicht kann trotzdem eingetragen werden.
              </p>
            </div>
          )}

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

          {/* Schichtfelder (ausgeblendet bei Freiem Tag) */}
          {!isFreeDay && (
            <>
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

              <label className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <input type="checkbox" checked={autoEnd} onChange={e => setAutoEnd(e.target.checked)} />
                Endzeit berechnen
              </label>
              {autoEnd && (
                <div className="flex gap-4 mt-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={jobModel === '40h'}
                      onChange={() => setJobModel('40h')}
                    />
                    40h-Job (8h/Tag)
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={jobModel === '30h'}
                      onChange={() => setJobModel('30h')}
                    />
                    30h-Job (7h/Tag)
                  </label>
                </div>
              )}

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
              <div className="border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSplit(v => !v)}
                  className={cn(
                    'flex items-center gap-2 text-sm font-medium transition-all',
                    showSplit
                      ? 'text-indigo-600 hover:text-indigo-700'
                      : 'text-gray-600 hover:text-indigo-600'
                  )}
                >
                  <span className={cn('transition-transform text-lg', showSplit ? 'rotate-90' : '')}>
                    {showSplit ? '➖' : '➕'}
                  </span>
                  {showSplit ? 'Zweite Schicht entfernen' : '➕ Zweite Schicht hinzufügen'}
                </button>
              </div>
            </>
          )}

          {/* Schicht 2 */}
          {!isFreeDay && showSplit && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-3 mt-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-indigo-700">✂️ Zweite Schicht</p>
                <button
                  type="button"
                  onClick={() => setShowSplit(false)}
                  className="p-1 rounded hover:bg-indigo-200 text-indigo-600 transition-colors text-sm"
                  title="Löschen"
                >
                  Entfernen
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-gray-500 uppercase tracking-wide">Beginn2</Label>
                  <Input type="time" value={startTime2} onChange={e => setStartTime2(e.target.value)} className="mt-0.5" />
                </div>
                <div>
                  <Label className="text-[11px] text-gray-500 uppercase tracking-wide">Ende2</Label>
                  <Input type="time" value={endTime2} onChange={e => setEndTime2(e.target.value)} className="mt-0.5" />
                </div>
              </div>
              <div>
                <Label className="text-[11px] text-gray-500 uppercase tracking-wide">Hinweis2</Label>
                <Input
                  value={note2}
                  onChange={e => setNote2(e.target.value)}
                  placeholder="Abenddienst…"
                  className="mt-0.5"
                />
              </div>
              <div>
                <Label className="text-[11px] text-gray-500 uppercase tracking-wide">Farbe2</Label>
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

    {/* ShiftTemplateManager Modal */}
    {showTemplateManager && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
            <h2 className="text-lg font-semibold text-gray-900">Schicht-Vorlagen verwalten</h2>
            <button
              onClick={() => setShowTemplateManager(false)}
              className="p-1 rounded hover:bg-gray-100 text-gray-500"
              aria-label="Schließen"
            >
              ✕
            </button>
          </div>
          <div className="px-6 py-4">
            <ShiftTemplateManager
              templates={templates}
              onSave={handleSaveTemplate}
              onDelete={handleDeleteTemplate}
              departmentId={department ?? 'dept_default'}
            />
          </div>
        </div>
      </div>
    )}

    {/* ShiftEditorSettings Modal */}
    {showSettings && date && employeeId && (
      <ShiftEditorSettings
        open={true}
        onClose={() => setShowSettings(false)}
        employeeName={employeeName}
        date={date}
        department={department ?? 'dept_default'}
        employeeId={employeeId}
      />
    )}
    </>
  )
}
