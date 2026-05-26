import { format, parseISO, differenceInMinutes } from 'date-fns'
import { pb, ensureAuth, sendPushToEmployee } from '../sender.js'

const notifiedToday = new Set<string>()
let lastReset = new Date().toDateString()

function resetIfNewDay() {
  const today = new Date().toDateString()
  if (today !== lastReset) { notifiedToday.clear(); lastReset = today }
}

interface ShiftEntry {
  id: string; employee: string; date: string; start_time: string; end_time: string
}
interface TimeEntry { id: string; employee: string; start_time: string }

export async function checkEinstempel() {
  resetIfNewDay()
  await ensureAuth()
  const today = format(new Date(), 'yyyy-MM-dd')
  const now   = new Date()

  const shifts = await pb.collection('shift_entries').getFullList<ShiftEntry>({
    filter: `date = "${today}" && employee != "" && employee != null`,
    requestKey: null,
  }).catch(() => [] as ShiftEntry[])

  for (const shift of shifts) {
    if (notifiedToday.has(shift.employee)) continue

    const shiftStart = parseISO(`${today}T${shift.start_time}`)
    const minsLate   = differenceInMinutes(now, shiftStart)
    if (minsLate < 20) continue

    const entries = await pb.collection('time_entries').getFullList<TimeEntry>({
      filter: `employee = "${shift.employee}" && start_time >= "${today} 00:00:00"`,
      requestKey: null,
    }).catch(() => [] as TimeEntry[])

    if (entries.length === 0) {
      const h = shift.start_time.slice(0, 5)
      await sendPushToEmployee(
        shift.employee,
        'Schicht & Plan – Erinnerung ⏰',
        `Du hast heute um ${h} Uhr Schichtbeginn – bitte vergiss nicht einzustempeln.`,
      )
      notifiedToday.add(shift.employee)
    }
  }
}
