import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSwipeGesture } from '../useSwipeGesture'

describe('useSwipeGesture', () => {
  let mockVibrate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockVibrate = vi.fn(() => true)
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
      configurable: true,
    })
  })

  describe('Pointer event tracking', () => {
    it('should initialize with fillPercent = 0', () => {
      const { result } = renderHook(() => useSwipeGesture())
      expect(result.current.fillPercent).toBe(0)
    })

    it('should track pointerDown event', () => {
      const { result } = renderHook(() => useSwipeGesture())
      const mockEvent = new PointerEvent('pointerdown', {
        clientX: 100,
        pointerId: 1,
      })

      act(() => {
        result.current.pointerHandlers.onPointerDown(mockEvent)
      })

      expect(result.current.isAnimating).toBe(true)
    })
  })

  describe('Swipe distance and velocity calculation', () => {
    it('should calculate distance correctly during pointerMove', () => {
      const { result } = renderHook(() => useSwipeGesture())

      const downEvent = new PointerEvent('pointerdown', {
        clientX: 100,
        pointerId: 1,
      })
      act(() => {
        result.current.pointerHandlers.onPointerDown(downEvent)
      })

      const moveEvent = new PointerEvent('pointermove', {
        clientX: 200,
        pointerId: 1,
      })
      act(() => {
        result.current.pointerHandlers.onPointerMove(moveEvent)
      })

      expect(result.current.fillPercent).toBeGreaterThan(30)
      expect(result.current.fillPercent).toBeLessThan(40)
    })

    it('should calculate velocity during rapid swipes', () => {
      const { result } = renderHook(() => useSwipeGesture())

      const downEvent = new PointerEvent('pointerdown', {
        clientX: 100,
        pointerId: 1,
      })
      act(() => {
        result.current.pointerHandlers.onPointerDown(downEvent)
      })

      const moveEvent = new PointerEvent('pointermove', {
        clientX: 250,
        pointerId: 1,
      })
      act(() => {
        result.current.pointerHandlers.onPointerMove(moveEvent)
      })

      expect(result.current.fillPercent).toBeGreaterThan(50)
    })
  })

  describe('Trigger threshold logic', () => {
    it('should trigger success on full slow swipe (280px)', () => {
      const onSuccess = vi.fn()
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeComplete: onSuccess })
      )

      const downEvent = new PointerEvent('pointerdown', {
        clientX: 0,
        pointerId: 1,
      })
      act(() => {
        result.current.pointerHandlers.onPointerDown(downEvent)
      })

      const moveEvent = new PointerEvent('pointermove', {
        clientX: 280,
        pointerId: 1,
      })
      act(() => {
        result.current.pointerHandlers.onPointerMove(moveEvent)
      })

      const upEvent = new PointerEvent('pointerup', {
        clientX: 280,
        pointerId: 1,
      })
      act(() => {
        result.current.pointerHandlers.onPointerUp(upEvent)
      })

      expect(onSuccess).toHaveBeenCalled()
    })

    it('should not trigger on incomplete swipe (~150px)', () => {
      const onSuccess = vi.fn()
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeComplete: onSuccess })
      )

      const downEvent = new PointerEvent('pointerdown', {
        clientX: 0,
        pointerId: 1,
      })
      act(() => {
        result.current.pointerHandlers.onPointerDown(downEvent)
      })

      const moveEvent = new PointerEvent('pointermove', {
        clientX: 150,
        pointerId: 1,
      })
      act(() => {
        result.current.pointerHandlers.onPointerMove(moveEvent)
      })

      const upEvent = new PointerEvent('pointerup', {
        clientX: 150,
        pointerId: 1,
      })
      act(() => {
        result.current.pointerHandlers.onPointerUp(upEvent)
      })

      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('should trigger on fast swipe at ~140px (velocity high)', () => {
      const onSuccess = vi.fn()
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeComplete: onSuccess })
      )

      const downEvent = new PointerEvent('pointerdown', {
        clientX: 0,
        pointerId: 1,
      })
      act(() => {
        result.current.pointerHandlers.onPointerDown(downEvent)
      })

      const moveEvent = new PointerEvent('pointermove', {
        clientX: 140,
        pointerId: 1,
      })
      act(() => {
        result.current.pointerHandlers.onPointerMove(moveEvent)
      })

      const upEvent = new PointerEvent('pointerup', {
        clientX: 140,
        pointerId: 1,
      })
      act(() => {
        result.current.pointerHandlers.onPointerUp(upEvent)
      })

      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
  })

  describe('Haptic feedback', () => {
    it('should call navigator.vibrate on success', () => {
      const onSuccess = vi.fn()
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeComplete: onSuccess })
      )

      const downEvent = new PointerEvent('pointerdown', {
        clientX: 0,
        pointerId: 1,
      })
      act(() => {
        result.current.pointerHandlers.onPointerDown(downEvent)
      })

      const moveEvent = new PointerEvent('pointermove', {
        clientX: 280,
        pointerId: 1,
      })
      act(() => {
        result.current.pointerHandlers.onPointerMove(moveEvent)
      })

      const upEvent = new PointerEvent('pointerup', {
        clientX: 280,
        pointerId: 1,
      })
      act(() => {
        result.current.pointerHandlers.onPointerUp(upEvent)
      })

      expect(mockVibrate).toHaveBeenCalledWith(15)
    })

    it('should handle missing navigator.vibrate gracefully', () => {
      // @ts-ignore
      delete navigator.vibrate
      const onSuccess = vi.fn()
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeComplete: onSuccess })
      )

      const downEvent = new PointerEvent('pointerdown', {
        clientX: 0,
        pointerId: 1,
      })
      act(() => {
        result.current.pointerHandlers.onPointerDown(downEvent)
      })

      const moveEvent = new PointerEvent('pointermove', {
        clientX: 280,
        pointerId: 1,
      })
      act(() => {
        result.current.pointerHandlers.onPointerMove(moveEvent)
      })

      const upEvent = new PointerEvent('pointerup', {
        clientX: 280,
        pointerId: 1,
      })
      expect(() => {
        act(() => {
          result.current.pointerHandlers.onPointerUp(upEvent)
        })
      }).not.toThrow()
    })
  })

  describe('Reset functionality', () => {
    it('should reset fillPercent to 0 on reset()', () => {
      const { result } = renderHook(() => useSwipeGesture())

      const downEvent = new PointerEvent('pointerdown', {
        clientX: 0,
        pointerId: 1,
      })
      act(() => {
        result.current.pointerHandlers.onPointerDown(downEvent)
      })

      const moveEvent = new PointerEvent('pointermove', {
        clientX: 150,
        pointerId: 1,
      })
      act(() => {
        result.current.pointerHandlers.onPointerMove(moveEvent)
      })

      expect(result.current.fillPercent).toBeGreaterThan(0)

      act(() => {
        result.current.reset()
      })

      expect(result.current.fillPercent).toBe(0)
      expect(result.current.isAnimating).toBe(false)
    })
  })
})
