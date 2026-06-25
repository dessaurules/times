import { ABSENCE_COLORS, type ShiftTemplate, type ShiftColor, type AbsenceType, ABSENCE_LABELS } from '@shared/types'
import { useCreateAbsence } from '@/hooks/useCreateAbsence'
import { useState } from 'react'

interface QuickSelectSectionsProps {
  templates: ShiftTemplate[]
  onSelectTemplate: (id: string, data: { start_time: string; end_time: string; color: ShiftColor; is_free_day?: boolean }) => void
  onSelectAbsence: (absence_type: AbsenceType, dateFrom: string, dateTo: string) => void
  employeeId: string
  date: string  // ISO date (yyyy-MM-dd)
  userId: string  // User ID who is creating
}

const ABSENCE_TYPES: AbsenceType[] = ['K', 'KK', 'U', 'RU', 'SU', 'AT', 'S', 'ÜA']

export default function QuickSelectSections({
  templates,
  onSelectTemplate,
  onSelectAbsence,
  employeeId,
  date,
  userId,
}: QuickSelectSectionsProps) {
  const { createAbsence } = useCreateAbsence()
  const [isCreatingAbsence, setIsCreatingAbsence] = useState(false)

  const handleAbsenceClick = async (type: AbsenceType) => {
    try {
      setIsCreatingAbsence(true)
      await createAbsence(employeeId, date, date, type, userId)
      onSelectAbsence(type, date, date)
    } catch (error) {
      console.error('Fehler beim Erstellen der Abwesenheit:', error)
    } finally {
      setIsCreatingAbsence(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Section 1: Quick Select */}
      <div>
        <h3 className="text-[10px] font-bold text-[#6B7280] uppercase tracking-[0.08em] mb-2">
          Quick Select
        </h3>
        <div className="flex flex-wrap gap-1">
          {/* Frei Button */}
          <button
            type="button"
            onClick={() => onSelectTemplate('free', { start_time: '00:00', end_time: '00:00', color: 'blue', is_free_day: true })}
            className="font-bold rounded border-none cursor-pointer transition-opacity hover:opacity-80"
            style={{ padding: '3px 10px', fontSize: '11px', background: '#D1FAE5', color: '#065F46' }}
          >
            F
          </button>

          {/* Template Buttons */}
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(template.id, { start_time: template.start_time, end_time: template.end_time, color: template.color })}
              className="font-bold rounded border-none cursor-pointer transition-opacity hover:opacity-80"
              style={{ padding: '3px 10px', fontSize: '11px', background: '#DBEAFE', color: '#1E40AF' }}
              title={`${template.start_time} - ${template.end_time}`}
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      {/* Section 2: Abwesenheiten */}
      <div>
        <h3 className="text-[10px] font-bold text-[#6B7280] uppercase tracking-[0.08em] mb-2">
          Abwesenheiten
        </h3>
        <div className="flex flex-wrap gap-1">
          {ABSENCE_TYPES.map((type) => {
            const colors = ABSENCE_COLORS[type]
            const label = ABSENCE_LABELS[type]
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleAbsenceClick(type)}
                disabled={isCreatingAbsence}
                className="font-bold rounded border-none cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{
                  padding: '3px 10px',
                  fontSize: '11px',
                  background: colors.bg,
                  color: colors.text,
                }}
                title={label}
              >
                {type}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
