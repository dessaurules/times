import { useState } from 'react'
import { X, Pencil, Trash2 } from 'lucide-react'
import type { ShiftColor } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useShiftTemplates } from '@/hooks/useShiftTemplates'

interface ShiftEditorSettingsProps {
  open: boolean
  onClose: () => void
  employeeName: string
  date: string
  department: string
}

// ── Konstanten ────────────────────────────────────────────────────────────────

const SHIFT_COLORS: ShiftColor[] = ['blue', 'green', 'amber', 'purple', 'rose']

const COLOR_HEX: Record<ShiftColor, string> = {
  blue:   '#3B82F6',
  green:  '#10B981',
  amber:  '#F59E0B',
  purple: '#8B5CF6',
  rose:   '#EC4899',
}

const COLOR_LABELS: Record<ShiftColor, string> = {
  blue:   'Blau',
  green:  'Grün',
  amber:  'Bernstein',
  purple: 'Lila',
  rose:   'Rosa',
}

interface TemplateFormData {
  name: string
  start_time: string
  end_time: string
  color: ShiftColor
}

const EMPTY_FORM: TemplateFormData = {
  name: '',
  start_time: '',
  end_time: '',
  color: 'blue',
}

// ── ColorPicker ──────────────────────────────────────────────────────────────

function ShiftColorPicker({
  value,
  onChange,
}: {
  value: ShiftColor
  onChange: (c: ShiftColor) => void
}) {
  return (
    <div className="flex gap-2">
      {SHIFT_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          title={COLOR_LABELS[c]}
          onClick={() => onChange(c)}
          className={cn(
            'w-7 h-7 rounded-full border-2 transition-all',
            value === c ? 'border-[#111827] scale-110 shadow-sm' : 'border-transparent hover:scale-105',
          )}
          style={{ backgroundColor: COLOR_HEX[c] }}
        />
      ))}
    </div>
  )
}

// ── TemplatesTab ─────────────────────────────────────────────────────────────

function TemplatesTab({ department }: { department: string }) {
  const { templates, save, deleteTemplate } = useShiftTemplates(department)
  const [form, setForm] = useState<TemplateFormData>(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.start_time || !form.end_time) return

    setIsSubmitting(true)
    try {
      await save({
        department,
        ...form,
      })
      setForm(EMPTY_FORM)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Templates List */}
      {templates.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-sm text-gray-900">Vorhandene Templates</h3>
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: COLOR_HEX[template.color] }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900">{template.name}</p>
                    <p className="text-xs text-gray-600">
                      {template.start_time} - {template.end_time}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    title="Bearbeiten"
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    title="Löschen"
                    onClick={() => deleteTemplate(template.id)}
                    className="p-1.5 rounded hover:bg-red-100 text-gray-600 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form für neue Template */}
      <div className="pt-4 border-t border-gray-200">
        <h3 className="font-medium text-sm text-gray-900 mb-4">Neue Template</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="template-name" className="text-sm">
              Name
            </Label>
            <Input
              id="template-name"
              type="text"
              placeholder="z.B. Frühschicht"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="template-start" className="text-sm">
                Beginn (HH:mm)
              </Label>
              <Input
                id="template-start"
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="template-end" className="text-sm">
                Ende (HH:mm)
              </Label>
              <Input
                id="template-end"
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm block mb-2">Farbe</Label>
            <ShiftColorPicker
              value={form.color}
              onChange={(color) => setForm({ ...form, color })}
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            Template erstellen
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function ShiftEditorSettings({
  open,
  onClose,
  employeeName,
  date,
  department,
}: ShiftEditorSettingsProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'absences'>('templates')

  if (!open) return null

  const dayLabel = new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-[600px] w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="font-semibold text-gray-900">Einstellungen & Verwaltung</h2>
            <p className="text-sm text-gray-600 mt-1">
              {employeeName} · {dayLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-5">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            ⚙️ Templates
          </button>
          <button
            onClick={() => setActiveTab('absences')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'absences'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📅 Abwesenheiten
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {activeTab === 'templates' && (
            <TemplatesTab department={department} />
          )}
          {activeTab === 'absences' && (
            <div>
              <p className="text-gray-600">Absences tab placeholder</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
