import { useState } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  weekLabel: string
  deptCount: number
  empCount: number
  isUpdate?: boolean
  onClose: () => void
  onPublish: (notifyEmployees: boolean) => Promise<void>
}

export default function PublishDialog({ open, weekLabel, deptCount, empCount, isUpdate = false, onClose, onPublish }: Props) {
  const [notify, setNotify] = useState(true)
  const [loading, setLoading] = useState(false)

  async function handlePublish() {
    setLoading(true)
    try {
      await onPublish(notify)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => { if (!loading) onClose() }}>
      <DialogHeader>
        <DialogTitle>{isUpdate ? 'Aktualisierung veröffentlichen' : 'Dienstplan veröffentlichen'}</DialogTitle>
      </DialogHeader>
      <DialogBody>
        {/* Info-Box */}
        <div className={`border rounded-lg p-3 text-sm ${isUpdate ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          <p className="font-semibold">{weekLabel}</p>
          <p className={`text-xs mt-0.5 ${isUpdate ? 'text-amber-600' : 'text-emerald-600'}`}>
            {isUpdate
              ? `${empCount} Mitarbeiter mit neuen oder geänderten Schichten`
              : `${deptCount} Abteilung${deptCount !== 1 ? 'en' : ''} · ${empCount} Mitarbeiter`}
          </p>
        </div>

        {/* Benachrichtigungs-Checkbox */}
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={notify}
            onChange={e => setNotify(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-indigo-600"
          />
          <span className="text-sm text-gray-700">
            {isUpdate
              ? 'Betroffene Mitarbeiter über Änderungen benachrichtigen'
              : 'Alle betroffenen Mitarbeiter per Benachrichtigung informieren'}
          </span>
        </label>

        {/* Aktionen */}
        <div className="flex justify-end gap-2 mt-1">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Abbrechen
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={loading}>
            {loading
              ? (isUpdate ? 'Wird aktualisiert…' : 'Wird veröffentlicht…')
              : (isUpdate ? 'Aktualisierung veröffentlichen' : 'Veröffentlichen')}
          </Button>
        </div>
      </DialogBody>
    </Dialog>
  )
}
