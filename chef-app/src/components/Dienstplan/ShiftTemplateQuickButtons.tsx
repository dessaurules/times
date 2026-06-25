import { ABSENCE_COLORS } from '@shared/types'
import type { ShiftTemplate, ShiftColor } from '@shared/types'

type QuickAbsenceType = 'K' | 'U' | 'S'

export interface QuickSelectData {
  is_free_day: boolean
  absence_type?: QuickAbsenceType | null
  start_time?: string
  end_time?: string
  color?: ShiftColor
}

interface Props {
  templates: ShiftTemplate[]
  onSelect: (id: string, data: QuickSelectData) => void
  onManage?: () => void
}

const ABSENCE_BUTTONS = [
  {
    id: 'absence_krank',
    label: 'K',
    title: 'Krank',
    data: { is_free_day: false, absence_type: 'K' as const },
    style: { backgroundColor: ABSENCE_COLORS.K.bg, color: ABSENCE_COLORS.K.text },
  },
  {
    id: 'absence_urlaub',
    label: 'U',
    title: 'Urlaub',
    data: { is_free_day: false, absence_type: 'U' as const },
    style: { backgroundColor: ABSENCE_COLORS.U.bg, color: ABSENCE_COLORS.U.text },
  },
  {
    id: 'absence_schule',
    label: 'S',
    title: 'Schulung',
    data: { is_free_day: false, absence_type: 'S' as const },
    style: { backgroundColor: ABSENCE_COLORS.S.bg, color: ABSENCE_COLORS.S.text },
  },
  {
    id: 'absence_frei',
    label: 'F',
    title: 'Frei',
    data: { is_free_day: true, absence_type: null },
    style: { backgroundColor: '#E1F5EE', color: '#085041' },
  },
]

export default function ShiftTemplateQuickButtons({ templates, onSelect, onManage }: Props) {
  const visibleTemplates = templates.slice(0, 4)

  return (
    <div className="flex flex-col gap-3">
      {/* Absence Group */}
      <div className="grid grid-cols-4 gap-2">
        {ABSENCE_BUTTONS.map((btn) => (
          <button
            key={btn.id}
            onClick={() => onSelect(btn.id, btn.data)}
            title={btn.title}
            style={btn.style}
            className="flex flex-col items-center justify-center rounded-lg py-2 px-1 text-center font-semibold transition-opacity hover:opacity-80"
          >
            <span className="text-sm font-bold">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Custom Templates Group */}
      {templates.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {visibleTemplates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() =>
                onSelect(tpl.id, {
                  start_time: tpl.start_time,
                  end_time: tpl.end_time,
                  color: tpl.color,
                  is_free_day: false,
                })
              }
              className="flex flex-col items-center justify-center rounded-lg bg-gray-100 py-2 px-1 text-center text-gray-700 transition-colors hover:bg-gray-200"
            >
              <span className="text-xs font-semibold leading-tight">{tpl.name}</span>
              <span className="text-xs text-gray-500">
                {tpl.start_time}–{tpl.end_time}
              </span>
            </button>
          ))}
          {onManage && (
            <button
              aria-label="+"
              onClick={onManage}
              className="flex items-center justify-center rounded-lg bg-gray-100 py-2 px-1 text-gray-500 transition-colors hover:bg-gray-200"
            >
              <span className="text-lg leading-none">+</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
