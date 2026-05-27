import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pb } from '../lib/pb'
import { getHolidayDates } from '../lib/holidays'
import { buildCalendarDays, buildAbsenceMap } from '../lib/calendarUtils'
import type { Employee, Absence, AbsenceType } from '@shared/types'
import { VACATION_TYPES, ABSENCE_COLORS } from '@shared/types'
import KalenderTable from '../components/Abwesenheiten/KalenderTable'
import ApprovalPopover from '../components/Abwesenheiten/ApprovalPopover'
import { useAuthStore } from '../stores/auth'
import { notifyEmployee } from '../lib/notifications'

const VALID_TYPES: AbsenceType[] = ['U', 'RU', 'U3', 'SU', 'K', 'KK', 'AT', 'S', 'ÜA']

export default function Abwesenheiten() {
  const user = useAuthStore(s => s.user)
  const canApprove = user?.role === 'gf'

  const [currentDate, setCurrentDate] = useState(() => new Date())
  const year  = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  const [employees,    setEmployees]  = useState<Employee[]>([])
  const [absences,     setAbsences]   = useState<Absence[]>([])
  const [federalState, setFederal]    = useState('ST')
  const [loading,      setLoading]    = useState(true)

  const [activeCell, setActiveCell] = useState<{ empId: string; date: string } | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [dragRange,  setDragRange]  = useState<{ empId: string; start: string; end: string } | null>(null)
  const [popover,    setPopover]    = useState<{ absence: Absence; rect: DOMRect } | null>(null)
  const [animatingCells, setAnimatingCells] = useState<Map<string, 'filled' | 'cleared'>>(new Map())
  const inputRef       = useRef<HTMLInputElement>(null)
  const confirmTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didDragRef     = useRef(false)
  const dragRef        = useRef<{ empId: string; start: string; end: string; kuerzel: AbsenceType } | null>(null)

  function triggerCellAnim(key: string, type: 'filled' | 'cleared') {
    setAnimatingCells(prev => new Map(prev).set(key, type))
    setTimeout(() => {
      setAnimatingCells(prev => {
        const next = new Map(prev)
        next.delete(key)
        return next
      })
    }, 350)
  }

  useEffect(() => {
    Promise.all([
      pb.collection('settings').getFullList({ requestKey: 'abs-settings' }),
      pb.collection('employees').getFullList<Employee>({
        sort: 'last_name,first_name', filter: 'active = true', requestKey: 'abs-employees',
      }),
    ]).then(([settings, emps]) => {
      const fs = (settings as unknown as { key: string; value: string }[]).find(s => s.key === 'federal_state')?.value ?? 'ST'
      setFederal(fs)
      setEmployees(emps)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    setLoading(true)
    const from = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
    const to   = format(endOfMonth(new Date(year, month - 1)),   'yyyy-MM-dd')
    pb.collection('absences').getFullList<Absence>({
      filter: `date_from <= "${to}" && date_to >= "${from}"`,
      requestKey: `absences-${year}-${month}`,
    })
      .then(setAbsences)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [year, month])

  useEffect(() => {
    if (activeCell) inputRef.current?.focus()
    else {
      setInputValue('')
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
    }
  }, [activeCell])

  const holidayDates = getHolidayDates(year, federalState)
  const calendarDays = buildCalendarDays(year, month, holidayDates)
  const absenceMap   = buildAbsenceMap(absences)

  const monthWorkingDays = useMemo(
    () => calendarDays.filter(d => !d.isWeekend && !d.isHoliday).length,
    [calendarDays]
  )

  const summaries = useMemo(() => {
    const currentDates = new Set(calendarDays.map(d => d.date))
    const raw = new Map<string, { vacation: number; sick: number }>()
    for (const emp of employees) raw.set(emp.id, { vacation: 0, sick: 0 })
    for (const [key, abs] of absenceMap) {
      if (abs.status !== 'approved') continue
      const lastUnderscore = key.lastIndexOf('_')
      const empId = key.slice(0, lastUnderscore)
      const date  = key.slice(lastUnderscore + 1)
      if (!currentDates.has(date)) continue
      const s = raw.get(empId)
      if (!s) continue
      if (VACATION_TYPES.includes(abs.type)) s.vacation++
      else if (abs.type === 'K' || abs.type === 'KK') s.sick++
    }
    const map = new Map<string, { at: number; vacation: number; sick: number }>()
    for (const [empId, s] of raw) {
      map.set(empId, {
        at: Math.max(0, monthWorkingDays - s.vacation - s.sick),
        vacation: s.vacation,
        sick: s.sick,
      })
    }
    return map
  }, [absenceMap, employees, calendarDays, monthWorkingDays])

  const createAbsence = useCallback(async (empId: string, dateFrom: string, dateTo: string, type: AbsenceType) => {
    const rec = await pb.collection('absences').create<Absence>({
      employee: empId, date_from: dateFrom, date_to: dateTo,
      type, status: 'approved', created_by: user!.id,
    }, { requestKey: null })
    setAbsences(prev => [...prev, rec])
    triggerCellAnim(`${empId}_${dateFrom}`, 'filled')
  }, [user])

  async function deleteAbsenceById(id: string) {
    const target = absences.find(a => a.id === id)
    await pb.collection('absences').delete(id)
    setAbsences(prev => prev.filter(a => a.id !== id))
    if (target) {
      triggerCellAnim(`${target.employee}_${target.date_from}`, 'cleared')
    }
  }

  function absDateLabel(abs: Absence) {
    return abs.date_from === abs.date_to
      ? format(parseISO(abs.date_from), 'dd.MM.yyyy', { locale: de })
      : `${format(parseISO(abs.date_from), 'dd.MM.', { locale: de })} – ${format(parseISO(abs.date_to), 'dd.MM.yyyy', { locale: de })}`
  }

  async function handleApprove(absenceId: string) {
    const rec = await pb.collection('absences').update<Absence>(absenceId, {
      status: 'approved', approved_by: user!.id, approved_at: new Date().toISOString(),
    })
    setAbsences(prev => prev.map(a => a.id === absenceId ? rec : a))
    setPopover(null)
    const absence = absences.find(a => a.id === absenceId)
    if (absence) {
      notifyEmployee(
        absence.employee,
        'absence_approved',
        'Antrag genehmigt',
        `Dein ${absence.type}-Antrag (${absDateLabel(absence)}) wurde genehmigt.`,
        absence.id,
      )
    }
  }

  async function handleReject(absenceId: string) {
    const rec = await pb.collection('absences').update<Absence>(absenceId, { status: 'rejected' })
    setAbsences(prev => prev.map(a => a.id === absenceId ? rec : a))
    const absence = absences.find(a => a.id === absenceId)
    if (absence) {
      notifyEmployee(
        absence.employee,
        'absence_rejected',
        'Antrag abgelehnt',
        `Dein ${absence.type}-Antrag (${absDateLabel(absence)}) wurde leider abgelehnt.`,
        absence.id,
      )
    }
    setPopover(null)
  }

  type NavDir = 'right' | 'down' | null

  function nextWorkCell(empId: string, date: string, dir: 'right' | 'down') {
    const empIdx = employees.findIndex(e => e.id === empId)
    const dayIdx = calendarDays.findIndex(d => d.date === date)
    if (dir === 'right') {
      for (let i = dayIdx + 1; i < calendarDays.length; i++) {
        if (!calendarDays[i].isWeekend && !calendarDays[i].isHoliday)
          return { empId, date: calendarDays[i].date }
      }
      return null
    }
    const newIdx = Math.min(empIdx + 1, employees.length - 1)
    if (newIdx === empIdx) return null
    return { empId: employees[newIdx].id, date }
  }

  function executeConfirm(
    type: AbsenceType,
    snapCell: { empId: string; date: string } | null,
    snapDrag: { empId: string; start: string; end: string } | null,
    direction: NavDir = 'right',
  ) {
    if (snapDrag && snapDrag.start !== snapDrag.end) {
      const daysToFill = calendarDays.filter(d =>
        d.date >= snapDrag.start &&
        d.date <= snapDrag.end &&
        !d.isWeekend &&
        !d.isHoliday &&
        !absenceMap.has(`${snapDrag.empId}_${d.date}`)
      )
      for (const day of daysToFill) {
        createAbsence(snapDrag.empId, day.date, day.date, type)
      }
      setDragRange(null)
    } else if (snapCell) {
      const existing = absenceMap.get(`${snapCell.empId}_${snapCell.date}`)
      if (existing) deleteAbsenceById(existing.id)
      createAbsence(snapCell.empId, snapCell.date, snapCell.date, type)
    }
    if (direction && snapCell) {
      setActiveCell(nextWorkCell(snapCell.empId, snapCell.date, direction))
    } else {
      setActiveCell(null)
    }
    setInputValue('')
    if (confirmTimer.current) clearTimeout(confirmTimer.current)
  }

  function handleCellClick(empId: string, date: string, absence: Absence | undefined) {
    // Ignore click if it was the end of a drag
    if (didDragRef.current) return
    if (absence && absence.status === 'pending' && canApprove) {
      const cellEl = document.querySelector(`[data-cell="${empId}_${date}"]`)
      if (cellEl) setPopover({ absence, rect: cellEl.getBoundingClientRect() })
      return
    }
    setActiveCell({ empId, date })
    setDragRange(null)
  }

  function handleCellMouseDown(empId: string, date: string, kuerzel: AbsenceType) {
    didDragRef.current = false
    setActiveCell(null)
    const drag = { empId, start: date, end: date, kuerzel }
    dragRef.current = drag
    setDragRange({ empId, start: date, end: date })
  }

  function handleCellMouseEnter(empId: string, date: string) {
    if (!dragRef.current || dragRef.current.empId !== empId) return
    if (date !== dragRef.current.start) didDragRef.current = true
    const [s, e] = dragRef.current.start <= date
      ? [dragRef.current.start, date]
      : [date, dragRef.current.start]
    const drag = { empId, start: s, end: e, kuerzel: dragRef.current.kuerzel }
    dragRef.current = drag
    setDragRange({ empId, start: s, end: e })
  }

  const mouseUpHandlerRef = useRef<() => void>(() => {})
  mouseUpHandlerRef.current = () => {
    if (didDragRef.current && dragRef.current) {
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      executeConfirm(dragRef.current.kuerzel, null, dragRef.current, null)
    }
    dragRef.current = null
    setDragRange(null)
    setTimeout(() => { didDragRef.current = false }, 0)
  }

  useEffect(() => {
    const handler = () => mouseUpHandlerRef.current()
    window.addEventListener('mouseup', handler)
    return () => window.removeEventListener('mouseup', handler)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!activeCell && !dragRange) return

    if (e.key === 'Escape') {
      e.preventDefault()
      setActiveCell(null)
      setDragRange(null)
      dragRef.current = null
      setInputValue('')
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      return
    }

    if (e.key === 'Backspace') {
      e.preventDefault()
      if (inputValue === '') {
        if (activeCell) {
          const existing = absenceMap.get(`${activeCell.empId}_${activeCell.date}`)
          if (existing) deleteAbsenceById(existing.id)
        }
        if (confirmTimer.current) clearTimeout(confirmTimer.current)
      } else {
        setInputValue(prev => prev.slice(0, -1))
        if (confirmTimer.current) clearTimeout(confirmTimer.current)
      }
      return
    }

    if (e.key === 'Delete') {
      e.preventDefault()
      if (activeCell) {
        const existing = absenceMap.get(`${activeCell.empId}_${activeCell.date}`)
        if (existing) deleteAbsenceById(existing.id)
      }
      setInputValue('')
      return
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const type = inputValue.toUpperCase() as AbsenceType
      if (inputValue && VALID_TYPES.includes(type)) {
        executeConfirm(type, activeCell, dragRange, e.key === 'Enter' ? 'down' : 'right')
      } else {
        setActiveCell(null)
        setDragRange(null)
        setInputValue('')
      }
      return
    }

    if (activeCell && (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      setDragRange(null)
      const empIdx = employees.findIndex(emp => emp.id === activeCell.empId)
      const dayIdx = calendarDays.findIndex(d => d.date === activeCell.date)
      let newEmpIdx = empIdx
      let newDayIdx = dayIdx
      if (e.key === 'ArrowRight') newDayIdx = Math.min(dayIdx + 1, calendarDays.length - 1)
      if (e.key === 'ArrowLeft')  newDayIdx = Math.max(dayIdx - 1, 0)
      if (e.key === 'ArrowDown')  newEmpIdx = Math.min(empIdx + 1, employees.length - 1)
      if (e.key === 'ArrowUp')    newEmpIdx = Math.max(empIdx - 1, 0)
      setActiveCell({ empId: employees[newEmpIdx].id, date: calendarDays[newDayIdx].date })
      setInputValue('')
      return
    }

    if (e.key.length === 1) {
      e.preventDefault()
      const next = (inputValue + e.key).toUpperCase()
      if (!VALID_TYPES.some(t => t.startsWith(next))) return
      setInputValue(next)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      const isExact   = VALID_TYPES.includes(next as AbsenceType)
      const hasLonger = VALID_TYPES.some(t => t !== next && t.startsWith(next))
      if (isExact) {
        const snapCell = activeCell
        const snapDrag = dragRange
        // Unambiguous (RU, AT, KK, U3, ÜA): confirm after short delay for visual feedback
        // Ambiguous (U→U3, K→KK, S→SU): confirm after 600ms if no more input
        const delay = hasLonger ? 600 : 150
        confirmTimer.current = setTimeout(() => {
          executeConfirm(next as AbsenceType, snapCell, snapDrag)
        }, delay)
      }
    }
  }

  if (loading && employees.length === 0) return <p className="text-sm text-[#6B7280]">Lade…</p>

  return (
    <div>
      <input
        ref={inputRef}
        className="sr-only"
        onKeyDown={handleKeyDown}
        onChange={() => {}}
        value={inputValue}
        readOnly
      />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Abwesenheiten</h1>
          <p className="text-sm text-[#6B7280]">Monatsübersicht</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(d => subMonths(d, 1))}
            className="p-1.5 rounded hover:bg-[#E5E7EB] text-[#6B7280]"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-[#111827] w-36 text-center">
            {format(currentDate, 'MMMM yyyy', { locale: de })}
          </span>
          <button
            onClick={() => setCurrentDate(d => addMonths(d, 1))}
            className="p-1.5 rounded hover:bg-[#E5E7EB] text-[#6B7280]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <p className="text-sm text-[#6B7280] mb-3">
        <span className="font-semibold text-[#111827]">{monthWorkingDays}</span> Arbeitstage
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {(['U','RU','K','KK','AT','S','ÜA'] as AbsenceType[]).map(type => (
          <span
            key={type}
            className="px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{ backgroundColor: ABSENCE_COLORS[type].bg, color: ABSENCE_COLORS[type].text }}
          >
            {type}
          </span>
        ))}
        <span className="text-[10px] text-[#6B7280] ml-1 self-center">
          Kürzel eingeben · ← → ↑ ↓ navigieren · ⌫ löschen · Drag zum Kopieren
        </span>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
        {employees.length === 0 && !loading ? (
          <p className="text-sm text-[#6B7280] p-6 text-center">Keine aktiven Mitarbeiter vorhanden.</p>
        ) : (
          <KalenderTable
            employees={employees}
            absenceMap={absenceMap}
            calendarDays={calendarDays}
            summaries={summaries}
            activeCell={activeCell}
            inputValue={inputValue}
            dragRange={dragRange}
            onCellClick={handleCellClick}
            onCellMouseDown={handleCellMouseDown}
            onCellMouseEnter={handleCellMouseEnter}
            animatingCells={animatingCells}
          />
        )}
      </div>

      {popover && canApprove && (
        <ApprovalPopover
          absence={popover.absence}
          employee={employees.find(e => e.id === popover.absence.employee)!}
          anchorRect={popover.rect}
          onApprove={() => handleApprove(popover.absence.id)}
          onReject={() => handleReject(popover.absence.id)}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  )
}
