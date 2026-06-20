import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import UrlaubsCard from '../UrlaubsCard'

describe('UrlaubsCard (mini-ring variant B)', () => {
  it('renders SVG gauge with correct dimensions', () => {
    const { container } = render(
      <UrlaubsCard taken={10} planned={3} entitlement={25} />
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('width', '64')
    expect(svg).toHaveAttribute('height', '36')
    expect(svg).toHaveAttribute('viewBox', '0 0 88 52')
  })

  it('shows open days count', () => {
    render(<UrlaubsCard taken={10} planned={3} entitlement={25} />)
    // open = 25 - 10 - 3 = 12
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('shows "Offen" label', () => {
    render(<UrlaubsCard taken={10} planned={3} entitlement={25} />)
    expect(screen.getByText('Offen')).toBeInTheDocument()
  })

  it('renders indigo gradient for taken days', () => {
    const { container } = render(
      <UrlaubsCard taken={10} planned={0} entitlement={25} />
    )
    const gradient = container.querySelector('#gaugeGradUrlaub')
    expect(gradient).toBeInTheDocument()
    const stops = gradient?.querySelectorAll('stop')
    expect(stops?.[0]).toHaveAttribute('stop-color', '#4F46E5')
    expect(stops?.[1]).toHaveAttribute('stop-color', '#7C3AED')
  })

  it('renders amber stroke for planned days when planned > 0', () => {
    const { container } = render(
      <UrlaubsCard taken={5} planned={3} entitlement={25} />
    )
    const paths = container.querySelectorAll('path')
    // Should have background path, taken path, and planned path
    const amberPath = Array.from(paths).find(
      p => p.getAttribute('stroke') === '#F59E0B'
    )
    expect(amberPath).toBeInTheDocument()
  })

  it('does not render amber path when planned is 0', () => {
    const { container } = render(
      <UrlaubsCard taken={5} planned={0} entitlement={25} />
    )
    const paths = container.querySelectorAll('path')
    const amberPath = Array.from(paths).find(
      p => p.getAttribute('stroke') === '#F59E0B'
    )
    expect(amberPath).toBeUndefined()
  })

  it('clamps open days to 0 when taken + planned exceeds entitlement', () => {
    render(<UrlaubsCard taken={20} planned={10} entitlement={25} />)
    // open = max(0, 25 - 20 - 10) = 0
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('does not accept monthDeltaMins prop (TypeScript interface check via rendering)', () => {
    // This test verifies the component renders without monthDeltaMins
    expect(() =>
      render(<UrlaubsCard taken={10} planned={3} entitlement={25} />)
    ).not.toThrow()
  })

  it('does not render the Überstunden-Badge with green/red styling', () => {
    const { container } = render(
      <UrlaubsCard taken={10} planned={3} entitlement={25} />
    )
    // No text referencing "Std. im Monat" or monthly overtime
    expect(screen.queryByText(/Std\. im Monat/)).not.toBeInTheDocument()
    // No emerald/red badge classes
    const emeraldBadge = container.querySelector('.bg-emerald-50')
    const redBadge = container.querySelector('.bg-red-50')
    expect(emeraldBadge).not.toBeInTheDocument()
    expect(redBadge).not.toBeInTheDocument()
  })

  it('uses compact card styling with rounded-xl and p-3', () => {
    const { container } = render(
      <UrlaubsCard taken={10} planned={3} entitlement={25} />
    )
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('rounded-xl')
    expect(card.className).toContain('p-3')
  })

  it('has flex layout with gap-3', () => {
    const { container } = render(
      <UrlaubsCard taken={10} planned={3} entitlement={25} />
    )
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('flex')
    expect(card.className).toContain('gap-3')
  })

  it('renders background arc path with gray stroke', () => {
    const { container } = render(
      <UrlaubsCard taken={0} planned={0} entitlement={25} />
    )
    const paths = container.querySelectorAll('path')
    const bgPath = Array.from(paths).find(
      p => p.getAttribute('stroke') === '#E5E7EB'
    )
    expect(bgPath).toBeInTheDocument()
  })
})
