import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { User as UserIcon, FileText, Clock, Download } from 'lucide-react'
import { pb } from '../../lib/pb'
import { useAuthStore } from '../../stores/auth'
import type { Employee, Document, Availability } from '@shared/types'
import { CONTRACT_LABELS } from '@shared/types'
import { cn } from '@/lib/utils'

type Tab = 'stammdaten' | 'dokumente' | 'verfuegbarkeiten'

const TABS: { id: Tab; label: string; icon: typeof UserIcon }[] = [
  { id: 'stammdaten',       label: 'Stammdaten',       icon: UserIcon  },
  { id: 'dokumente',        label: 'Dokumente',        icon: FileText  },
  { id: 'verfuegbarkeiten', label: 'Verfügbarkeiten', icon: Clock     },
]

const DOC_TYPE_LABELS: Record<string, string> = {
  vertrag:    'Vertrag',
  lohnschein: 'Lohnschein',
  au_schein:  'AU-Schein',
  sonstiges:  'Sonstiges',
}

const WEEKDAY_LABELS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const WEEKDAY_ORDER  = [1, 2, 3, 4, 5, 6, 0]

export default function MeineDaten() {
  const user       = useAuthStore(s => s.user)
  const employeeId = user?.employee ?? ''

  const [tab, setTab] = useState<Tab>('stammdaten')

  const [employee,    setEmployee]    = useState<Employee | null>(null)
  const [documents,   setDocuments]   = useState<Document[]>([])
  const [docsLoaded,  setDocsLoaded]  = useState(false)
  const [avails,      setAvails]      = useState<Availability[]>([])
  const [availsLoaded,setAvailsLoaded] = useState(false)
  const [saving,      setSaving]      = useState(false)

  useEffect(() => {
    if (!employeeId) return
    pb.collection('employees').getOne<Employee>(employeeId, {
      expand: 'department',
      requestKey: null,
    }).then(setEmployee).catch(console.error)
  }, [employeeId])

  useEffect(() => {
    if (tab !== 'dokumente' || docsLoaded || !employeeId) return
    pb.collection('documents').getFullList<Document>({
      filter: `employee = "${employeeId}"`,
      sort:   '-date',
      requestKey: null,
    }).then(docs => { setDocuments(docs); setDocsLoaded(true) }).catch(console.error)
  }, [tab, employeeId, docsLoaded])

  useEffect(() => {
    if (tab !== 'verfuegbarkeiten' || availsLoaded || !employeeId) return
    pb.collection('availability').getFullList<Availability>({
      filter: `employee = "${employeeId}"`,
      sort:   'day_of_week',
      requestKey: null,
    }).then(a => { setAvails(a); setAvailsLoaded(true) }).catch(console.error)
  }, [tab, employeeId, availsLoaded])

  function getAvailForDay(day: number) {
    return avails.find(a => a.day_of_week === day)
  }

  async function handleAvailToggle(day: number) {
    const existing = getAvailForDay(day)
    setSaving(true)
    try {
      if (existing) {
        const updated = await pb.collection('availability').update<Availability>(existing.id, {
          available: !existing.available,
        })
        setAvails(prev => prev.map(a => a.id === updated.id ? updated : a))
      } else {
        const created = await pb.collection('availability').create<Availability>({
          employee:    employeeId,
          day_of_week: day,
          from_time:   '08:00',
          to_time:     '17:00',
          available:   true,
        })
        setAvails(prev => [...prev, created].sort((a, b) => a.day_of_week - b.day_of_week))
      }
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  async function handleAvailTimeChange(day: number, field: 'from_time' | 'to_time', value: string) {
    const existing = getAvailForDay(day)
    if (!existing) return
    setSaving(true)
    try {
      const updated = await pb.collection('availability').update<Availability>(existing.id, { [field]: value })
      setAvails(prev => prev.map(a => a.id === updated.id ? updated : a))
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  function getFileUrl(doc: Document): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return pb.files.getURL(doc as any, doc.file)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">Meine Daten</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Stammdaten, Dokumente und Verfügbarkeiten</p>
      </div>

      {/* Tab-Leiste */}
      <div className="flex gap-1 bg-[#F3F4F6] rounded-xl p-1 mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              tab === id
                ? 'bg-white text-[#111827] shadow-sm'
                : 'text-[#6B7280] hover:text-[#374151]'
            )}
          >
            <Icon size={15} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Stammdaten ─────────────────────────────────────────────── */}
      {tab === 'stammdaten' && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          {!employee ? (
            <div className="py-12 text-center text-sm text-[#6B7280]">Lade…</div>
          ) : (
            <>
              <div className="px-5 py-5 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-[#E5E7EB]">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-3 shadow-sm">
                  <span className="text-lg font-bold text-white">
                    {employee.first_name?.[0] ?? ''}{employee.last_name?.[0] ?? ''}
                  </span>
                </div>
                <div className="text-lg font-bold text-[#111827]">
                  {employee.first_name} {employee.last_name}
                </div>
                {employee.position && (
                  <div className="text-sm text-[#6B7280] mt-0.5">{employee.position}</div>
                )}
              </div>

              <div className="divide-y divide-[#F3F4F6]">
                {([
                  ['Abteilung',     employee.expand?.department?.name ?? '—'],
                  ['Vertragsart',   CONTRACT_LABELS[employee.contract_type] ?? employee.contract_type],
                  ['Wochenstunden', `${employee.weekly_hours} h`],
                  ['Eintrittsdatum', employee.start_date
                    ? format(parseISO(employee.start_date), 'd. MMMM yyyy', { locale: de })
                    : '—'],
                  ['Urlaubsanspruch', `${employee.vacation_days} Tage/Jahr`],
                  ['E-Mail', employee.email || '—'],
                  ['Telefon', employee.phone || '—'],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center px-5 py-3.5">
                    <span className="text-sm text-[#6B7280]">{label}</span>
                    <span className="text-sm font-medium text-[#111827] text-right max-w-[60%] truncate">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="px-5 py-3 bg-[#F9FAFB] border-t border-[#E5E7EB]">
                <p className="text-xs text-[#9CA3AF]">
                  Änderungen werden ausschließlich durch den Betrieb vorgenommen.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Dokumente ──────────────────────────────────────────────── */}
      {tab === 'dokumente' && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          {!docsLoaded ? (
            <div className="py-12 text-center text-sm text-[#6B7280]">Lade…</div>
          ) : documents.length === 0 ? (
            <div className="py-12 text-center">
              <FileText size={32} className="text-[#D1D5DB] mx-auto mb-3" />
              <p className="text-sm text-[#6B7280]">Keine Dokumente vorhanden</p>
              <p className="text-xs text-[#9CA3AF] mt-1">Dokumente werden vom Betrieb hochgeladen</p>
            </div>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-[1fr_110px_90px_70px] px-5 py-2.5 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {['Dokument', 'Typ', 'Datum', ''].map(h => (
                  <div key={h} className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">{h}</div>
                ))}
              </div>

              <div className="divide-y divide-[#F3F4F6]">
                {documents.map(doc => (
                  <div key={doc.id} className="flex md:grid md:grid-cols-[1fr_110px_90px_70px] items-center gap-3 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#111827] truncate">{doc.name}</div>
                      <div className="text-xs text-[#9CA3AF] md:hidden">
                        {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                        {doc.date && ` · ${format(parseISO(doc.date), 'dd.MM.yyyy')}`}
                      </div>
                    </div>
                    <div className="hidden md:block text-sm text-[#6B7280]">
                      {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                    </div>
                    <div className="hidden md:block text-sm text-[#6B7280]">
                      {doc.date ? format(parseISO(doc.date), 'dd.MM.yyyy') : '—'}
                    </div>
                    <div>
                      {doc.file && (
                        <a
                          href={getFileUrl(doc)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors"
                        >
                          <Download size={12} />
                          <span className="hidden md:inline">Öffnen</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-5 py-3 bg-[#F9FAFB] border-t border-[#E5E7EB]">
                <p className="text-xs text-[#9CA3AF]">Dokumente werden vom Betrieb verwaltet.</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Verfügbarkeiten ────────────────────────────────────────── */}
      {tab === 'verfuegbarkeiten' && (
        <div>
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden mb-3">
            <div className="px-5 py-4 border-b border-[#E5E7EB]">
              <h2 className="text-sm font-semibold text-[#111827]">Wöchentliche Verfügbarkeit</h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Lege fest, an welchen Tagen und zu welchen Zeiten du verfügbar bist
              </p>
            </div>

            {!availsLoaded ? (
              <div className="py-12 text-center text-sm text-[#6B7280]">Lade…</div>
            ) : (
              <div className="divide-y divide-[#F3F4F6]">
                {WEEKDAY_ORDER.map(day => {
                  const avail    = getAvailForDay(day)
                  const isAvail  = avail?.available ?? false

                  return (
                    <div key={day} className="flex items-center gap-3 px-5 py-3.5">
                      {/* Wochentag */}
                      <div className="w-24 shrink-0 text-sm font-medium text-[#374151]">
                        {WEEKDAY_LABELS[day]}
                      </div>

                      {/* Toggle */}
                      <button
                        onClick={() => handleAvailToggle(day)}
                        disabled={saving}
                        aria-label={isAvail ? 'Verfügbarkeit deaktivieren' : 'Verfügbarkeit aktivieren'}
                        className={cn(
                          'relative shrink-0 w-10 rounded-full transition-colors duration-200 disabled:opacity-50',
                          isAvail ? 'bg-indigo-500' : 'bg-[#D1D5DB]'
                        )}
                        style={{ height: 22 }}
                      >
                        <span
                          className="absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200"
                          style={{ left: isAvail ? 'calc(100% - 19px)' : '3px' }}
                        />
                      </button>

                      {/* Zeitraum */}
                      {isAvail && avail ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={avail.from_time}
                            onChange={e => handleAvailTimeChange(day, 'from_time', e.target.value)}
                            disabled={saving}
                            className="h-8 px-2 rounded-lg border border-[#E5E7EB] text-sm text-[#111827] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
                          />
                          <span className="text-[#9CA3AF] text-sm">–</span>
                          <input
                            type="time"
                            value={avail.to_time}
                            onChange={e => handleAvailTimeChange(day, 'to_time', e.target.value)}
                            disabled={saving}
                            className="h-8 px-2 rounded-lg border border-[#E5E7EB] text-sm text-[#111827] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-[#9CA3AF]">Nicht verfügbar</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <p className="text-xs text-[#9CA3AF] text-center px-4">
            Deine Verfügbarkeiten werden bei der Erstellung des Dienstplans berücksichtigt.
          </p>
        </div>
      )}
    </div>
  )
}
