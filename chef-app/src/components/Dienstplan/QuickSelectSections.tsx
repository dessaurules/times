import { ABSENCE_COLORS, type ShiftTemplate, type ShiftColor } from '@shared/types'

interface QuickSelectSectionsProps {
  templates: ShiftTemplate[]
  onSelectTemplate: (id: string, data: { start_time: string; end_time: string; color: ShiftColor; is_free_day?: boolean }) => void
  onSelectAbsence: (absence_type: string) => void
}

const ABSENCE_QUICK_SELECT = [
  { type: 'K', label: 'Krank' },
  { type: 'KK', label: 'Krank (Kind)' },
  { type: 'U', label: 'Urlaub' },
  { type: 'RU', label: 'Resturlaub' },
  { type: 'SU', label: 'Sonderurlaub' },
  { type: 'AT', label: 'Arzttermin' },
  { type: 'S', label: 'Schulung' },
  { type: 'ÜA', label: 'Übergang' },
]

export default function QuickSelectSections({
  templates,
  onSelectTemplate,
  onSelectAbsence,
}: QuickSelectSectionsProps) {
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
          {ABSENCE_QUICK_SELECT.map(({ type, label }) => {
            const colors = ABSENCE_COLORS[type as keyof typeof ABSENCE_COLORS]
            return (
              <button
                key={type}
                type="button"
                onClick={() => onSelectAbsence(type)}
                className="font-bold rounded border-none cursor-pointer transition-opacity hover:opacity-80"
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
