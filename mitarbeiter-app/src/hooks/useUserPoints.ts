import { useState, useEffect } from 'react'
import { pb } from '@/lib/pb'

interface UseUserPointsReturn {
  points: number
  loading: boolean
}

export function useUserPoints(): UseUserPointsReturn {
  const [points, setPoints] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    const loadUserPoints = async () => {
      try {
        // Check if user is authenticated
        if (!pb.authStore.record) {
          setLoading(false)
          return
        }

        const user = await pb.collection('users').getOne(pb.authStore.record.id)
        setPoints(user.get('points') ?? 0)
      } catch (err) {
        console.error('[useUserPoints]', err)
        setPoints(0)
      } finally {
        setLoading(false)
      }
    }

    const subscribeToUser = async () => {
      try {
        if (!pb.authStore.record) {
          return
        }

        unsubscribe = await pb.collection('users').subscribe(pb.authStore.record.id, (e) => {
          setPoints(e.record.get('points') ?? 0)
        })
      } catch (err) {
        console.error('[useUserPoints] subscription error', err)
      }
    }

    loadUserPoints().then(() => {
      subscribeToUser()
    })

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])

  return {
    points,
    loading,
  }
}
