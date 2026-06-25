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

describe('Quick Select Sections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Quick Select section with Frei button and templates', () => {
    const mockTemplates = [
      {
        id: 'tmpl1',
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z',
        department: 'dept_1',
        name: 'Frühschicht',
        start_time: '06:00',
        end_time: '14:00',
        color: 'blue' as const,
      },
    ]

    vi.mocked(useShiftTemplates).mockReturnValue({
      templates: mockTemplates,
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

    // Check Quick Select section
    expect(screen.getByText('Quick Select')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /🌴.*Frei/ })).toBeInTheDocument()
    expect(screen.getByText('Frühschicht')).toBeInTheDocument()
  })

  it('renders Abwesenheiten section with 4 absence types', () => {
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

    expect(screen.getByText('Abwesenheiten')).toBeInTheDocument()
    // Check for emoji + label pairs
    expect(screen.getByText(/🏥.*Krank/)).toBeInTheDocument()
    expect(screen.getByText(/✈️.*Urlaub/)).toBeInTheDocument()
    expect(screen.getByText(/📚.*Schulung/)).toBeInTheDocument()
    expect(screen.getByText(/🩺.*Arzttermin/)).toBeInTheDocument()
  })
})

describe('Shift 2 Expandable Section', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows expand button initially', () => {
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

    expect(screen.getByText(/Zweite Schicht hinzufügen/)).toBeInTheDocument()
  })

  it('expands shift 2 section when button is clicked', async () => {
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
      />
    )

    const expandBtn = screen.getByText(/Zweite Schicht hinzufügen/)
    await user.click(expandBtn)

    // Should show shift 2 fields
    await waitFor(() => {
      expect(screen.getByText(/Zweite Schicht entfernen/)).toBeInTheDocument()
    })
  })

  it('collapses shift 2 section when button is clicked again', async () => {
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
        initial={{ start_time: '08:00', end_time: '16:00', color: 'blue', start_time2: '18:00', end_time2: '23:00', color2: 'purple' }}
      />
    )

    const collapseBtn = screen.getByText(/Zweite Schicht entfernen/)
    await user.click(collapseBtn)

    // Should show expand button again
    expect(screen.getByText(/Zweite Schicht hinzufügen/)).toBeInTheDocument()
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
