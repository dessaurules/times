import { useState, useEffect, useMemo } from 'react'
import {
  startOfMonth, endOfMonth, addMonths, subMonths,
  format, parseISO, getDay, addDays, max, min,
} from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { pb } from '../lib/pb'
import { getHolidayDates } from '../lib/holidays'
import type { Employee, Department, TimeEntry, Absence, VacationAccount, AbsenceType } from '@shared/types'
import { VACATION_TYPES, ABSENCE_COLORS } from '@shared/types'
import { cn } from '@/lib/utils'
import DruckModal from './DruckModal'

// ── Helfer ────────────────────────────────────────────────────────────────────

function workingDays(from: Date, to: Date, holidays: Set<string>): number {
  let count = 0
  let d = new Date(from)
  while (d <= to) {
    const dow = getDay(d)
    const key = format(d, 'yyyy-MM-dd')
    if (dow !== 0 && dow !== 6 && !holidays.has(key)) count++
    d = addDays(d, 1)
  }
  return count
}

function absenceDaysInPeriod(
  absence: Absence,
  periodFrom: Date,
  periodTo: Date,
  holidays: Set<string>,
): number {
  const absFrom = parseISO(absence.date_from)
  const absTo   = parseISO(absence.date_to)
  const from    = max([absFrom, periodFrom])
  const to      = min([absTo,   periodTo])
  if (from > to) return 0
  return workingDays(from, to, holidays)
}

function sollHours(emp: Employee, periodFrom: Date, periodTo: Date, holidays: Set<string>): number {
  const empStart = parseISO(emp.start_date)
  const empEnd   = emp.end_date ? parseISO(emp.end_date) : null
  const from     = empStart > periodFrom ? empStart : periodFrom
  const to       = empEnd && empEnd < periodTo ? empEnd : periodTo
  if (from > to) return 0
  return (emp.weekly_hours / 5) * workingDays(from, to, holidays)
}

