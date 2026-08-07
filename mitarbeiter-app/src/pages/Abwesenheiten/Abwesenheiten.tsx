import { useState, useEffect, useMemo } from 'react'
import { format, parseISO, eachDayOfInterval, isWeekend, startOfMonth, endOfMonth, getYear } from 'date-fns'
import { de } from 'date-fns/locale'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { pb } from '../../lib/pb'
import { useAuthStore } from '../../stores/auth'
import { getHolidayDates, getHolidayMap } from '../../lib/holidays'
import type { Absence, AbsenceType, VacationAccount } from '@shared/types'
import { ABSENCE_COLORS, VACATION_TYPES } from '@shared/types'
import AntragDialog from './AntragDialog'
import MonthModal   from './MonthModal'
import { cn } from '@/lib/utils'

const MONTHS = Array.from({ length: 12 }, (_, i) => i) // 0–11

function countAbsenceDays(absences: Absence[], year: number, federalState: string): Record<AbsenceType, number> {
  const holidays = getHolidayDates(year, federalState)
  const result   = {} as Record<AbsenceType, number>

  for (const a of absences) {
    const from = parseISO(a.date_from)
    const to   = parseISO(a.date_to)
    const days = eachDayOfInterval({ start: from, end: to }).filter(d => {
      if (isWeekend(d)) return false
      if (holidays.has(format(d, 'yyyy-MM-dd'))) return false
      return true
    })
    result[a.type] = (result[a.type] ?? 0) + days.length
  }
  return result
}

