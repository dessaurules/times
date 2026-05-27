import { useState, useEffect, useMemo } from 'react'
import {
  startOfMonth, endOfMonth, addMonths, subMonths,
  format, parseISO, getDay, addDays, max, min,
} from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pb } from '../lib/pb'
import { getHolidayDates } from '../lib/holidays'
import type { Employee, Department, TimeEntry, Absence, VacationAccount, AbsenceType } from '@shared/types'
import { VACATION_TYPES } from '@shared/types'
import { cn } from '@/lib/utils'
import DruckModal from './DruckModal'
import BerichteTabelle from '@/components/Berichte/BerichteTabelle'
import BerichteKacheln from '@/components/Berichte/BerichteKacheln'
import BerichteJahr from '@/components/Berichte/BerichteJahr'
import { toExcel, toCsv, type BerichtRow } from '@/lib/exportUtils'

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

  // ── Berichte-Ansicht (Tab-Switcher) ─────────────────────────────────────────
  type BerichteView = 'tabelle' | 'kacheln' | 'jahresverlauf'
  const [berichteView, setBerichteViewRaw] = useState<BerichteView>(() => {
    const saved = localStorage.getItem('berichte-view')
    return (saved === 'tabelle' || saved === 'kacheln' || saved === 'jahresverlauf') ? saved : 'tabelle'
  })
  function setBerichteView(v: BerichteView) {
    setBerichteViewRaw(v)
    localStorage.setItem('berichte-view', v)
  }

  // BerichtRow[] aus empData() aufbauen
  const berichtRows = useMemo<BerichtRow[]>(() => {
    if (loading) return []
    return employees.map(emp => {
      const { soll, ist, delta, byType, vacTaken, vacTotal } = empData(emp)
      const vacK = (['K', 'KK'] as AbsenceType[]).reduce((s, t) => s + (byType[t] ?? 0), 0)
      return {
        name:              `${emp.last_name}, ${emp.first_name}`,
        abteilung:         emp.expand?.department?.name ?? '',
        soll,
        ist,
        differenz:         delta,
        ueberst_kumuliert: delta,
        urlaub_genommen:   vacTaken,
        urlaub_gesamt:     vacTotal ?? 0,
        krank:             vacK,
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, employees, entries, absences, vacAccounts])

  // Monatliche Δ-Werte für BerichteJahr (nur wenn Jahresansicht aktiv)
  const monthlyData = useMemo<Record<string, number[]>>(() => {
    if (view !== 'jahr' || loading) return {}
    const result: Record<string, number[]> = {}
    for (const emp of employees) {
      const yearHols = getHolidayDates(yearNum, federalState)
      const monthly: number[] = Array(12).fill(0)
      for (let m = 0; m < 12; m++) {
        const mFrom = new Date(yearNum, m, 1)
        const mTo   = endOfMonth(mFrom)
        const soll  = sollHours(emp, mFrom, mTo, yearHols)
        const fromStr = format(mFrom, 'yyyy-MM-dd')
        const toStr   = format(mTo,   'yyyy-MM-dd')
        const istMins = entries
          .filter(e => {
            if (e.employee !== emp.id) return false
            const d = format(parseISO(e.start_time), 'yyyy-MM-dd')
            return d >= fromStr && d <= toStr
          })
          .reduce((s, e) => s + netMinutes(e), 0)
        monthly[m] = istMins / 60 - soll
      }
      result[`${emp.last_name}, ${emp.first_name}`] = monthly
    }
    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, loading, employees, entries, yearNum, federalState])

  // Export-Handler
  const monthStr = view === 'monat'
    ? format(monthDate, 'yyyy-MM')
    : String(yearNum)

  function handleExcelExport() {
    toExcel(berichtRows, `Berichte_${monthStr}.xlsx`, monthStr)
  }
  function handleCsvExport() {
    toCsv(berichtRows, `Berichte_${monthStr}.csv`)
  }

  return (
    <div>
      {/* ── Kopfzeile ── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">Berichte</h1>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Ansichts-Tab-Switcher */}
          <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden text-sm">
            {(['tabelle', 'kacheln', 'jahresverlauf'] as const).map(v => (
              <button
                key={v}
                onClick={() => setBerichteView(v)}
                className={cn(
                  'px-3 py-1.5 transition-colors border-r border-[#E5E7EB] last:border-0',
                  berichteView === v
                    ? 'bg-[#4F46E5] text-white font-medium'
                    : 'bg-white text-[#6B7280] hover:bg-[#F3F4F6]',
                )}
              >
                {v === 'tabelle' ? '☰ Tabelle' : v === 'kacheln' ? '⊞ Kacheln' : '📅 Jahresverlauf'}
              </button>
            ))}
          </div>

          {/* Export-Buttons */}
          <button
            onClick={handleExcelExport}
            className="h-9 px-3 text-sm border border-[#E5E7EB] rounded-md bg-white text-[#374151] hover:bg-[#F3F4F6] transition-colors"
            title="Excel exportieren"
          >
            📊 Excel
          </button>
          <button
            onClick={handleCsvExport}
            className="h-9 px-3 text-sm border border-[#E5E7EB] rounded-md bg-white text-[#374151] hover:bg-[#F3F4F6] transition-colors"
            title="CSV exportieren"
          >
            📋 CSV
          </button>

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

      {/* ── Ansichten ── */}
      {loading ? (
        <p className="text-sm text-[#6B7280]">Lade…</p>
      ) : berichteView === 'tabelle' ? (
        <BerichteTabelle rows={berichtRows} onExportPdf={emp => { const e = employees.find(x => `${x.last_name}, ${x.first_name}` === emp); if (e) setDruckEmp(e) }} />
      ) : berichteView === 'kacheln' ? (
        <BerichteKacheln rows={berichtRows} />
      ) : berichteView === 'jahresverlauf' ? (
        <BerichteJahr rows={berichtRows} year={yearNum} monthlyData={monthlyData} />
      ) : null}


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
