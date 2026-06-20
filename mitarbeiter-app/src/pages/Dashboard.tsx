import { useState, useEffect, useRef, useMemo } from 'react'
import { format, differenceInMinutes, parseISO, eachDayOfInterval, isWeekend, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { de } from 'date-fns/locale'
import { Clock, Plus } from 'lucide-react'
import { pb } from '../lib/pb'
import { useAuthStore } from '../stores/auth'
import type { TimeEntry, Absence, VacationAccount, Employee, AbsenceType } from '@shared/types'
import { VACATION_TYPES, ABSENCE_COLORS } from '@shared/types'
import { cn } from '@/lib/utils'
import AntragDialog from './Abwesenheiten/AntragDialog'
import { getHolidayDates } from '../lib/holidays'
import MonatsstundenGauge from '../components/MonatsstundenGauge'
import UrlaubsCard from '../components/UrlaubsCard'
import { SwipeButton } from '../components/SwipeButton'

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

type AbsenceGroup = {
  type: AbsenceType
  status: string
  dateFrom: string
  dateTo: string
  note?: string
}

function groupAbsences(absences: Absence[]): AbsenceGroup[] {
  const sorted = [...absences].sort((a, b) => a.date_from.localeCompare(b.date_from))
  const groups: AbsenceGroup[] = []

  for (const abs of sorted) {
    const last = groups[groups.length - 1]
    if (
      last &&
      last.type === abs.type &&
      last.status === abs.status &&
      daysBetween(last.dateTo, abs.date_from) <= 3
    ) {
      if (abs.date_to > last.dateTo) last.dateTo = abs.date_to
      if (!last.note && abs.note) last.note = abs.note
    } else {
      groups.push({ type: abs.type as AbsenceType, status: abs.status, dateFrom: abs.date_from, dateTo: abs.date_to, note: abs.note })
    }
  }

  return groups.reverse()
}

function formatDuration(mins: number) {
  const h = Math.floor(Math.abs(mins) / 60)
  const m = Math.abs(mins) % 60
  return `${h}:${String(m).padStart(2, '0')} h`
}

function minutesBetween(from: string, to: string | undefined) {
  const end = to ? parseISO(to) : new Date()
  return differenceInMinutes(end, parseISO(from))
}

function todayMins(entries: TimeEntry[]) {
  const today = format(new Date(), 'yyyy-MM-dd')
  return entries
    .filter(e => e.start_time.startsWith(today))
    .reduce((sum, e) => {
      const gross = minutesBetween(e.start_time, e.end_time)
      return sum + Math.max(0, gross - (e.break_minutes ?? 0))
    }, 0)
}

export default function Dashboard() {
  const user      = useAuthStore(s => s.user)
  const [emp,     setEmp]     = useState<Employee | null>(null)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [absences, setAbsences] = useState<Absence[]>([])
  const [vacAcc,  setVacAcc]  = useState<VacationAccount | null>(null)
  const [now,     setNow]     = useState(new Date())
  const [stamping, setStamping] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [showAntrag, setShowAntrag] = useState(false)
  const [stampProgress, setStampProgress] = useState(0)
  const [antragDate, setAntragDate] = useState<string | undefined>()
  const [fedState,   setFedState]   = useState('ST')
  const [viewMonth, setViewMonth] = useState(new Date())
  const [monthEntries, setMonthEntries] = useState<TimeEntry[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const employeeId = user?.employee
  const year       = now.getFullYear()

  useEffect(() => {
    pb.collection('settings').getFirstListItem<{ value: string }>('key = "federal_state"', { requestKey: null })
      .then(s => setFedState(s.value))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!employeeId) return

    Promise.all([
      pb.collection('employees').getOne<Employee>(employeeId, { requestKey: null }),
      pb.collection('time_entries').getFullList<TimeEntry>({
        filter: `employee = "${employeeId}"`,
        sort: '-start_time',
        perPage: 50,
        requestKey: null,
      }),
      pb.collection('absences').getFullList<Absence>({
        filter: `employee = "${employeeId}" && date_from >= "${year}-01-01" && date_to <= "${year}-12-31"`,
        sort: '-date_from',
        requestKey: null,
      }),
      pb.collection('vacation_accounts').getFirstListItem<VacationAccount>(
        `employee = "${employeeId}" && year = ${year}`,
        { requestKey: null }
      ).catch(() => null),
    ]).then(([e, te, ab, va]) => {
      setEmp(e)
      setEntries(te)
      setAbsences(ab)
      setVacAcc(va)
    }).catch(console.error)
  }, [employeeId, year])

  useEffect(() => {
    if (!employeeId) return
    const from = format(startOfMonth(viewMonth), 'yyyy-MM-dd')
    const to   = format(endOfMonth(viewMonth),   'yyyy-MM-dd')
    pb.collection('time_entries').getFullList<TimeEntry>({
      filter: `employee = "${employeeId}" && start_time >= "${from}" && start_time <= "${to} 23:59:59"`,
      sort: 'start_time',
      requestKey: null,
    }).then(setMonthEntries).catch(console.error)
  }, [employeeId, viewMonth])

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 10_000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const unsubTimeRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    if (!employeeId) return
    pb.collection('time_entries').subscribe<TimeEntry>('*', (e) => {
      if (e.record.employee !== employeeId) return
      if (e.action === 'create') {
        setEntries(prev => [e.record, ...prev])
      } else if (e.action === 'update') {
        setEntries(prev => prev.map(t => t.id === e.record.id ? e.record : t))
      } else if (e.action === 'delete') {
        setEntries(prev => prev.filter(t => t.id !== e.record.id))
      }
    }, { requestKey: null }).then(fn => { unsubTimeRef.current = fn })
    return () => { unsubTimeRef.current?.(); pb.collection('time_entries').unsubscribe('*') }
  }, [employeeId])

  const openEntry = entries.find(e => !e.end_time)
  const isStamped = !!openEntry

  async function handleStempel() {
    if (!employeeId || stamping) return
    setStamping(true)
    setError(null)
    try {
      if (isStamped && openEntry) {
        const updated = await pb.collection('time_entries').update<TimeEntry>(openEntry.id, {
          end_time: new Date().toISOString(),
        })
        setEntries(prev => prev.map(e => e.id === updated.id ? updated : e))
      } else {
        const created = await pb.collection('time_entries').create<TimeEntry>({
          employee:   employeeId,
          start_time: new Date().toISOString(),
        })
        setEntries(prev => [created, ...prev])
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setStamping(false)
    }
  }

  function handleAntragCreated(absence: Absence) {
    if (absence.date_from.startsWith(String(year))) {
      setAbsences(prev => [absence, ...prev].sort((a, b) => b.date_from.localeCompare(a.date_from)))
    }
  }

  const liveMins     = openEntry ? minutesBetween(openEntry.start_time, undefined) : 0
  const todayNetMins = isStamped
    ? todayMins(entries.filter(e => e.id !== openEntry!.id)) + Math.max(0, liveMins)
    : todayMins(entries)

  const holidays = useMemo(() => getHolidayDates(year, fedState), [year, fedState])

  const targetMins = useMemo(() => {
    const days = eachDayOfInterval({
      start: startOfMonth(viewMonth),
      end:   endOfMonth(viewMonth),
    }).filter(d => !isWeekend(d) && !holidays.has(format(d, 'yyyy-MM-dd')))
    return Math.round((emp?.weekly_hours ?? 0) / 5 * days.length * 60)
  }, [viewMonth, emp, holidays])

  const actualMonthMins = useMemo(() => {
    return monthEntries.reduce((sum, e) => {
      const gross = differenceInMinutes(
        e.end_time ? parseISO(e.end_time) : new Date(),
        parseISO(e.start_time)
      )
      return sum + Math.max(0, gross - (e.break_minutes ?? 0))
    }, 0)
  }, [monthEntries])

  const plannedDays = useMemo(() => absences
    .filter(a => VACATION_TYPES.includes(a.type) && a.status === 'pending')
    .reduce((sum, a) => {
      return sum + eachDayOfInterval({ start: parseISO(a.date_from), end: parseISO(a.date_to) })
        .filter(d => !isWeekend(d) && !holidays.has(format(d, 'yyyy-MM-dd')))
        .length
    }, 0), [absences, holidays])

  const takenDays = useMemo(() => absences
    .filter(a => VACATION_TYPES.includes(a.type) && a.status === 'approved')
    .reduce((sum, a) => {
      return sum + eachDayOfInterval({ start: parseISO(a.date_from), end: parseISO(a.date_to) })
        .filter(d => !isWeekend(d) && !holidays.has(format(d, 'yyyy-MM-dd')))
        .length
    }, 0), [absences, holidays])

  const entitlement = (vacAcc?.entitlement ?? emp?.vacation_days ?? 0) + (vacAcc?.carry_over ?? 0)

  const pendingCount = absences.filter(a => a.status === 'pending').length

  const greeting = now.getHours() < 12 ? 'Guten Morgen' : now.getHours() < 18 ? 'Guten Tag' : 'Guten Abend'
  const dayLabel  = format(now, 'EEEE, dd. MMMM yyyy', { locale: de })

  function getStampCardStyle(): React.CSSProperties {
    if (isStamped || stampProgress === 0) return {}
    const p = stampProgress / 100
    return {
      background: `linear-gradient(135deg,
        rgba(16,185,129,${p * 0.12}) 0%,
        rgba(5,150,105,${p * 0.08}) 100%),
        #ffffff`,
      borderColor: `rgba(16,185,129,${0.1 + p * 0.25})`,
      boxShadow: `0 ${Math.round(p * 4)}px ${Math.round(p * 16)}px rgba(16,185,129,${p * 0.12})`,
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-[#6B7280]">{dayLabel}</p>
        <h1 className="text-2xl font-bold text-[#111827] mt-0.5">
          {greeting}, {user?.first_name ?? user?.name?.split(' ')[0] ?? ''}
        </h1>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Stempeluhr */}
        <div
          className={cn(
            'rounded-2xl p-6 transition-colors duration-75',
            isStamped
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200'
              : 'bg-white border border-[#E5E7EB] shadow-sm'
          )}
          style={getStampCardStyle()}
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className={isStamped ? 'text-emerald-100' : 'text-[#6B7280]'} />
            <span className={cn('text-sm font-medium', isStamped ? 'text-emerald-100' : 'text-[#6B7280]')}>
              Stempeluhr
            </span>
          </div>

          <div className="mb-5">
            <div className={cn('text-3xl font-bold tabular-nums', isStamped ? 'text-white' : 'text-[#111827]')}>
              {isStamped ? (
                <>
                  {Math.floor(todayNetMins / 60)}
                  <span className="blink">:</span>
                  {String(todayNetMins % 60).padStart(2, '0')} h
                </>
              ) : formatDuration(todayNetMins)}
            </div>
            <div className={cn('text-sm mt-1', isStamped ? 'text-emerald-100' : 'text-[#6B7280]')}>
              {isStamped
                ? `Eingestempelt seit ${format(parseISO(openEntry!.start_time), 'HH:mm')} Uhr`
                : 'Heute noch nicht eingestempelt'}
            </div>
          </div>

          <SwipeButton
            isStamped={isStamped}
            isLoading={stamping}
            onSwipeComplete={handleStempel}
            onSwipeFailed={() => setStampProgress(0)}
            onProgress={(p) => setStampProgress(p)}
          />
        </div>

        {/* Monatsstunden + Urlaub */}
        <div className="space-y-3">
          <MonatsstundenGauge
            actualMins={actualMonthMins}
            targetMins={targetMins}
            month={viewMonth}
            onPrev={() => setViewMonth(m => subMonths(m, 1))}
            onNext={() => setViewMonth(m => addMonths(m, 1))}
          />
          <UrlaubsCard
            taken={takenDays}
            planned={plannedDays}
            entitlement={entitlement}
            monthDeltaMins={actualMonthMins - targetMins}
          />
        </div>
      </div>

      {/* Meine Anträge */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#111827]">Meine Anträge</h2>
            {pendingCount > 0 && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                {pendingCount} offen
              </span>
            )}
          </div>
          <button
            onClick={() => { setAntragDate(undefined); setShowAntrag(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-medium shadow-sm shadow-indigo-200 hover:from-indigo-600 hover:to-violet-700 transition-all"
          >
            <Plus size={12} /> Antrag
          </button>
        </div>

        {absences.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-[#6B7280]">Noch keine Anträge in {year}</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#F3F4F6]">
            {groupAbsences(absences).map((g, i) => {
              const isRejected = g.status === 'rejected'
              const isApproved = g.status === 'approved'
              const colors = ABSENCE_COLORS[g.type]
              return (
                <li key={i} className="flex items-center gap-3 px-5 py-3.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: colors.bg }}
                  >
                    <span className="text-xs font-bold" style={{ color: colors.text }}>{g.type}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      'text-sm font-medium',
                      isRejected ? 'line-through text-[#9CA3AF]' : 'text-[#111827]'
                    )}>
                      {g.dateFrom === g.dateTo
                        ? format(parseISO(g.dateFrom), 'dd.MM.yyyy')
                        : `${format(parseISO(g.dateFrom), 'dd.MM.')} – ${format(parseISO(g.dateTo), 'dd.MM.yyyy')}`}
                    </div>
                    {g.note && <div className="text-xs text-[#9CA3AF] truncate">{g.note}</div>}
                  </div>
                  {isRejected ? (
                    <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      Abgelehnt
                    </span>
                  ) : isApproved ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Genehmigt
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Ausstehend
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {showAntrag && (
        <AntragDialog
          employeeId={employeeId ?? ''}
          initialFrom={antragDate}
          onClose={() => setShowAntrag(false)}
          onCreated={handleAntragCreated}
        />
      )}
    </div>
  )
}
