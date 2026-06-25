import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ShiftEditor from '../ShiftEditor'

// Mock hooks
vi.mock('../../../hooks/useShiftTemplates', () => ({
  useShiftTemplates: vi.fn(),
}))

import { useShiftTemplates } from '../../../hooks/useShiftTemplates'

describe('ShiftEditor Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders header with two lines: title and employee/day info', () => {
    vi.mocked(useShiftTemplates).mockReturnValue({
      templates: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      deleteTemplate: vi.fn(),
    })

    render(
      <ShiftEditor
        open={true}
        onClose={() => {}}
        onSave={() => {}}
        employeeName="Max Mustermann"
        dayLabel="Mi, 25.06.2026"
        department="dept_1"
      />
    )

    expect(screen.getByText('Schicht eintragen')).toBeInTheDocument()
    expect(screen.getByText(/Max Mustermann · Mi, 25.06.2026/)).toBeInTheDocument()
  })

  it('renders gear icon button', () => {
    vi.mocked(useShiftTemplates).mockReturnValue({
      templates: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      deleteTemplate: vi.fn(),
    })

    render(
      <ShiftEditor
        open={true}
        onClose={() => {}}
        onSave={() => {}}
        employeeName="Max Mustermann"
        dayLabel="Mi, 25.06.2026"
        department="dept_1"
      />
    )

    const gearButton = screen.getByRole('button', { name: /Einstellungen/i })
    expect(gearButton).toBeInTheDocument()
  })
})
