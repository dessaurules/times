import { useState } from 'react'
import { Gem } from 'lucide-react'
import { useGamificationEnabled } from '@/hooks/useGamificationEnabled'
import { useUserPoints } from '@/hooks/useUserPoints'
import { Button } from '../ui/button'
import { GamificationSheet } from './GamificationSheet'

export function GamificationHeader() {
  const { enabled } = useGamificationEnabled()
  const { points } = useUserPoints()
  const [open, setOpen] = useState(false)

  if (!enabled) {
    return null
  }

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          className="relative"
        >
          <Gem className="h-5 w-5 text-amber-500" />
          {/* min-w statt fester Breite: bei "100" reichten 20px nicht (21px
              Inhalt). Gleiches Muster wie der Zaehler der NotificationBell —
              die Hoehe bleibt fest, damit einstellige Werte kreisrund sind. */}
          <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center font-semibold tabular-nums">
            {points}
          </div>
        </Button>
      </div>
      <GamificationSheet open={open} onOpenChange={setOpen} />
    </>
  )
}
