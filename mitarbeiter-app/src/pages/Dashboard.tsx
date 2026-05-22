import { useState, useEffect, useRef, useMemo } from 'react'
import { format, differenceInMinutes, parseISO, eachDayOfInterval, isWeekend } from 'date-fns'
import { de } from 'date-fns/locale'
import { LogIn, LogOut, Clock, CalendarOff, Plus } from 'lucide-react'
import { pb } from '../lib/pb'
import { useAuthStore } from '../stores/auth'
import type { TimeEntry, Absence, VacationAccount, Employee } from '@shared/types'
import { VACATION_TYPES, ABSENCE_COLORS } from '@shared/types'
import { cn } from '@/lib/utils'
import AntragDialog from './Abwesenheiten/AntragDialog'
import { getHolidayDates } from '../lib/holidays'

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
  const [antragDate, setAntragDate] = useState<string | undefined>()
  const [fedState,   setFedState]   = useState('ST')
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
    timerRef.current = setInterval(() => setNow(new Date()), 10_000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

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

  const takenDays = useMemo(() => absences
    .filter(a => VACATION_TYPES.includes(a.type) && a.status === 'approved')
    .reduce((sum, a) => {
      return sum + eachDayOfInterval({ start: parseISO(a.date_from), end: parseISO(a.date_to) })
        .filter(d => !isWeekend(d) && !holidays.has(format(d, 'yyyy-MM-dd')))
        .length
    }, 0), [absences, holidays])

  const entitlement = (vacAcc?.entitlement ?? emp?.vacation_days ?? 0) + (vacAcc?.carry_over ?? 0)
  const remaining   = entitlement - takenDays

  const pendingCount = absences.filter(a => a.status === 'pending').length

  const greeting = now.getHours() < 12 ? 'Guten Morgen' : now.getHours() < 18 ? 'Guten Tag' : 'Guten Abend'
  const dayLabel  = format(now, 'EEEE, dd. MMMM yyyy', { locale: de })

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-[#6B7280]">{dayLabel}</p>
        <h1 className="text-2xl font-bold text-[#111827] mt-0.5">
          {greeting}, {user?.name?.split(' ')[0] ?? ''}
        </h1>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Stempeluhr */}
        <div className={cn(
          'rounded-2xl p-6 transition-all',
          isStamped
            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200'
            : 'bg-white border border-[#E5E7EB] shadow-sm'
        )}>
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

          <button
            onClick={handleStempel}
            disabled={stamping}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-60',
              isStamped
                ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                : 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-200 hover:from-indigo-600 hover:to-violet-700'
            )}
          >
            {isStamped ? <LogOut size={15} /> : <LogIn size={15} />}
            {stamping ? 'Bitte warten…' : isStamped ? 'Ausstempeln' : 'Einstempeln'}
          </button>
        </div>

        {/* Urlaubskonto */}
        <div className="rounded-2xl p-6 bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100">
          <div className="flex items-center gap-2 mb-4">
            <CalendarOff size={16} className="text-indigo-400" />
            <span className="text-sm font-medium text-indigo-600">Urlaubskonto {year}</span>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#6B7280]">Anspruch</span>
              <span className="text-sm font-semibold text-[#111827]">{entitlement} Tage</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#6B7280]">Genommen</span>
              <span className="text-sm font-semibold text-[#111827]">{takenDays} Tage</span>
            </div>
            <div className="h-px bg-indigo-100" />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-indigo-700">Verbleibend</span>
              <span className={cn(
                'text-lg font-bold',
                remaining <= 3 ? 'text-red-600' : remaining <= 7 ? 'text-amber-600' : 'text-indigo-600'
              )}>
                {remaining} Tage
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Meine Anträge */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
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
            {absences.map(a => {
              const isRejected = a.status === 'rejected'
              const isApproved = a.status === 'approved'
              const colors = ABSENCE_COLORS[a.type]
              return (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: colors.bg }}
                  >
                    <span className="text-xs font-bold" style={{ color: colors.text }}>{a.type}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      'text-sm font-medium',
                      isRejected ? 'line-through text-[#9CA3AF]' : 'text-[#111827]'
                    )}>
                      {a.date_from === a.date_to
                        ? format(parseISO(a.date_from), 'dd.MM.yyyy')
                        : `${format(parseISO(a.date_from), 'dd.MM.')} – ${format(parseISO(a.date_to), 'dd.MM.yyyy')}`}
                    </div>
                    {a.note && <div className="text-xs text-[#9CA3AF] truncate">{a.note}</div>}
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
