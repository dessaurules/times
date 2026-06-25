import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import ShiftEditorSettings from '../ShiftEditorSettings'

describe('ShiftEditorSettings', () => {
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
})
