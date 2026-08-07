import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const emblaApiMock = {
  scrollTo: vi.fn(),
  selectedScrollSnap: vi.fn(() => 0),
  on: vi.fn(),
  off: vi.fn(),
}

vi.mock('embla-carousel-react', () => ({
  default: () => [vi.fn(), emblaApiMock],
}))

import ZeitenCarousel from '../ZeitenCarousel'

describe('ZeitenCarousel', () => {
  const slides = [
    { key: 'a', label: 'Täglich', content: <div>Tagesinhalt</div> },
    { key: 'b', label: 'Wöchentlich', content: <div>Wocheninhalt</div> },
    { key: 'c', label: 'Monatlich', content: <div>Monatsinhalt</div> },
  ]

  beforeEach(() => {
    emblaApiMock.scrollTo.mockClear()
    emblaApiMock.selectedScrollSnap.mockReturnValue(0)
    emblaApiMock.on.mockClear()
    emblaApiMock.off.mockClear()
  })

  it('rendert alle drei Titel und Karteninhalte', () => {
    render(<ZeitenCarousel slides={slides} />)
    expect(screen.getByText('Täglich')).toBeInTheDocument()
    expect(screen.getByText('Wöchentlich')).toBeInTheDocument()
    expect(screen.getByText('Monatlich')).toBeInTheDocument()
    expect(screen.getByText('Tagesinhalt')).toBeInTheDocument()
    expect(screen.getByText('Wocheninhalt')).toBeInTheDocument()
    expect(screen.getByText('Monatsinhalt')).toBeInTheDocument()
  })

  it('hebt standardmäßig den ersten Titel hervor', () => {
    render(<ZeitenCarousel slides={slides} />)
    expect(screen.getByText('Täglich')).toHaveClass('text-indigo-600')
    expect(screen.getByText('Wöchentlich')).not.toHaveClass('text-indigo-600')
  })

  it('startet bei initialIndex, falls gesetzt', () => {
    render(<ZeitenCarousel slides={slides} initialIndex={1} />)
    expect(screen.getByText('Wöchentlich')).toHaveClass('text-indigo-600')
  })

  it('scrollt zur geklickten Karte', () => {
    render(<ZeitenCarousel slides={slides} />)
    fireEvent.click(screen.getByText('Monatlich'))
    expect(emblaApiMock.scrollTo).toHaveBeenCalledWith(2)
  })

  it('hebt den Titel hervor, wenn embla eine neue Karte meldet (z.B. nach Wisch-Geste)', () => {
    render(<ZeitenCarousel slides={slides} />)
    const selectCb = emblaApiMock.on.mock.calls.find(([evt]) => evt === 'select')?.[1] as () => void
    emblaApiMock.selectedScrollSnap.mockReturnValue(2)
    act(() => selectCb())
    expect(screen.getByText('Monatlich')).toHaveClass('text-indigo-600')
  })

  it('rendert einen Dot pro Karte, aktiver Dot ist breiter', () => {
    render(<ZeitenCarousel slides={slides} />)
    const dots = screen.getAllByRole('button', { name: /wechseln/i })
    expect(dots).toHaveLength(3)
    expect(dots[0]).toHaveClass('w-4')
    expect(dots[1]).not.toHaveClass('w-4')
  })
})
