import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import UrlaubsCard from '../UrlaubsCard'

describe('UrlaubsCard (red/green ring with toggle)', () => {
  it('renders SVG gauge with correct dimensions (3/4 circle)', () => {
    const { container } = render(
      <UrlaubsCard taken={10} planned={3} entitlement={25} />
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('width', '64')
    expect(svg).toHaveAttribute('height', '56')
    expect(svg).toHaveAttribute('viewBox', '0 0 88 64')
  })

  it('shows open days count', () => {
    render(<UrlaubsCard taken={10} planned={3} entitlement={25} />)
    // open = 25 - 10 - 3 = 12
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('shows "verfügbar" label in default mode', () => {
    render(<UrlaubsCard taken={10} planned={3} entitlement={25} />)
    expect(screen.getByText('verfügbar')).toBeInTheDocument()
  })

  it('shows year header', () => {
    render(<UrlaubsCard taken={10} planned={3} entitlement={25} />)
    const year = new Date().getFullYear()
    expect(screen.getByText(`Urlaub ${year}`)).toBeInTheDocument()
  })

  it('renders red gradient for taken days', () => {
    const { container } = render(
      <UrlaubsCard taken={10} planned={0} entitlement={25} />
    )
    const gradient = container.querySelector('#gRed')
    expect(gradient).toBeInTheDocument()
    const stops = gradient?.querySelectorAll('stop')
    expect(stops?.[0]).toHaveAttribute('stop-color', '#DC2626')
    expect(stops?.[1]).toHaveAttribute('stop-color', '#EF4444')
  })

  it('renders red arc when taken > 0', () => {
    const { container } = render(
      <UrlaubsCard taken={5} planned={3} entitlement={25} />
    )
    const paths = container.querySelectorAll('path')
    const redPath = Array.from(paths).find(
      p => p.getAttribute('stroke') === 'url(#gRed)'
    )
    expect(redPath).toBeInTheDocument()
  })

  it('does not render red arc when taken is 0', () => {
    const { container } = render(
      <UrlaubsCard taken={0} planned={3} entitlement={25} />
    )
    const paths = container.querySelectorAll('path')
    const redPath = Array.from(paths).find(
      p => p.getAttribute('stroke') === 'url(#gRed)'
    )
    expect(redPath).toBeUndefined()
  })

  it('renders green arc for free days (open + planned)', () => {
    const { container } = render(
      <UrlaubsCard taken={5} planned={3} entitlement={25} />
    )
    const paths = container.querySelectorAll('path')
    const greenPath = Array.from(paths).find(
      p => p.getAttribute('stroke') === '#10B981'
    )
    expect(greenPath).toBeInTheDocument()
  })

  it('does not render green arc when open and planned are both 0', () => {
    const { container } = render(
      <UrlaubsCard taken={25} planned={0} entitlement={25} />
    )
    const paths = container.querySelectorAll('path')
    const greenPath = Array.from(paths).find(
      p => p.getAttribute('stroke') === '#10B981'
    )
    expect(greenPath).toBeUndefined()
  })

  it('clamps open days to 0 when taken + planned exceeds entitlement', () => {
    render(<UrlaubsCard taken={20} planned={10} entitlement={25} />)
    // open = max(0, 25 - 20 - 10) = 0
    expect(screen.getByText('0')).toBeInTheDocument()
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

  it('does not render amber stroke (old design removed)', () => {
    const { container } = render(
      <UrlaubsCard taken={5} planned={3} entitlement={25} />
    )
    const paths = container.querySelectorAll('path')
    const amberPath = Array.from(paths).find(
      p => p.getAttribute('stroke') === '#F59E0B'
    )
    expect(amberPath).toBeUndefined()
  })

  it('does not render old indigo gradient', () => {
    const { container } = render(
      <UrlaubsCard taken={10} planned={3} entitlement={25} />
    )
    const oldGradient = container.querySelector('#gaugeGradUrlaub')
    expect(oldGradient).not.toBeInTheDocument()
  })

  it('shows "verfügbar" in default available mode', () => {
    render(<UrlaubsCard taken={8} planned={2} entitlement={30} />)
    expect(screen.getByText('verfügbar')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
  })

  it('toggles to "genommen" mode on click', async () => {
    const { container } = render(
      <UrlaubsCard taken={8} planned={2} entitlement={30} />
    )
    const card = container.firstChild as HTMLElement
    fireEvent.click(card)
    expect(screen.getByText('genommen')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('toggles back to "verfügbar" mode on second click', async () => {
    const { container } = render(
      <UrlaubsCard taken={8} planned={2} entitlement={30} />
    )
    const card = container.firstChild as HTMLElement
    fireEvent.click(card)
    fireEvent.click(card)
    expect(screen.getByText('verfügbar')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
  })

  it('shows numbers in format "X / Y Tage"', () => {
    render(<UrlaubsCard taken={8} planned={2} entitlement={30} />)
    expect(screen.getByText('30 Tage')).toBeInTheDocument()
  })

  it('is clickable with cursor-pointer styling', () => {
    const { container } = render(
      <UrlaubsCard taken={10} planned={3} entitlement={25} />
    )
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('cursor-pointer')
  })
})
