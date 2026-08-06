import { useState, useEffect } from 'react'
import { pb } from '@/lib/pb'

export interface Assignment {
  id: string
  task_id: string
  user_id: string
  status: 'active' | 'completed' | 'rejected' | 'expired'
  expires_at: string
  expand?: {
    task_id?: { title: string; points: number; requires_media: boolean }
  }
}

interface UseAssignmentsReturn {
  assignments: Assignment[]
  loading: boolean
}

export function useAssignments(): UseAssignmentsReturn {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    const loadAssignments = async () => {
      try {
        // Check if user is authenticated
        if (!pb.authStore.record) {
          setLoading(false)
          return
        }

        const records = await pb.collection('gam_assignments').getFullList({
          filter: `user_id = "${pb.authStore.record.id}"`,
          expand: 'task_id',
          sort: '-created',
        })

        setAssignments(records as unknown as Assignment[])
      } catch (err) {
        console.error('[useAssignments]', err)
        setAssignments([])
      } finally {
        setLoading(false)
      }
    }

    const subscribeToAssignments = async () => {
      try {
        if (!pb.authStore.record) {
          return
        }

        const currentUserId = pb.authStore.record.id

        unsubscribe = await pb.collection('gam_assignments').subscribe('*', (e) => {
          const record = e.record as unknown as Assignment

          // Only update if this assignment belongs to current user
          if (record.user_id === currentUserId) {
            setAssignments((prev) => {
              const existingIndex = prev.findIndex((a) => a.id === record.id)

              if (existingIndex >= 0) {
                // Update existing assignment
                const updated = [...prev]
                updated[existingIndex] = record
                return updated
              } else {
                // Add new assignment
                return [record, ...prev]
              }
            })
          }
        })
      } catch (err) {
        console.error('[useAssignments] subscription error', err)
      }
    }

    loadAssignments().then(() => {
      subscribeToAssignments()
    })

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])

  // Helper function to check if assignment is expired (lazy evaluation)
  const getAssignmentStatus = (assignment: Assignment): Assignment['status'] => {
    if (assignment.status !== 'active') {
      return assignment.status
    }

    if (assignment.expires_at && new Date(assignment.expires_at) < new Date()) {
      return 'expired'
    }

    return 'active'
  }

  // Return assignments with lazy-evaluated expired status
  const assignmentsWithStatus = assignments.map((a) => ({
    ...a,
    status: getAssignmentStatus(a),
  }))

  return {
    assignments: assignmentsWithStatus,
    loading,
  }
}
