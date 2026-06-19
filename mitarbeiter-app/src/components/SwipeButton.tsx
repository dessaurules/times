import { useSwipeGesture } from '@/hooks/useSwipeGesture'
import { LogIn, LogOut, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeButtonProps {
  isStamped: boolean
  isLoading: boolean
  onSwipeComplete: () => void
  onSwipeFailed?: () => void
}

export function SwipeButton({
  isStamped,
  isLoading,
  onSwipeComplete,
  onSwipeFailed,
}: SwipeButtonProps) {
  const { fillPercent, pointerHandlers, reset } = useSwipeGesture({
    onSwipeComplete,
    onSwipeFailed,
  })

  const buttonWidth = 280
  const thumbPosition = Math.max(0, fillPercent - 20)

  const isDisabled = isLoading

  const text = isLoading ? 'Bitte warten…' : isStamped ? 'Ausstempeln' : 'Einstempeln'
  const icon = isLoading ? null : isStamped ? <LogOut size={15} /> : <LogIn size={15} />
  const showCheckmark = isStamped && !isLoading

  const bgColor = isStamped
    ? 'from-emerald-500 to-teal-600'
    : 'from-indigo-500 to-violet-600'

  return (
    <div
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      style={{
        touchAction: 'none',
        width: `${buttonWidth}px`,
        height: '60px',
        cursor: isDisabled ? 'not-allowed' : 'grab',
        '--fill-percent': `${fillPercent}%`,
        '--thumb-position': `${thumbPosition}%`,
      } as React.CSSProperties & { '--fill-percent': string; '--thumb-position': string }}
      className={cn(
        'relative rounded-2xl overflow-hidden',
        'flex items-center justify-center',
        `bg-gradient-to-r ${bgColor}`,
        'transition-opacity',
        isDisabled && 'opacity-60 cursor-not-allowed'
      )}
      onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDisabled) {
          pointerHandlers.onPointerDown(e.nativeEvent)
        }
      }}
      onPointerMove={(e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDisabled) {
          pointerHandlers.onPointerMove(e.nativeEvent)
        }
      }}
      onPointerUp={(e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDisabled) {
          pointerHandlers.onPointerUp(e.nativeEvent)
        }
      }}
      onPointerCancel={() => {
        reset()
      }}
    >
      {/* Fill background (animated via CSS variable) */}
      <div
        className="absolute inset-0 bg-white/20 transition-all duration-100 ease-out"
        style={{
          width: `var(--fill-percent)`,
        }}
      />

      {/* Thumb/Button indicator (on the left side of fill) */}
      <div
        className="absolute left-0 top-0 bottom-0 flex items-center transition-all duration-100 ease-out"
        style={{
          left: `var(--thumb-position)`,
          pointerEvents: 'none',
        }}
      >
        <div className="w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center ml-1.5">
          {showCheckmark ? (
            <Check size={20} className="text-emerald-600" />
          ) : (
            icon && <span className="text-indigo-600">{icon}</span>
          )}
        </div>
      </div>

      {/* Text (centered, always visible) */}
      <div className="relative z-10 flex items-center gap-2 text-white font-medium text-sm">
        <span>{text}</span>
        {!isStamped && !isLoading && <span>→</span>}
      </div>
    </div>
  )
}
