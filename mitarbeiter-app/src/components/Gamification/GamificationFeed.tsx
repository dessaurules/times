import { Loader2 } from 'lucide-react'
import { useActivityFeed, type Event } from '@/hooks/useActivityFeed'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'

export function GamificationFeed() {
  const { events, loading } = useActivityFeed()

  const getEventMessage = (event: Event): string => {
    switch (event.type) {
      case 'submission_approved':
        return `✓ ${event.data?.points || 0} Punkte für "${event.data?.task_title || 'Aufgabe'}"`
      case 'reward_redeemed':
        return `🎁 ${event.data?.reward_title || 'Prämie'} eingelöst`
      default:
        return 'Aktivität'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[#4F46E5]" />
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[#6B7280]">Keine Aktivitäten noch</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <Card key={event.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#111827]">{getEventMessage(event)}</p>
              <Badge variant="secondary" className="text-xs">
                {new Date(event.created).toLocaleDateString()}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
