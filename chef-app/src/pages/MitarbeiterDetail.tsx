import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Save, Upload, Download, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { de } from 'date-fns/locale'
import { pb } from '../lib/pb'
import type { Employee, Department, ContractType, VacationAccount, Document, DocumentType, Absence, AbsenceType, TimeEntry } from '@shared/types'
import { CONTRACT_LABELS, ABSENCE_COLORS } from '@shared/types'
import { Button } from '../components/ui/button'
import { Input }  from '../components/ui/input'
import { Label }  from '../components/ui/label'
import { cn } from '@/lib/utils'

// ── Typen & Konstanten ────────────────────────────────────────────────────────

type Tab = 'stammdaten' | 'urlaubskonto' | 'dokumente'

const TABS: { id: Tab; label: string }[] = [
  { id: 'stammdaten',   label: 'Stammdaten' },
  { id: 'urlaubskonto', label: 'Urlaubskonto' },
  { id: 'dokumente',    label: 'Dokumente' },
]

const DOC_LABELS: Record<DocumentType, string> = {
  vertrag:    'Vertrag',
  lohnschein: 'Lohnschein',
  au_schein:  'AU-Schein',
  sonstiges:  'Sonstiges',
}

type FormData = {
  first_name: string; last_name: string; email: string; phone: string
  birthday: string; street: string; zip: string; city: string
  department: string; position: string; contract_type: ContractType
  weekly_hours: number; start_date: string; end_date: string
  vacation_days: number; active: boolean
}

const EMPTY: FormData = {
  first_name: '', last_name: '', email: '', phone: '',
  birthday: '', street: '', zip: '', city: '',
  department: '', position: '', contract_type: 'vz',
  weekly_hours: 40, start_date: '', end_date: '',
  vacation_days: 25, active: true,
}

