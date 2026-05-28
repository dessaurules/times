import React, { useState } from 'react'
import { ChevronDown, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SHIFT_COLOR_BG, SHIFT_COLOR_TEXT, ABSENCE_COLORS, ABSENCE_LABELS } from '@shared/types'
import type { Department, Employee, ShiftEntry, Absence } from '@shared/types'
import { sortEmployees, calcShiftMins, fmtMins, calcSollMins } from '@/lib/dienstplanUtils'
import type { WeekDay } from '@/lib/dienstplanUtils'

interface Props {
  days: WeekDay[]
  departments: Department[]
  employees: Employee[]
  entries: ShiftEntry[]
  absenceMap: Record<string, Absence>
  rowOrder: Record<string, string[]>
  editableDepts: string[]
  onCellClick: (empId: string, date: string, existing?: ShiftEntry, absence?: Absence) => void
  onShiftDrop: (entryId: string, toEmpId: string, toDate: string) => void
  onRowReorder: (deptId: string, fromIdx: number, toIdx: number) => void
}

export default function WeekGrid({
  days,
  departments,
  employees,
  entries,
  absenceMap,
  rowOrder,
  editableDepts,
  onCellClick,
  onShiftDrop,
  onRowReorder,
}: Props) {
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set())
  const [dragEntry, setDragEntry] = useState<ShiftEntry | null>(null)
  const [cellOver, setCellOver] = useState<string | null>(null)
  const [dragRowInfo, setDragRowInfo] = useState<{ deptId: string; idx: number } | null>(null)
  const [rowDragOverInfo, setRowDragOverInfo] = useState<{ deptId: string; idx: number } | null>(null)

  function empWeekMins(empId: string): number {
    return entries
      .filter(e => e.employee === empId && !e.is_free_day)
      .reduce((sum, e) => sum + calcShiftMins(e), 0)
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white">
      <table className="border-collapse min-w-full">
        <thead className="sticky top-0 z-20 bg-white">
          <tr>
            {/* Name-Spalte Header */}
            <th className="sticky left-0 z-30 bg-white border-b border-r border-[#E5E7EB] px-3 py-1.5 text-left min-w-[110px]">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Mitarbeiter
              </span>
            </th>
            {/* Tag-Spalten */}
            {days.map(day => (
              <th
                key={day.date}
                className={cn(
                  'w-24 min-w-[96px] text-center border-b border-r border-[#E5E7EB] py-1 bg-white',
                  day.isHoliday && 'bg-amber-50',
                  day.isWeekend && !day.isHoliday && 'bg-gray-50',
                )}
              >
                <span className="block font-bold text-sm">{day.dayName}</span>
                <span className="block text-[11px] text-gray-500">{day.label}</span>
                {day.isHoliday && (
                  <span className="block text-[9px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded mt-0.5 truncate max-w-full">
                    {day.holidayName}
                  </span>
                )}
              </th>
            ))}
            <th className="sticky right-0 z-30 bg-indigo-50 border-b border-l-2 border-l-indigo-200 border-[#E5E7EB] px-2 py-1 min-w-[80px] text-center">
              <span className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wide">Σ h</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {departments.map(dept => {
            const deptEmps = sortEmployees(
              employees.filter(e => e.department === dept.id),
              dept.id,
              rowOrder,
            )
            const isCollapsed = collapsedDepts.has(dept.id)

            return (
              <React.Fragment key={dept.id}>
                {/* Abteilungs-Header */}
                <tr key={`dept-${dept.id}`}>
                  <td
                    colSpan={days.length + 1}
                    className="bg-indigo-50 text-indigo-700 text-[11px] font-bold uppercase tracking-wide px-3 py-1 cursor-pointer select-none border-y border-indigo-100"
                    onClick={() =>
                      setCollapsedDepts(prev => {
                        const next = new Set(prev)
                        next.has(dept.id) ? next.delete(dept.id) : next.add(dept.id)
                        return next
                      })
                    }
                  >
                    <ChevronDown
                      className={cn(
                        'w-3 h-3 inline mr-1 transition-transform',
                        collapsedDepts.has(dept.id) && '-rotate-90',
                      )}
                    />
                    {dept.name}
                  </td>
                  <td className="sticky right-0 bg-indigo-50 border-l-2 border-l-indigo-200 border-b border-[#E5E7EB]" />
                </tr>
                {/* Mitarbeiter-Zeilen */}
                {!isCollapsed &&
                  deptEmps.map((emp, empIdx) => (
                    <tr
                      key={emp.id}
                      draggable={editableDepts.includes(dept.id)}
                      onDragStart={() => setDragRowInfo({ deptId: dept.id, idx: empIdx })}
                      onDragEnd={() => {
                        setDragRowInfo(null)
                        setRowDragOverInfo(null)
                      }}
                      onDragOver={e => {
                        e.preventDefault()
                        setRowDragOverInfo({ deptId: dept.id, idx: empIdx })
                      }}
                      onDrop={e => {
                        e.preventDefault()
                        if (
                          dragRowInfo &&
                          dragRowInfo.deptId === dept.id &&
                          dragRowInfo.idx !== empIdx
                        ) {
                          onRowReorder(dept.id, dragRowInfo.idx, empIdx)
                        }
                        setDragRowInfo(null)
                        setRowDragOverInfo(null)
                      }}
                      className={cn(
                        rowDragOverInfo?.deptId === dept.id &&
                          rowDragOverInfo?.idx === empIdx &&
                          'bg-indigo-50',
                      )}
                    >
                      {/* Name-Zelle */}
                      <td
                        className={cn(
                          'sticky left-0 z-10 bg-white border-b border-r border-[#E5E7EB] px-2 py-1 min-w-[110px]',
                          rowDragOverInfo?.deptId === dept.id &&
                            rowDragOverInfo?.idx === empIdx &&
                            'bg-indigo-50',
                        )}
                      >
                        <div className="flex items-center gap-1">
                          {editableDepts.includes(dept.id) && (
                            <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0 cursor-grab" />
                          )}
                          <span className="text-[13px] font-medium text-[#111827] truncate">
                            {emp.last_name}, {emp.first_name}
                          </span>
                        </div>
                      </td>
                      {/* Tag-Zellen */}
                      {days.map(day => {
                        const cellKey = `${emp.id}_${day.date}`
                        const entry = entries.find(
                          e => e.employee === emp.id && e.date.startsWith(day.date),
                        )
                        const isEditable = editableDepts.includes(dept.id)
                        const isDragOver = cellOver === cellKey
                        const absence = absenceMap[`${emp.id}_${day.date}`]

                        return (
                          <td
                            key={day.date}
                            className={cn(
                              'border-b border-r border-[#E5E7EB] p-1 w-24 h-[52px] overflow-hidden',
                              day.isHoliday && 'bg-amber-50/50',
                              day.isWeekend && !day.isHoliday && 'bg-gray-50/50',
                              isDragOver &&
                                'bg-indigo-50 outline-dashed outline-2 outline-indigo-400 outline-offset-[-2px]',
                            )}
                            onDragOver={e => {
                              e.preventDefault()
                              setCellOver(cellKey)
                            }}
                            onDragLeave={() => {
                              if (cellOver === cellKey) setCellOver(null)
                            }}
                            onDrop={e => {
                              e.preventDefault()
                              if (dragEntry) onShiftDrop(dragEntry.id, emp.id, day.date)
                              setCellOver(null)
                              setDragEntry(null)
                            }}
                            onClick={() => !entry && isEditable && onCellClick(emp.id, day.date, undefined, absence)}
                          >
                            {entry ? (
                              <div
                                className="flex flex-col h-full gap-0.5"
                                onClick={e => {
                                  e.stopPropagation()
                                  onCellClick(emp.id, day.date, entry, absence)
                                }}
                              >
                                {entry.is_free_day ? (
                                  /* Freier Tag */
                                  <div
                                    draggable={isEditable}
                                    onDragStart={e => { e.stopPropagation(); setDragEntry(entry) }}
                                    onDragEnd={() => setDragEntry(null)}
                                    className="text-[11px] px-1.5 h-full rounded text-center cursor-pointer hover:opacity-80 transition-opacity flex flex-col justify-center bg-emerald-50 font-black text-emerald-600"
                                  >
                                    F
                                  </div>
                                ) : (
                                  <>
                                    {/* Schicht 1 — doppelte Höhe wenn keine Split-Schicht */}
                                    <div
                                      draggable={isEditable}
                                      onDragStart={e => {
                                        e.stopPropagation()
                                        setDragEntry(entry)
                                      }}
                                      onDragEnd={() => setDragEntry(null)}
                                      className={cn(
                                        'text-[11px] px-1.5 rounded text-center cursor-pointer hover:opacity-80 transition-opacity flex flex-col justify-center',
                                        entry.start_time2 ? 'flex-1' : 'h-full',
                                      )}
                                      style={{
                                        background: SHIFT_COLOR_BG[entry.color],
                                        color: SHIFT_COLOR_TEXT[entry.color],
                                      }}
                                    >
                                      {entry.start_time}–{entry.end_time}
                                      {entry.note && (
                                        <span className="block text-[9px] opacity-70 truncate">
                                          {entry.note}
                                        </span>
                                      )}
                                    </div>
                                    {/* Schicht 2 (Split) */}
                                    {entry.start_time2 &&
                                      entry.end_time2 &&
                                      entry.color2 && (
                                        <div
                                          className="text-[11px] px-1.5 flex-1 flex items-center justify-center rounded text-center"
                                          style={{
                                            background: SHIFT_COLOR_BG[entry.color2],
                                            color: SHIFT_COLOR_TEXT[entry.color2],
                                          }}
                                        >
                                          {entry.start_time2}–{entry.end_time2}
                                          {entry.note2 && (
                                            <span className="block text-[9px] opacity-70 truncate">
                                              {entry.note2}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    {/* Abwesenheits-Warnung unter Schicht */}
                                    {absence && (
                                      <div
                                        className="text-[9px] text-center mt-0.5 font-semibold"
                                        style={{ color: ABSENCE_COLORS[absence.type].text }}
                                      >
                                        ⚠ {absence.type}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            ) : absence ? (
                              <div
                                className="text-[11px] px-1.5 h-full rounded text-center cursor-pointer hover:opacity-80 transition-opacity flex flex-col justify-center font-semibold leading-none"
                                style={{
                                  background: ABSENCE_COLORS[absence.type].bg,
                                  color: ABSENCE_COLORS[absence.type].text,
                                }}
                                onClick={e => { e.stopPropagation(); isEditable && onCellClick(emp.id, day.date, undefined, absence) }}
                              >
                                {absence.type}
                              </div>
                            ) : isEditable ? (
                              <div className="flex items-center justify-center h-full">
                                <span className="text-[10px] text-gray-300 border border-dashed border-gray-200 rounded px-1.5 py-0.5 hover:border-indigo-300 hover:text-indigo-400 transition-colors">
                                  +
                                </span>
                              </div>
                            ) : null}
                          </td>
                        )
                      })}
                      {/* Stunden-Zelle */}
                      {(() => {
                        const netMins = empWeekMins(emp.id)
                        const sollMins = calcSollMins(emp, days, absenceMap)
                        const pct = sollMins > 0 ? Math.min(100, Math.round((netMins / sollMins) * 100)) : 0
                        const saldo = netMins - sollMins
                        const barColor = pct >= 100 ? 'bg-emerald-400' : 'bg-indigo-400'
                        const saldoStyle = saldo > 5
                          ? 'bg-amber-50 text-amber-700'
                          : saldo < -5
                            ? 'bg-red-50 text-red-600'
                            : 'bg-emerald-50 text-emerald-600'
                        return (
                          <td className="sticky right-0 bg-indigo-50/80 border-l-2 border-l-indigo-200 border-b border-[#E5E7EB] px-2 py-1.5 min-w-[80px]">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-sm font-bold text-gray-800 leading-none">{fmtMins(netMins)}</p>
                              {sollMins > 0 && (
                                <span className={cn('text-[10px] font-semibold px-1 py-0.5 rounded', saldoStyle)}>
                                  {saldo === 0 ? '±0' : (saldo > 0 ? '+' : '') + fmtMins(saldo)}
                                </span>
                              )}
                            </div>
                            {sollMins > 0 && (
                              <div className="mt-1 h-0.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={cn('h-full rounded-full transition-all', barColor)}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            )}
                          </td>
                        )
                      })()}
                    </tr>
                  ))}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
