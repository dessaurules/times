import { useState, useRef, useCallback } from 'react'

const TRIGGER_THRESHOLD = 200
const MAX_VELOCITY_FOR_CALC = 1500

interface UseSwipeGestureOptions {
  onSwipeComplete?: () => void
  onSwipeFailed?: () => void
  getWidth?: () => number
}

interface PointerHandlers {
  onPointerDown: (e: PointerEvent) => void
  onPointerMove: (e: PointerEvent) => void
  onPointerUp: (e: PointerEvent) => void
}

export function useSwipeGesture(options: UseSwipeGestureOptions = {}) {
  const [fillPercent, setFillPercent] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const pointerStartX = useRef<number | null>(null)
  const pointerStartTime = useRef<number | null>(null)
  const isTracking = useRef(false)

  const vibrate = useCallback((duration: number) => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(duration)
      }
    } catch (e) {
      // Silently ignore
    }
  }, [])

  const calculateVelocity = useCallback(
    (distance: number, elapsedMs: number): number => {
      if (elapsedMs === 0) return 0
      return (distance / elapsedMs) * 1000
    },
    []
  )

  const shouldTrigger = useCallback(
    (distance: number, velocity: number): boolean => {
      const normalizedVelocity = Math.min(velocity / MAX_VELOCITY_FOR_CALC, 1.0)
      const requirement = TRIGGER_THRESHOLD / (2 - normalizedVelocity)
      return distance >= requirement
    },
    []
  )

  const onPointerDown = useCallback((e: PointerEvent) => {
    pointerStartX.current = e.clientX
    pointerStartTime.current = Date.now()
    isTracking.current = true
    setIsAnimating(true)
    setFillPercent(0)
  }, [])

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!isTracking.current || pointerStartX.current === null) return

    const distance = e.clientX - pointerStartX.current
    if (distance < 0) return

    const width = options.getWidth?.() ?? 280
    const percent = Math.min((distance / width) * 100, 100)
    setFillPercent(percent)
  }, [options])

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      if (!isTracking.current || pointerStartX.current === null || pointerStartTime.current === null) {
        return
      }

      isTracking.current = false

      const distance = e.clientX - pointerStartX.current
      const elapsedMs = Date.now() - pointerStartTime.current
      const velocity = calculateVelocity(distance, elapsedMs)

      if (distance >= 0 && shouldTrigger(distance, velocity)) {
        setFillPercent(100)
        setIsAnimating(false)
        vibrate(15)
        options.onSwipeComplete?.()
      } else {
        setFillPercent(0)
        setIsAnimating(false)
        options.onSwipeFailed?.()
      }

      pointerStartX.current = null
      pointerStartTime.current = null
    },
    [calculateVelocity, shouldTrigger, vibrate, options]
  )

  const reset = useCallback(() => {
    setFillPercent(0)
    setIsAnimating(false)
    isTracking.current = false
    pointerStartX.current = null
    pointerStartTime.current = null
  }, [])

  const pointerHandlers: PointerHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }

  return {
    fillPercent,
    isAnimating,
    pointerHandlers,
    reset,
  }
}