function toDateInput(v: string | undefined): string {
  if (!v) return ''
  return v.substring(0, 10)
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────

export default function MitarbeiterDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const isNew    = !id

  const [tab, setTab]               = useState<Tab>('stammdaten')
  const [form, setForm]             = useState<FormData>(EMPTY)
  const [departments, setDepts]     = useState<Department[]>([])
  const [loading, setLoading]       = useState(!isNew)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [userWarn, setUserWarn]     = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)

  // Mini-Dashboard
  const [viewMonth, setViewMonth]       = useState(() => startOfMonth(new Date()))
  const [dashData, setDashData]         = useState<DashData | null>(null)
  const [dashLoading, setDashLoading]   = useState(false)

  useEffect(() => {
    pb.collection('departments')
      .getFullList<Department>({ sort: 'sort_order,name' })
      .then(setDepts)
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    pb.collection('employees').getOne<Employee>(id)
      .then(emp => {
        if (cancelled) return
        setForm({
          first_name:    emp.first_name,
          last_name:     emp.last_name,
          email:         emp.email,
          phone:         emp.phone ?? '',
          birthday:      toDateInput(emp.birthday),
          street:        emp.street ?? '',
          zip:           emp.zip ?? '',
          city:          emp.city ?? '',
          department:    emp.department ?? '',
          position:      emp.position ?? '',
          contract_type: emp.contract_type,
          weekly_hours:  emp.weekly_hours,
          start_date:    toDateInput(emp.start_date),
          end_date:      toDateInput(emp.end_date),
          vacation_days: emp.vacation_days,
          active:        emp.active,
        })
      })
      .catch((err: { isAbort?: boolean }) => {
        if (cancelled || err?.isAbort) return
        setError('Mitarbeiter nicht gefunden')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  // Kachel-Daten laden
  useEffect(() => {
    if (!id) return
    let cancelled = false
    setDashLoading(true)

    const currentYear = new Date().getFullYear()
    const monthStart  = format(viewMonth, 'yyyy-MM-dd')
    const monthEnd    = format(endOfMonth(viewMonth), 'yyyy-MM-dd')
    const curStart    = `${format(startOfMonth(new Date()), 'yyyy-MM-dd')} 00:00:00`
    const curEnd      = `${format(endOfMonth(new Date()), 'yyyy-MM-dd')} 23:59:59`

    Promise.all([
      pb.collection('vacation_accounts').getList<VacationAccount>(1, 1, {
        filter: `employee = "${id}" && year = ${currentYear}`,
        requestKey: 'dash-vac',
      }),
      pb.collection('absences').getList(1, 1, {
        filter: `employee = "${id}" && status = "approved" && (type = "U" || type = "RU" || type = "U3" || type = "SU") && date_from >= "${currentYear}-01-01" && date_from <= "${currentYear}-12-31"`,
        requestKey: 'dash-taken',
      }),
      pb.collection('absences').getFullList<Absence>({
        filter: `employee = "${id}" && date_from >= "${monthStart}" && date_from <= "${monthEnd}" && status != "rejected"`,
        requestKey: 'dash-abs',
      }),
      pb.collection('time_entries').getFullList<TimeEntry>({
        filter: `employee = "${id}" && start_time >= "${curStart}" && start_time <= "${curEnd}"`,
        requestKey: 'dash-hours',
      }).catch((): TimeEntry[] => []),
    ]).then(([vacRes, takenRes, monthAbsences, timeEntries]) => {
      if (cancelled) return
      const account = vacRes.items[0] ?? null
      const taken   = takenRes.totalItems

      const mins = timeEntries
        .filter(t => t.end_time)
        .reduce((sum, t) => {
          const ms = new Date(t.end_time!).getTime() - new Date(t.start_time).getTime()
          return sum + Math.max(0, ms / 60000 - t.break_minutes)
        }, 0)

      setDashData({ account, taken, monthAbsences, hours: mins / 60 })
    }).catch(console.error)
      .finally(() => { if (!cancelled) setDashLoading(false) })

    return () => { cancelled = true }
  }, [id, viewMonth])

  function upd<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const data = {
        ...form,
        birthday:   form.birthday   || '',
        end_date:   form.end_date   || '',
        department: form.department || '',
      }
      if (isNew) {
        const rec = await pb.collection('employees').create(data)

        // User-Account automatisch anlegen
        const tempPass = Math.random().toString(36).slice(2, 10) + 'Aa1!'
        try {
          await pb.collection('users').create({
            email:           form.email,
            password:        tempPass,
            passwordConfirm: tempPass,
            name:            `${form.first_name} ${form.last_name}`,
            role:            'mitarbeiter',
            employee:        rec.id,
          })
          // Einladungs-Mail (Passwort setzen) verschicken
          await pb.collection('users').requestPasswordReset(form.email).catch(() => {
            setUserWarn('Account angelegt, aber Einladungs-E-Mail konnte nicht gesendet werden. SMTP konfiguriert?')
          })
        } catch (userErr: unknown) {
          const msg = (userErr as { response?: { data?: { email?: { message: string } } } })
            ?.response?.data?.email?.message
          setUserWarn(
            msg?.includes('already')
              ? `Mitarbeiter angelegt. E-Mail „${form.email}" hat bereits einen Account — Login-Daten bleiben unverändert.`
              : `Mitarbeiter angelegt, aber Account konnte nicht erstellt werden: ${msg ?? 'Unbekannter Fehler'}`
          )
        }

        navigate(`/mitarbeiter/${rec.id}`, { replace: true })
      } else {
        await pb.collection('employees').update(id!, data)
      }
    } catch (err: unknown) {
      const pbErr = err as { status?: number; response?: { data?: Record<string, { message: string }> }; message?: string }
      const fieldErrors = pbErr?.response?.data
      if (fieldErrors && Object.keys(fieldErrors).length > 0) {
        setError(Object.entries(fieldErrors).map(([k, v]) => `${k}: ${v.message}`).join('\n'))
      } else {
        setError(`${pbErr?.message ?? 'Fehler'} (Status ${pbErr?.status ?? '?'})`)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    try {
      await pb.collection('employees').delete(id)
      navigate('/mitarbeiter', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen')
    }
  }

  if (loading) return <p className="text-sm text-[#706D6A]">Lade…</p>

  const title = isNew ? 'Neuer Mitarbeiter' : `${form.last_name}, ${form.first_name}`

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/mitarbeiter')}>
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-[#1A1917]">{title}</h1>
          <p className="text-xs text-[#706D6A]">{isNew ? 'Neuen Mitarbeiter anlegen' : 'Mitarbeiter bearbeiten'}</p>
        </div>
      </div>

      {/* Mini-Dashboard — nur für bestehende MA */}
      {!isNew && (
        <MiniDashboard
          form={form}
          data={dashData}
          loading={dashLoading}
          viewMonth={viewMonth}
          onPrevMonth={() => setViewMonth(m => subMonths(m, 1))}
          onNextMonth={() => setViewMonth(m => addMonths(m, 1))}
        />
      )}

      {/* Tab-Leiste — nur für bestehende MA */}
      {!isNew && (
        <div className="flex border-b border-[#EDE7DC] mb-4">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === t.id
                  ? 'border-[#BA7517] text-[#BA7517]'
                  : 'border-transparent text-[#706D6A] hover:text-[#1A1917]',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-3 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md whitespace-pre-line">{error}</div>
      )}
      {userWarn && (
        <div className="mb-3 p-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md">{userWarn}</div>
      )}

      {/* ── Stammdaten ─────────────────────────────────────────────────────── */}
      {(isNew || tab === 'stammdaten') && (
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Card title="Persönliche Daten">
              <div className="grid grid-cols-2 gap-3">
                <F label="Vorname *"><Input value={form.first_name} onChange={e => upd('first_name', e.target.value)} required /></F>
                <F label="Nachname *"><Input value={form.last_name}  onChange={e => upd('last_name',  e.target.value)} required /></F>
                <F label="E-Mail *"><Input type="email" value={form.email} onChange={e => upd('email', e.target.value)} required /></F>
                <F label="Telefon"><Input value={form.phone} onChange={e => upd('phone', e.target.value)} /></F>
                <F label="Geburtsdatum" className="col-span-2">
                  <Input type="date" value={form.birthday} onChange={e => upd('birthday', e.target.value)} className="max-w-[180px]" />
                </F>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <F label="Straße & Nr." className="col-span-2">
                  <Input value={form.street} onChange={e => upd('street', e.target.value)} />
                </F>
                <F label="PLZ"><Input value={form.zip} onChange={e => upd('zip', e.target.value)} /></F>
                <F label="Stadt" className="col-span-2">
                  <Input value={form.city} onChange={e => upd('city', e.target.value)} />
                </F>
              </div>
            </Card>

            <div className="flex flex-col gap-3">
              <Card title="Tätigkeit">
                <div className="grid grid-cols-2 gap-3">
                  <F label="Abteilung">
                    <NativeSelect value={form.department} onChange={e => upd('department', e.target.value)}>
                      <option value="">— keine —</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </NativeSelect>
                  </F>
                  <F label="Position"><Input value={form.position} onChange={e => upd('position', e.target.value)} /></F>
                  <F label="Vertragstyp *">
                    <NativeSelect value={form.contract_type} onChange={e => upd('contract_type', e.target.value as ContractType)} required>
                      {(Object.entries(CONTRACT_LABELS) as [ContractType, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </NativeSelect>
                  </F>
                  <F label="Stunden/Woche *">
                    <Input type="number" min={1} max={168} step={0.5} value={form.weekly_hours}
                      onChange={e => upd('weekly_hours', parseFloat(e.target.value))} required />
                  </F>
                </div>
              </Card>

              <Card title="Beschäftigung">
                <div className="grid grid-cols-2 gap-3">
                  <F label="Eintrittsdatum *">
                    <Input type="date" value={form.start_date} onChange={e => upd('start_date', e.target.value)} required />
                  </F>
                  <F label="Austrittsdatum">
                    <Input type="date" value={form.end_date} onChange={e => upd('end_date', e.target.value)} />
                  </F>
                  <F label="Urlaubstage/Jahr *">
                    <Input type="number" min={0} max={365} value={form.vacation_days}
                      onChange={e => upd('vacation_days', parseInt(e.target.value))} required />
                  </F>
                  <F label="Status">
                    <div className="flex items-center gap-2 h-9">
                      <input
                        type="checkbox"
                        id="active"
                        checked={form.active}
                        onChange={e => upd('active', e.target.checked)}
                        className="h-4 w-4 rounded border-[#EDE7DC] accent-[#BA7517]"
                      />
                      <Label htmlFor="active" className="font-normal cursor-pointer">Aktiv</Label>
                    </div>
                  </F>
                </div>
              </Card>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              {!isNew && !confirmDel && (
                <Button type="button" variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setConfirmDel(true)}
                >
                  <Trash2 size={15} /> Löschen
                </Button>
              )}
              {confirmDel && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600">Wirklich löschen?</span>
                  <Button type="button" variant="destructive" size="sm" onClick={handleDelete}>Ja</Button>
                  <Button type="button" variant="outline"     size="sm" onClick={() => setConfirmDel(false)}>Nein</Button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/mitarbeiter')}>Abbrechen</Button>
              <Button type="submit" disabled={saving}>
                <Save size={15} />
                {saving ? 'Speichere…' : 'Speichern'}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* ── Urlaubskonto ──────────────────────────────────────────────────── */}
      {!isNew && tab === 'urlaubskonto' && (
        <UrlaubskontoTab employeeId={id!} defaultEntitlement={form.vacation_days} />
      )}

      {/* ── Dokumente ─────────────────────────────────────────────────────── */}
      {!isNew && tab === 'dokumente' && (
        <DokumenteTab employeeId={id!} />
      )}
    </div>
  )
}

// ── Mini-Dashboard ────────────────────────────────────────────────────────────

type DashData = {
  account:       VacationAccount | null
  taken:         number
  monthAbsences: Absence[]
  hours:         number
}

function MiniDashboard({ form, data, loading, viewMonth, onPrevMonth, onNextMonth }: {
  form:         FormData
  data:         DashData | null
  loading:      boolean
  viewMonth:    Date
  onPrevMonth:  () => void
  onNextMonth:  () => void
}) {
  const entitlement = data?.account?.entitlement ?? form.vacation_days
  const carryOver   = data?.account?.carry_over ?? 0
  const taken       = data?.taken ?? 0
  const remaining   = entitlement + carryOver - taken

  const absences    = data?.monthAbsences ?? []
  const absTotal    = absences.length
  const byType      = absences.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1; return acc
  }, {} as Record<string, number>)

  const hours       = data?.hours ?? 0
  const hoursLabel  = hours > 0 ? `${hours.toFixed(1)} h` : null

  const vacColor    = !data || loading ? 'default'
    : remaining <= 0 ? 'red'
    : remaining <= 4 ? 'amber'
    : 'green'

  return (
    <div className="bg-white border border-[#EDE7DC] rounded-lg overflow-hidden mb-4">
      <div className="grid grid-cols-3 divide-x divide-[#EDE7DC]">
        {/* Urlaub */}
        <div className="px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#706D6A] mb-1">
            Urlaub verbleibend
          </div>
          {loading ? (
            <div className="h-7 w-10 bg-[#F5F2EE] rounded animate-pulse" />
          ) : (
            <>
              <div className={cn(
                'text-2xl font-bold',
                vacColor === 'green' ? 'text-green-700' : vacColor === 'amber' ? 'text-[#BA7517]' : vacColor === 'red' ? 'text-red-600' : 'text-[#1A1917]',
              )}>
                {remaining}
              </div>
              <div className="text-xs text-[#706D6A] mt-0.5">
                {entitlement + carryOver} gesamt · {taken} genommen
              </div>
            </>
          )}
        </div>

        {/* Stunden */}
        <div className="px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#706D6A] mb-1">
            Stunden (akt. Monat)
          </div>
          <div className="text-2xl font-bold text-[#706D6A]">
            {hoursLabel ?? '—'}
          </div>
          <div className="text-xs text-[#706D6A] mt-0.5">
            {format(startOfMonth(new Date()), 'MMMM yyyy', { locale: de })}
          </div>
        </div>

        {/* Abwesenheiten */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#706D6A]">
              Abwesenheiten
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={onPrevMonth}
                className="p-0.5 rounded hover:bg-[#F5F2EE] text-[#706D6A] hover:text-[#1A1917]"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-[10px] font-medium w-20 text-center capitalize">
                {format(viewMonth, 'MMM yyyy', { locale: de })}
              </span>
              <button
                onClick={onNextMonth}
                className="p-0.5 rounded hover:bg-[#F5F2EE] text-[#706D6A] hover:text-[#1A1917]"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          {loading ? (
            <div className="h-7 w-8 bg-[#F5F2EE] rounded animate-pulse" />
          ) : absTotal === 0 ? (
            <div className="text-2xl font-bold text-[#706D6A]">—</div>
          ) : (
            <>
              <div className="text-2xl font-bold text-[#1A1917] leading-none mb-1.5">
                {absTotal} T
              </div>
              <div className="flex flex-wrap gap-1">
                {(Object.entries(byType) as [AbsenceType, number][]).map(([type, count]) => {
                  const colors = ABSENCE_COLORS[type]
                  return (
                    <span key={type}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded leading-none"
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {type}:{count}
                    </span>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Urlaubskonto-Tab ──────────────────────────────────────────────────────────

type EditAccount = { entitlement: number; carry_over: number; carry_over_expires: string }

function UrlaubskontoTab({ employeeId, defaultEntitlement }: { employeeId: string; defaultEntitlement: number }) {
  const [year, setYear]       = useState(new Date().getFullYear())
  const [account, setAccount] = useState<VacationAccount | null>(null)
  const [taken, setTaken]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [edit, setEdit]       = useState<EditAccount>({ entitlement: defaultEntitlement, carry_over: 0, carry_over_expires: '' })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setEditing(false)
    setError(null)

    const vacFilter  = `employee = "${employeeId}" && year = ${year}`
    const takenFilter = `employee = "${employeeId}" && status = "approved" && (type = "U" || type = "RU" || type = "U3" || type = "SU") && date_from >= "${year}-01-01" && date_from <= "${year}-12-31"`

    Promise.all([
      pb.collection('vacation_accounts').getList<VacationAccount>(1, 1, { filter: vacFilter }),
      pb.collection('absences').getList(1, 1, { filter: takenFilter }),
    ]).then(([accRes, absRes]) => {
      if (cancelled) return
      const acc = accRes.items[0] ?? null
      setAccount(acc)
      setTaken(absRes.totalItems)
      setEdit({
        entitlement:         acc?.entitlement ?? defaultEntitlement,
        carry_over:          acc?.carry_over ?? 0,
        carry_over_expires:  toDateInput(acc?.carry_over_expires),
      })
    }).catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [year, employeeId, defaultEntitlement])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const data = {
        employee:            employeeId,
        year,
        entitlement:         edit.entitlement,
        carry_over:          edit.carry_over,
        carry_over_expires:  edit.carry_over_expires || null,
      }
      const saved = account
        ? await pb.collection('vacation_accounts').update<VacationAccount>(account.id, data)
        : await pb.collection('vacation_accounts').create<VacationAccount>(data)
      setAccount(saved)
      setEditing(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const entitlement = account?.entitlement ?? defaultEntitlement
  const carryOver   = account?.carry_over ?? 0
  const total       = entitlement + carryOver
  const remaining   = total - taken

  return (
    <div className="bg-white border border-[#EDE7DC] rounded-lg p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-[#1A1917]">Urlaubskonto {year}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setYear(y => y - 1)}
            className="p-1 rounded hover:bg-[#F5F2EE] text-[#706D6A]"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium w-12 text-center">{year}</span>
          <button
            onClick={() => setYear(y => y + 1)}
            className="p-1 rounded hover:bg-[#F5F2EE] text-[#706D6A]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[#706D6A]">Lade…</p>
      ) : (
        <>
          {error && (
            <div className="mb-3 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{error}</div>
          )}

          {!editing ? (
            <>
              <table className="w-full text-sm">
                <tbody>
                  <VacRow label="Urlaubsanspruch"      value={entitlement} />
                  <VacRow label="Resturlaub übertragen" value={carryOver}
                    sub={account?.carry_over_expires
                      ? `verfällt ${format(parseISO(account.carry_over_expires), 'dd.MM.yyyy', { locale: de })}`
                      : undefined}
                  />
                  <VacRow label="Gesamt verfügbar" value={total} highlight />
                  <VacRow label="Genommen (genehmigt)" value={taken} />
                  <VacRow label="Verbleibend" value={remaining}
                    color={remaining < 0 ? 'red' : remaining <= 3 ? 'amber' : 'green'}
                  />
                </tbody>
              </table>
              <div className="mt-4 pt-4 border-t border-[#EDE7DC]">
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  Konto bearbeiten
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3 max-w-sm">
              <F label="Urlaubsanspruch (Tage)">
                <Input
                  type="number" min={0} max={365}
                  value={edit.entitlement}
                  onChange={e => setEdit(p => ({ ...p, entitlement: parseInt(e.target.value) || 0 }))}
                />
              </F>
              <F label="Resturlaub übertragen (Tage)">
                <Input
                  type="number" min={0} max={365}
                  value={edit.carry_over}
                  onChange={e => setEdit(p => ({ ...p, carry_over: parseInt(e.target.value) || 0 }))}
                />
              </F>
              <F label="Resturlaub verfällt am">
                <Input
                  type="date"
                  value={edit.carry_over_expires}
                  onChange={e => setEdit(p => ({ ...p, carry_over_expires: e.target.value }))}
                />
              </F>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleSave} disabled={saving} size="sm">
                  <Save size={14} /> {saving ? 'Speichere…' : 'Speichern'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Abbrechen</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function VacRow({ label, value, sub, highlight, color }: {
  label: string; value: number; sub?: string; highlight?: boolean; color?: 'green' | 'amber' | 'red'
}) {
  const valueColor = color === 'red' ? 'text-red-600' : color === 'amber' ? 'text-[#BA7517]' : color === 'green' ? 'text-green-700' : 'text-[#1A1917]'
  return (
    <tr className={highlight ? 'border-t border-b border-[#EDE7DC]' : ''}>
      <td className={cn('py-2 pr-4 text-[#706D6A]', highlight && 'font-medium text-[#1A1917]')}>
        {label}
        {sub && <span className="block text-xs text-[#706D6A] font-normal">{sub}</span>}
      </td>
      <td className={cn('py-2 text-right font-semibold tabular-nums', valueColor, highlight && 'text-base')}>
        {value}
      </td>
    </tr>
  )
}

// ── Dokumente-Tab ─────────────────────────────────────────────────────────────

type UploadForm = { name: string; type: DocumentType; date: string }

function DokumenteTab({ employeeId }: { employeeId: string }) {
  const [docs, setDocs]           = useState<Document[]>([])
  const [loading, setLoading]     = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [uploadForm, setUploadForm] = useState<UploadForm>({
    name: '', type: 'sonstiges', date: format(new Date(), 'yyyy-MM-dd'),
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    pb.collection('documents')
      .getFullList<Document>({ filter: `employee = "${employeeId}"`, sort: '-date' })
      .then(items => { if (!cancelled) setDocs(items) })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [employeeId])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
    if (file && !uploadForm.name) {
      setUploadForm(p => ({ ...p, name: file.name.replace(/\.[^.]+$/, '') }))
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile) return
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('employee',    employeeId)
      formData.append('name',        uploadForm.name)
      formData.append('type',        uploadForm.type)
      formData.append('date',        uploadForm.date)
      formData.append('uploaded_by', pb.authStore.record?.id ?? '')
      formData.append('file',        selectedFile)
      const created = await pb.collection('documents').create<Document>(formData)
      setDocs(prev => [created, ...prev])
      setShowUpload(false)
      setUploadForm({ name: '', type: 'sonstiges', date: format(new Date(), 'yyyy-MM-dd') })
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(doc: Document) {
    try {
      await pb.collection('documents').delete(doc.id)
      setDocs(prev => prev.filter(d => d.id !== doc.id))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen')
    }
  }

  function downloadDoc(doc: Document) {
    const url = pb.files.getURL(doc, doc.file, { download: true })
    window.open(url, '_blank')
  }

  return (
    <div className="bg-white border border-[#EDE7DC] rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[#1A1917]">Dokumente</h2>
        <Button size="sm" onClick={() => setShowUpload(s => !s)}>
          <Upload size={14} /> Hochladen
        </Button>
      </div>

      {error && (
        <div className="mb-3 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{error}</div>
      )}

      {/* Upload-Formular */}
      {showUpload && (
        <form onSubmit={handleUpload} className="mb-4 p-4 border border-[#EDE7DC] rounded-lg bg-[#FDFCFB] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#1A1917]">Neues Dokument</span>
            <button type="button" onClick={() => setShowUpload(false)} className="text-[#706D6A] hover:text-[#1A1917]">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Datei *" className="col-span-2">
              <input
                ref={fileInputRef}
                type="file"
                required
                onChange={handleFileChange}
                className="block w-full text-sm text-[#1A1917] file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-[#EDE7DC] file:text-sm file:bg-white file:text-[#1A1917] hover:file:bg-[#F5F2EE] cursor-pointer"
              />
            </F>
            <F label="Bezeichnung *">
              <Input
                value={uploadForm.name}
                onChange={e => setUploadForm(p => ({ ...p, name: e.target.value }))}
                required
              />
            </F>
            <F label="Typ">
              <NativeSelect
                value={uploadForm.type}
                onChange={e => setUploadForm(p => ({ ...p, type: e.target.value as DocumentType }))}
              >
                {(Object.entries(DOC_LABELS) as [DocumentType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </NativeSelect>
            </F>
            <F label="Datum">
              <Input
                type="date"
                value={uploadForm.date}
                onChange={e => setUploadForm(p => ({ ...p, date: e.target.value }))}
              />
            </F>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={uploading || !selectedFile}>
              <Upload size={14} /> {uploading ? 'Lade hoch…' : 'Speichern'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowUpload(false)}>
              Abbrechen
            </Button>
          </div>
        </form>
      )}

      {/* Dokumentenliste */}
      {loading ? (
        <p className="text-sm text-[#706D6A]">Lade…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-[#706D6A]">Noch keine Dokumente vorhanden.</p>
      ) : (
        <div className="divide-y divide-[#EDE7DC]">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#1A1917] truncate">{doc.name}</div>
                <div className="text-xs text-[#706D6A]">
                  {DOC_LABELS[doc.type]} · {doc.date ? format(parseISO(doc.date), 'dd.MM.yyyy', { locale: de }) : '—'}
                </div>
              </div>
              <button
                onClick={() => downloadDoc(doc)}
                className="p-1.5 rounded text-[#706D6A] hover:text-[#1A1917] hover:bg-[#F5F2EE]"
                title="Herunterladen"
              >
                <Download size={15} />
              </button>
              <button
                onClick={() => handleDelete(doc)}
                className="p-1.5 rounded text-[#706D6A] hover:text-red-600 hover:bg-red-50"
                title="Löschen"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Shared UI-Helfer ──────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#EDE7DC] rounded-lg p-5">
      <h2 className="text-sm font-semibold text-[#1A1917] mb-4">{title}</h2>
      {children}
    </div>
  )
}

function F({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs text-[#706D6A] mb-1 block">{label}</Label>
      {children}
    </div>
  )
}

function NativeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="h-9 w-full rounded-md border border-[#EDE7DC] bg-white px-3 py-2 text-sm text-[#1A1917] outline-none focus:border-[#BA7517] focus:ring-2 focus:ring-[#BA7517]/20"
    />
  )
}
