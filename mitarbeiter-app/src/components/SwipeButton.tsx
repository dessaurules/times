import { useRef, useCallback, useEffect } from 'react'
import { useSwipeGesture } from '@/hooks/useSwipeGesture'
import { LogIn, LogOut, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeButtonProps {
  isStamped: boolean
  isLoading: boolean
  onSwipeComplete: () => void
  onSwipeFailed?: () => void
  onProgress?: (percent: number) => void
}

export function SwipeButton({
  isStamped,
  isLoading,
  onSwipeComplete,
  onSwipeFailed,
  onProgress,
}: SwipeButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)

  const getWidth = useCallback(() => {
    return containerRef.current?.getBoundingClientRect().width ?? 300
  }, [])

  const handleProgress = useCallback((percent: number) => {
    onProgress?.(percent)
  }, [onProgress])

  const { fillPercent, isSnapBack, pointerHandlers, reset } = useSwipeGesture({
    onSwipeComplete,
    onSwipeFailed,
    getWidth,
  })

  // onProgress bei jeder fillPercent-Änderung aufrufen
  useEffect(() => {
    handleProgress(fillPercent)
  }, [fillPercent, handleProgress])

  // Snap-Back: Transition aktivieren BEVOR fillPercent auf 0 fällt
  // Setze Transition-Klasse auf mount von isSnapBack, dann triggert React die fillPercent-Änderung
  useEffect(() => {
    const fill = fillRef.current
    const thumb = thumbRef.current
    if (!fill || !thumb) return

    if (isSnapBack) {
      const ease = '350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      fill.style.transition = `width ${ease}`
      thumb.style.transition = `left ${ease}`
    } else {
      fill.style.transition = ''
      thumb.style.transition = ''
    }
  }, [isSnapBack])

  const thumbPosition = Math.max(0, fillPercent - 20)
  const isDisabled = isLoading

  const text = isLoading ? 'Bitte warten…' : isStamped ? 'Ausstempeln' : 'Einstempeln'
  const icon = isLoading ? null : isStamped ? <LogOut size={15} /> : <LogIn size={15} />
  const showCheck = isStamped && !isLoading
  const bgColor = isStamped ? 'from-emerald-500 to-teal-600' : 'from-indigo-500 to-violet-600'

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      style={{
        touchAction: 'none',
        width: '100%',
        height: '60px',
        cursor: isDisabled ? 'not-allowed' : 'grab',
      }}
      className={cn(
        'relative rounded-2xl overflow-hidden',
        'flex items-center justify-center',
        `bg-gradient-to-r ${bgColor}`,
        'transition-opacity',
        isDisabled && 'opacity-60 cursor-not-allowed'
      )}
      onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDisabled) pointerHandlers.onPointerDown(e.nativeEvent)
      }}
      onPointerMove={(e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDisabled) pointerHandlers.onPointerMove(e.nativeEvent)
      }}
      onPointerUp={(e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDisabled) pointerHandlers.onPointerUp(e.nativeEvent)
      }}
      onPointerCancel={() => reset()}
    >
      {/* Fill */}
      <div
        ref={fillRef}
        className="absolute inset-0 bg-white/20"
        style={{ width: `${fillPercent}%` }}
      />

      {/* Thumb */}
      <div
        ref={thumbRef}
        className="absolute left-0 top-0 bottom-0 flex items-center"
        style={{ left: `${thumbPosition}%`, pointerEvents: 'none' }}
      >
        <div className="w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center ml-1.5">
          {showCheck ? (
            <Check size={20} className="text-emerald-600" />
          ) : (
            icon && <span className="text-indigo-600">{icon}</span>
          )}
        </div>
      </div>

      {/* Text */}
      <div className="relative z-10 flex items-center gap-2 text-white font-medium text-sm">
        <span>{text}</span>
        {!isStamped && !isLoading && <span>→</span>}
      </div>
    </div>
  )
}
