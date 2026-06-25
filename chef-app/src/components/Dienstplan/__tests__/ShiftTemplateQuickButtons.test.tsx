import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ShiftTemplateQuickButtons from '../ShiftTemplateQuickButtons'
import type { ShiftTemplate } from '@shared/types'

const mockTemplates: ShiftTemplate[] = [
  {
    id: 'tpl_1',
    department: 'dept_1',
    name: '10-19',
    start_time: '10:00',
    end_time: '19:00',
    color: 'blue',
    sort_order: 1,
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z',
  },
]

describe('ShiftTemplateQuickButtons', () => {
  it('should render absence buttons', () => {
    render(<ShiftTemplateQuickButtons templates={[]} onSelect={vi.fn()} />)
    expect(screen.getByText('K')).toBeInTheDocument()
    expect(screen.getByText('U')).toBeInTheDocument()
    expect(screen.getByText('S')).toBeInTheDocument()
    expect(screen.getByText('F')).toBeInTheDocument()
  })

  it('should render custom templates', () => {
    render(<ShiftTemplateQuickButtons templates={mockTemplates} onSelect={vi.fn()} />)
    expect(screen.getByText('10-19')).toBeInTheDocument()
    expect(screen.getByText('10:00–19:00')).toBeInTheDocument()
  })

  it('should call onSelect when absence clicked', () => {
    const onSelect = vi.fn()
    render(<ShiftTemplateQuickButtons templates={[]} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('K'))
    expect(onSelect).toHaveBeenCalledWith('absence_krank', { is_free_day: false, absence_type: 'K' })
  })

  it('should call onSelect when template clicked', () => {
    const onSelect = vi.fn()
    render(<ShiftTemplateQuickButtons templates={mockTemplates} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('10-19'))
    expect(onSelect).toHaveBeenCalledWith('tpl_1', {
      start_time: '10:00',
      end_time: '19:00',
      color: 'blue',
      is_free_day: false,
    })
  })

  it('should render plus button for manage templates', () => {
    render(
      <ShiftTemplateQuickButtons
        templates={mockTemplates}
        onSelect={vi.fn()}
        onManage={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument()
  })

  it('should call onManage when plus clicked', () => {
    const onManage = vi.fn()
    render(
      <ShiftTemplateQuickButtons
        templates={mockTemplates}
        onSelect={vi.fn()}
        onManage={onManage}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '+' }))
    expect(onManage).toHaveBeenCalled()
  })
})
