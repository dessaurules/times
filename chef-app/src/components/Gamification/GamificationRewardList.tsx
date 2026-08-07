import { useState, useEffect, useRef } from 'react'
import { pb } from '@/lib/pb'
import { Button } from '@/components/ui/button'
import { Dialog, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'

interface GamReward {
  id: string
  title: string
  description: string
  points_cost: number
  category: string
  redemption_type: 'budget_limit' | 'code'
  max_redemptions: number
  redemptions_count: number
  status: 'draft' | 'active' | 'archived'
  created: string
  updated: string
}

interface FormData {
  title: string
  description: string
  points_cost: number
  category: string
  redemption_type: 'budget_limit' | 'code'
  max_redemptions: number
}

export default function GamificationRewardList() {
  const [rewards, setRewards] = useState<GamReward[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    points_cost: 100,
    category: '',
    redemption_type: 'budget_limit',
    max_redemptions: 0,
  })
  const [submitting, setSubmitting] = useState(false)

  // Load rewards
  useEffect(() => {
    loadRewards()
  }, [])

  async function loadRewards() {
    try {
      setLoading(true)
      setError(null)
      const list = await pb.collection('gam_rewards').getFullList<GamReward>()
      setRewards(list)
    } catch (err) {
      setError(`Fehler beim Laden der Prämien: ${err}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Subscribe to real-time updates
  const unsubRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    pb.collection('gam_rewards').subscribe('*', () => {
      loadRewards()
    }).then(fn => { unsubRef.current = fn })
      .catch(err => console.warn('Real-Time Subscription nicht verfügbar:', err))
    return () => {
      unsubRef.current?.()
      pb.collection('gam_rewards').unsubscribe('*')
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
      await pb.collection('gam_rewards').create({
        ...formData,
        status: 'draft',
        redemptions_count: 0,
      })
      setFormData({
        title: '',
        description: '',
        points_cost: 100,
        category: '',
        redemption_type: 'budget_limit',
        max_redemptions: 0,
      })
      setDialogOpen(false)
      await loadRewards()
    } catch (err) {
      setError(`Fehler beim Erstellen der Prämie: ${err}`)
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'archived':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Entwurf'
      case 'active':
        return 'Aktiv'
      case 'archived':
        return 'Archiviert'
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Prämien</h2>
          <p className="text-sm text-gray-600 mt-1">Verwalten Sie verfügbare Prämien für Punkte</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Neue Prämie
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8 text-gray-600">
          Lade Prämien…
        </div>
      )}

      {/* Rewards Table */}
      {!loading && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Titel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Punkte-Kosten</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Eingelöst</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {rewards.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-600 text-sm">
                    Keine Prämien vorhanden
                  </td>
                </tr>
              ) : (
                rewards.map((reward) => (
                  <tr key={reward.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{reward.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{reward.points_cost}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {reward.redemptions_count}{reward.max_redemptions > 0 ? ` / ${reward.max_redemptions}` : ''}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge className={getStatusColor(reward.status)}>
                        {getStatusLabel(reward.status)}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog: New Reward */}
      <Dialog open={dialogOpen} onClose={() => { if (!submitting) setDialogOpen(false) }}>
        <DialogHeader>
          <DialogTitle>Neue Prämie erstellen</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="reward-title">Titel *</Label>
              <Input
                id="reward-title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="z.B. Gutschein"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="reward-description">Beschreibung</Label>
              <textarea
                id="reward-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detaillierte Prämien-Beschreibung"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
              />
            </div>

            {/* Points Cost */}
            <div>
              <Label htmlFor="reward-points">Punkte-Kosten</Label>
              <Input
                id="reward-points"
                type="number"
                value={formData.points_cost}
                onChange={(e) => setFormData({ ...formData, points_cost: parseInt(e.target.value) })}
                min={1}
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="reward-category">Kategorie</Label>
              <Input
                id="reward-category"
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="z.B. Gutschein"
              />
            </div>

            {/* Redemption Type */}
            <div>
              <Label htmlFor="reward-redemption-type">Einlösungstyp</Label>
              <select
                id="reward-redemption-type"
                value={formData.redemption_type}
                onChange={(e) => setFormData({ ...formData, redemption_type: e.target.value as 'budget_limit' | 'code' })}
                className="h-9 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
              >
                <option value="budget_limit">Budget-Limit</option>
                <option value="code">Code</option>
              </select>
            </div>

            {/* Max Redemptions */}
            <div>
              <Label htmlFor="reward-max-redemptions">Max. Einlösungen</Label>
              <Input
                id="reward-max-redemptions"
                type="number"
                value={formData.max_redemptions}
                onChange={(e) => setFormData({ ...formData, max_redemptions: parseInt(e.target.value) })}
                min={0}
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
