import { useState } from 'react'
import { Gem } from 'lucide-react'
import { useGamificationEnabled } from '@/hooks/useGamificationEnabled'
import { Button } from '../ui/button'
import { GamificationSheet } from './GamificationSheet'

export function GamificationHeader() {
  const { enabled } = useGamificationEnabled()
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
        </Button>
      </div>
      <GamificationSheet open={open} onOpenChange={setOpen} />
    </>
  )
}
