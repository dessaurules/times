import React, { useState } from 'react'
import { ChevronDown, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SHIFT_COLOR_BG, SHIFT_COLOR_TEXT } from '@shared/types'
import type { Department, Employee, ShiftEntry } from '@shared/types'
import { sortEmployees } from '@/lib/dienstplanUtils'
import type { WeekDay } from '@/lib/dienstplanUtils'

interface Props {
  days: WeekDay[]
  departments: Department[]
  employees: Employee[]
  entries: ShiftEntry[]
  rowOrder: Record<string, string[]>
  editableDepts: string[]
  onCellClick: (empId: string, date: string, existing?: ShiftEntry) => void
  onShiftDrop: (entryId: string, toEmpId: string, toDate: string) => void
  onRowReorder: (deptId: string, fromIdx: number, toIdx: number) => void
}

export default function WeekGrid({
  days,
  departments,
  employees,
  entries,
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

  return (
    <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white">
      <table className="border-collapse min-w-full">
        <thead className="sticky top-0 z-20 bg-white">
          <tr>
            {/* Name-Spalte Header */}
            <th className="sticky left-0 z-30 bg-white border-b border-r border-[#E5E7EB] px-3 py-2 text-left min-w-[140px]">
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
                    className="bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wide px-3 py-1.5 cursor-pointer select-none"
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
                          'sticky left-0 z-10 bg-white border-b border-r border-[#E5E7EB] px-2 py-1 min-w-[140px]',
                          rowDragOverInfo?.deptId === dept.id &&
                            rowDragOverInfo?.idx === empIdx &&
                            'bg-indigo-50',
                        )}
                      >
                        <div className="flex items-center gap-1">
                          {editableDepts.includes(dept.id) && (
                            <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0 cursor-grab" />
                          )}
                          <span className="text-sm text-gray-700 truncate">
                            {emp.first_name} {emp.last_name}
                          </span>
                        </div>
                      </td>
                      {/* Tag-Zellen */}
                      {days.map(day => {
                        const cellKey = `${emp.id}_${day.date}`
                        const entry = entries.find(
                          e => e.employee === emp.id && e.date === day.date,
                        )
                        const isEditable = editableDepts.includes(dept.id)
                        const isDragOver = cellOver === cellKey

                        return (
                          <td
                            key={day.date}
                            className={cn(
                              'border-b border-r border-[#E5E7EB] p-1 align-top w-24',
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
                            onClick={() => !entry && isEditable && onCellClick(emp.id, day.date)}
                          >
                            {entry ? (
                              <div
                                onClick={e => {
                                  e.stopPropagation()
                                  onCellClick(emp.id, day.date, entry)
                                }}
                              >
                                {/* Schicht 1 */}
                                <div
                                  draggable={isEditable}
                                  onDragStart={e => {
                                    e.stopPropagation()
                                    setDragEntry(entry)
                                  }}
                                  onDragEnd={() => setDragEntry(null)}
                                  className="text-[11px] px-1.5 py-0.5 rounded text-center cursor-pointer hover:opacity-80 transition-opacity"
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
                                      className="text-[11px] px-1.5 py-0.5 rounded text-center mt-0.5"
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
                              </div>
                            ) : isEditable ? (
                              <div className="flex items-center justify-center h-8">
                                <span className="text-[10px] text-gray-300 border border-dashed border-gray-200 rounded px-1.5 py-0.5 hover:border-indigo-300 hover:text-indigo-400 transition-colors">
                                  +
                                </span>
                              </div>
                            ) : null}
                          </td>
                        )
                      })}
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
