import { useState, useEffect, useRef } from 'react'
import { pb } from '@/lib/pb'
import { Button } from '@/components/ui/button'
import { Dialog, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'

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
}

export default function GamificationTaskList() {
  const [tasks, setTasks] = useState<GamTask[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    points: 10,
    category: '',
    difficulty: 'easy',
    requires_media: false,
    daily_limit_per_user: 0,
    expires_at: '',
  })
  const [submitting, setSubmitting] = useState(false)

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

  async function handleSubmit() {
    if (!formData.title.trim()) {
      setError('Titel ist erforderlich')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      await pb.collection('gam_tasks').create(formData)
      setFormData({
        title: '',
        description: '',
        points: 10,
        category: '',
        difficulty: 'easy',
        requires_media: false,
        daily_limit_per_user: 0,
        expires_at: '',
      })
      setDialogOpen(false)
      await loadTasks()
    } catch (err) {
      setError(`Fehler beim Erstellen der Aufgabe: ${err}`)
      console.error(err)
    } finally {
      setSubmitting(false)
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
        <Button onClick={() => setDialogOpen(true)} size="sm">
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
                  <tr key={task.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{task.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{task.points}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{task.category}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge className={getDifficultyColor(task.difficulty)}>
                        {getDifficultyLabel(task.difficulty)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge className="bg-green-100 text-green-800">Aktiv</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog: New Task */}
      <Dialog open={dialogOpen} onClose={() => { if (!submitting) setDialogOpen(false) }}>
        <DialogHeader>
          <DialogTitle>Neue Aufgabe erstellen</DialogTitle>
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
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Abbrechen
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Wird erstellt…' : 'Erstellen'}
            </Button>
          </div>
        </DialogBody>
      </Dialog>
    </div>
  )
}
