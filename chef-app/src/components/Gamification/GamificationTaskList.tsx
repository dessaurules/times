import { useState, useEffect, useRef } from 'react'
import { pb } from '@/lib/pb'
import { Button } from '@/components/ui/button'
import { Dialog, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2 } from 'lucide-react'

interface GamTask {
  id: string
  title: string
  description: string
  points: number
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  requires_media: boolean
  daily_limit_per_user: number
  expires_at: string
  active: boolean
  created: string
  updated: string
}

interface FormData {
  title: string
  description: string
  points: number
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  requires_media: boolean
  daily_limit_per_user: number
  expires_at: string
  active: boolean
}

const EMPTY_FORM: FormData = {
  title: '',
  description: '',
  points: 10,
  category: '',
  difficulty: 'easy',
  requires_media: false,
  daily_limit_per_user: 0,
  expires_at: '',
  active: true,
}

export default function GamificationTaskList() {
  const [tasks, setTasks] = useState<GamTask[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  // Gesetzt = Bearbeiten-Modus, null = Anlegen. Steuert Titel, Aktion und
  // Sichtbarkeit des Loeschen-Bereichs im selben Dialog.
  const [editingTask, setEditingTask] = useState<GamTask | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Load tasks and subscribe (separate effects to avoid race conditions)
  useEffect(() => {
    loadTasks()
  }, [])

  async function loadTasks() {
    try {
      setLoading(true)
      setError(null)
      const list = await pb.collection('gam_tasks').getFullList<GamTask>()
      setTasks(list)
    } catch (err) {
      setError(`Fehler beim Laden der Aufgaben: ${err}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Subscribe to real-time updates (separate effect, starts AFTER component mounts)
  const unsubRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    // Delay subscribe to avoid race condition with initial load
    const timer = setTimeout(() => {
      pb.collection('gam_tasks').subscribe('*', (e) => {
        if (e.action === 'delete') {
          setTasks(t => t.filter(task => task.id !== e.record.id))
        } else {
          setTasks(t => {
            const idx = t.findIndex(task => task.id === e.record.id)
            if (idx >= 0) t[idx] = e.record as unknown as GamTask
            else t.push(e.record as unknown as GamTask)
            return [...t]
          })
        }
      }, { requestKey: null }).then(fn => { unsubRef.current = fn })
        .catch(err => console.warn('Real-Time Subscription nicht verfügbar:', err))
    }, 100)

    return () => {
      clearTimeout(timer)
      unsubRef.current?.()
      pb.collection('gam_tasks').unsubscribe('*')
    }
  }, [])

  function openCreateDialog() {
    setEditingTask(null)
    setConfirmDelete(false)
    setFormData(EMPTY_FORM)
    setError(null)
    setDialogOpen(true)
  }

  function openEditDialog(task: GamTask) {
    setEditingTask(task)
    setConfirmDelete(false)
    setFormData({
      title: task.title ?? '',
      description: task.description ?? '',
      points: task.points ?? 0,
      category: task.category ?? '',
      difficulty: task.difficulty ?? 'easy',
      requires_media: task.requires_media ?? false,
      daily_limit_per_user: task.daily_limit_per_user ?? 0,
      // Ein leeres Ablaufdatum bleibt leer — <input type="date"> braucht
      // YYYY-MM-DD, PocketBase liefert einen vollen Zeitstempel.
      expires_at: task.expires_at ? task.expires_at.slice(0, 10) : '',
      active: task.active ?? true,
    })
    setError(null)
    setDialogOpen(true)
  }

  function closeDialog() {
    if (submitting || deleting) return
    setDialogOpen(false)
    setConfirmDelete(false)
  }

  async function handleSubmit() {
    if (!formData.title.trim()) {
      setError('Titel ist erforderlich')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      if (editingTask) {
        await pb.collection('gam_tasks').update(editingTask.id, formData)
      } else {
        await pb.collection('gam_tasks').create(formData)
      }
      setFormData(EMPTY_FORM)
      setEditingTask(null)
      setDialogOpen(false)
      await loadTasks()
    } catch (err) {
      setError(
        editingTask
          ? `Fehler beim Speichern der Aufgabe: ${err}`
          : `Fehler beim Erstellen der Aufgabe: ${err}`
      )
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!editingTask) return

    try {
      setDeleting(true)
      setError(null)
      await pb.collection('gam_tasks').delete(editingTask.id)
      setEditingTask(null)
      setConfirmDelete(false)
      setDialogOpen(false)
      await loadTasks()
    } catch (err) {
      setError(`Fehler beim Löschen der Aufgabe: ${err}`)
      console.error(err)
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'hard':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'Einfach'
      case 'medium':
        return 'Mittel'
      case 'hard':
        return 'Schwer'
      default:
        return difficulty
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Aufgaben</h2>
          <p className="text-sm text-gray-600 mt-1">Verwalten Sie verfügbare Gamification-Aufgaben</p>
        </div>
        <Button onClick={openCreateDialog} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Neue Aufgabe
        </Button>
      </div>

      {/* Error Message - nur wenn keine Daten vorhanden sind */}
      {error && tasks.length === 0 && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8 text-gray-600">
          Lade Aufgaben…
        </div>
      )}

      {/* Tasks Table */}
      {!loading && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Titel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Punkte</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Kategorie</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Schwierigkeit</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-600 text-sm">
                    Keine Aufgaben vorhanden
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => openEditDialog(task)}
                    className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">{task.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{task.points}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{task.category}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge className={getDifficultyColor(task.difficulty)}>
                        {getDifficultyLabel(task.difficulty)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge className={task.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                        {task.active ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog: Aufgabe anlegen oder bearbeiten */}
      <Dialog open={dialogOpen} onClose={closeDialog}>
        <DialogHeader>
          <DialogTitle>{editingTask ? 'Aufgabe bearbeiten' : 'Neue Aufgabe erstellen'}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="task-title">Titel *</Label>
              <Input
                id="task-title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="z.B. Schicht angeboten"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="task-description">Beschreibung</Label>
              <textarea
                id="task-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detaillierte Aufgabenbeschreibung"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
              />
            </div>

            {/* Points */}
            <div>
              <Label htmlFor="task-points">Punkte</Label>
              <Input
                id="task-points"
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                min={1}
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="task-category">Kategorie</Label>
              <Input
                id="task-category"
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="z.B. Schicht"
              />
            </div>

            {/* Difficulty */}
            <div>
              <Label htmlFor="task-difficulty">Schwierigkeit</Label>
              <select
                id="task-difficulty"
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
                className="h-9 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
              >
                <option value="easy">Einfach</option>
                <option value="medium">Mittel</option>
                <option value="hard">Schwer</option>
              </select>
            </div>

            {/* Requires Media */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="task-media"
                checked={formData.requires_media}
                onChange={(e) => setFormData({ ...formData, requires_media: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 accent-indigo-600"
              />
              <Label htmlFor="task-media">Medien erforderlich</Label>
            </div>

            {/* Daily Limit */}
            <div>
              <Label htmlFor="task-daily-limit">Tägliches Limit pro Benutzer</Label>
              <Input
                id="task-daily-limit"
                type="number"
                value={formData.daily_limit_per_user}
                onChange={(e) => setFormData({ ...formData, daily_limit_per_user: parseInt(e.target.value) })}
                min={0}
              />
            </div>

            {/* Expires At */}
            <div>
              <Label htmlFor="task-expires">Ablaufdatum</Label>
              <Input
                id="task-expires"
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
            </div>

            {/* Status: steuert, ob Mitarbeiter die Aufgabe im Shop sehen */}
            <div className="flex items-start justify-between gap-4 pt-3 border-t border-[#E5E7EB]">
              <div>
                <Label htmlFor="task-active">Status</Label>
                <p className="text-xs text-gray-600 mt-0.5">
                  {formData.active
                    ? 'Aktiv — Mitarbeiter können die Aufgabe annehmen'
                    : 'Inaktiv — die Aufgabe wird Mitarbeitern nicht angezeigt'}
                </p>
              </div>
              <Switch
                id="task-active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
            </div>
          </div>

          {/* Actions */}
          {confirmDelete ? (
            /* Inline-Rückfrage statt zweitem Overlay — Muster aus Einstellungen.tsx */
            <div className="flex items-center gap-2 mt-6">
              <span className="flex-1 text-sm text-red-600">
                „{editingTask?.title}" wirklich löschen?
              </span>
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Wird gelöscht…' : 'Ja'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                Nein
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-6">
              {editingTask && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDelete(true)}
                  disabled={submitting}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Löschen
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={closeDialog} disabled={submitting}>
                Abbrechen
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={submitting}>
                {submitting
                  ? (editingTask ? 'Wird gespeichert…' : 'Wird erstellt…')
                  : (editingTask ? 'Speichern' : 'Erstellen')}
              </Button>
            </div>
          )}
        </DialogBody>
      </Dialog>
    </div>
  )
}
