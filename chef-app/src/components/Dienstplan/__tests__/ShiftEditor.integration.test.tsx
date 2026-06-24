import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ShiftEditor from '../ShiftEditor'
import type { ShiftTemplate } from '@shared/types'

// Mock the useShiftTemplates hook
vi.mock('@/hooks/useShiftTemplates', () => ({
  useShiftTemplates: vi.fn(),
}))

import { useShiftTemplates } from '@/hooks/useShiftTemplates'

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

const defaultHookReturn = {
  templates: mockTemplates,
  loading: false,
  error: null,
  refetch: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
  deleteTemplate: vi.fn(),
}

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onSave: vi.fn(),
  employeeName: 'Max Mustermann',
  dayLabel: 'Mo 01.01.',
  department: 'dept_1',
}

describe('ShiftEditor Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useShiftTemplates as ReturnType<typeof vi.fn>).mockReturnValue(defaultHookReturn)
  })

  it('should save immediately when absence button clicked', async () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    render(
      <ShiftEditor
        {...defaultProps}
        onSave={onSave}
        onClose={onClose}
      />
    )

    fireEvent.click(screen.getByText('K'))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled()
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('should save template data when template clicked', async () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    render(
      <ShiftEditor
        {...defaultProps}
        onSave={onSave}
        onClose={onClose}
      />
    )

    fireEvent.click(screen.getByText('10-19'))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          start_time: '10:00',
          end_time: '19:00',
          color: 'blue',
        })
      )
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('should still allow manual input', async () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    render(
      <ShiftEditor
        {...defaultProps}
        onSave={onSave}
        onClose={onClose}
      />
    )

    const startInputs = screen.getAllByDisplayValue('08:00')
    fireEvent.change(startInputs[0], { target: { value: '09:00' } })

    const endInputs = screen.getAllByDisplayValue('16:00')
    fireEvent.change(endInputs[0], { target: { value: '17:00' } })

    fireEvent.click(screen.getByText('Speichern'))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          start_time: '09:00',
          end_time: '17:00',
        })
      )
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('should open template manager when plus button clicked', async () => {
    render(<ShiftEditor {...defaultProps} />)

    // The plus button is rendered by ShiftTemplateQuickButtons when onManage is provided
    const plusButton = screen.getByRole('button', { name: '+' })
    fireEvent.click(plusButton)

    await waitFor(() => {
      expect(screen.getByText('Schicht-Vorlagen verwalten')).toBeInTheDocument()
    })
  })
})
