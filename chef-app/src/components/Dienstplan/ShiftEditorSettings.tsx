import { useState } from 'react'
import { X } from 'lucide-react'

interface ShiftEditorSettingsProps {
  open: boolean
  onClose: () => void
  employeeName: string
  date: string
  department: string
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
            <div>
              <p className="text-gray-600">Templates tab placeholder</p>
            </div>
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
