import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, ChevronUp, ChevronDown, Pencil, RotateCcw } from 'lucide-react'
import { pb } from '../lib/pb'
import type { Settings, Department, User, UserRole, Employee } from '@shared/types'
import { DEFAULT_BREAK_RULES, type BreakRule } from './Zeiterfassung'
import { useAuthStore } from '../stores/auth'
import { Button } from '../components/ui/button'
import { Input }  from '../components/ui/input'
import { Label }  from '../components/ui/label'
import { cn } from '@/lib/utils'

// ── Konstanten ────────────────────────────────────────────────────────────────

const BUNDESLAENDER = [
  { code: 'BB', name: 'Brandenburg' },
  { code: 'BE', name: 'Berlin' },
  { code: 'BW', name: 'Baden-Württemberg' },
  { code: 'BY', name: 'Bayern' },
  { code: 'HB', name: 'Bremen' },
  { code: 'HE', name: 'Hessen' },
  { code: 'HH', name: 'Hamburg' },
  { code: 'MV', name: 'Mecklenburg-Vorpommern' },
  { code: 'NI', name: 'Niedersachsen' },
  { code: 'NW', name: 'Nordrhein-Westfalen' },
  { code: 'RP', name: 'Rheinland-Pfalz' },
  { code: 'SH', name: 'Schleswig-Holstein' },
  { code: 'SL', name: 'Saarland' },
  { code: 'SN', name: 'Sachsen' },
  { code: 'ST', name: 'Sachsen-Anhalt' },
  { code: 'TH', name: 'Thüringen' },
]

const DEPT_COLORS = [
  '#BA7517', '#3B82F6', '#22C55E', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
  '#6B7280', '#1A1917',
]

type Section = 'allgemein' | 'abteilungen' | 'zeiterfassung' | 'nutzer'

const NAV: { id: Section; label: string }[] = [
  { id: 'allgemein',     label: 'Allgemein' },
  { id: 'abteilungen',   label: 'Abteilungen' },
  { id: 'zeiterfassung', label: 'Zeiterfassung' },
  { id: 'nutzer',        label: 'Nutzer & Rollen' },
]

