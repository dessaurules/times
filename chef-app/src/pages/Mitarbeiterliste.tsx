import { useEffect, useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { pb } from '../lib/pb'
import type { Employee, Department, ContractType } from '@shared/types'
import { CONTRACT_LABELS } from '@shared/types'
import { Button }    from '../components/ui/button'
import { Input }     from '../components/ui/input'
import { Badge }     from '../components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table'
import MitarbeiterModal from './MitarbeiterModal'

type EmployeeRow = Employee & { expand?: { department?: Department } }

export default function Mitarbeiterliste() {
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null)
  const [rows, setRows]           = useState<EmployeeRow[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const [departments, setDepts]   = useState<Department[]>([])
  const [filterDept, setFilterDept]         = useState('')
  const [filterContract, setFilterContract] = useState('')
  const [filterActive, setFilterActive]     = useState('')
  const perPage = 20

  useEffect(() => {
    pb.collection('departments')
      .getFullList<Department>({ sort: 'sort_order,name' })
      .then(setDepts)
      .catch(console.error)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const parts: string[] = []
    if (search.trim()) parts.push(`(first_name ~ "${search}" || last_name ~ "${search}" || email ~ "${search}")`)
    if (filterDept)     parts.push(`department = "${filterDept}"`)
    if (filterContract) parts.push(`contract_type = "${filterContract}"`)
    if (filterActive !== '') parts.push(`active = ${filterActive}`)
    const filter = parts.join(' && ')

    pb.collection('employees')
      .getList<EmployeeRow>(page, perPage, { filter, expand: 'department', sort: 'last_name,first_name' })
      .then(res => { if (!cancelled) { setRows(res.items); setTotal(res.totalItems) } })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [search, page, filterDept, filterContract, filterActive])

  function resetFilters() {
    setSearch(''); setFilterDept(''); setFilterContract(''); setFilterActive(''); setPage(1)
  }

  const hasFilter = search || filterDept || filterContract || filterActive !== ''
  const totalPages = Math.ceil(total / perPage)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] mb-1">Mitarbeiter</h1>
          <p className="text-sm text-[#6B7280]">{total} {total === 1 ? 'Eintrag' : 'Einträge'}</p>
        </div>
        <Button onClick={() => setSelectedId('new')}>
          <Plus size={16} /> Neuer Mitarbeiter
        </Button>
      </div>

      {/* Suche + Filter */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" />
          <Input
            placeholder="Name oder E-Mail…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 w-56"
          />
        </div>

        <FilterSelect value={filterDept} onChange={v => { setFilterDept(v); setPage(1) }}>
          <option value="">Alle Abteilungen</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </FilterSelect>

        <FilterSelect value={filterContract} onChange={v => { setFilterContract(v); setPage(1) }}>
          <option value="">Alle Vertragsarten</option>
          {(Object.entries(CONTRACT_LABELS) as [ContractType, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </FilterSelect>

        <FilterSelect value={filterActive} onChange={v => { setFilterActive(v); setPage(1) }}>
          <option value="">Aktiv & Inaktiv</option>
          <option value="true">Nur Aktive</option>
          <option value="false">Nur Inaktive</option>
        </FilterSelect>

        {hasFilter && (
          <button onClick={resetFilters} className="text-xs text-[#6B7280] hover:text-[#111827] underline underline-offset-2">
            Filter zurücksetzen
          </button>
        )}
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Abteilung</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Vertrag</TableHead>
              <TableHead>Std./Wo.</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-[#6B7280]">Lade…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-[#6B7280]">
                {hasFilter ? 'Keine Treffer' : 'Noch keine Mitarbeiter angelegt'}
              </TableCell></TableRow>
            ) : rows.map(emp => (
              <TableRow key={emp.id} onClick={() => setSelectedId(emp.id)} className="cursor-pointer">
                <TableCell>
                  <div className="font-medium text-[#111827]">{emp.last_name}, {emp.first_name}</div>
                </TableCell>
                <TableCell>{emp.expand?.department?.name ?? '—'}</TableCell>
                <TableCell>{emp.position || '—'}</TableCell>
                <TableCell>{CONTRACT_LABELS[emp.contract_type]}</TableCell>
                <TableCell>{emp.weekly_hours}</TableCell>
                <TableCell>
                  <Badge variant={emp.active ? 'success' : 'secondary'}>
                    {emp.active ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-[#6B7280]">Seite {page} von {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Zurück</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Weiter</Button>
          </div>
        </div>
      )}

      <MitarbeiterModal
        employeeId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  )
}

function FilterSelect({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-9 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
    >
      {children}
    </select>
  )
}
