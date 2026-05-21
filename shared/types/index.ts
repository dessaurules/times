// PocketBase-Basisfelder (alle Records haben diese)
export interface PBRecord {
  id: string
  created: string
  updated: string
}

// ── Enums ──────────────────────────────────────────────
export type UserRole       = 'gf' | 'sl' | 'mitarbeiter'
export type ContractType   = 'vz' | 'tz' | 'mj' | 'az'
export type AbsenceType    = 'U' | 'RU' | 'U3' | 'SU' | 'K' | 'KK' | 'AT' | 'S' | 'ÜA'
export type AbsenceStatus  = 'pending' | 'approved' | 'rejected'
export type DocumentType   = 'vertrag' | 'lohnschein' | 'au_schein' | 'sonstiges'
export type NotifType      = 'absence_request' | 'absence_approved' | 'absence_rejected' | 'general'

// ── Collections ────────────────────────────────────────
export interface User extends PBRecord {
  email: string
  name: string
  role: UserRole
  employee?: string
  expand?: { employee?: Employee }
}

export interface Department extends PBRecord {
  name: string
  color: string
  sort_order: number
}

export interface Employee extends PBRecord {
  first_name: string
  last_name: string
  email: string
  phone: string
  birthday: string        // ISO date
  street: string
  zip: string
  city: string
  department: string      // relation ID
  position: string
  contract_type: ContractType
  weekly_hours: number
  start_date: string      // ISO date
  end_date?: string       // ISO date
  vacation_days: number
  active: boolean
  expand?: { department?: Department }
}

export interface Absence extends PBRecord {
  employee: string        // relation ID
  date_from: string       // ISO date
  date_to: string         // ISO date
  type: AbsenceType
  status: AbsenceStatus
  note?: string
  document?: string       // file
  created_by: string
  approved_by?: string
  approved_at?: string
  expand?: { employee?: Employee; approved_by?: User }
}

export interface VacationAccount extends PBRecord {
  employee: string
  year: number
  entitlement: number
  carry_over: number
  carry_over_expires: string  // ISO date
  expand?: { employee?: Employee }
}

export interface TimeEntry extends PBRecord {
  employee: string
  start_time: string      // ISO datetime
  end_time?: string       // null = eingestempelt
  break_minutes: number
  note?: string
  corrected_by?: string
}

export interface Document extends PBRecord {
  employee: string
  name: string
  type: DocumentType
  file: string
  date: string
  uploaded_by: string
}

export interface Notification extends PBRecord {
  user: string
  title: string
  message: string
  type: NotifType
  read: boolean
  reference_id?: string
}

export interface Settings extends PBRecord {
  key: string
  value: string
}

export interface Availability extends PBRecord {
  employee: string
  day_of_week: number     // 0 = So … 6 = Sa
  from_time: string       // "08:00"
  to_time: string
  available: boolean
}

// ── Konstanten ─────────────────────────────────────────
export const VACATION_TYPES: AbsenceType[] = ['U', 'RU', 'U3', 'SU']
export const AUTO_APPROVED_TYPES: AbsenceType[] = ['K', 'KK', 'AT', 'S', 'ÜA']

export const CONTRACT_LABELS: Record<ContractType, string> = {
  vz: 'Vollzeit', tz: 'Teilzeit', mj: 'Minijob', az: 'Azubi',
}

export const ABSENCE_COLORS: Record<AbsenceType, { bg: string; text: string }> = {
  U:    { bg: '#FAEEDA', text: '#633806' },
  RU:   { bg: '#EF9F27', text: '#412402' },
  U3:   { bg: '#FAC775', text: '#633806' },
  SU:   { bg: '#EEEDFE', text: '#3C3489' },
  K:    { bg: '#FCEBEB', text: '#791F1F' },
  KK:   { bg: '#F7C1C1', text: '#501313' },
  AT:   { bg: '#F1EFE8', text: '#444441' },
  S:    { bg: '#E6F1FB', text: '#0C447C' },
  'ÜA': { bg: '#E1F5EE', text: '#085041' },
}
