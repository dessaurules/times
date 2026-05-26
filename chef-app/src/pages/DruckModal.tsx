import { useState, useEffect, useMemo } from 'react'
import {
  format, getDay, parseISO, addDays, startOfMonth, endOfMonth,
  max, min, startOfWeek, addWeeks, getISOWeek,
} from 'date-fns'
import { de } from 'date-fns/locale'
import { X, Printer } from 'lucide-react'
import { pb } from '../lib/pb'
import { getHolidayMap, getHolidayDates } from '../lib/holidays'
import type { Employee, Department, TimeEntry, Absence, VacationAccount, AbsenceType } from '@shared/types'
import { VACATION_TYPES, ABSENCE_COLORS } from '@shared/types'
import { cn } from '@/lib/utils'

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

function absenceDaysInPeriod(a: Absence, from: Date, to: Date, holidays: Set<string>): number {
  const aFrom = parseISO(a.date_from)
  const aTo   = parseISO(a.date_to)
  const start = max([aFrom, from])
  const end   = min([aTo,   to])
  if (start > end) return 0
  return workingDays(start, end, holidays)
}

function sollHours(emp: Employee, from: Date, to: Date, holidays: Set<string>): number {
  const empStart = parseISO(emp.start_date)
  const empEnd   = emp.end_date ? parseISO(emp.end_date) : null
  const s = empStart > from ? empStart : from
  const e = empEnd && empEnd < to ? empEnd : to
  if (s > e) return 0
  return (emp.weekly_hours / 5) * workingDays(s, e, holidays)
}

