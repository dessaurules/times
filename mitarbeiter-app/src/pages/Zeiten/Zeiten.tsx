import { useState, useEffect } from 'react'
import { format, endOfDay, isWeekend, startOfYear, parseISO } from 'date-fns'
import { pb } from '../../lib/pb'
import { useAuthStore } from '../../stores/auth'
import { getHolidayDates } from '../../lib/holidays'
import type { TimeEntry } from '@shared/types'
import { cn } from '@/lib/utils'
import { netMins, fmtDuration, dailySollMins } from '../../lib/zeitenCalc'
import ZeitenCarousel from '../../components/ZeitenCarousel'
import TaeglichCard from './TaeglichCard'
import WoechentlichCard from './WoechentlichCard'
import MonatlichCard from './MonatlichCard'

export default function Zeiten() {
  const user       = useAuthStore(s => s.user)
  const employeeId = user?.id ?? ''

  const [fedState,        setFedState]        = useState('ST')
  const [allEntries,      setAllEntries]      = useState<TimeEntry[]>([])
  const [loadingOvertime, setLoadingOvertime] = useState(true)

  useEffect(() => {
    pb.collection('settings')
      .getFirstListItem<{ value: string }>('key = "federal_state"', { requestKey: null })
      .then(s => setFedState(s.value))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!employeeId) return
    setLoadingOvertime(true)
    const from = format(startOfYear(new Date()), "yyyy-MM-dd HH:mm:ss")
    const to   = format(endOfDay(new Date()), "yyyy-MM-dd HH:mm:ss")
    pb.collection('time_entries').getFullList<TimeEntry>({
      filter: `employee = "${employeeId}" && start_time >= "${from}" && start_time <= "${to}" && end_time != ""`,
      sort:   'start_time',
      requestKey: 'zeiten-all',
    }).then(setAllEntries)
      .catch(console.error)
      .finally(() => setLoadingOvertime(false))
  }, [employeeId])

  const weeklyHours = user?.weekly_hours ?? 40
  const sollPerDay  = dailySollMins(weeklyHours)

  const holidaysYear = getHolidayDates(new Date().getFullYear(), fedState)
  const overtimeMins = (() => {
    const dayMap = new Map<string, number>()
    for (const e of allEntries) {
      if (!e.end_time) continue
      const ds = e.start_time.slice(0, 10)
      dayMap.set(ds, (dayMap.get(ds) ?? 0) + netMins(e))
    }
    let total = 0
    for (const [ds, mins] of dayMap) {
      const d = parseISO(ds)
      if (!isWeekend(d) && !holidaysYear.has(ds)) {
        total += mins - sollPerDay
      }
    }
    return total
  })()

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-y-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-[#111827]">Meine Zeiten</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Deine Arbeitszeitnachweise</p>
        </div>

        {/* Überstunden-Kachel */}
        {!loadingOvertime && (
          <div className={cn(
            'px-4 py-2.5 rounded-xl text-right border',
            overtimeMins >= 0
              ? 'bg-emerald-50 border-emerald-100'
              : 'bg-red-50 border-red-100'
          )}>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] mb-0.5">
              Überstunden {new Date().getFullYear()}
            </div>
            <div className={cn(
              'text-lg font-bold tabular-nums',
              overtimeMins >= 0 ? 'text-emerald-700' : 'text-red-600'
            )}>
              {fmtDuration(overtimeMins, true)}
            </div>
          </div>
        )}
      </div>

      <ZeitenCarousel
        slides={[
          { key: 'taeglich',     label: 'Täglich',     content: <TaeglichCard employeeId={employeeId} fedState={fedState} weeklyHours={weeklyHours} /> },
          { key: 'woechentlich', label: 'Wöchentlich', content: <WoechentlichCard employeeId={employeeId} fedState={fedState} weeklyHours={weeklyHours} /> },
          { key: 'monatlich',    label: 'Monatlich',   content: <MonatlichCard employeeId={employeeId} fedState={fedState} weeklyHours={weeklyHours} /> },
        ]}
        initialIndex={0}
      />

      {/* Hinweis */}
      <p className="mt-4 text-xs text-[#9CA3AF] text-center">
        Korrekturen werden vom Betrieb vorgenommen.
      </p>
    </div>
  )
}
