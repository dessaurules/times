import { format, addDays } from 'date-fns'
import { de } from 'date-fns/locale'
import { pb, ensureAuth, sendPushToEmployee } from '../sender.js'

interface ShiftEntry {
  id: string; employee: string; date: string
  start_time: string; end_time: string
  expand?: { department?: { name: string } }
}

export async function sendMorgenErinnerung() {
  await ensureAuth()
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const shifts = await pb.collection('shift_entries').getFullList<ShiftEntry>({
    filter: `date = "${tomorrow}" && employee != "" && employee != null`,
    expand: 'department',
    requestKey: null,
  }).catch(() => [] as ShiftEntry[])

  const seen = new Set<string>()
  for (const shift of shifts) {
    if (seen.has(shift.employee)) continue
    seen.add(shift.employee)

    const start = shift.start_time.slice(0, 5)
    const end   = shift.end_time.slice(0, 5)
    const dept  = shift.expand?.department?.name ?? ''
    const dayLabel = format(addDays(new Date(), 1), 'EEEE', { locale: de })

    await sendPushToEmployee(
      shift.employee,
      `Schicht & Plan – Morgen 🌅`,
      `${dayLabel}: ${start}–${end} Uhr${dept ? ` (${dept})` : ''}. Gute Nacht! 😴`,
    )
  }
}
