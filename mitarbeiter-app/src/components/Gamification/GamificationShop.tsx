import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useUserPoints } from '@/hooks/useUserPoints'
import { pb } from '@/lib/pb'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

interface Reward {
  id: string
  title: string
  description: string
  points_cost: number
  status: string
  available_from: string
  available_until: string
  max_redemptions: number
  redemptions_count: number
}

export function GamificationShop() {
  const { points } = useUserPoints()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [redeemingId, setRedeemingId] = useState<string | null>(null)

  useEffect(() => {
    const loadRewards = async () => {
      try {
        const records = await pb.collection('gam_rewards').getFullList({
          filter: 'status = "active" && (available_from = "" || available_from <= @now) && (available_until = "" || available_until > @now)',
          sort: '-points_cost',
        })
        setRewards(records as unknown as Reward[])
      } catch (err) {
        console.error('[GamificationShop] Error loading rewards:', err)
        setRewards([])
      } finally {
        setLoading(false)
      }
    }

    loadRewards()
  }, [])

  const handleRedeem = async (reward: Reward) => {
    if (!pb.authStore.record) {
      alert('User not authenticated')
      return
    }

    setRedeemingId(reward.id)
    try {
      await pb.collection('gam_orders').create({
        reward_id: reward.id,
        user_id: pb.authStore.record.id,
      })
      alert('Prämie eingereicht! Admin wird diese bald genehmigen.')
      // Reload rewards
      const records = await pb.collection('gam_rewards').getFullList({
        filter: 'status = "active" && (available_from = "" || available_from <= @now) && (available_until = "" || available_until > @now)',
        sort: '-points_cost',
      })
      setRewards(records as unknown as Reward[])
    } catch (err) {
      console.error('[GamificationShop] Error redeeming reward:', err)
      alert('Fehler beim Einlösen der Prämie')
    } finally {
      setRedeemingId(null)
    }
  }

  const getButtonText = (reward: Reward): string => {
    if (points >= reward.points_cost) {
      if (reward.max_redemptions > 0 && reward.redemptions_count >= reward.max_redemptions) {
        return 'Ausverkauft'
      }
      return 'Einlösen'
    }
    const needed = reward.points_cost - points
    return `${needed} Punkte mehr nötig`
  }

  const isButtonDisabled = (reward: Reward): boolean => {
    if (points < reward.points_cost) return true
    if (reward.max_redemptions > 0 && reward.redemptions_count >= reward.max_redemptions) return true
    return false
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[#4F46E5]" />
      </div>
    )
  }

  if (rewards.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[#6B7280]">Keine verfügbaren Prämien</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {rewards.map((reward) => (
        <Card key={reward.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-[#111827]">{reward.title}</h3>
              </div>
              <Badge variant="default">{reward.points_cost}</Badge>
            </div>
            <p className="text-sm text-[#6B7280] mb-3">{reward.description}</p>
            <Button
              size="sm"
              onClick={() => handleRedeem(reward)}
              disabled={isButtonDisabled(reward) || redeemingId === reward.id}
              className="w-full"
            >
              {redeemingId === reward.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Wird eingereicht...
                </>
              ) : (
                getButtonText(reward)
              )}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
