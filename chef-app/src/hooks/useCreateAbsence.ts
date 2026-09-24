import { pb } from '@/lib/pb'
import type { Absence, AbsenceType } from '@shared/types'
import { AUTO_APPROVED_TYPES } from '@shared/types'

export function useCreateAbsence() {
  const createAbsence = async (
    employeeId: string,
    dateFrom: string,    // ISO date (yyyy-MM-dd)
    dateTo: string,      // ISO date (yyyy-MM-dd)
    type: AbsenceType,
    userId: string       // User erstellt die Abwesenheit
  ): Promise<Absence> => {
    const status = AUTO_APPROVED_TYPES.includes(type) ? 'approved' : 'pending'
    const approvedAt = status === 'approved' ? new Date().toISOString() : undefined
    const approvedBy = status === 'approved' ? userId : undefined

    const absence = await pb.collection('absences').create<Absence>({
      employee: employeeId,
      date_from: dateFrom,
      date_to: dateTo,
      type,
      status,
      created_by: userId,
      approved_by: approvedBy,
      approved_at: approvedAt,
    })

    return absence
  }

  return { createAbsence }
}
