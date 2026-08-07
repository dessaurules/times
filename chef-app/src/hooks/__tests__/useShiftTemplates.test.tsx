import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { ShiftTemplate } from '@shared/types'

// vi.mock is hoisted, so we use vi.fn() directly inside the factory
// and access the mock via the imported module reference
vi.mock('../../lib/pb', () => ({
  pb: {
    collection: vi.fn().mockReturnValue({
      getFullList: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    }),
  },
}))

import { pb } from '../../lib/pb'
import { useShiftTemplates } from '../useShiftTemplates'

const mockTemplates: ShiftTemplate[] = [
  {
    id: 'tmpl1',
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z',
    department: 'dept1',
    name: 'Frühschicht',
    start_time: '06:00',
    end_time: '14:00',
    color: 'blue',
    sort_order: 1,
  },
  {
    id: 'tmpl2',
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z',
    department: 'dept1',
    name: 'Spätschicht',
    start_time: '14:00',
    end_time: '22:00',
    color: 'green',
    sort_order: 2,
  },
]

// Helper to access the collection mock methods
function getCollectionMock() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (pb.collection as any)()
}

describe('useShiftTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const col = getCollectionMock()
    col.getFullList.mockResolvedValue([...mockTemplates])
    col.create.mockResolvedValue({
      id: 'tmpl3',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
      department: 'dept1',
      name: 'Nachtschicht',
      start_time: '22:00',
      end_time: '06:00',
      color: 'purple',
      sort_order: 3,
    } as ShiftTemplate)
    col.delete.mockResolvedValue(undefined)
  })

  it('should load templates for department', async () => {
    const { result } = renderHook(() => useShiftTemplates('dept1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.templates.length).toBe(2)
    expect(result.current.error).toBeNull()

    const col = getCollectionMock()
    expect(col.getFullList).toHaveBeenCalledWith({
      filter: 'department = "dept1"',
      sort: '+sort_order,+name',
    })
  })

  it('should save new template', async () => {
    const col = getCollectionMock()

    // First load: 2 templates; after save refetch returns 3
    col.getFullList
      .mockResolvedValueOnce([...mockTemplates])
      .mockResolvedValueOnce([
        ...mockTemplates,
        {
          id: 'tmpl3',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z',
          department: 'dept1',
          name: 'Nachtschicht',
          start_time: '22:00',
          end_time: '06:00',
          color: 'purple',
          sort_order: 3,
        } as ShiftTemplate,
      ])

    const { result } = renderHook(() => useShiftTemplates('dept1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.templates.length).toBe(2)

    await result.current.save({
      department: 'dept1',
      name: 'Nachtschicht',
      start_time: '22:00',
      end_time: '06:00',
      color: 'purple',
      sort_order: 3,
    })

    await waitFor(() => {
      expect(result.current.templates.length).toBe(3)
    })

    expect(col.create).toHaveBeenCalledOnce()
  })

  it('should delete template', async () => {
    const col = getCollectionMock()

    // First load: 2 templates; after delete refetch returns 1
    col.getFullList
      .mockResolvedValueOnce([...mockTemplates])
      .mockResolvedValueOnce([mockTemplates[1]])

    const { result } = renderHook(() => useShiftTemplates('dept1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.templates.length).toBe(2)

    await result.current.deleteTemplate('tmpl1')

    await waitFor(() => {
      expect(result.current.templates.length).toBe(1)
    })

    expect(col.delete).toHaveBeenCalledWith('tmpl1')
  })

  it('should handle errors gracefully', async () => {
    const col = getCollectionMock()
    col.getFullList.mockRejectedValue(new Error('Invalid department ID'))

    const { result } = renderHook(() => useShiftTemplates('invalid-dept-id'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).not.toBeNull()
    expect(result.current.templates.length).toBe(0)
  })
})
