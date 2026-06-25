import { useState, useEffect, useMemo, useRef, type FormEvent } from 'react'
import { X, Upload } from 'lucide-react'
import { format, eachDayOfInterval, isWeekend, parseISO } from 'date-fns'
import { pb } from '../../lib/pb'
import { useAuthStore } from '../../stores/auth'
import type { Absence, AbsenceType } from '@shared/types'
import { VACATION_TYPES } from '@shared/types'
import { cn } from '@/lib/utils'
import { getHolidayDates } from '../../lib/holidays'
import { notifyGF } from '../../lib/notifications'

const ABSENCE_OPTIONS: { value: AbsenceType; label: string }[] = [
  { value: 'U',   label: 'Urlaub (U)' },
  { value: 'RU',  label: 'Resturlaub (RU)' },
  { value: 'U3',  label: 'Urlaub 3. Kind (U3)' },
  { value: 'SU',  label: 'Sonderurlaub (SU)' },
  { value: 'K',   label: 'Krank (K)' },
  { value: 'KK',  label: 'Kind krank (KK)' },
  { value: 'AT',  label: 'Arbeitstag anderweitig (AT)' },
  { value: 'S',   label: 'Sonstige (S)' },
  { value: 'ÜA',  label: 'Überstundenabbau (ÜA)' },
]

type Props = {
  employeeId: string
  initialFrom?: string
  onClose:   () => void
  onCreated: (absence: Absence) => void
}

export default function AntragDialog({ employeeId, initialFrom, onClose, onCreated }: Props) {
  const user    = useAuthStore(s => s.user)
  const today   = format(new Date(), 'yyyy-MM-dd')

  const [type,     setType]     = useState<AbsenceType>('U')
  const [dateFrom, setDateFrom] = useState(initialFrom ?? today)
  const [dateTo,   setDateTo]   = useState(initialFrom ?? today)
  const [note,     setNote]     = useState('')
  const [file,     setFile]     = useState<File | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [fedState, setFedState] = useState('ST')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    pb.collection('settings').getFirstListItem<{ value: string }>('key = "federal_state"', { requestKey: null })
      .then(s => setFedState(s.value))
      .catch(() => {})
  }, [])

  const holidays = useMemo(
    () => getHolidayDates(new Date(dateFrom).getFullYear(), fedState),
    [dateFrom, fedState]
  )

  const workingDays = useMemo(() => {
    if (!dateFrom || !dateTo || dateFrom > dateTo) return 0
    return eachDayOfInterval({ start: parseISO(dateFrom), end: parseISO(dateTo) })
      .filter(d => !isWeekend(d) && !holidays.has(format(d, 'yyyy-MM-dd')))
      .length
  }, [dateFrom, dateTo, holidays])

  const needsApproval = VACATION_TYPES.includes(type)
  const showUpload    = type === 'K' || type === 'KK'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!employeeId) {
      setError('Kein Mitarbeiter-Datensatz verknüpft. Bitte neu einloggen.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      let created: Absence
      if (file) {
        const fd = new FormData()
        fd.append('employee',   employeeId)
        fd.append('date_from',  dateFrom)
        fd.append('date_to',    dateTo)
        fd.append('type',       type)
        fd.append('status',     needsApproval ? 'pending' : 'approved')
        fd.append('note',       note)
        fd.append('created_by', user!.id)
        fd.append('document',   file)
        created = await pb.collection('absences').create<Absence>(fd)
      } else {
        created = await pb.collection('absences').create<Absence>({
          employee:   employeeId,
          date_from:  dateFrom,
          date_to:    dateTo,
          type,
          status:     needsApproval ? 'pending' : 'approved',
          note,
          created_by: user!.id,
        })
      }
      onCreated(created)
      onClose()
      if (needsApproval) {
        const dateLabel = dateFrom === dateTo ? dateFrom : `${dateFrom} – ${dateTo}`
        notifyGF(
          'Neuer Antrag',
          `${user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.name ?? 'Ein Mitarbeiter'} hat einen ${type}-Antrag gestellt (${dateLabel}).`,
          'absence_request',
          created.id,
        )
      }
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-base font-semibold text-[#111827]">Neuer Antrag</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
              {error}
            </div>
          )}

          {/* Art */}
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Art</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as AbsenceType)}
              className="w-full h-10 px-3 rounded-xl border border-[#E5E7EB] text-sm text-[#111827] bg-white outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
            >
              {ABSENCE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {needsApproval ? (
              <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                Dieser Antrag muss genehmigt werden.
              </p>
            ) : (
              <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                Wird direkt eingetragen.
              </p>
            )}
          </div>

          {/* Zeitraum */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">Von</label>
              <input
                type="date"
                required
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); if (e.target.value > dateTo) setDateTo(e.target.value) }}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E7EB] text-sm text-[#111827] outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">Bis</label>
              <input
                type="date"
                required
                min={dateFrom}
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E7EB] text-sm text-[#111827] outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Arbeitstage-Vorschau */}
          {workingDays > 0 && (
            <p className="text-xs text-[#6B7280] -mt-1">
              = <span className="font-semibold text-[#374151]">{workingDays} Arbeitstag{workingDays !== 1 ? 'e' : ''}</span> (ohne Wochenenden & Feiertage)
            </p>
          )}

          {/* AU-Bescheinigung */}
          {showUpload && (
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">
                AU-Bescheinigung <span className="text-[#9CA3AF] font-normal">(optional)</span>
              </label>
              <div
                onClick={() => fileRef.current?.click()}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
                  file
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-[#E5E7EB] hover:border-indigo-300 hover:bg-indigo-50/50'
                )}
              >
                <Upload size={16} className={file ? 'text-indigo-500' : 'text-[#9CA3AF]'} />
                <span className={cn('text-sm', file ? 'text-indigo-700 font-medium' : 'text-[#6B7280]')}>
                  {file ? file.name : 'Datei auswählen (PDF, JPG, PNG)'}
                </span>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}

          {/* Notiz */}
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">
              Notiz <span className="text-[#9CA3AF] font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Weitere Informationen…"
              className="w-full px-3 py-2.5 rounded-xl border border-[#E5E7EB] text-sm text-[#111827] resize-none outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100 placeholder:text-[#9CA3AF]"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-[#E5E7EB] text-sm text-[#374151] hover:bg-[#F3F4F6] transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-medium shadow-sm shadow-indigo-200 hover:from-indigo-600 hover:to-violet-700 transition-all disabled:opacity-60"
            >
              {saving ? 'Wird eingereicht…' : 'Einreichen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
