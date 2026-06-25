import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    const user = userEvent.setup()
    const onSave = vi.fn()
    const onClose = vi.fn()

    render(
      <ShiftEditor
        {...defaultProps}
        onSave={onSave}
        onClose={onClose}
      />
    )

    // Click the Krank (K) absence button with emoji
    const krankBtn = screen.getByText(/🏥.*Krank/)
    await user.click(krankBtn)

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          note: expect.stringMatching(/Krank/)
        })
      )
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('should save template data when template clicked', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const onClose = vi.fn()

    render(
      <ShiftEditor
        {...defaultProps}
        onSave={onSave}
        onClose={onClose}
      />
    )

    await user.click(screen.getByText('10-19'))

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
    const user = userEvent.setup()
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
    await user.clear(startInputs[0])
    await user.type(startInputs[0], '09:00')

    const endInputs = screen.getAllByDisplayValue('16:00')
    await user.clear(endInputs[0])
    await user.type(endInputs[0], '17:00')

    await user.click(screen.getByText('Speichern'))

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

  it('should schedule multi-shift (Shift 1 + 2) correctly', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const onClose = vi.fn()

    render(
      <ShiftEditor
        {...defaultProps}
        onSave={onSave}
        onClose={onClose}
      />
    )

    // Ensure Freier Tag is NOT checked
    const freierTagCheckbox = screen.getByRole('checkbox', { name: /Freier Tag/i })
    if (freierTagCheckbox.checked) {
      await user.click(freierTagCheckbox)
    }

    // Set Shift 1
    const startInputs = screen.getAllByDisplayValue('08:00')
    await user.clear(startInputs[0])
    await user.type(startInputs[0], '08:30')

    const endInputs = screen.getAllByDisplayValue('16:00')
    await user.clear(endInputs[0])
    await user.type(endInputs[0], '15:30')

    // Expand Shift 2
    const expandBtn = screen.getByText(/Zweite Schicht hinzufügen/)
    await user.click(expandBtn)

    // Wait for Shift 2 fields to appear
    await waitFor(() => {
      expect(screen.getByText(/Zweite Schicht entfernen/)).toBeInTheDocument()
    })

    // Set Shift 2 (fields should be different now)
    const startInputs2 = screen.getAllByDisplayValue('18:00')
    await user.clear(startInputs2[0])
    await user.type(startInputs2[0], '17:00')

    const endInputs2 = screen.getAllByDisplayValue('23:00')
    await user.clear(endInputs2[0])
    await user.type(endInputs2[0], '22:00')

    // Save
    await user.click(screen.getByText('Speichern'))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          start_time: '08:30',
          end_time: '15:30',
          start_time2: '17:00',
          end_time2: '22:00',
        })
      )
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('should open settings modal when gear icon is clicked', async () => {
    const user = userEvent.setup()

    render(
      <ShiftEditor
        {...defaultProps}
        employeeId="emp_123"
        date="2026-06-25"
      />
    )

    const gearButton = screen.getByRole('button', { name: /Einstellungen/i })
    await user.click(gearButton)

    await waitFor(() => {
      expect(screen.getByText('Einstellungen & Verwaltung')).toBeInTheDocument()
    })
  })
})
