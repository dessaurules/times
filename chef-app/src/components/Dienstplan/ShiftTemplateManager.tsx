import { useState } from 'react'
import { Pencil, Trash2, Plus, X } from 'lucide-react'
import type { ShiftTemplate, ShiftColor } from '@shared/types'
import { SHIFT_COLOR_BG, SHIFT_COLOR_TEXT } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

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

// ── Typen ─────────────────────────────────────────────────────────────────────

interface TemplateFormData {
  name: string
  start_time: string
  end_time: string
  color: ShiftColor
}

interface Props {
  templates: ShiftTemplate[]
  onSave: (template: TemplateFormData & { id?: string }) => Promise<void>
  onDelete: (id: string) => Promise<void>
  departmentId: string
}

const EMPTY_FORM: TemplateFormData = {
  name: '',
  start_time: '',
  end_time: '',
  color: 'blue',
}

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

function isValidTime(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value)
}

// ── ShiftColorPicker ──────────────────────────────────────────────────────────

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

// ── TemplateModal ─────────────────────────────────────────────────────────────

interface ModalProps {
  initial?: ShiftTemplate | null
  onClose: () => void
  onSave: (data: TemplateFormData & { id?: string }) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

function TemplateModal({ initial, onClose, onSave, onDelete }: ModalProps) {
  const isEdit = Boolean(initial)
  const [form, setForm] = useState<TemplateFormData>(
    initial
      ? { name: initial.name, start_time: initial.start_time, end_time: initial.end_time, color: initial.color }
      : { ...EMPTY_FORM },
  )
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof TemplateFormData>(key: K, value: TemplateFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  function validate(): string | null {
    if (!form.name.trim()) return 'Name ist erforderlich.'
    if (!isValidTime(form.start_time)) return 'Startzeit muss im Format HH:mm angegeben werden.'
    if (!isValidTime(form.end_time)) return 'Endzeit muss im Format HH:mm angegeben werden.'
    return null
  }

  async function handleSave() {
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setSaving(true)
    setError(null)
    try {
      await onSave({ ...form, id: initial?.id })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!initial || !onDelete) return
    setSaving(true)
    try {
      await onDelete(initial.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen')
      setSaving(false)
    }
  }

  // Preview badge
  const previewBg   = SHIFT_COLOR_BG[form.color]
  const previewText = SHIFT_COLOR_TEXT[form.color]

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#111827]">
            {isEdit ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#F3F4F6] text-[#6B7280]"
            aria-label="Schließen"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{error}</div>
          )}

          {/* Name */}
          <div>
            <Label htmlFor="tpl-name" className="text-xs text-[#6B7280] mb-1 block">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="tpl-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="z.B. Frühschicht"
              autoFocus
            />
          </div>

          {/* Zeiten */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tpl-start" className="text-xs text-[#6B7280] mb-1 block">
                Startzeit <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tpl-start"
                type="time"
                value={form.start_time}
                onChange={(e) => set('start_time', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tpl-end" className="text-xs text-[#6B7280] mb-1 block">
                Endzeit <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tpl-end"
                type="time"
                value={form.end_time}
                onChange={(e) => set('end_time', e.target.value)}
              />
            </div>
          </div>

          {/* Farbwähler */}
          <div>
            <Label className="text-xs text-[#6B7280] mb-2 block">Farbe</Label>
            <ShiftColorPicker value={form.color} onChange={(c) => set('color', c)} />
          </div>

          {/* Vorschau */}
          {form.name && form.start_time && form.end_time && (
            <div>
              <Label className="text-xs text-[#6B7280] mb-2 block">Vorschau</Label>
              <span
                className="inline-flex flex-col items-start rounded-md px-2.5 py-1.5 text-xs font-semibold"
                style={{ backgroundColor: previewBg, color: previewText }}
              >
                <span>{form.name}</span>
                <span className="font-normal opacity-80">
                  {form.start_time}–{form.end_time}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#E5E7EB] flex items-center justify-between">
          {/* Löschen-Bereich (nur Edit) */}
          <div>
            {isEdit && onDelete && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600">Wirklich löschen?</span>
                  <Button size="sm" variant="destructive" onClick={handleDelete} disabled={saving}>
                    Ja, löschen
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)} disabled={saving}>
                    Abbrechen
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving}
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-400"
                >
                  <Trash2 size={14} />
                  Löschen
                </Button>
              )
            )}
          </div>

          {/* Speichern */}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Speichere…' : isEdit ? 'Speichern' : 'Erstellen'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ShiftTemplateManager ──────────────────────────────────────────────────────

export default function ShiftTemplateManager({ templates, onSave, onDelete, departmentId }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editTemplate, setEditTemplate] = useState<ShiftTemplate | null>(null)

  function openCreate() {
    setEditTemplate(null)
    setModalOpen(true)
  }

  function openEdit(tpl: ShiftTemplate) {
    setEditTemplate(tpl)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditTemplate(null)
  }

  async function handleSave(data: TemplateFormData & { id?: string }) {
    await onSave(data)
  }

  async function handleDelete(id: string) {
    await onDelete(id)
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-[#6B7280]">
          {templates.length} {templates.length === 1 ? 'Vorlage' : 'Vorlagen'}
        </span>
        <Button onClick={openCreate} size="sm">
          <Plus size={15} />
          Neue Vorlage
        </Button>
      </div>

      {/* Tabelle */}
      {templates.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-8 text-center">
          <p className="text-sm text-[#6B7280]">Noch keine Vorlagen für diese Abteilung.</p>
          <button
            onClick={openCreate}
            className="mt-3 text-sm text-[#4F46E5] hover:text-[#4338CA] font-medium"
          >
            Erste Vorlage erstellen →
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[#6B7280]">Vorschau</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[#6B7280]">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[#6B7280]">Zeitraum</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[#6B7280]">Farbe</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {templates.map((tpl) => (
                <tr key={tpl.id} className="group hover:bg-[#F9FAFB] transition-colors">
                  {/* Vorschau-Badge */}
                  <td className="px-4 py-3">
                    <span
                      className="inline-block rounded-md px-2 py-0.5 text-xs font-semibold"
                      style={{
                        backgroundColor: SHIFT_COLOR_BG[tpl.color],
                        color: SHIFT_COLOR_TEXT[tpl.color],
                      }}
                    >
                      {tpl.name}
                    </span>
                  </td>
                  {/* Name */}
                  <td className="px-4 py-3 font-medium text-[#111827]">{tpl.name}</td>
                  {/* Zeitraum */}
                  <td className="px-4 py-3 text-[#6B7280]">
                    {tpl.start_time}–{tpl.end_time}
                  </td>
                  {/* Farbe */}
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full inline-block"
                        style={{ backgroundColor: COLOR_HEX[tpl.color] }}
                      />
                      <span className="text-xs text-[#6B7280]">{COLOR_LABELS[tpl.color]}</span>
                    </span>
                  </td>
                  {/* Aktionen */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(tpl)}
                        className="p-1.5 rounded hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827]"
                        title="Bearbeiten"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setEditTemplate(tpl)
                          setModalOpen(true)
                        }}
                        className="p-1.5 rounded hover:bg-red-50 text-[#6B7280] hover:text-red-600"
                        title="Löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <TemplateModal
          initial={editTemplate}
          onClose={closeModal}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      {/* Hidden: departmentId used by parent, referenced to avoid TS unused warning */}
      <span data-dept={departmentId} className="sr-only" />
    </div>
  )
}
