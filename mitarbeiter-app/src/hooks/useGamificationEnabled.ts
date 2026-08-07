import { useState, useEffect } from 'react'
import { pb } from '@/lib/pb'

interface UseGamificationEnabledReturn {
  enabled: boolean
  loading: boolean
}

export function useGamificationEnabled(): UseGamificationEnabledReturn {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    const loadGamificationSettings = async () => {
      try {
        const records = await pb.collection('gam_settings').getFullList({ limit: 1 })
        if (records.length > 0) {
          setEnabled(records[0].get('enabled') ?? false)
        } else {
          setEnabled(false)
        }
      } catch (err) {
        console.error('[useGamificationEnabled]', err)
        setEnabled(false)
      } finally {
        setLoading(false)
      }
    }

    const subscribeToSettings = async () => {
      try {
        unsubscribe = await pb.collection('gam_settings').subscribe('*', (e) => {
          setEnabled(e.record.get('enabled') ?? false)
        })
      } catch (err) {
        console.error('[useGamificationEnabled] subscription error', err)
      }
    }

    loadGamificationSettings().then(() => {
      subscribeToSettings()
    })

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])

  return {
    enabled,
    loading,
  }
}