const ROLE_LABELS: Record<UserRole, string> = {
  gf:          'Geschäftsführung',
  sl:          'Schichtleitung',
  mitarbeiter: 'Mitarbeiter-App',
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────

export default function Einstellungen() {
  const [section, setSection] = useState<Section>('allgemein')

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1A1917] mb-1">Einstellungen</h1>
      <p className="text-sm text-[#706D6A] mb-6">Betriebseinstellungen verwalten</p>

      <div className="flex gap-6">
        {/* Linke Navigation */}
        <nav className="w-44 shrink-0">
          <ul className="space-y-0.5">
            {NAV.map(n => (
              <li key={n.id}>
                <button
                  onClick={() => setSection(n.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm rounded-md border-l-2 transition-colors',
                    section === n.id
                      ? 'border-[#BA7517] text-[#BA7517] bg-[#FDF8F0] font-medium'
                      : 'border-transparent text-[#706D6A] hover:text-[#1A1917] hover:bg-[#F5F2EE]',
                  )}
                >
                  {n.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Rechter Content-Bereich */}
        <div className="flex-1 min-w-0">
          {section === 'allgemein'     && <AllgemeinSection />}
          {section === 'abteilungen'   && <AbteilungenSection />}
          {section === 'zeiterfassung' && <ZeiterfassungSection />}
          {section === 'nutzer'        && <NutzerSection />}
        </div>
      </div>
    </div>
  )
}

// ── Allgemein ─────────────────────────────────────────────────────────────────

function AllgemeinSection() {
  const [values,  setValues]  = useState<Record<string, string>>({})
  const [ids,     setIds]     = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    pb.collection('settings').getFullList<Settings>()
      .then(list => {
        const v: Record<string, string> = {}
        const id: Record<string, string> = {}
        list.forEach(s => { v[s.key] = s.value; id[s.key] = s.id })
        setValues(v)
        setIds(id)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function set(key: string, value: string) {
    setValues(v => ({ ...v, [key]: value }))
    setSaved(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const newIds = { ...ids }
      for (const [key, value] of Object.entries(values)) {
        if (newIds[key]) {
          await pb.collection('settings').update(newIds[key], { key, value })
        } else {
          const rec = await pb.collection('settings').create({ key, value })
          newIds[key] = rec.id
        }
      }
      setIds(newIds)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-[#706D6A]">Lade…</p>

  return (
    <div className="max-w-md">
      {error && (
        <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{error}</div>
      )}
      <form onSubmit={handleSave} className="bg-white border border-[#EDE7DC] rounded-lg p-5 space-y-4">
        <div>
          <Label htmlFor="company_name" className="text-xs text-[#706D6A] mb-1 block">Betriebsname</Label>
          <Input
            id="company_name"
            value={values.company_name ?? ''}
            onChange={e => set('company_name', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="federal_state" className="text-xs text-[#706D6A] mb-1 block">
            Bundesland (für Feiertage)
          </Label>
          <select
            id="federal_state"
            value={values.federal_state ?? 'ST'}
            onChange={e => set('federal_state', e.target.value)}
            className="h-9 w-full rounded-md border border-[#EDE7DC] bg-white px-3 py-2 text-sm text-[#1A1917] outline-none focus:border-[#BA7517] focus:ring-2 focus:ring-[#BA7517]/20"
          >
            {BUNDESLAENDER.map(bl => (
              <option key={bl.code} value={bl.code}>{bl.name}</option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="carry_over_deadline" className="text-xs text-[#706D6A] mb-1 block">
            Urlaubsübertrag verfällt am (MM-TT)
          </Label>
          <Input
            id="carry_over_deadline"
            value={values.carry_over_deadline ?? '03-31'}
            onChange={e => set('carry_over_deadline', e.target.value)}
            placeholder="03-31"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#EDE7DC]">
          {saved && <span className="text-sm text-green-600">Gespeichert ✓</span>}
          <Button type="submit" disabled={saving}>
            <Save size={15} />
            {saving ? 'Speichere…' : 'Speichern'}
          </Button>
        </div>
      </form>
    </div>
  )
}

// ── Abteilungen ───────────────────────────────────────────────────────────────

type EditState = { name: string; color: string }

function AbteilungenSection() {
  const [depts, setDepts]         = useState<Department[]>([])
  const [loading, setLoading]     = useState(true)
  const [editId, setEditId]       = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ name: '', color: DEPT_COLORS[0] })
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [showNew, setShowNew]     = useState(false)
  const [newState, setNewState]   = useState<EditState>({ name: '', color: DEPT_COLORS[0] })
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    pb.collection('departments')
      .getFullList<Department>({ sort: 'sort_order,name' })
      .then(setDepts)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function startEdit(dept: Department) {
    setEditId(dept.id)
    setEditState({ name: dept.name, color: dept.color })
    setConfirmDel(null)
    setShowNew(false)
  }

  async function saveEdit(dept: Department) {
    if (!editState.name.trim()) return
    try {
      const updated = await pb.collection('departments').update<Department>(dept.id, {
        name:  editState.name.trim(),
        color: editState.color,
      })
      setDepts(prev => prev.map(d => d.id === dept.id ? updated : d))
      setEditId(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    }
  }

  async function handleDelete(id: string) {
    try {
      await pb.collection('departments').delete(id)
      setDepts(prev => prev.filter(d => d.id !== id))
      setConfirmDel(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen')
    }
  }

  async function moveUp(index: number) {
    if (index === 0) return
    const a = depts[index]
    const b = depts[index - 1]
    await Promise.all([
      pb.collection('departments').update(a.id, { sort_order: b.sort_order }),
      pb.collection('departments').update(b.id, { sort_order: a.sort_order }),
    ])
    setDepts(prev => {
      const next = [...prev]
      next[index - 1] = { ...a, sort_order: b.sort_order }
      next[index]     = { ...b, sort_order: a.sort_order }
      return next
    })
  }

  async function moveDown(index: number) {
    if (index === depts.length - 1) return
    const a = depts[index]
    const b = depts[index + 1]
    await Promise.all([
      pb.collection('departments').update(a.id, { sort_order: b.sort_order }),
      pb.collection('departments').update(b.id, { sort_order: a.sort_order }),
    ])
    setDepts(prev => {
      const next = [...prev]
      next[index]     = { ...b, sort_order: a.sort_order }
      next[index + 1] = { ...a, sort_order: b.sort_order }
      return next
    })
  }

  async function handleCreate() {
    if (!newState.name.trim()) return
    const maxOrder = depts.reduce((m, d) => Math.max(m, d.sort_order), 0)
    try {
      const created = await pb.collection('departments').create<Department>({
        name:       newState.name.trim(),
        color:      newState.color,
        sort_order: maxOrder + 1,
      })
      setDepts(prev => [...prev, created])
      setNewState({ name: '', color: DEPT_COLORS[0] })
      setShowNew(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Anlegen')
    }
  }

  if (loading) return <p className="text-sm text-[#706D6A]">Lade…</p>

  return (
    <div className="max-w-md">
      <div className="bg-white border border-[#EDE7DC] rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#EDE7DC] flex items-center justify-between">
          <span className="text-sm font-semibold text-[#1A1917]">Abteilungen</span>
          <span className="text-xs text-[#706D6A]">{depts.length} {depts.length === 1 ? 'Eintrag' : 'Einträge'}</span>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{error}</div>
        )}

        {/* Liste */}
        {depts.length === 0 && !showNew ? (
          <p className="px-4 py-6 text-sm text-[#706D6A]">Noch keine Abteilungen angelegt.</p>
        ) : (
          <ul className="divide-y divide-[#EDE7DC]">
            {depts.map((dept, i) => (
              <li key={dept.id}>
                {editId === dept.id ? (
                  /* Inline-Edit */
                  <div className="px-4 py-3 space-y-2">
                    <Input
                      value={editState.name}
                      onChange={e => setEditState(s => ({ ...s, name: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(dept); if (e.key === 'Escape') setEditId(null) }}
                      autoFocus
                    />
                    <ColorPicker
                      value={editState.color}
                      onChange={color => setEditState(s => ({ ...s, color }))}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(dept)}>
                        <Save size={13} /> Speichern
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditId(null)}>
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                ) : confirmDel === dept.id ? (
                  /* Lösch-Bestätigung */
                  <div className="px-4 py-3 flex items-center gap-2">
                    <span className="text-sm text-red-600 flex-1">„{dept.name}" wirklich löschen?</span>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(dept.id)}>Ja</Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirmDel(null)}>Nein</Button>
                  </div>
                ) : (
                  /* Normal-Zeile */
                  <div className="px-4 py-2.5 flex items-center gap-2 group">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: dept.color }}
                    />
                    <span className="flex-1 text-sm text-[#1A1917] truncate">{dept.name}</span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => moveUp(i)}
                        disabled={i === 0}
                        className="p-1 rounded hover:bg-[#F5F2EE] text-[#706D6A] disabled:opacity-30"
                        title="Nach oben"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => moveDown(i)}
                        disabled={i === depts.length - 1}
                        className="p-1 rounded hover:bg-[#F5F2EE] text-[#706D6A] disabled:opacity-30"
                        title="Nach unten"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        onClick={() => startEdit(dept)}
                        className="p-1 rounded hover:bg-[#F5F2EE] text-[#706D6A]"
                        title="Bearbeiten"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => { setConfirmDel(dept.id); setEditId(null); setShowNew(false) }}
                        className="p-1 rounded hover:bg-red-50 text-[#706D6A] hover:text-red-600"
                        title="Löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}

            {/* Neue Abteilung — Inline-Formular */}
            {showNew && (
              <li className="px-4 py-3 space-y-2 bg-[#FDFCFB]">
                <Input
                  placeholder="Name der Abteilung"
                  value={newState.name}
                  onChange={e => setNewState(s => ({ ...s, name: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowNew(false) }}
                  autoFocus
                />
                <ColorPicker
                  value={newState.color}
                  onChange={color => setNewState(s => ({ ...s, color }))}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreate} disabled={!newState.name.trim()}>
                    <Plus size={13} /> Anlegen
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowNew(false)}>
                    Abbrechen
                  </Button>
                </div>
              </li>
            )}
          </ul>
        )}

        {/* Footer — Neue Abteilung */}
        {!showNew && (
          <div className="px-4 py-3 border-t border-[#EDE7DC]">
            <button
              onClick={() => { setShowNew(true); setEditId(null); setConfirmDel(null) }}
              className="flex items-center gap-1.5 text-sm text-[#BA7517] hover:text-[#9E6312] font-medium"
            >
              <Plus size={15} /> Neue Abteilung
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Zeiterfassung-Einstellungen ───────────────────────────────────────────────

function ZeiterfassungSection() {
  const [rules,   setRules]   = useState<BreakRule[]>(DEFAULT_BREAK_RULES)
  const [recordId, setRecordId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    pb.collection('settings').getFullList<Settings>({ filter: 'key = "break_rules"' })
      .then(list => {
        const rec = list[0]
        if (rec) {
          setRecordId(rec.id)
          try { setRules(JSON.parse(rec.value)) } catch { /* default */ }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function updateRule(i: number, field: keyof BreakRule, value: number) {
    setRules(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
    setSaved(false)
  }

  function addRule() {
    setRules(prev => [...prev, { minHours: 6, breakMins: 15 }])
    setSaved(false)
  }

  function removeRule(i: number) {
    setRules(prev => prev.filter((_, idx) => idx !== i))
    setSaved(false)
  }

  function reset() {
    setRules([...DEFAULT_BREAK_RULES])
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const value = JSON.stringify(rules)
      if (recordId) {
        await pb.collection('settings').update(recordId, { value })
      } else {
        const rec = await pb.collection('settings').create<Settings>({ key: 'break_rules', value })
        setRecordId(rec.id)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-[#706D6A]">Lade…</p>

  const sorted = [...rules].sort((a, b) => a.minHours - b.minHours)

  return (
    <div className="max-w-md">
      {error && (
        <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{error}</div>
      )}
      <div className="bg-white border border-[#EDE7DC] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#EDE7DC] flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-[#1A1917]">Automatische Pausenregeln</span>
            <p className="text-xs text-[#706D6A] mt-0.5">Gemäß ArbZG §4. Werden beim Erfassen automatisch angewendet.</p>
          </div>
          <button onClick={reset} title="Auf ArbZG-Standard zurücksetzen"
            className="p-1.5 rounded hover:bg-[#F5F2EE] text-[#706D6A] hover:text-[#1A1917]">
            <RotateCcw size={14} />
          </button>
        </div>

        <div className="divide-y divide-[#EDE7DC]">
          {sorted.map((rule, i) => {
            const origIdx = rules.indexOf(rule)
            return (
              <div key={i} className="px-4 py-3 flex items-center gap-2">
                <span className="text-sm text-[#706D6A] shrink-0">Ab</span>
                <Input
                  type="number" min={1} max={24} step={0.5}
                  value={rule.minHours}
                  onChange={e => updateRule(origIdx, 'minHours', parseFloat(e.target.value))}
                  className="h-8 w-16 text-sm text-center px-1"
                />
                <span className="text-sm text-[#706D6A] shrink-0">Stunden →</span>
                <Input
                  type="number" min={0} max={120} step={5}
                  value={rule.breakMins}
                  onChange={e => updateRule(origIdx, 'breakMins', parseInt(e.target.value))}
                  className="h-8 w-16 text-sm text-center px-1"
                />
                <span className="text-sm text-[#706D6A] shrink-0">Min. Pause</span>
                <button onClick={() => removeRule(origIdx)}
                  className="ml-auto p-1 rounded hover:bg-red-50 text-[#706D6A] hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>

        <div className="px-4 py-3 border-t border-[#EDE7DC] flex items-center justify-between">
          <button onClick={addRule}
            className="flex items-center gap-1.5 text-sm text-[#BA7517] hover:text-[#9E6312] font-medium">
            <Plus size={15} /> Regel hinzufügen
          </button>
          <div className="flex items-center gap-3">
            {saved && <span className="text-sm text-green-600">Gespeichert ✓</span>}
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save size={13} /> {saving ? 'Speichere…' : 'Speichern'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Nutzer & Rollen ───────────────────────────────────────────────────────────

type UserRow = User & { expand?: { employee?: Employee } }

function NutzerSection() {
  const currentUser = useAuthStore(s => s.user)
  const [users,   setUsers]   = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState<Record<string, boolean>>({})
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    pb.collection('users').getFullList<UserRow>({ expand: 'employee', sort: 'name', requestKey: null })
      .then(setUsers)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  async function changeRole(userId: string, role: UserRole) {
    setSaving(s => ({ ...s, [userId]: true }))
    setError(null)
    try {
      const updated = await pb.collection('users').update<UserRow>(userId, { role }, { expand: 'employee' })
      setUsers(prev => prev.map(u => u.id === userId ? updated : u))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(s => ({ ...s, [userId]: false }))
    }
  }

  return (
    <div className="bg-white border border-[#EDE7DC] rounded-lg p-5">
      <h2 className="text-sm font-semibold text-[#1A1917] mb-1">Nutzer & Rollen</h2>
      <p className="text-xs text-[#706D6A] mb-4">Zugriffsrechte für Chef-App-Nutzer verwalten.</p>

      {error && (
        <div className="mb-3 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-[#706D6A]">Lade…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-[#706D6A]">Keine Nutzer gefunden.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#EDE7DC]">
              <th className="text-left py-2 pr-4 text-xs font-medium text-[#706D6A]">Name</th>
              <th className="text-left py-2 pr-4 text-xs font-medium text-[#706D6A]">E-Mail</th>
              <th className="text-left py-2 pr-4 text-xs font-medium text-[#706D6A]">Mitarbeiter</th>
              <th className="text-left py-2 text-xs font-medium text-[#706D6A]">Rolle</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const isSelf = u.id === currentUser?.id
              const emp    = u.expand?.employee
              return (
                <tr key={u.id} className="border-b border-[#EDE7DC] last:border-0">
                  <td className="py-2.5 pr-4 font-medium text-[#1A1917]">{u.name}</td>
                  <td className="py-2.5 pr-4 text-[#706D6A] text-xs">{u.email}</td>
                  <td className="py-2.5 pr-4 text-[#706D6A]">
                    {emp ? `${emp.last_name}, ${emp.first_name}` : <span className="text-[#BBBBBB]">—</span>}
                  </td>
                  <td className="py-2.5">
                    {isSelf ? (
                      <span className="text-[#706D6A] text-xs">{ROLE_LABELS[u.role]} <span className="text-[#BBBBBB]">(du)</span></span>
                    ) : (
                      <select
                        value={u.role}
                        disabled={saving[u.id]}
                        onChange={e => changeRole(u.id, e.target.value as UserRole)}
                        className="h-8 rounded-md border border-[#EDE7DC] bg-white px-2 text-sm text-[#1A1917] outline-none focus:border-[#BA7517] focus:ring-2 focus:ring-[#BA7517]/20 disabled:opacity-50"
                      >
                        {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Farbwähler ────────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {DEPT_COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            'w-6 h-6 rounded-full border-2 transition-all',
            value === c ? 'border-[#1A1917] scale-110' : 'border-transparent hover:scale-105',
          )}
          style={{ backgroundColor: c }}
          title={c}
        />
      ))}
    </div>
  )
}
