import { useState, useEffect } from 'react'
import { pb } from '@/lib/pb'

interface UseGamificationEnabledReturn {
  enabled: boolean
  loading: boolean
}

/**
 * Auto-Cancellation des PocketBase-SDK ist kein Fehlerfall: ueberlappende
 * Anfragen brechen die aeltere ab. Wird das als echter Fehler behandelt,
 * entsteht derselbe Schaden wie beim Auth-Bug in Commit c74d7f4.
 */
function isAbort(err: unknown): boolean {
  return Boolean(
    err && typeof err === 'object' && 'isAbort' in err && (err as { isAbort?: boolean }).isAbort,
  )
}

export function useGamificationEnabled(): UseGamificationEnabledReturn {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    const loadGamificationSettings = async () => {
      try {
        const records = await pb.collection('gam_settings').getFullList({ requestKey: null })
        if (records.length > 0) {
          setEnabled(records[0].enabled ?? false)
        } else {
          setEnabled(false)
        }
      } catch (err) {
        if (isAbort(err)) return
        console.error('[useGamificationEnabled]', err)
        setEnabled(false)
      } finally {
        setLoading(false)
      }
    }

    const subscribeToSettings = async () => {
      try {
        unsubscribe = await pb.collection('gam_settings').subscribe('*', (e) => {
          setEnabled(e.record.enabled ?? false)
        }, { requestKey: null })
      } catch (err) {
        if (isAbort(err)) return
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
