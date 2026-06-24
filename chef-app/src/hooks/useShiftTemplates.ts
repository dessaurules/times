import { useState, useEffect, useCallback } from 'react'
import { pb } from '../lib/pb'
import type { ShiftTemplate } from '@shared/types'

interface UseShiftTemplatesReturn {
  templates: ShiftTemplate[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  save: (template: Omit<ShiftTemplate, 'id' | 'created' | 'updated'>) => Promise<void>
  update: (id: string, template: Partial<Omit<ShiftTemplate, 'id' | 'created' | 'updated'>>) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
}

export function useShiftTemplates(deptId: string): UseShiftTemplatesReturn {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await pb.collection('shift_templates').getFullList({
        filter: `department = "${deptId}"`,
        sort: '+sort_order,+name',
      })
      setTemplates(result as unknown as ShiftTemplate[])
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [deptId])

  useEffect(() => {
    refetch()
  }, [refetch])

  const save = useCallback(
    async (template: Omit<ShiftTemplate, 'id' | 'created' | 'updated'>) => {
      await pb.collection('shift_templates').create(template)
      await refetch()
    },
    [refetch]
  )

  const update = useCallback(
    async (id: string, template: Partial<Omit<ShiftTemplate, 'id' | 'created' | 'updated'>>) => {
      await pb.collection('shift_templates').update(id, template)
      await refetch()
    },
    [refetch]
  )

  const deleteTemplate = useCallback(
    async (id: string) => {
      await pb.collection('shift_templates').delete(id)
      await refetch()
    },
    [refetch]
  )

  return {
    templates,
    loading,
    error,
    refetch,
    save,
    update,
    deleteTemplate,
  }
}