function netMinutes(entry: TimeEntry): number {
  if (!entry.end_time) return 0
  return Math.max(
    0,
    Math.round((new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / 60000) - entry.break_minutes,
  )
}

function fmtH(hours: number): string {
  if (hours <= 0) return '0 h'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m === 0 ? `${h} h` : `${h}:${String(m).padStart(2, '0')} h`
}

function fmtDelta(hours: number): string {
  if (Math.abs(hours) < 0.02) return '–'
  return (hours > 0 ? '+' : '-') + fmtH(Math.abs(hours))
}

function toLocalHHMM(iso: string): string {
  return format(new Date(iso), 'HH:mm')
}

// ── Abwesenheitsbezeichnungen ─────────────────────────────────────────────────

const ABSENCE_LABELS: Record<AbsenceType, string> = {
  U:    'Urlaub',
  RU:   'Resturlaub',
  U3:   'Urlaub (3. Kind)',
  SU:   'Sonderurlaub',
  K:    'Krank',
  KK:   'Kind krank',
  AT:   'Arbeitszeitausgleich',
  S:    'Schule / Berufsschule',
  'ÜA': 'Überstundenausgleich',
}

const ALL_ABSENCE_TYPES: AbsenceType[] = ['U', 'RU', 'U3', 'SU', 'K', 'KK', 'AT', 'S', 'ÜA']

// ── Typen ─────────────────────────────────────────────────────────────────────

type EmployeeRow = Employee & { expand?: { department?: Department } }

type StundenRow =
  | { type: 'month-header'; month: Date }
  | { type: 'month-total'; month: Date; mins: number }
  | { type: 'entry'; date: Date; isWeekend: boolean; holidayName: string | null; entries: TimeEntry[] }

type WeekSummary = {
  kw:       number
  weekFrom: Date
  weekTo:   Date
  byType:   Partial<Record<AbsenceType, number>>
}

type Props = {
  emp:          EmployeeRow
  periodFrom:   Date
  periodTo:     Date
  view:         'monat' | 'jahr'
  entries:      TimeEntry[]
  absences:     Absence[]
  vacAccounts:  VacationAccount[]
  holidays:     Set<string>
  federalState: string
  companyName:  string
  onClose:      () => void
}

// ── Komponente ────────────────────────────────────────────────────────────────

export default function DruckModal({
  emp, periodFrom, periodTo, view,
  entries, absences, vacAccounts,
  holidays, federalState, companyName, onClose,
}: Props) {

  const [yearVacTaken, setYearVacTaken] = useState<number | null>(null)

  // Print-Styles
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'druck-print-style'
    style.textContent = `
      @media print {
        body > *:not(#druck-root) { display: none !important; }
        #druck-root { position: static !important; overflow: visible !important; background: white !important; }
        .no-print { display: none !important; }
      }
      @page { size: A4; margin: 18mm; }
    `
    document.head.appendChild(style)
    return () => { document.getElementById('druck-print-style')?.remove() }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Resturlaub: für Jahresansicht direkt berechnen, für Monatsansicht nachladen
  useEffect(() => {
    const vacAcc = vacAccounts.find(v => v.employee === emp.id)
    if (!vacAcc) { setYearVacTaken(null); return }

    const year      = periodFrom.getFullYear()
    const yearStart = new Date(year, 0, 1)
    const yearEnd   = new Date(year, 11, 31)

    if (view === 'jahr') {
      const days = absences
        .filter(a => a.employee === emp.id && VACATION_TYPES.includes(a.type))
        .reduce((s, a) => s + absenceDaysInPeriod(a, yearStart, yearEnd, holidays), 0)
      setYearVacTaken(days)
      return
    }

    const yearHolidays = getHolidayDates(year, federalState)
    pb.collection('absences').getFullList<Absence>({
      filter: `employee = "${emp.id}" && status = "approved" && date_from <= "${year}-12-31" && date_to >= "${year}-01-01"`,
      requestKey: `druck-vac-${emp.id}-${year}`,
    }).then(yearAbs => {
      const days = yearAbs
        .filter(a => VACATION_TYPES.includes(a.type))
        .reduce((s, a) => s + absenceDaysInPeriod(a, yearStart, yearEnd, yearHolidays), 0)
      setYearVacTaken(days)
    }).catch(() => setYearVacTaken(null))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emp.id, view, periodFrom.getFullYear(), federalState])

  // ── Gefilterte Daten ─────────────────────────────────────────────────────────

  const empEntries  = entries.filter(e => e.employee === emp.id)
  const empAbsences = absences.filter(a => a.employee === emp.id)
  const vacAcc      = vacAccounts.find(v => v.employee === emp.id)

  // Feiertagsnamen
  const holidayMap = useMemo(() => {
    const years = new Set([periodFrom.getFullYear(), periodTo.getFullYear()])
    const map   = new Map<string, string>()
    for (const year of years) {
      for (const [k, v] of getHolidayMap(year, federalState)) map.set(k, v)
    }
    return map
  }, [periodFrom, periodTo, federalState])

  // ── Stunden-Zeilen: nur Tage mit Einträgen ───────────────────────────────────

  const stundenRows = useMemo<StundenRow[]>(() => {
    // Einmalige Datumsliste sortiert nach Datum
    const dateKeys = [...new Set(empEntries.map(e => format(new Date(e.start_time), 'yyyy-MM-dd')))].sort()
    const result: StundenRow[] = []
    let lastMonth = -1
    let lastMonthDate: Date | null = null

    for (const key of dateKeys) {
      const date  = parseISO(key)
      const dow   = getDay(date)
      const month = date.getMonth()

      if (view === 'jahr' && month !== lastMonth) {
        if (lastMonth !== -1 && lastMonthDate) {
          result.push({ type: 'month-total', month: lastMonthDate, mins: monthMins(lastMonthDate) })
        }
        result.push({ type: 'month-header', month: date })
        lastMonth = month
      }
      lastMonthDate = date

      const isWeekend  = dow === 0 || dow === 6
      const holidayName = holidayMap.get(key) ?? null
      const dayEntries = empEntries.filter(e => format(new Date(e.start_time), 'yyyy-MM-dd') === key)

      result.push({ type: 'entry', date, isWeekend, holidayName, entries: dayEntries })
    }

    if (view === 'jahr' && lastMonthDate) {
      result.push({ type: 'month-total', month: lastMonthDate, mins: monthMins(lastMonthDate) })
    }

    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empEntries, view, holidayMap])

  function monthMins(monthDate: Date): number {
    const mFrom = startOfMonth(monthDate)
    const mTo   = endOfMonth(monthDate)
    return empEntries
      .filter(e => { const d = new Date(e.start_time); return d >= mFrom && d <= mTo })
      .reduce((s, e) => s + netMinutes(e), 0)
  }

  // ── Abwesenheiten wöchentlich ─────────────────────────────────────────────────

  const weekSummaries = useMemo<WeekSummary[]>(() => {
    if (empAbsences.length === 0) return []
    const result: WeekSummary[] = []
    let weekMon = startOfWeek(periodFrom, { weekStartsOn: 1 })

    while (weekMon <= periodTo) {
      const weekSun = addDays(weekMon, 6)
      const wFrom   = weekMon < periodFrom ? periodFrom : weekMon
      const wTo     = weekSun > periodTo   ? periodTo   : weekSun

      const byType: Partial<Record<AbsenceType, number>> = {}
      for (const abs of empAbsences) {
        const days = absenceDaysInPeriod(abs, wFrom, wTo, holidays)
        if (days > 0) byType[abs.type] = (byType[abs.type] ?? 0) + days
      }

      if (Object.keys(byType).length > 0) {
        const displayTo = min([addDays(weekMon, 4), wTo]) // bis Freitag
        result.push({ kw: getISOWeek(weekMon), weekFrom: wFrom, weekTo: displayTo, byType })
      }
      weekMon = addWeeks(weekMon, 1)
    }
    return result
  }, [empAbsences, periodFrom, periodTo, holidays])

  // Nur Abwesenheitstypen, die tatsächlich vorkommen (für Spaltenkopf)
  const activeAbsTypes = ALL_ABSENCE_TYPES.filter(t => weekSummaries.some(w => (w.byType[t] ?? 0) > 0))

  // ── Zusammenfassung ───────────────────────────────────────────────────────────

  const totalIstMins = empEntries.reduce((s, e) => s + netMinutes(e), 0)
  const totalSollH   = sollHours(emp, periodFrom, periodTo, holidays)
  const totalDeltaH  = totalIstMins / 60 - totalSollH
  const arbeitstage  = workingDays(periodFrom, periodTo, holidays)

  const vacDays   = empAbsences.filter(a => VACATION_TYPES.includes(a.type))
    .reduce((s, a) => s + absenceDaysInPeriod(a, periodFrom, periodTo, holidays), 0)
  const sickDays  = empAbsences.filter(a => a.type === 'K' || a.type === 'KK')
    .reduce((s, a) => s + absenceDaysInPeriod(a, periodFrom, periodTo, holidays), 0)
  const otherDays = empAbsences.filter(a => a.type === 'AT' || a.type === 'S' || a.type === 'ÜA')
    .reduce((s, a) => s + absenceDaysInPeriod(a, periodFrom, periodTo, holidays), 0)

  const vacTotal    = vacAcc ? vacAcc.entitlement + vacAcc.carry_over : null
  const resturlaub  = vacTotal !== null && yearVacTaken !== null ? vacTotal - yearVacTaken : null

  const periodLabel = view === 'monat'
    ? format(periodFrom, 'MMMM yyyy', { locale: de })
    : periodFrom.getFullYear().toString()
  const dept = emp.expand?.department

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div id="druck-root" className="fixed inset-0 z-50 bg-[#F3F4F6] overflow-y-auto">

      {/* Toolbar */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between bg-white border-b border-[#E5E7EB] px-6 py-3 shadow-sm">
        <button onClick={onClose} className="flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#111827] transition-colors">
          <X size={16} />
          Schließen
        </button>
        <span className="text-sm font-medium text-[#111827] capitalize">
          {emp.last_name}, {emp.first_name} — {periodLabel}
        </span>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-[#4F46E5] text-white text-sm px-4 py-1.5 rounded-md hover:bg-[#4338CA] transition-colors"
        >
          <Printer size={14} />
          Drucken / PDF
        </button>
      </div>

      {/* A4-Dokument */}
      <div className="max-w-[794px] mx-auto my-8 bg-white shadow-sm print:shadow-none print:my-0">
        <div className="p-[18mm]">

          {/* Dokumentkopf */}
          <div className="flex justify-between items-baseline mb-5">
            <span className="text-[11px] text-[#6B7280]">{companyName} · Schicht & Plan</span>
            <span className="text-[11px] text-[#6B7280] capitalize">{periodLabel}</span>
          </div>

          <h2 className="text-[15px] font-bold text-[#111827] uppercase tracking-widest mb-4">Zeitnachweis</h2>

          <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-6 text-[12px]">
            <div>
              <span className="text-[#6B7280]">Mitarbeiter: </span>
              <span className="font-semibold">{emp.last_name}, {emp.first_name}</span>
            </div>
            <div>
              <span className="text-[#6B7280]">Zeitraum: </span>
              <span>{format(periodFrom, 'dd.MM.yyyy')} – {format(periodTo, 'dd.MM.yyyy')}</span>
            </div>
            <div>
              <span className="text-[#6B7280]">Abteilung: </span>
              <span>{dept?.name ?? '–'}</span>
            </div>
            <div>
              <span className="text-[#6B7280]">Soll-Stunden: </span>
              <span>{fmtH(totalSollH)} ({arbeitstage} Arbeitstage)</span>
            </div>
          </div>

          {/* ── Stundentabelle ── */}
          <h3 className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#6B7280] mb-1.5 mt-4">Stunden</h3>

          {stundenRows.length === 0 ? (
            <p className="text-[11px] text-[#9CA3AF] italic mb-4">Keine Zeiteinträge im Zeitraum.</p>
          ) : (
            <table className="w-full border-collapse text-[10px] border border-[#D1D5DB]">
              <thead>
                <tr className="bg-[#F3F4F6]">
                  <th className="border border-[#D1D5DB] px-2 py-1.5 text-left font-semibold text-[#6B7280] w-9">Tag</th>
                  <th className="border border-[#D1D5DB] px-2 py-1.5 text-left font-semibold text-[#6B7280] w-24">Datum</th>
                  <th className="border border-[#D1D5DB] px-2 py-1.5 text-center font-semibold text-[#6B7280] w-12">Von</th>
                  <th className="border border-[#D1D5DB] px-2 py-1.5 text-center font-semibold text-[#6B7280] w-12">Bis</th>
                  <th className="border border-[#D1D5DB] px-2 py-1.5 text-center font-semibold text-[#6B7280] w-14">Pause</th>
                  <th className="border border-[#D1D5DB] px-2 py-1.5 text-center font-semibold text-[#6B7280] w-14">Netto</th>
                  <th className="border border-[#D1D5DB] px-2 py-1.5 text-left font-semibold text-[#6B7280]">Notiz</th>
                </tr>
              </thead>
              <tbody>
                {stundenRows.map((row, idx) => {

                  if (row.type === 'month-header') return (
                    <tr key={idx}>
                      <td colSpan={7} className="border border-[#D1D5DB] px-2 py-1.5 font-bold text-[#4F46E5] bg-[#EEF2FF] capitalize text-[10px]">
                        {format(row.month, 'MMMM yyyy', { locale: de })}
                      </td>
                    </tr>
                  )

                  if (row.type === 'month-total') return (
                    <tr key={idx} className="bg-[#F3F4F6]">
                      <td colSpan={5} className="border border-[#D1D5DB] px-2 py-1 text-right text-[#6B7280] font-semibold text-[9px] uppercase tracking-wide">
                        Monats-Summe {format(row.month, 'MMMM', { locale: de })}
                      </td>
                      <td className="border border-[#D1D5DB] px-2 py-1 text-center tabular-nums font-semibold text-[#111827]">
                        {fmtH(row.mins / 60)}
                      </td>
                      <td className="border border-[#D1D5DB]" />
                    </tr>
                  )

                  // Eintrag-Zeile (ggf. mehrere pro Tag)
                  const { date, isWeekend, holidayName, entries: dayEntries } = row
                  const rowClass = (isWeekend || holidayName) ? 'bg-[#F3F4F6]' : ''
                  const dayStr  = format(date, 'EEE', { locale: de })
                  const dateStr = format(date, 'dd.MM.yyyy')
                  const notizSuffix = holidayName ? `(Feiertag: ${holidayName})` : ''

                  return dayEntries.map((entry, ei) => (
                    <tr key={`${idx}-${ei}`} className={rowClass}>
                      <td className={cn('border border-[#D1D5DB] px-2 py-1 capitalize', (isWeekend || holidayName) && 'text-[#4F46E5]')}>
                        {ei === 0 ? dayStr : ''}
                      </td>
                      <td className="border border-[#D1D5DB] px-2 py-1">{ei === 0 ? dateStr : ''}</td>
                      <td className="border border-[#D1D5DB] px-2 py-1 text-center tabular-nums">{toLocalHHMM(entry.start_time)}</td>
                      <td className="border border-[#D1D5DB] px-2 py-1 text-center tabular-nums">{entry.end_time ? toLocalHHMM(entry.end_time) : '–'}</td>
                      <td className="border border-[#D1D5DB] px-2 py-1 text-center tabular-nums">{entry.break_minutes} min</td>
                      <td className="border border-[#D1D5DB] px-2 py-1 text-center tabular-nums font-semibold">{fmtH(netMinutes(entry) / 60)}</td>
                      <td className="border border-[#D1D5DB] px-2 py-1 text-[#6B7280]">
                        {ei === 0 && notizSuffix
                          ? <span className="italic text-[#4F46E5]">{notizSuffix}{entry.note ? ` · ${entry.note}` : ''}</span>
                          : (entry.note ?? '')}
                      </td>
                    </tr>
                  ))
                })}

                {/* Gesamt */}
                <tr className="bg-[#F3F4F6]">
                  <td colSpan={5} className="border border-[#D1D5DB] px-2 py-1.5 text-right font-semibold text-[#6B7280] text-[9px] uppercase tracking-wide">
                    Gesamt Ist-Stunden
                  </td>
                  <td className="border border-[#D1D5DB] px-2 py-1.5 text-center tabular-nums font-bold text-[#111827]">
                    {fmtH(totalIstMins / 60)}
                  </td>
                  <td className="border border-[#D1D5DB]" />
                </tr>
              </tbody>
            </table>
          )}

          {/* ── Abwesenheiten (wöchentlich) ── */}
          {weekSummaries.length > 0 && (
            <>
              <h3 className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#6B7280] mb-1.5 mt-6">Abwesenheiten</h3>
              <table className="w-full border-collapse text-[10px] border border-[#D1D5DB]">
                <thead>
                  <tr className="bg-[#F3F4F6]">
                    <th className="border border-[#D1D5DB] px-2 py-1.5 text-center font-semibold text-[#6B7280] w-10">KW</th>
                    <th className="border border-[#D1D5DB] px-2 py-1.5 text-left font-semibold text-[#6B7280] w-28">Zeitraum</th>
                    {activeAbsTypes.map(t => (
                      <th
                        key={t}
                        className="border border-[#D1D5DB] px-2 py-1.5 text-center font-semibold text-[9px] whitespace-nowrap"
                        style={{ color: ABSENCE_COLORS[t].text, backgroundColor: ABSENCE_COLORS[t].bg }}
                        title={ABSENCE_LABELS[t]}
                      >
                        {t}
                      </th>
                    ))}
                    <th className="border border-[#D1D5DB] px-2 py-1.5 text-center font-semibold text-[#6B7280] w-10">Σ</th>
                  </tr>
                </thead>
                <tbody>
                  {weekSummaries.map((w, i) => {
                    const total = activeAbsTypes.reduce((s, t) => s + (w.byType[t] ?? 0), 0)
                    const fromStr = format(w.weekFrom, 'dd.MM.')
                    const toStr   = format(w.weekTo,   'dd.MM.yyyy')
                    return (
                      <tr key={i} className={i % 2 === 1 ? 'bg-[#F9FAFB]' : ''}>
                        <td className="border border-[#D1D5DB] px-2 py-1 text-center font-semibold text-[#6B7280]">{w.kw}</td>
                        <td className="border border-[#D1D5DB] px-2 py-1 whitespace-nowrap">{fromStr} – {toStr}</td>
                        {activeAbsTypes.map(t => (
                          <td key={t} className="border border-[#D1D5DB] px-2 py-1 text-center tabular-nums">
                            {w.byType[t]
                              ? <span className="font-semibold" style={{ color: ABSENCE_COLORS[t].text }}>{w.byType[t]}</span>
                              : <span className="text-[#D1D5DB]">–</span>}
                          </td>
                        ))}
                        <td className="border border-[#D1D5DB] px-2 py-1 text-center tabular-nums font-semibold text-[#111827]">{total}</td>
                      </tr>
                    )
                  })}
                  {/* Abwesenheits-Summe */}
                  {weekSummaries.length > 1 && (
                    <tr className="bg-[#F3F4F6] font-semibold">
                      <td colSpan={2} className="border border-[#D1D5DB] px-2 py-1 text-right text-[#6B7280] text-[9px] uppercase tracking-wide">Gesamt</td>
                      {activeAbsTypes.map(t => {
                        const sum = weekSummaries.reduce((s, w) => s + (w.byType[t] ?? 0), 0)
                        return (
                          <td key={t} className="border border-[#D1D5DB] px-2 py-1 text-center tabular-nums">
                            {sum > 0
                              ? <span style={{ color: ABSENCE_COLORS[t].text }}>{sum}</span>
                              : <span className="text-[#D1D5DB]">–</span>}
                          </td>
                        )
                      })}
                      <td className="border border-[#D1D5DB] px-2 py-1 text-center tabular-nums text-[#111827]">
                        {weekSummaries.reduce((s, w) => s + activeAbsTypes.reduce((ss, t) => ss + (w.byType[t] ?? 0), 0), 0)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}

          {/* ── Zusammenfassung ── */}
          <h3 className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#6B7280] mb-1.5 mt-6">Zusammenfassung</h3>
          <table className="border-collapse text-[10px] border border-[#D1D5DB]">
            <tbody>
              <tr>
                <td className="border border-[#D1D5DB] px-3 py-1.5 text-[#6B7280] w-64">Soll-Stunden</td>
                <td className="border border-[#D1D5DB] px-3 py-1.5 tabular-nums font-semibold w-32">{fmtH(totalSollH)}</td>
              </tr>
              <tr>
                <td className="border border-[#D1D5DB] px-3 py-1.5 text-[#6B7280]">Ist-Stunden</td>
                <td className="border border-[#D1D5DB] px-3 py-1.5 tabular-nums font-semibold">{fmtH(totalIstMins / 60)}</td>
              </tr>
              <tr>
                <td className="border border-[#D1D5DB] px-3 py-1.5 text-[#6B7280]">Differenz</td>
                <td className={cn(
                  'border border-[#D1D5DB] px-3 py-1.5 tabular-nums font-semibold',
                  totalDeltaH > 0.02 ? 'text-emerald-600' : totalDeltaH < -0.02 ? 'text-red-500' : 'text-[#9CA3AF]',
                )}>
                  {fmtDelta(totalDeltaH)}
                </td>
              </tr>
              {vacDays > 0 && (
                <tr>
                  <td className="border border-[#D1D5DB] px-3 py-1.5 text-[#6B7280]">Urlaubstage genommen (U / RU / U3 / SU)</td>
                  <td className="border border-[#D1D5DB] px-3 py-1.5 tabular-nums">{vacDays} {vacDays === 1 ? 'Tag' : 'Tage'}</td>
                </tr>
              )}
              {sickDays > 0 && (
                <tr>
                  <td className="border border-[#D1D5DB] px-3 py-1.5 text-[#6B7280]">Krankheitstage (K / KK)</td>
                  <td className="border border-[#D1D5DB] px-3 py-1.5 tabular-nums">{sickDays} {sickDays === 1 ? 'Tag' : 'Tage'}</td>
                </tr>
              )}
              {otherDays > 0 && (
                <tr>
                  <td className="border border-[#D1D5DB] px-3 py-1.5 text-[#6B7280]">Sonstige (AT / S / ÜA)</td>
                  <td className="border border-[#D1D5DB] px-3 py-1.5 tabular-nums">{otherDays} {otherDays === 1 ? 'Tag' : 'Tage'}</td>
                </tr>
              )}
              {vacAcc && (
                <>
                  <tr>
                    <td className="border border-[#D1D5DB] px-3 py-1.5 text-[#6B7280]">
                      Urlaubsanspruch {periodFrom.getFullYear()} (inkl. Übertrag)
                    </td>
                    <td className="border border-[#D1D5DB] px-3 py-1.5 tabular-nums">
                      {vacAcc.entitlement + vacAcc.carry_over} Tage
                      {vacAcc.carry_over > 0 && (
                        <span className="text-[#6B7280] ml-1">({vacAcc.entitlement} + {vacAcc.carry_over} Übertrag)</span>
                      )}
                    </td>
                  </tr>
                  {yearVacTaken !== null && (
                    <tr>
                      <td className="border border-[#D1D5DB] px-3 py-1.5 text-[#6B7280]">
                        Genommen gesamt {periodFrom.getFullYear()}
                      </td>
                      <td className="border border-[#D1D5DB] px-3 py-1.5 tabular-nums">{yearVacTaken} Tage</td>
                    </tr>
                  )}
                  {resturlaub !== null && (
                    <tr>
                      <td className="border border-[#D1D5DB] px-3 py-1.5 font-semibold text-[#111827]">Resturlaub</td>
                      <td className={cn(
                        'border border-[#D1D5DB] px-3 py-1.5 tabular-nums font-bold',
                        resturlaub <= 0 ? 'text-red-500' : resturlaub <= 3 ? 'text-amber-600' : 'text-emerald-600',
                      )}>
                        {resturlaub} {resturlaub === 1 ? 'Tag' : 'Tage'}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>

          {/* Unterschriften */}
          <div className="mt-16 grid grid-cols-2 gap-x-14 text-[10px] text-[#6B7280]">
            <div>
              <div className="h-10" />
              <div className="border-t border-[#6B7280] pt-1">Ort, Datum &nbsp;&nbsp;&nbsp; Unterschrift Mitarbeiter</div>
            </div>
            <div>
              <div className="h-10" />
              <div className="border-t border-[#6B7280] pt-1">Ort, Datum &nbsp;&nbsp;&nbsp; Unterschrift Leitung</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
