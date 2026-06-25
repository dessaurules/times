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

describe('Settings Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens settings modal when gear button is clicked', async () => {
    const user = userEvent.setup()

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
        employeeId="emp_123"
        date="2026-06-25"
      />
    )

    const gearButton = screen.getByRole('button', { name: /Einstellungen/i })
    await user.click(gearButton)

    // Settings modal should render
    await waitFor(() => {
      expect(screen.getByText('Einstellungen & Verwaltung')).toBeInTheDocument()
    })
  })

  it('closes settings modal when close button is clicked', async () => {
    const user = userEvent.setup()

    vi.mocked(useShiftTemplates).mockReturnValue({
      templates: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      deleteTemplate: vi.fn(),
    })

    const { container } = render(
      <ShiftEditor
        open={true}
        onClose={() => {}}
        onSave={() => {}}
        employeeName="Max Mustermann"
        dayLabel="Mi, 25.06.2026"
        department="dept_1"
        employeeId="emp_123"
        date="2026-06-25"
      />
    )

    // Open modal
    const gearButton = screen.getByRole('button', { name: /Einstellungen/i })
    await user.click(gearButton)

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('Einstellungen & Verwaltung')).toBeInTheDocument()
    })

    // Find and click close button (X in modal header)
    const xButtons = container.querySelectorAll('button svg')
    const closeBtn = xButtons[xButtons.length - 1]?.parentElement
    if (closeBtn) {
      await user.click(closeBtn)
    }

    // Modal should be hidden
    await waitFor(() => {
      expect(screen.queryByText('Einstellungen & Verwaltung')).not.toBeInTheDocument()
    })
  })
})
