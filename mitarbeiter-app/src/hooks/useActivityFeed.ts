import { useState, useEffect } from 'react'
import { pb } from '@/lib/pb'

export interface Event {
  id: string
  type: 'submission_approved' | 'reward_redeemed' | 'submission_rejected' | 'reward_rejected'
  user_id: string
  data?: Record<string, any>
  created: string
}

interface UseActivityFeedReturn {
  events: Event[]
  loading: boolean
}

const POSITIVE_EVENT_TYPES = ['submission_approved', 'reward_redeemed']

export function useActivityFeed(): UseActivityFeedReturn {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    const loadActivityFeed = async () => {
      try {
        // Check if user is authenticated
        if (!pb.authStore.record) {
          setLoading(false)
          return
        }

        const records = await pb.collection('gam_events').getFullList({
          filter: `user_id = "${pb.authStore.record.id}" && (type = "submission_approved" || type = "reward_redeemed")`,
          sort: '-created',
          limit: 50,
        })

        setEvents(records as unknown as Event[])
      } catch (err) {
        console.error('[useActivityFeed]', err)
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    const subscribeToActivityFeed = async () => {
      try {
        if (!pb.authStore.record) {
          return
        }

        const currentUserId = pb.authStore.record.id

        unsubscribe = await pb.collection('gam_events').subscribe('*', (e) => {
          const record = e.record as unknown as Event

          // Only add if event belongs to current user AND is a positive event type
          if (record.user_id === currentUserId && POSITIVE_EVENT_TYPES.includes(record.type)) {
            setEvents((prev) => [record, ...prev])
          }
        })
      } catch (err) {
        console.error('[useActivityFeed] subscription error', err)
      }
    }

    loadActivityFeed().then(() => {
      subscribeToActivityFeed()
    })

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])

  return {
    events,
    loading,
  }
}
