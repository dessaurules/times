import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { GemSignal } from '../GemSignal'

describe('GemSignal', () => {
  it('ruht grau und ohne Glanzstrich', () => {
    const { container } = render(<GemSignal sparkle={false} />)

    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg?.getAttribute('class')).toContain('text-gray-500')
    expect(container.querySelector('.gem-sweep')).not.toBeInTheDocument()
  })

  it('faerbt sich indigo und zeigt den Glanzstrich', () => {
    const { container } = render(<GemSignal sparkle={true} />)

    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('class')).toContain('text-[#4F46E5]')

    const sweep = container.querySelector('.gem-sweep')
    expect(sweep).toBeInTheDocument()
    expect(sweep?.getAttribute('stroke-dasharray')).toBe('18 82')
  })

  it('behaelt die drei Grundpfade des Diamanten in beiden Zustaenden', () => {
    const ruhig = render(<GemSignal sparkle={false} />).container
    const aktiv = render(<GemSignal sparkle={true} />).container

    expect(ruhig.querySelectorAll('path')).toHaveLength(3)
    expect(aktiv.querySelectorAll('path')).toHaveLength(4)
  })
})
