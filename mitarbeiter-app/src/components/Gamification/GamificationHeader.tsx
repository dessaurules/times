import { useState } from 'react'
import { useGamificationEnabled } from '@/hooks/useGamificationEnabled'
import { useGamificationSignal } from '@/hooks/useGamificationSignal'
import { Button } from '../ui/button'
import { GamificationSheet } from './GamificationSheet'
import { GemSignal } from './GemSignal'

export function GamificationHeader() {
  const { enabled } = useGamificationEnabled()
  const { sparkle, markSeen } = useGamificationSignal()
  const [open, setOpen] = useState(false)

  if (!enabled) {
    return null
  }

  // Beim Oeffnen markieren, nicht beim Schliessen: Wer nachsieht, hat die
  // Meldung zur Kenntnis genommen.
  const handleOpen = () => {
    setOpen(true)
    markSeen()
  }

  return (
    <>
      <div className="relative">
        <Button variant="ghost" size="icon" onClick={handleOpen} className="relative">
          <GemSignal sparkle={sparkle} />
        </Button>
      </div>
      <GamificationSheet open={open} onOpenChange={setOpen} />
    </>
  )
}
