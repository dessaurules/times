import { useState, useEffect, useRef, useCallback } from 'react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns'
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
  const [isDragging, setIsDragging] = useState(false)
  const [popover,    setPopover]    = useState<{ absence: Absence; rect: DOMRect } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      pb.collection('settings').getFullList({ requestKey: 'abs-settings' }),
      pb.collection('employees').getFullList<Employee>({
        sort: 'last_name,first_name', filter: 'active = true', requestKey: 'abs-employees',
      }),
    ]).then(([settings, emps]) => {
      const fs = (settings as { key: string; value: string }[]).find(s => s.key === 'federal_state')?.value ?? 'ST'
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
    else setInputValue('')
  }, [activeCell])

  const holidayDates = getHolidayDates(year, federalState)
  const calendarDays = buildCalendarDays(year, month, holidayDates)
  const absenceMap   = buildAbsenceMap(absences)

  const createAbsence = useCallback(async (empId: string, dateFrom: string, dateTo: string, type: AbsenceType) => {
    const status = VACATION_TYPES.includes(type) ? 'pending' : 'approved'
    const rec = await pb.collection('absences').create<Absence>({
      employee: empId, date_from: dateFrom, date_to: dateTo,
      type, status, created_by: user!.id,
    })
    setAbsences(prev => [...prev, rec])
  }, [user])

  async function deleteAbsenceById(id: string) {
    await pb.collection('absences').delete(id)
    setAbsences(prev => prev.filter(a => a.id !== id))
  }

  async function handleApprove(absenceId: string) {
    const rec = await pb.collection('absences').update<Absence>(absenceId, {
      status: 'approved', approved_by: user!.id, approved_at: new Date().toISOString(),
    })
    setAbsences(prev => prev.map(a => a.id === absenceId ? rec : a))
    setPopover(null)
  }

  async function handleReject(absenceId: string) {
    const rec = await pb.collection('absences').update<Absence>(absenceId, { status: 'rejected' })
    setAbsences(prev => prev.map(a => a.id === absenceId ? rec : a))
    setPopover(null)
  }

  function handleCellClick(empId: string, date: string, absence: Absence | undefined) {
    if (isDragging) return
    if (absence && absence.status === 'pending' && canApprove) {
      const cellEl = document.querySelector(`[data-cell="${empId}_${date}"]`)
      if (cellEl) setPopover({ absence, rect: cellEl.getBoundingClientRect() })
      return
    }
    setActiveCell({ empId, date })
  }

  function handleCellMouseDown(empId: string, date: string) {
    setIsDragging(false)
    setDragRange({ empId, start: date, end: date })
  }

  function handleCellMouseEnter(empId: string, date: string) {
    if (!dragRange || dragRange.empId !== empId) return
    setIsDragging(true)
    const [s, e] = dragRange.start <= date ? [dragRange.start, date] : [date, dragRange.start]
    setDragRange({ empId, start: s, end: e })
  }

  const handleMouseUp = useCallback(() => {
    if (isDragging && dragRange && inputValue) {
      const type = inputValue.toUpperCase() as AbsenceType
      if (VALID_TYPES.includes(type)) {
        createAbsence(dragRange.empId, dragRange.start, dragRange.end, type)
      }
    }
    setDragRange(null)
    setIsDragging(false)
  }, [isDragging, dragRange, inputValue, createAbsence])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!activeCell) return
    e.preventDefault()

    if (e.key === 'Escape') {
      setActiveCell(null)
      return
    }

    if (e.key === 'Backspace') {
      setInputValue(prev => prev.slice(0, -1))
      return
    }

    if (e.key === 'Delete') {
      const existing = absenceMap.get(`${activeCell.empId}_${activeCell.date}`)
      if (existing) deleteAbsenceById(existing.id)
      setActiveCell(null)
      return
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      const type = inputValue.toUpperCase() as AbsenceType
      if (inputValue && VALID_TYPES.includes(type)) {
        createAbsence(activeCell.empId, activeCell.date, activeCell.date, type)
      }
      setActiveCell(null)
      return
    }

    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
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
      const next = (inputValue + e.key).toUpperCase()
      if (VALID_TYPES.some(t => t.startsWith(next))) setInputValue(next)
    }
  }

  if (loading && employees.length === 0) return <p className="text-sm text-[#706D6A]">Lade…</p>

  return (
    <div onMouseUp={handleMouseUp}>
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
          <h1 className="text-2xl font-bold text-[#1A1917]">Abwesenheiten</h1>
          <p className="text-sm text-[#706D6A]">Monatsübersicht</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(d => subMonths(d, 1))}
            className="p-1.5 rounded hover:bg-[#EDE7DC] text-[#706D6A]"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-[#1A1917] w-36 text-center">
            {format(currentDate, 'MMMM yyyy', { locale: de })}
          </span>
          <button
            onClick={() => setCurrentDate(d => addMonths(d, 1))}
            className="p-1.5 rounded hover:bg-[#EDE7DC] text-[#706D6A]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

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
        <span className="text-[10px] text-[#706D6A] ml-1 self-center">
          Kürzel eingeben · Pfeiltasten navigieren · Drag zum Ausfüllen · Delete löschen
        </span>
      </div>

      <div className="bg-white border border-[#EDE7DC] rounded-lg overflow-hidden">
        {employees.length === 0 && !loading ? (
          <p className="text-sm text-[#706D6A] p-6 text-center">Keine aktiven Mitarbeiter vorhanden.</p>
        ) : (
          <KalenderTable
            employees={employees}
            absenceMap={absenceMap}
            calendarDays={calendarDays}
            activeCell={activeCell}
            inputValue={inputValue}
            dragRange={dragRange}
            onCellClick={handleCellClick}
            onCellMouseDown={handleCellMouseDown}
            onCellMouseEnter={handleCellMouseEnter}
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
