import { pb } from './pb'
import type { NotifType } from '@shared/types'

export async function notifyGF(
  title: string,
  message: string,
  type: NotifType = 'absence_request',
  referenceId?: string,
) {
  try {
    const gfUsers = await pb.collection('users').getFullList({
      filter:     'role = "gf"',
      requestKey: null,
    })
    await Promise.all(
      gfUsers.map(u =>
        pb.collection('notifications').create({
          user:         u.id,
          title,
          message,
          type,
          read:         false,
          reference_id: referenceId,
        }, { requestKey: null }).catch(() => {})
      )
    )
  } catch {
    // PocketBase-Regel erlaubt MA möglicherweise kein Listing von GF-Nutzern
  }
}
