// Requires Node 18+ (native fetch). Run: node scripts/setup-pb.mjs
// Compatible with PocketBase v0.23+
const BASE  = 'http://127.0.0.1:8091'
const EMAIL = process.argv[2] ?? 'admin@example.com'
const PASS  = process.argv[3] ?? 'Admin1234!'

// ── Auth (v0.23+: _superusers statt admins) ───────────
let token
try {
  const authRes = await fetch(`${BASE}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: EMAIL, password: PASS }),
  })
  if (!authRes.ok) {
    console.error('Auth fehlgeschlagen:', await authRes.text())
    process.exit(1)
  }
  const data = await authRes.json()
  token = data.token
} catch (err) {
  console.error(`PocketBase nicht erreichbar unter ${BASE} — läuft PocketBase?`)
  console.error(err.message)
  process.exit(1)
}
if (!token) { console.error('Kein Token erhalten'); process.exit(1) }
console.log('✓ Admin authentifiziert')

const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

// users-Collection-ID einmalig holen (für Relation-Felder)
const usersColRes = await fetch(`${BASE}/api/collections/users`, { headers: H })
if (!usersColRes.ok) {
  console.error('Konnte users-Collection nicht laden:', await usersColRes.text())
  process.exit(1)
}
const usersCol = await usersColRes.json()
const USERS_ID = usersCol.id
console.log(`✓ users Collection ID: ${USERS_ID}`)

async function create(body) {
  const checkRes = await fetch(`${BASE}/api/collections/${body.name}`, { headers: H })
  if (checkRes.ok) {
    const existing = await checkRes.json()
    console.log(`  Collection "${body.name}" bereits vorhanden (${existing.id})`)
    return existing
  }
  const r = await fetch(`${BASE}/api/collections`, {
    method: 'POST', headers: H, body: JSON.stringify(body),
  })
  const d = await r.json()
  if (!r.ok) throw new Error(`${body.name}: ${JSON.stringify(d)}`)
  console.log(`✓ Collection "${body.name}" angelegt (${d.id})`)
  return d
}

async function patch(id, body) {
  const r = await fetch(`${BASE}/api/collections/${id}`, {
    method: 'PATCH', headers: H, body: JSON.stringify(body),
  })
  const d = await r.json()
  if (!r.ok) throw new Error(`patch ${id}: ${JSON.stringify(d)}`)
  console.log(`✓ Collection "${d.name}" aktualisiert`)
  return d
}

// ── Hilfsfunktionen für Felder (v0.23+ API) ──────────
const textField   = (name, opts = {}) => ({ type: 'text',     name, ...opts })
const emailField  = (name, opts = {}) => ({ type: 'email',    name, ...opts })
const numberField = (name, opts = {}) => ({ type: 'number',   name, ...opts })
const boolField   = (name, opts = {}) => ({ type: 'bool',     name, ...opts })
const dateField   = (name, opts = {}) => ({ type: 'date',     name, ...opts })
const selectField = (name, values, opts = {}) => ({ type: 'select', name, options: { maxSelect: 1, values }, ...opts })
const fileField   = (name, opts = {}) => ({ type: 'file',     name, ...opts })
const relationField = (name, collectionId, opts = {}) => ({
  type: 'relation', name,
  options: { collectionId, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] },
  ...opts,
})

// ── 1. departments ────────────────────────────────────
const departments = await create({
  name: 'departments', type: 'base',
  listRule: "@request.auth.id != ''",
  viewRule: "@request.auth.id != ''",
  createRule: "@request.auth.record.role = 'gf'",
  updateRule: "@request.auth.record.role = 'gf'",
  deleteRule: "@request.auth.record.role = 'gf'",
  fields: [
    textField('name',       { required: true  }),
    textField('color',      { required: true  }),
    numberField('sort_order'),
  ],
})

// ── 2. settings ───────────────────────────────────────
await create({
  name: 'settings', type: 'base',
  listRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl'",
  viewRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl'",
  createRule: "@request.auth.record.role = 'gf'",
  updateRule: "@request.auth.record.role = 'gf'",
  deleteRule: "@request.auth.record.role = 'gf'",
  fields: [
    textField('key',   { required: true }),
    textField('value'),
  ],
})

// ── 3. employees ──────────────────────────────────────
const employees = await create({
  name: 'employees', type: 'base',
  listRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl'",
  viewRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || id = @request.auth.record.employee",
  createRule: "@request.auth.record.role = 'gf'",
  updateRule: "@request.auth.record.role = 'gf'",
  deleteRule: "@request.auth.record.role = 'gf'",
  fields: [
    textField('first_name',    { required: true }),
    textField('last_name',     { required: true }),
    emailField('email',        { required: true }),
    textField('phone'),
    dateField('birthday'),
    textField('street'),
    textField('zip'),
    textField('city'),
    relationField('department', departments.id, { options: { collectionId: departments.id, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: ['name'] } }),
    textField('position'),
    selectField('contract_type', ['vz','tz','mj','az'], { required: true }),
    numberField('weekly_hours',  { required: true }),
    dateField('start_date',      { required: true }),
    dateField('end_date'),
    numberField('vacation_days', { required: true }),
    boolField('active'),
  ],
})

// ── 4. users: role + employee Felder hinzufügen ───────
const existingFieldNames = (usersCol.fields ?? usersCol.schema ?? []).map(f => f.name)
const newUserFields = []
if (!existingFieldNames.includes('role')) {
  newUserFields.push(selectField('role', ['gf','sl','mitarbeiter'], { required: true }))
}
if (!existingFieldNames.includes('employee')) {
  newUserFields.push(relationField('employee', employees.id))
}
if (newUserFields.length > 0) {
  const currentFields = usersCol.fields ?? usersCol.schema ?? []
  await patch(usersCol.id, { fields: [...currentFields, ...newUserFields] })
} else {
  console.log('✓ users-Felder bereits vorhanden, übersprungen')
}

// ── 5. absences ───────────────────────────────────────
await create({
  name: 'absences', type: 'base',
  listRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee.user = @request.auth.id",
  viewRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee.user = @request.auth.id",
  createRule: "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || (employee.user = @request.auth.id && @request.data.status = 'pending')",
  updateRule: "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || (employee.user = @request.auth.id && status = 'pending')",
  deleteRule: "@request.auth.record.role = 'gf'",
  fields: [
    { ...relationField('employee', employees.id), required: true,  options: { collectionId: employees.id, cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] } },
    dateField('date_from', { required: true }),
    dateField('date_to',   { required: true }),
    selectField('type',   ['U','RU','U3','SU','K','KK','AT','S','ÜA'], { required: true }),
    selectField('status', ['pending','approved','rejected'], { required: true }),
    textField('note'),
    fileField('document',  { options: { maxSelect: 1, maxSize: 10485760, mimeTypes: ['application/pdf','image/jpeg','image/png'] } }),
    { ...relationField('created_by',  USERS_ID), required: true  },
    relationField('approved_by', USERS_ID),
    dateField('approved_at'),
  ],
})

// ── 6. vacation_accounts ──────────────────────────────
await create({
  name: 'vacation_accounts', type: 'base',
  listRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee.user = @request.auth.id",
  viewRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee.user = @request.auth.id",
  createRule: "@request.auth.record.role = 'gf'",
  updateRule: "@request.auth.record.role = 'gf'",
  deleteRule: "@request.auth.record.role = 'gf'",
  fields: [
    { ...relationField('employee', employees.id), required: true, options: { collectionId: employees.id, cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] } },
    numberField('year',               { required: true }),
    numberField('entitlement',        { required: true }),
    numberField('carry_over',         { required: true }),
    dateField('carry_over_expires',   { required: true }),
  ],
})

// ── 7. time_entries ───────────────────────────────────
await create({
  name: 'time_entries', type: 'base',
  listRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee.user = @request.auth.id",
  viewRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee.user = @request.auth.id",
  createRule: "@request.auth.id != ''",
  updateRule: "@request.auth.record.role = 'gf' || (employee.user = @request.auth.id && end_time = '')",
  deleteRule: "@request.auth.record.role = 'gf'",
  fields: [
    { ...relationField('employee', employees.id), required: true, options: { collectionId: employees.id, cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] } },
    dateField('start_time',    { required: true }),
    dateField('end_time'),
    numberField('break_minutes'),
    textField('note'),
    relationField('corrected_by', USERS_ID),
  ],
})

// ── 8. documents ──────────────────────────────────────
await create({
  name: 'documents', type: 'base',
  listRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee.user = @request.auth.id",
  viewRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee.user = @request.auth.id",
  createRule: "@request.auth.record.role = 'gf'",
  updateRule: "@request.auth.record.role = 'gf'",
  deleteRule: "@request.auth.record.role = 'gf'",
  fields: [
    { ...relationField('employee', employees.id), required: true, options: { collectionId: employees.id, cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] } },
    textField('name',        { required: true }),
    selectField('type',     ['vertrag','lohnschein','au_schein','sonstiges'], { required: true }),
    fileField('file',       { required: true, options: { maxSelect: 1, maxSize: 20971520, mimeTypes: ['application/pdf','image/jpeg','image/png'] } }),
    dateField('date',        { required: true }),
    { ...relationField('uploaded_by', USERS_ID), required: true },
  ],
})

// ── 9. notifications ──────────────────────────────────
await create({
  name: 'notifications', type: 'base',
  listRule:   "user = @request.auth.id",
  viewRule:   "user = @request.auth.id",
  createRule: "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl'",
  updateRule: "user = @request.auth.id",
  deleteRule: "user = @request.auth.id",
  fields: [
    { ...relationField('user', USERS_ID), required: true, options: { collectionId: USERS_ID, cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] } },
    textField('title',        { required: true }),
    textField('message'),
    selectField('type', ['absence_request','absence_approved','absence_rejected','general'], { required: true }),
    boolField('read'),
    textField('reference_id'),
  ],
})

// ── 10. availability ──────────────────────────────────
await create({
  name: 'availability', type: 'base',
  listRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee.user = @request.auth.id",
  viewRule:   "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee.user = @request.auth.id",
  createRule: "@request.auth.record.role = 'gf' || employee.user = @request.auth.id",
  updateRule: "@request.auth.record.role = 'gf' || employee.user = @request.auth.id",
  deleteRule: "@request.auth.record.role = 'gf' || employee.user = @request.auth.id",
  fields: [
    { ...relationField('employee', employees.id), required: true, options: { collectionId: employees.id, cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] } },
    numberField('day_of_week', { required: true }),
    textField('from_time',     { required: true }),
    textField('to_time',       { required: true }),
    boolField('available'),
  ],
})

// ── 11. Default settings ──────────────────────────────
const defaultSettings = [
  { key: 'company_name',        value: 'Mein Betrieb' },
  { key: 'federal_state',       value: 'ST' },
  { key: 'carry_over_deadline', value: '03-31' },
  { key: 'shift_swap_enabled',  value: 'false' },
]

for (const s of defaultSettings) {
  const res = await fetch(`${BASE}/api/collections/settings/records?filter=(key='${encodeURIComponent(s.key)}')`, { headers: H })
  const { totalItems } = await res.json()
  if (totalItems === 0) {
    const r = await fetch(`${BASE}/api/collections/settings/records`, {
      method: 'POST', headers: H, body: JSON.stringify(s),
    })
    if (!r.ok) {
      console.error(`  Setting "${s.key}" fehlgeschlagen:`, await r.text())
    } else {
      console.log(`✓ Setting "${s.key}" angelegt`)
    }
  } else {
    console.log(`  Setting "${s.key}" bereits vorhanden`)
  }
}

console.log('\n✅ PocketBase Schema vollständig eingerichtet.')
console.log('👉 Erstelle jetzt einen GF-Nutzer unter http://127.0.0.1:8091/_/')
