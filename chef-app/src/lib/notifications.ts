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
    // employeeId is already the users.id (after consolidation)
    await pb.collection('notifications').create({
      user:         employeeId,
      title,
      message,
      type,
      read:         false,
      reference_id: referenceId,
    }, { requestKey: null })
  } catch {
    // Notification creation failed (user might not exist or invalid data)
  }
}
