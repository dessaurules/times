import { Button } from '@/components/ui/button'
import { ABSENCE_COLORS, type ShiftTemplate, type ShiftColor } from '@shared/types'

interface QuickSelectSectionsProps {
  templates: ShiftTemplate[]
  onSelectTemplate: (id: string, data: { start_time: string; end_time: string; color: ShiftColor; is_free_day?: boolean }) => void
  onSelectAbsence: (absence_type: string) => void
}

const ABSENCE_QUICK_SELECT = [
  { type: 'K', emoji: '🏥', label: 'Krank' },
  { type: 'U', emoji: '✈️', label: 'Urlaub' },
  { type: 'S', emoji: '📚', label: 'Schulung' },
  { type: 'AT', emoji: '🩺', label: 'Arzttermin' },
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
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
          Quick Select
        </h3>
        <div className="flex flex-wrap gap-2">
          {/* Frei Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSelectTemplate('free', { start_time: '00:00', end_time: '00:00', color: 'blue', is_free_day: true })}
            className="text-sm"
          >
            🌴 Frei
          </Button>

          {/* Template Buttons */}
          {templates.map((template) => (
            <Button
              key={template.id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSelectTemplate(template.id, { start_time: template.start_time, end_time: template.end_time, color: template.color })}
              className="text-sm"
              title={`${template.start_time} - ${template.end_time}`}
            >
              {template.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Section 2: Abwesenheiten */}
      <div>
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
          Abwesenheiten
        </h3>
        <div className="flex flex-wrap gap-2">
          {ABSENCE_QUICK_SELECT.map(({ type, emoji, label }) => {
            const colors = ABSENCE_COLORS[type as keyof typeof ABSENCE_COLORS]
            return (
              <button
                key={type}
                type="button"
                onClick={() => onSelectAbsence(type)}
                className="px-3 py-1.5 rounded text-sm font-medium transition-all hover:shadow-sm border"
                style={{
                  background: colors.bg,
                  color: colors.text,
                  borderColor: colors.text + '44',
                }}
                title={label}
              >
                {emoji} {label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
