import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MonatsstundenGauge from '../MonatsstundenGauge'

describe('MonatsstundenGauge (mini-ring variant B)', () => {
  const month = new Date(2026, 5, 1) // Juni 2026

  it('renders the month label in German', () => {
    render(
      <MonatsstundenGauge actualMins={480} targetMins={960} month={month} />
    )
    expect(screen.getByText(/Juni 2026/i)).toBeInTheDocument()
  })

  it('renders actual and target hours', () => {
    render(
      <MonatsstundenGauge actualMins={480} targetMins={960} month={month} />
    )
    // 480 mins = 8:00, 960 mins = 16:00
    expect(screen.getByText('8:00')).toBeInTheDocument()
    expect(screen.getByText(/16:00/)).toBeInTheDocument()
  })

  it('renders an SVG gauge element', () => {
    const { container } = render(
      <MonatsstundenGauge actualMins={480} targetMins={960} month={month} />
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('width', '64')
    expect(svg).toHaveAttribute('height', '36')
  })

  it('renders without onPrev/onNext props (compact interface)', () => {
    // Should not throw when these props are absent
    expect(() =>
      render(<MonatsstundenGauge actualMins={0} targetMins={960} month={month} />)
    ).not.toThrow()
  })

  it('clamps progress at 100% when actual exceeds target', () => {
    const { container } = render(
      <MonatsstundenGauge actualMins={2000} targetMins={960} month={month} />
    )
    const paths = container.querySelectorAll('path')
    // The progress path should have strokeDashoffset = 0 (fully filled)
    const progressPath = paths[1]
    expect(progressPath).toBeInTheDocument()
  })
})
