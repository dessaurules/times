import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from '@testing-library/react'
import { SwipeButton } from '../SwipeButton'

describe('SwipeButton', () => {
  const mockOnSwipeComplete = vi.fn()

  beforeEach(() => {
    mockOnSwipeComplete.mockClear()
  })

  it('should render with "Einstempeln" text when not stamped', () => {
    render(
      <SwipeButton
        isStamped={false}
        isLoading={false}
        onSwipeComplete={mockOnSwipeComplete}
      />
    )

    expect(screen.getByText(/Einstempeln/)).toBeInTheDocument()
  })

  it('should render with "Ausstempeln" text when stamped', () => {
    render(
      <SwipeButton
        isStamped={true}
        isLoading={false}
        onSwipeComplete={mockOnSwipeComplete}
      />
    )

    expect(screen.getByText(/Ausstempeln/)).toBeInTheDocument()
  })

  it('should show "Bitte warten…" when loading', () => {
    render(
      <SwipeButton
        isStamped={false}
        isLoading={true}
        onSwipeComplete={mockOnSwipeComplete}
      />
    )

    expect(screen.getByText(/Bitte warten/)).toBeInTheDocument()
  })

  it('should be disabled when loading', () => {
    const { container } = render(
      <SwipeButton
        isStamped={false}
        isLoading={true}
        onSwipeComplete={mockOnSwipeComplete}
      />
    )

    const button = container.querySelector('div[role="button"]')
    expect(button).toHaveClass('opacity-60')
    expect(button).toHaveClass('cursor-not-allowed')
  })

  it('should apply correct color based on isStamped', () => {
    const { container, rerender } = render(
      <SwipeButton
        isStamped={false}
        isLoading={false}
        onSwipeComplete={mockOnSwipeComplete}
      />
    )

    let button = container.querySelector('div[role="button"]')
    expect(button).toHaveClass('from-indigo-500', 'to-violet-600')

    rerender(
      <SwipeButton
        isStamped={true}
        isLoading={false}
        onSwipeComplete={mockOnSwipeComplete}
      />
    )

    button = container.querySelector('div[role="button"]')
    expect(button).toHaveClass('from-emerald-500', 'to-teal-600')
  })

  it('should render checkmark icon when stamped', () => {
    const { container } = render(
      <SwipeButton
        isStamped={true}
        isLoading={false}
        onSwipeComplete={mockOnSwipeComplete}
      />
    )

    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('should handle pointer events correctly', async () => {
    const { container } = render(
      <SwipeButton
        isStamped={false}
        isLoading={false}
        onSwipeComplete={mockOnSwipeComplete}
      />
    )

    const button = container.querySelector('div[role="button"]') as HTMLDivElement
    expect(button).toBeInTheDocument()
    expect(button).toHaveStyle('touch-action: none')
  })

  it('calls onProgress with fillPercent during pointer move', () => {
    const onProgress = vi.fn()
    const { container } = render(
      <SwipeButton
        isStamped={false}
        isLoading={false}
        onSwipeComplete={vi.fn()}
        onProgress={onProgress}
      />
    )

    const button = container.querySelector('div[role="button"]') as HTMLElement

    // Clear calls from initial render (fillPercent = 0)
    onProgress.mockClear()

    // Simulate pointer down
    act(() => {
      button.dispatchEvent(new PointerEvent('pointerdown', { clientX: 0, pointerId: 1, bubbles: true }))
    })

    // Simulate pointer move with 100px distance (on 300px button = ~33%)
    act(() => {
      button.dispatchEvent(new PointerEvent('pointermove', { clientX: 100, bubbles: true }))
    })

    // onProgress should have been called with a value > 0
    expect(onProgress).toHaveBeenCalled()
    const calls = onProgress.mock.calls
    const hasNonZeroCall = calls.some(call => call[0] > 0)
    expect(hasNonZeroCall).toBe(true)
  })
})