function netMinutes(e: TimeEntry): number {
  if (!e.end_time) return 0
  return Math.max(0, Math.round((new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / 60000) - e.break_minutes)
}

function fmtH(hours: number): string {
  if (hours <= 0) return '0 h'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m === 0 ? `${h} h` : `${h}:${String(m).padStart(2, '0')} h`
}

function fmtDelta(hours: number): string {
  if (Math.abs(hours) < 0.02) return '–'
  const sign = hours > 0 ? '+' : '-'
  return sign + fmtH(Math.abs(hours))
}

// ── Typen ─────────────────────────────────────────────────────────────────────

type EmployeeRow = Employee & { expand?: { department?: Department } }

const ABSENCE_COLS: AbsenceType[] = ['U', 'RU', 'U3', 'SU', 'K', 'KK', 'AT', 'S', 'ÜA']

// ── Hauptkomponente ───────────────────────────────────────────────────────────

export default function Berichte() {
  const [view,       setView]      = useState<'monat' | 'jahr'>('monat')
  const [monthDate,  setMonthDate] = useState(() => startOfMonth(new Date()))
  const [yearNum,    setYearNum]   = useState(() => new Date().getFullYear())
  const [filterDept, setFilterDept]= useState('')

  const [employees,   setEmployees]  = useState<EmployeeRow[]>([])
  const [departments, setDepts]      = useState<Department[]>([])
  const [entries,     setEntries]    = useState<TimeEntry[]>([])
  const [absences,    setAbsences]   = useState<Absence[]>([])
  const [vacAccounts, setVacAccounts]= useState<VacationAccount[]>([])
  const [loading,     setLoading]    = useState(true)
  const [federalState,setFedState]   = useState('ST')
  const [companyName, setCompanyName]= useState('Schicht & Plan')
  const [druckEmp,    setDruckEmp]   = useState<EmployeeRow | null>(null)

  const periodFrom = view === 'monat' ? startOfMonth(monthDate) : new Date(yearNum, 0, 1)
  const periodTo   = view === 'monat' ? endOfMonth(monthDate)   : new Date(yearNum, 11, 31)

  const holidays = useMemo(
    () => getHolidayDates(view === 'monat' ? monthDate.getFullYear() : yearNum, federalState),
    [view, monthDate, yearNum, federalState],
  )

  useEffect(() => {
    pb.collection('settings').getFirstListItem<{ value: string }>('key = "federal_state"')
      .then(s => setFedState(s.value)).catch(() => {})
    pb.collection('settings').getFirstListItem<{ value: string }>('key = "company_name"')
      .then(s => setCompanyName(s.value)).catch(() => {})
  }, [])

  useEffect(() => {
    pb.collection('departments').getFullList<Department>({ sort: 'sort_order,name' })
      .then(setDepts).catch(console.error)
  }, [])

  useEffect(() => {
    const filter = filterDept ? `active = true && department = "${filterDept}"` : 'active = true'
    pb.collection('employees').getFullList<EmployeeRow>({
      filter, expand: 'department', sort: 'last_name,first_name',
    }).then(setEmployees).catch(console.error)
  }, [filterDept])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const fromStr = format(periodFrom, 'yyyy-MM-dd')
    const toStr   = format(periodTo,   'yyyy-MM-dd')

    const reqs: Promise<any>[] = [
      pb.collection('time_entries').getFullList<TimeEntry>({
        filter: `start_time >= "${fromStr} 00:00:00" && start_time <= "${toStr} 23:59:59"`,
        sort: 'start_time', requestKey: 'ber-entries',
      }),
      pb.collection('absences').getFullList<Absence>({
        filter: `date_from <= "${toStr}" && date_to >= "${fromStr}" && status = "approved"`,
        sort: 'date_from', requestKey: 'ber-absences',
      }),
    ]

    if (view === 'jahr') {
      reqs.push(
        pb.collection('vacation_accounts').getFullList<VacationAccount>({
          filter: `year = ${yearNum}`, requestKey: 'ber-vac',
        }),
      )
    }

    Promise.all(reqs).then(([ents, abs, vac]) => {
      if (cancelled) return
      setEntries(ents)
      setAbsences(abs)
      if (vac) setVacAccounts(vac)
    }).catch(console.error).finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, monthDate, yearNum])

  // ── Berechnungen pro Mitarbeiter ──────────────────────────────────────────

  function empData(emp: Employee) {
    const soll    = sollHours(emp, periodFrom, periodTo, holidays)
    const istMins = entries.filter(e => e.employee === emp.id).reduce((s, e) => s + netMinutes(e), 0)
    const ist     = istMins / 60
    const delta   = ist - soll

    const byType: Partial<Record<AbsenceType, number>> = {}
    for (const type of ABSENCE_COLS) {
      const days = absences
        .filter(a => a.employee === emp.id && a.type === type)
        .reduce((s, a) => s + absenceDaysInPeriod(a, periodFrom, periodTo, holidays), 0)
      if (days > 0) byType[type] = days
    }

    const vacTaken = VACATION_TYPES.reduce((s, t) => s + (byType[t] ?? 0), 0)
    const vacAcc   = vacAccounts.find(v => v.employee === emp.id)
    const vacTotal = vacAcc ? vacAcc.entitlement + vacAcc.carry_over : null

    return { soll, ist, delta, byType, vacTaken, vacTotal }
  }

  const colSpanEmpty = 6 + (view === 'jahr' ? 1 : 0) + ABSENCE_COLS.length

  return (
    <div>
      {/* ── Kopfzeile ── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">Berichte</h1>

        <div className="flex items-center gap-2">
          {/* Monat / Jahr Toggle */}
          <div className="flex rounded-md border border-[#E5E7EB] overflow-hidden text-sm">
            <button
              onClick={() => setView('monat')}
              className={cn(
                'px-3 py-1.5 transition-colors',
                view === 'monat'
                  ? 'bg-[#4F46E5] text-white font-medium'
                  : 'bg-white text-[#6B7280] hover:bg-[#F3F4F6]',
              )}
            >Monat</button>
            <button
              onClick={() => setView('jahr')}
              className={cn(
                'px-3 py-1.5 border-l border-[#E5E7EB] transition-colors',
                view === 'jahr'
                  ? 'bg-[#4F46E5] text-white font-medium'
                  : 'bg-white text-[#6B7280] hover:bg-[#F3F4F6]',
              )}
            >Jahr</button>
          </div>

          {/* Abteilungs-Filter */}
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="h-9 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
          >
            <option value="">Alle Abteilungen</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          {/* Navigation */}
          <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-md px-1">
            <button
              onClick={() => view === 'monat' ? setMonthDate(d => subMonths(d, 1)) : setYearNum(y => y - 1)}
              className="p-1.5 rounded hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827]"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 py-1 text-xs text-[#6B7280] min-w-[140px] text-center capitalize">
              {view === 'monat'
                ? format(monthDate, 'MMMM yyyy', { locale: de })
                : yearNum}
            </span>
            <button
              onClick={() => view === 'monat' ? setMonthDate(d => addMonths(d, 1)) : setYearNum(y => y + 1)}
              className="p-1.5 rounded hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827]"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabelle ── */}
      {loading ? (
        <p className="text-sm text-[#6B7280]">Lade…</p>
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#F3F4F6]">
                <th className="text-left px-4 py-2.5 text-[#6B7280] font-medium border-b border-[#E5E7EB] whitespace-nowrap">Mitarbeiter</th>
                <th className="text-left px-3 py-2.5 text-[#6B7280] font-medium border-b border-[#E5E7EB] whitespace-nowrap">Abt.</th>
                <th className="text-right px-3 py-2.5 text-[#6B7280] font-medium border-b border-[#E5E7EB] whitespace-nowrap">Soll</th>
                <th className="text-right px-3 py-2.5 text-[#6B7280] font-medium border-b border-[#E5E7EB] whitespace-nowrap">Ist</th>
                <th className="text-right px-3 py-2.5 text-[#6B7280] font-medium border-b border-[#E5E7EB] whitespace-nowrap">Differenz</th>
                {view === 'jahr' && (
                  <th className="text-center px-3 py-2.5 text-[#6B7280] font-medium border-b border-[#E5E7EB] whitespace-nowrap">
                    Urlaub <span className="font-normal text-[#9CA3AF]">(gen./Anspr.)</span>
                  </th>
                )}
                {ABSENCE_COLS.map(t => (
                  <th
                    key={t}
                    className="text-center px-2 py-2.5 font-medium border-b border-[#E5E7EB] whitespace-nowrap text-xs"
                    style={{ color: ABSENCE_COLORS[t].text, backgroundColor: ABSENCE_COLORS[t].bg }}
                  >
                    {t}
                  </th>
                ))}
                <th className="border-b border-[#E5E7EB] w-9" />
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => {
                const { soll, ist, delta, byType, vacTaken, vacTotal } = empData(emp)
                const dept = emp.expand?.department
                return (
                  <tr key={emp.id} className={cn('border-b border-[#E5E7EB] last:border-0', i % 2 === 1 && 'bg-[#F9FAFB]')}>
                    <td className="px-4 py-2.5 font-medium text-[#111827] whitespace-nowrap">
                      {emp.last_name}, {emp.first_name}
                    </td>
                    <td className="px-3 py-2.5 text-[#6B7280] whitespace-nowrap">
                      {dept ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                          {dept.name}
                        </span>
                      ) : '–'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[#6B7280] tabular-nums whitespace-nowrap">{fmtH(soll)}</td>
                    <td className="px-3 py-2.5 text-right text-[#111827] tabular-nums whitespace-nowrap">{fmtH(ist)}</td>
                    <td className={cn(
                      'px-3 py-2.5 text-right tabular-nums font-medium whitespace-nowrap',
                      delta > 0.02 ? 'text-emerald-600' : delta < -0.02 ? 'text-red-500' : 'text-[#9CA3AF]',
                    )}>
                      {fmtDelta(delta)}
                    </td>
                    {view === 'jahr' && (
                      <td className="px-3 py-2.5 text-center tabular-nums text-[#6B7280] whitespace-nowrap">
                        {vacTaken > 0 || vacTotal !== null
                          ? <><span className="font-medium text-[#111827]">{vacTaken}</span> / {vacTotal ?? '–'}</>
                          : <span className="text-[#D1D5DB]">–</span>}
                      </td>
                    )}
                    {ABSENCE_COLS.map(t => (
                      <td key={t} className="px-2 py-2.5 text-center tabular-nums">
                        {byType[t]
                          ? <span className="font-medium text-xs" style={{ color: ABSENCE_COLORS[t].text }}>{byType[t]}</span>
                          : <span className="text-[#D1D5DB]">–</span>}
                      </td>
                    ))}
                    <td className="px-2 py-2.5 text-center">
                      <button
                        onClick={() => setDruckEmp(emp)}
                        className="p-1 rounded text-[#9CA3AF] hover:text-[#4F46E5] hover:bg-[#F3F4F6] transition-colors"
                        title="Druckansicht öffnen"
                      >
                        <Printer size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}

              {employees.length === 0 && (
                <tr>
                  <td colSpan={colSpanEmpty} className="px-4 py-10 text-center text-[#6B7280]">
                    Keine Mitarbeiter gefunden.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Summenzeile */}
            {employees.length > 1 && (() => {
              const totals = employees.map(empData)
              const totalSoll  = totals.reduce((s, d) => s + d.soll, 0)
              const totalIst   = totals.reduce((s, d) => s + d.ist,  0)
              const totalDelta = totalIst - totalSoll
              const byTypeSum: Partial<Record<AbsenceType, number>> = {}
              for (const t of ABSENCE_COLS) {
                const sum = totals.reduce((s, d) => s + (d.byType[t] ?? 0), 0)
                if (sum > 0) byTypeSum[t] = sum
              }
              return (
                <tfoot>
                  <tr className="bg-[#F3F4F6] border-t-2 border-[#E5E7EB] font-medium">
                    <td className="px-4 py-2.5 text-[#6B7280] text-xs uppercase tracking-wide">Gesamt</td>
                    <td />
                    <td className="px-3 py-2.5 text-right tabular-nums text-[#6B7280]">{fmtH(totalSoll)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[#111827]">{fmtH(totalIst)}</td>
                    <td className={cn(
                      'px-3 py-2.5 text-right tabular-nums',
                      totalDelta > 0.02 ? 'text-emerald-600' : totalDelta < -0.02 ? 'text-red-500' : 'text-[#9CA3AF]',
                    )}>
                      {fmtDelta(totalDelta)}
                    </td>
                    {view === 'jahr' && <td />}
                    {ABSENCE_COLS.map(t => (
                      <td key={t} className="px-2 py-2.5 text-center tabular-nums text-xs">
                        {byTypeSum[t]
                          ? <span style={{ color: ABSENCE_COLORS[t].text }}>{byTypeSum[t]}</span>
                          : <span className="text-[#D1D5DB]">–</span>}
                      </td>
                    ))}
                    <td />
                  </tr>
                </tfoot>
              )
            })()}
          </table>
        </div>
      )}

      {druckEmp && (
        <DruckModal
          emp={druckEmp}
          periodFrom={periodFrom}
          periodTo={periodTo}
          view={view}
          entries={entries}
          absences={absences}
          vacAccounts={vacAccounts}
          holidays={holidays}
          federalState={federalState}
          companyName={companyName}
          onClose={() => setDruckEmp(null)}
        />
      )}
    </div>
  )
}
