import { pb } from './pb'
import type { NotifType } from '@shared/types'

export async function notifyEmployee(
  employeeId: string,
  type: NotifType,
  title: string,
  message: string,
  referenceId?: string,
) {
  try {
    const empUser = await pb.collection('users').getFirstListItem(
      `employee = "${employeeId}"`,
      { requestKey: null },
    )
    await pb.collection('notifications').create({
      user:         empUser.id,
      title,
      message,
      type,
      read:         false,
      reference_id: referenceId,
    }, { requestKey: null })
  } catch {
    // Mitarbeiter hat möglicherweise noch keinen verknüpften Account
  }
}
