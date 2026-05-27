import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  weekLabel: string      // z.B. 'KW 22 · 25.05. – 01.06.2026'
  deptCount: number
  empCount: number
  onClose: () => void
  onPublish: (notifyEmployees: boolean) => Promise<void>
}

export default function PublishDialog({ open, weekLabel, deptCount, empCount, onClose, onPublish }: Props) {
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
    <Dialog open={open} onOpenChange={v => { if (!v && !loading) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Dienstplan veröffentlichen</DialogTitle>
        </DialogHeader>

        {/* Grüne Info-Box */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
          <p className="font-semibold">{weekLabel}</p>
          <p className="text-xs text-emerald-600 mt-0.5">
            {deptCount} Abteilung{deptCount !== 1 ? 'en' : ''} · {empCount} Mitarbeiter
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
            Alle betroffenen Mitarbeiter per Benachrichtigung informieren
          </span>
        </label>

        {/* Aktionen */}
        <div className="flex justify-end gap-2 mt-1">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Abbrechen
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={loading}>
            {loading ? 'Wird veröffentlicht…' : 'Veröffentlichen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
