import { format, parseISO, differenceInMinutes } from 'date-fns'
import { pb, ensureAuth, sendPushToEmployee } from '../sender.js'

const notifiedEntries = new Set<string>()
let lastReset = new Date().toDateString()

function resetIfNewDay() {
  const today = new Date().toDateString()
  if (today !== lastReset) { notifiedEntries.clear(); lastReset = today }
}

interface TimeEntry  { id: string; employee: string; start_time: string; end_time?: string }
interface ShiftEntry { id: string; employee: string; date: string; end_time: string }

export async function checkAusstempel() {
  resetIfNewDay()
  await ensureAuth()
  const today = format(new Date(), 'yyyy-MM-dd')
  const now   = new Date()

  const openEntries = await pb.collection('time_entries').getFullList<TimeEntry>({
    filter: `(end_time = "" || end_time = null) && start_time >= "${today} 00:00:00"`,
    requestKey: null,
  }).catch(() => [] as TimeEntry[])

  for (const entry of openEntries) {
    if (notifiedEntries.has(entry.id)) continue

    const shifts = await pb.collection('shift_entries').getFullList<ShiftEntry>({
      filter: `employee = "${entry.employee}" && date = "${today}"`,
      requestKey: null,
    }).catch(() => [] as ShiftEntry[])

    for (const shift of shifts) {
      const shiftEnd   = parseISO(`${today}T${shift.end_time}`)
      const minsAfter  = differenceInMinutes(now, shiftEnd)
      if (minsAfter < 30) continue

      const h = shift.end_time.slice(0, 5)
      await sendPushToEmployee(
        entry.employee,
        'Schicht & Plan – Erinnerung 🚪',
        `Deine Schicht endet um ${h} Uhr – bitte vergiss nicht auszustempeln!`,
      )
      notifiedEntries.add(entry.id)
    }
  }
}
