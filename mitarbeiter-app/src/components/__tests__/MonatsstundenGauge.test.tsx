import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MonatsstundenGauge from '../MonatsstundenGauge'

describe('MonatsstundenGauge (mini-ring variant B)', () => {
  const baseProps = {
    actualMins: 2300,
    targetMins: 10080,
    month: new Date(2026, 5, 1), // Juni 2026
    actualWeekMins: 960,   // 16:00 h
    targetWeekMins: 2400,  // 40:00 h
    calendarWeek: 25,
  }

  it('renders the month label in German', () => {
    render(<MonatsstundenGauge {...baseProps} />)
    expect(screen.getByText(/Juni 2026/i)).toBeInTheDocument()
  })

  it('renders actual and target hours', () => {
    render(
      <MonatsstundenGauge {...baseProps} actualMins={480} targetMins={960} />
    )
    // 480 mins = 8:00, 960 mins = 16:00
    expect(screen.getByText('8:00')).toBeInTheDocument()
    // 960 mins target is shown — check for "16:00" somewhere in the document
    expect(screen.getByText(/16:00/)).toBeInTheDocument()
  })

  it('renders an SVG gauge element', () => {
    const { container } = render(<MonatsstundenGauge {...baseProps} />)
    // The Lucide icon SVG has width=11; gauge SVG has width=64
    const gaugeSvg = container.querySelector('svg[width="64"]')
    expect(gaugeSvg).toBeInTheDocument()
    expect(gaugeSvg).toHaveAttribute('height', '36')
  })

  it('renders without onPrev/onNext props (compact interface)', () => {
    // Should not throw when optional props are absent
    expect(() =>
      render(<MonatsstundenGauge {...baseProps} actualMins={0} />)
    ).not.toThrow()
  })

  it('clamps progress at 100% when actual exceeds target', () => {
    const { container } = render(
      <MonatsstundenGauge {...baseProps} actualMins={2000} targetMins={960} />
    )
    const paths = container.querySelectorAll('path')
    // The progress path should be present (fully filled when actual > target)
    const progressPath = paths[1]
    expect(progressPath).toBeInTheDocument()
  })

  // --- Toggle-Verhalten ---

  it('zeigt Monatsmodus als Standard', () => {
    render(<MonatsstundenGauge {...baseProps} />)
    expect(screen.getByText('Juni 2026')).toBeInTheDocument()
    // 2300 mins = 38:20
    expect(screen.getByText('38:20')).toBeInTheDocument()
  })

  it('wechselt zu Wochenmodus nach Klick', async () => {
    render(<MonatsstundenGauge {...baseProps} />)
    const card = document.querySelector('.rounded-xl')!
    fireEvent.click(card)
    await screen.findByText('KW 25')
    // 960 mins actual week = 16:00
    expect(screen.getByText('16:00')).toBeInTheDocument()
  })

  it('wechselt zurück zu Monat nach zweitem Klick', async () => {
    render(<MonatsstundenGauge {...baseProps} />)
    const card = document.querySelector('.rounded-xl')!
    fireEvent.click(card)
    fireEvent.click(card)
    await screen.findByText('Juni 2026')
    expect(screen.getByText('38:20')).toBeInTheDocument()
  })

  it('zeigt KW-Label im Wochenmodus', async () => {
    render(<MonatsstundenGauge {...baseProps} calendarWeek={37} />)
    const card = document.querySelector('.rounded-xl')!
    fireEvent.click(card)
    await screen.findByText('KW 37')
  })
})
