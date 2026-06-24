import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { pb } from '@/lib/pb'
import { useAuthStore } from '@/stores/auth'
import { useShiftTemplates } from '@/hooks/useShiftTemplates'
import ShiftTemplateManager from '@/components/Dienstplan/ShiftTemplateManager'
import type { Department, ShiftTemplate, ShiftColor } from '@shared/types'

// ── Typen ─────────────────────────────────────────────────────────────────────

interface TemplateFormData {
  name: string
  start_time: string
  end_time: string
  color: ShiftColor
  id?: string
}

// ── Komponente ────────────────────────────────────────────────────────────────

export default function ShiftTemplatesPage() {
  const { user } = useAuthStore()

  // Permission-Check: Nur GF
  if (user?.role !== 'gf') {
    return <Navigate to="/" replace />
  }

  return <ShiftTemplatesContent />
}

function ShiftTemplatesContent() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState<string>('')
  const [deptLoading, setDeptLoading] = useState(true)

  // Abteilungen laden
  useEffect(() => {
    pb.collection('departments')
      .getFullList<Department>({ sort: 'sort_order,name' })
      .then((list) => {
        setDepartments(list)
        if (list.length > 0) setSelectedDeptId(list[0].id)
      })
      .catch(console.error)
      .finally(() => setDeptLoading(false))
  }, [])

  const dept = departments.find((d) => d.id === selectedDeptId)

  // Vorlagen für gewählte Abteilung
  const { templates, loading: templatesLoading, save, update, deleteTemplate } = useShiftTemplates(selectedDeptId)

  async function handleSave(data: TemplateFormData) {
    const { id, ...fields } = data
    if (id) {
      // Update existierende Vorlage
      await update(id, fields)
    } else {
      // Neue Vorlage erstellen
      await save({
        department: selectedDeptId,
        name: fields.name,
        start_time: fields.start_time,
        end_time: fields.end_time,
        color: fields.color,
      })
    }
  }

  async function handleDelete(id: string) {
    await deleteTemplate(id)
  }

  return (
    <div className="max-w-3xl">
      {/* Seitentitel */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">Schicht-Vorlagen verwalten</h1>
        {dept && (
          <p className="text-sm text-[#6B7280] mt-1">
            Abteilung: <span className="font-medium text-[#111827]">{dept.name}</span>
          </p>
        )}
      </div>

      {/* Abteilungs-Selektor */}
      {deptLoading ? (
        <p className="text-sm text-[#6B7280]">Lade Abteilungen…</p>
      ) : departments.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            Keine Abteilungen gefunden. Bitte zuerst Abteilungen in den{' '}
            <a href="/einstellungen" className="underline font-medium">
              Einstellungen
            </a>{' '}
            anlegen.
          </p>
        </div>
      ) : (
        <>
          {/* Abteilung wählen */}
          <div className="mb-6">
            <label className="text-xs text-[#6B7280] block mb-1.5">Abteilung auswählen</label>
            <div className="flex flex-wrap gap-2">
              {departments.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDeptId(d.id)}
                  className={[
                    'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors',
                    selectedDeptId === d.id
                      ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                      : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#4F46E5] hover:text-[#4F46E5]',
                  ].join(' ')}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: d.color }}
                  />
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          {/* Vorlagen-Manager */}
          {templatesLoading ? (
            <p className="text-sm text-[#6B7280]">Lade Vorlagen…</p>
          ) : (
            <ShiftTemplateManager
              templates={templates as ShiftTemplate[]}
              onSave={handleSave}
              onDelete={handleDelete}
              departmentId={selectedDeptId}
            />
          )}
        </>
      )}
    </div>
  )
}
