import { useState, useEffect, useCallback } from 'react'
import { pb } from '@/lib/pb'
import { useGamificationEnabled } from './useGamificationEnabled'
import { useAssignments } from './useAssignments'

/** Merker-Ersatz fuer "noch nie gesehen" — so bleibt der Filter in einem Codepfad. */
const EPOCH = '1970-01-01 00:00:00.000Z'

/** Ab hier gilt eine Frist als knapp. Auftraege laufen 8 Stunden. */
const EXPIRY_WARNING_MS = 60 * 60 * 1000
const TICK_MS = 60 * 1000

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
  const { assignments } = useAssignments()
  const [, tick] = useState(0)

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => tick((n) => n + 1), TICK_MS)
    return () => clearInterval(id)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    const userId = pb.authStore.record?.id
    if (!userId) return

    let cancelled = false
    const since = seenAt || EPOCH

    // Mit `requestKey: null` bricht das SDK ueberlappende Anfragen nicht mehr
    // ab. Feuern zwei Ereignisse kurz hintereinander, koennen sich die
    // Antworten ueberholen — die aeltere wuerde die neuere mit "kein Signal"
    // ueberschreiben. Nur die juengste Runde darf schreiben.
    let runde = 0

    const check = async () => {
      const meine = ++runde
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

        if (cancelled || meine !== runde) return
        setHasNew(tasks.totalItems > 0 || rewards.totalItems > 0 || events.totalItems > 0)
      } catch (err) {
        if (cancelled || meine !== runde || isAbort(err)) return
        // Ein verpasstes Funkeln ist harmlos, ein Fehler in der Kopfleiste nicht.
        setHasNew(false)
      }
    }

    check()

    const unsubs: Array<() => void> = []

    const abonniere = async () => {
      for (const name of ['gam_tasks', 'gam_rewards', 'gam_events'] as const) {
        try {
          const unsub = await pb.collection(name).subscribe(
            '*',
            (e) => {
              // Nur neue Datensaetze sind ein Signal: eine bestehende Aufgabe
              // zu bearbeiten aendert ihr `created` nicht.
              if (e.action === 'create') check()
            },
            { requestKey: null },
          )
          if (cancelled) {
            unsub()
            return
          }
          unsubs.push(unsub)
        } catch (err) {
          if (isAbort(err)) return
          // Ohne Subscription bleibt der Stand von `check()` stehen — das ist
          // schlechter als Live, aber besser als ein Fehler in der Kopfleiste.
        }
      }
    }

    abonniere()

    return () => {
      cancelled = true
      unsubs.forEach((unsub) => unsub())
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

  // Zustand, kein Ereignis: die Warnung ueberlebt markSeen und endet erst,
  // wenn der Auftrag eingereicht oder abgelaufen ist.
  const jetzt = Date.now()
  const deadlineNear = assignments.some((a) => {
    if (a.status !== 'active' || !a.expires_at) return false
    const rest = new Date(a.expires_at).getTime() - jetzt
    return rest > 0 && rest < EXPIRY_WARNING_MS
  })

  return {
    sparkle: hasNew || deadlineNear,
    markSeen,
  }
}