export default function Abwesenheiten() {
  const user       = useAuthStore(s => s.user)
  const employeeId = user?.employee ?? ''

  const [year,       setYear]       = useState(new Date().getFullYear())
  const [absences,   setAbsences]   = useState<Absence[]>([])
  const [vacAcc,     setVacAcc]     = useState<VacationAccount | null>(null)
  const [fedState,   setFedState]   = useState('ST')
  const [loading,    setLoading]    = useState(true)

  const [openMonth,  setOpenMonth]  = useState<Date | null>(null)
  const [showAntrag, setShowAntrag] = useState(false)
  const [antragDate, setAntragDate] = useState<string | undefined>(undefined)

  useEffect(() => {
    pb.collection('settings').getFirstListItem<{ value: string }>('key = "federal_state"', { requestKey: null })
      .then(s => setFedState(s.value))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!employeeId) return
    setLoading(true)
    Promise.all([
      pb.collection('absences').getFullList<Absence>({
        filter: `employee = "${employeeId}" && date_from >= "${year}-01-01" && date_to <= "${year}-12-31"`,
        sort:   'date_from',
        requestKey: null,
      }),
      pb.collection('vacation_accounts').getFirstListItem<VacationAccount>(
        `employee = "${employeeId}" && year = ${year}`,
        { requestKey: null }
      ).catch(() => null),
    ]).then(([abs, va]) => {
      setAbsences(abs)
      setVacAcc(va)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [employeeId, year])

  const holidayDates = useMemo(() => getHolidayDates(year, fedState), [year, fedState])

  // Tage pro Typ (nur approved)
  const daysByType = useMemo(
    () => countAbsenceDays(absences.filter(a => a.status === 'approved'), year, fedState),
    [absences, year, fedState]
  )

  // Urlaubstage genommen (approved vacation types)
  const vacTaken     = VACATION_TYPES.reduce((s, t) => s + (daysByType[t] ?? 0), 0)
  const entitlement  = (vacAcc?.entitlement ?? 0) + (vacAcc?.carry_over ?? 0)
  const remaining    = entitlement - vacTaken

  function absencesForMonth(month: number) {
    const from = format(startOfMonth(new Date(year, month)), 'yyyy-MM-dd')
    const to   = format(endOfMonth(new Date(year, month)), 'yyyy-MM-dd')
    return absences.filter(a => a.status !== 'rejected' && a.date_to >= from && a.date_from <= to)
  }


  function handleAntragCreated(absence: Absence) {
    if (getYear(parseISO(absence.date_from)) === year) {
      setAbsences(prev => [...prev, absence].sort((a, b) => a.date_from.localeCompare(b.date_from)))
    }
  }

  function openAntrag(date?: string) {
    setAntragDate(date)
    setShowAntrag(true)
  }

  const holidayMap = useMemo(() => getHolidayMap(year, fedState), [year, fedState])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Abwesenheiten</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Deine Abwesenheiten und Anträge</p>
        </div>
        <button
          onClick={() => openAntrag()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-medium shadow-sm shadow-indigo-200 hover:from-indigo-600 hover:to-violet-700 transition-all"
        >
          <Plus size={15} /> Antrag stellen
        </button>
      </div>

      {/* Jahresnavigation */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setYear(y => y - 1)}
          className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-lg font-bold text-[#111827] w-14 text-center">{year}</span>
        <button
          onClick={() => setYear(y => y + 1)}
          className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {MONTHS.map(m => (
            <div key={m} className="h-28 rounded-2xl bg-[#F3F4F6] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Monats-Kacheln */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-5">
            {MONTHS.map(m => {
              const monthDate  = new Date(year, m)
              const monthAbs   = absencesForMonth(m)
              const byType     = {} as Record<AbsenceType, number>
              for (const a of monthAbs) {
                const from = parseISO(a.date_from)
                const to   = parseISO(a.date_to)
                const days = eachDayOfInterval({ start: from, end: to }).filter(d => {
                  const ds = format(d, 'yyyy-MM-dd')
                  return !isWeekend(d) && !holidayDates.has(ds)
                    && ds >= format(startOfMonth(monthDate), 'yyyy-MM-dd')
                    && ds <= format(endOfMonth(monthDate), 'yyyy-MM-dd')
                })
                byType[a.type] = (byType[a.type] ?? 0) + days.length
              }
              const isCurrentMonth = m === new Date().getMonth() && year === new Date().getFullYear()
              const hasPending = monthAbs.some(a => a.status === 'pending')

              return (
                <button
                  key={m}
                  onClick={() => setOpenMonth(monthDate)}
                  className={cn(
                    'text-left p-4 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5',
                    isCurrentMonth
                      ? 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50'
                      : 'border-[#E5E7EB] bg-white hover:border-indigo-200'
                  )}
                >
                  <div className={cn(
                    'text-sm font-semibold mb-2 capitalize',
                    isCurrentMonth ? 'text-indigo-700' : 'text-[#374151]'
                  )}>
                    {format(monthDate, 'MMMM', { locale: de })}
                  </div>

                  {Object.keys(byType).length === 0 ? (
                    <div className="text-xs text-[#D1D5DB]">—</div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {(Object.entries(byType) as [AbsenceType, number][]).map(([t, d]) => {
                        const colors = ABSENCE_COLORS[t]
                        return (
                          <span
                            key={t}
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded leading-none"
                            style={{ backgroundColor: colors.bg, color: colors.text }}
                          >
                            {t} {d}T
                          </span>
                        )
                      })}
                      {hasPending && (
                        <span className="text-[10px] text-amber-500 font-medium">⏳</span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Jahres-Zusammenfassung */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl px-5 py-4">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {(Object.entries(daysByType) as [AbsenceType, number][]).map(([t, d]) => {
                const colors = ABSENCE_COLORS[t]
                return (
                  <span key={t} className="flex items-center gap-1.5">
                    <span
                      className="text-[11px] font-bold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {t}
                    </span>
                    <span className="text-[#374151] font-medium">{d} T</span>
                  </span>
                )
              })}
              {entitlement > 0 && (
                <>
                  <span className="text-[#D1D5DB]">·</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[#6B7280]">Urlaub verbleibend</span>
                    <span className={cn(
                      'font-bold',
                      remaining <= 0 ? 'text-red-600' : remaining <= 3 ? 'text-amber-600' : 'text-indigo-600'
                    )}>
                      {remaining} T
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* MonthModal */}
      {openMonth && (
        <MonthModal
          month={openMonth}
          allAbsences={absences}
          holidays={holidayMap}
          onClose={() => setOpenMonth(null)}
          onNewAntrag={date => { setOpenMonth(null); openAntrag(date) }}
        />
      )}

      {/* AntragDialog */}
      {showAntrag && (
        <AntragDialog
          employeeId={employeeId}
          initialFrom={antragDate}
          onClose={() => setShowAntrag(false)}
          onCreated={handleAntragCreated}
        />
      )}
    </div>
  )
}
