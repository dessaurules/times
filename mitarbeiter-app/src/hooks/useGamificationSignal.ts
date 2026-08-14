import { useState, useEffect, useCallback } from 'react'
import { pb } from '@/lib/pb'
import { useGamificationEnabled } from './useGamificationEnabled'

/** Merker-Ersatz fuer "noch nie gesehen" — so bleibt der Filter in einem Codepfad. */
const EPOCH = '1970-01-01 00:00:00.000Z'

interface UseGamificationSignalReturn {
  sparkle: boolean
  markSeen: () => Promise<void>
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

export function useGamificationSignal(): UseGamificationSignalReturn {
  const { enabled } = useGamificationEnabled()
  const [seenAt, setSeenAt] = useState<string>(
    () => (pb.authStore.record?.gam_seen_at as string | undefined) ?? '',
  )
  const [hasNew, setHasNew] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const userId = pb.authStore.record?.id
    if (!userId) return

    let cancelled = false
    const since = seenAt || EPOCH

    const check = async () => {
      try {
        const [tasks, rewards, events] = await Promise.all([
          pb.collection('gam_tasks').getList(1, 1, {
            filter: `active = true && (expires_at = "" || expires_at > @now) && created > "${since}"`,
            requestKey: null,
          }),
          pb.collection('gam_rewards').getList(1, 1, {
            filter: `status = "active" && created > "${since}"`,
            requestKey: null,
          }),
          pb.collection('gam_events').getList(1, 1, {
            filter: `user_id = "${userId}" && (type = "submission_approved" || type = "reward_redeemed") && created > "${since}"`,
            requestKey: null,
          }),
        ])

        if (cancelled) return
        setHasNew(tasks.totalItems > 0 || rewards.totalItems > 0 || events.totalItems > 0)
      } catch (err) {
        if (cancelled || isAbort(err)) return
        // Ein verpasstes Funkeln ist harmlos, ein Fehler in der Kopfleiste nicht.
        setHasNew(false)
      }
    }

    check()

    return () => {
      cancelled = true
    }
  }, [enabled, seenAt])

  const markSeen = useCallback(async () => {
    // Format des Servers, nicht ISO mit "T": PocketBase speichert
    // "2026-08-14 15:50:00.000Z", und bei einem String-Vergleich sortiert
    // "T" hinter dem Leerzeichen — ein neuerer Datensatz gaelte als aelter.
    const jetzt = new Date().toISOString().replace('T', ' ')
    setSeenAt(jetzt)
    setHasNew(false)

    const userId = pb.authStore.record?.id
    if (!userId) return

    try {
      await pb.collection('users').update(userId, { gam_seen_at: jetzt }, { requestKey: null })
    } catch (err) {
      if (isAbort(err)) return
      // Der lokale Merker bleibt trotzdem gesetzt. Beim naechsten Laden kehrt
      // das Signal zurueck — lieber einmal zu viel als eine verschluckte Meldung.
      console.error('[useGamificationSignal] markSeen', err)
    }
  }, [])

  return {
    sparkle: hasNew,
    markSeen,
  }
}
