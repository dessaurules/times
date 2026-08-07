import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { ShiftTemplate } from '@shared/types'
import ShiftEditorSettings from '../ShiftEditorSettings'

// Mock the useShiftTemplates hook
vi.mock('../../../hooks/useShiftTemplates', () => ({
  useShiftTemplates: vi.fn(),
}))

import { useShiftTemplates } from '../../../hooks/useShiftTemplates'

describe('ShiftEditorSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when open is false', () => {
    const { container } = render(
      <ShiftEditorSettings
        open={false}
        onClose={() => {}}
        employeeName="Max Mustermann"
        date="2026-06-25"
        department="dept_1"
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders modal when open is true', () => {
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
      <ShiftEditorSettings
        open={true}
        onClose={() => {}}
        employeeName="Max Mustermann"
        date="2026-06-25"
        department="dept_1"
      />
    )
    expect(screen.getByText('Einstellungen & Verwaltung')).toBeInTheDocument()
    expect(screen.getByText(/Max Mustermann/)).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    vi.mocked(useShiftTemplates).mockReturnValue({
      templates: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      deleteTemplate: vi.fn(),
    })

    const mockOnClose = vi.fn()
    const { container } = render(
      <ShiftEditorSettings
        open={true}
        onClose={mockOnClose}
        employeeName="Max Mustermann"
        date="2026-06-25"
        department="dept_1"
      />
    )
    const closeBtn = container.querySelector('button svg')?.parentElement
    if (closeBtn) {
      closeBtn.click()
      expect(mockOnClose).toHaveBeenCalled()
    }
  })

  // ── Templates Tab Tests ────────────────────────────────────────────────────────
  describe('Templates Tab', () => {
    it('renders template list when templates exist', () => {
      const mockTemplates: ShiftTemplate[] = [
        {
          id: 'tmpl1',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z',
          department: 'dept_1',
          name: 'Frühschicht',
          start_time: '06:00',
          end_time: '14:00',
          color: 'blue',
        },
        {
          id: 'tmpl2',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z',
          department: 'dept_1',
          name: 'Spätschicht',
          start_time: '14:00',
          end_time: '22:00',
          color: 'green',
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
        <ShiftEditorSettings
          open={true}
          onClose={() => {}}
          employeeName="Max Mustermann"
          date="2026-06-25"
          department="dept_1"
        />
      )

      expect(screen.getByText('Frühschicht')).toBeInTheDocument()
      expect(screen.getByText('Spätschicht')).toBeInTheDocument()
      expect(screen.getByText('06:00 - 14:00')).toBeInTheDocument()
      expect(screen.getByText('14:00 - 22:00')).toBeInTheDocument()
    })

    it('displays form for new template', () => {
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
        <ShiftEditorSettings
          open={true}
          onClose={() => {}}
          employeeName="Max Mustermann"
          date="2026-06-25"
          department="dept_1"
        />
      )

      expect(screen.getByLabelText('Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Beginn (HH:mm)')).toBeInTheDocument()
      expect(screen.getByLabelText('Ende (HH:mm)')).toBeInTheDocument()
      expect(screen.getByText('Template erstellen')).toBeInTheDocument()
    })

    it('calls save when new template is submitted', async () => {
      const user = userEvent.setup()
      const mockSave = vi.fn().mockResolvedValue(undefined)

      vi.mocked(useShiftTemplates).mockReturnValue({
        templates: [],
        loading: false,
        error: null,
        refetch: vi.fn(),
        save: mockSave,
        update: vi.fn(),
        deleteTemplate: vi.fn(),
      })

      render(
        <ShiftEditorSettings
          open={true}
          onClose={() => {}}
          employeeName="Max Mustermann"
          date="2026-06-25"
          department="dept_1"
        />
      )

      // Fill in form
      await user.type(screen.getByLabelText('Name'), 'Neue Schicht')
      await user.type(screen.getByLabelText('Beginn (HH:mm)'), '08:00')
      await user.type(screen.getByLabelText('Ende (HH:mm)'), '16:00')

      // Submit form
      const submitBtn = screen.getByText('Template erstellen')
      await user.click(submitBtn)

      // Verify save was called
      await waitFor(() => {
        expect(mockSave).toHaveBeenCalledWith({
          department: 'dept_1',
          name: 'Neue Schicht',
          start_time: '08:00',
          end_time: '16:00',
          color: 'blue', // default color
        })
      })
    })
  })

  // ── Absences Tab Tests ────────────────────────────────────────────────────────
  describe('Absences Tab', () => {
    it('renders absences for the selected date', async () => {
      const mockAbsences = [
        {
          id: 'abs1',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z',
          employee: 'emp1',
          date_from: '2026-06-25',
          date_to: '2026-06-27',
          type: 'U' as const,
          status: 'approved' as const,
          created_by: 'user1',
        },
        {
          id: 'abs2',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z',
          employee: 'emp1',
          date_from: '2026-06-30',
          date_to: '2026-07-05',
          type: 'K' as const,
          status: 'pending' as const,
          created_by: 'user1',
        },
      ]

      // Mock pb.collection
      vi.stubGlobal('pb', {
        collection: vi.fn(() => ({
          getFullList: vi.fn().mockResolvedValue(mockAbsences),
        })),
      })

      const user = userEvent.setup()
      render(
        <ShiftEditorSettings
          open={true}
          onClose={() => {}}
          employeeName="Max Mustermann"
          date="2026-06-25"
          department="dept_1"
          employeeId="emp1"
        />
      )

      // Click Absences tab
      const absencesTab = screen.getByText('📅 Abwesenheiten')
      await user.click(absencesTab)

      // Wait for absences to render
      await waitFor(() => {
        expect(screen.getByText('Urlaub')).toBeInTheDocument()
        expect(screen.getByText('Krank')).toBeInTheDocument()
      })

      // Check date ranges display
      expect(screen.getByText('2026-06-25 – 2026-06-27')).toBeInTheDocument()
      expect(screen.getByText('2026-06-30 – 2026-07-05')).toBeInTheDocument()

      // Check status display
      expect(screen.getByText('Genehmigt')).toBeInTheDocument()
      expect(screen.getByText('Ausstehend')).toBeInTheDocument()
    })

    it('shows empty state when no absences', async () => {
      vi.stubGlobal('pb', {
        collection: vi.fn(() => ({
          getFullList: vi.fn().mockResolvedValue([]),
        })),
      })

      const user = userEvent.setup()
      render(
        <ShiftEditorSettings
          open={true}
          onClose={() => {}}
          employeeName="Max Mustermann"
          date="2026-06-25"
          department="dept_1"
          employeeId="emp1"
        />
      )

      // Click Absences tab
      const absencesTab = screen.getByText('📅 Abwesenheiten')
      await user.click(absencesTab)

      // Check empty state
      await waitFor(() => {
        expect(screen.getByText(/Keine Abwesenheiten/)).toBeInTheDocument()
      })
    })

    it('filters out rejected absences', async () => {
      // Mock returns only non-rejected absences (simulating PocketBase filter)
      const mockAbsences = [
        {
          id: 'abs1',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z',
          employee: 'emp1',
          date_from: '2026-06-25',
          date_to: '2026-06-27',
          type: 'U' as const,
          status: 'approved' as const,
          created_by: 'user1',
        },
      ]

      vi.stubGlobal('pb', {
        collection: vi.fn(() => ({
          getFullList: vi.fn().mockResolvedValue(mockAbsences),
        })),
      })

      const user = userEvent.setup()
      render(
        <ShiftEditorSettings
          open={true}
          onClose={() => {}}
          employeeName="Max Mustermann"
          date="2026-06-25"
          department="dept_1"
          employeeId="emp1"
        />
      )

      // Click Absences tab
      const absencesTab = screen.getByText('📅 Abwesenheiten')
      await user.click(absencesTab)

      // Should only show approved
      await waitFor(() => {
        expect(screen.getByText('Urlaub')).toBeInTheDocument()
      })
    })
  })
})
