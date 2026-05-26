// Requires Node 18+ (native fetch). Run: node scripts/setup-pb.mjs
// Compatible with PocketBase v0.23+ (flat field API, _superusers auth)
const BASE  = 'http://127.0.0.1:8091'
const EMAIL = process.argv[2] ?? 'admin@example.com'
const PASS  = process.argv[3] ?? 'Admin1234!'

// ── Auth ───────────────────────────────────────────────
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
console.log('✓ Admin authentifiziert')

const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

// users-Collection-ID holen
const usersColRes = await fetch(`${BASE}/api/collections/users`, { headers: H })
if (!usersColRes.ok) { console.error('users-Collection nicht gefunden'); process.exit(1) }
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

async function patchCollection(id, body) {
  const r = await fetch(`${BASE}/api/collections/${id}`, {
    method: 'PATCH', headers: H, body: JSON.stringify(body),
  })
  const d = await r.json()
  if (!r.ok) throw new Error(`patch ${id}: ${JSON.stringify(d)}`)
  console.log(`✓ Collection "${d.name}" aktualisiert`)
  return d
}

async function addFieldIfMissing(collectionName, field) {
  const r = await fetch(`${BASE}/api/collections/${collectionName}`, { headers: H })
  if (!r.ok) { console.error(`Collection ${collectionName} nicht gefunden`); return }
  const col = await r.json()
  if (col.fields.some(f => f.name === field.name)) {
    console.log(`  Feld "${field.name}" in "${collectionName}" bereits vorhanden`)
    return
  }
  const pr = await fetch(`${BASE}/api/collections/${col.id}`, {
    method: 'PATCH', headers: H, body: JSON.stringify({ fields: [...col.fields, field] }),
  })
  const pd = await pr.json()
  if (!pr.ok) throw new Error(`addField ${collectionName}.${field.name}: ${JSON.stringify(pd)}`)
  console.log(`✓ Feld "${field.name}" zu "${collectionName}" hinzugefügt`)
}

// ── Feld-Definitionen (PocketBase v0.23+ flat API) ────
const f = {
  text:     (name, o = {}) => ({ type: 'text',     name, required: false, ...o }),
  email:    (name, o = {}) => ({ type: 'email',    name, required: false, ...o }),
  number:   (name, o = {}) => ({ type: 'number',   name, required: false, ...o }),
  bool:     (name, o = {}) => ({ type: 'bool',     name, required: false, ...o }),
  date:     (name, o = {}) => ({ type: 'date',     name, required: false, ...o }),
  file:     (name, o = {}) => ({ type: 'file',     name, required: false, maxSelect: 1, ...o }),
  select:   (name, values, o = {}) => ({ type: 'select',   name, required: false, maxSelect: 1, values, ...o }),
  relation: (name, collectionId, o = {}) => ({
    type: 'relation', name, required: false,
    collectionId, cascadeDelete: false, minSelect: 0, maxSelect: 1,
    ...o,
  }),
}

// ── 1. departments ────────────────────────────────────
const departments = await create({
  name: 'departments', type: 'base',
  listRule: "@request.auth.id != ''",
  viewRule: "@request.auth.id != ''",
  createRule: "@request.auth.role = 'gf'",
  updateRule: "@request.auth.role = 'gf'",
  deleteRule: "@request.auth.role = 'gf'",
  fields: [
    f.text('name',       { required: true }),
    f.text('color',      { required: true }),
    f.number('sort_order'),
  ],
})

// ── 2. settings ───────────────────────────────────────
await create({
  name: 'settings', type: 'base',
  listRule:   "@request.auth.id != ''",
  viewRule:   "@request.auth.id != ''",
  createRule: "@request.auth.role = 'gf'",
  updateRule: "@request.auth.role = 'gf'",
  deleteRule: "@request.auth.role = 'gf'",
  fields: [
    f.text('key',   { required: true }),
    f.text('value'),
  ],
})

// ── 3. employees ──────────────────────────────────────
const employees = await create({
  name: 'employees', type: 'base',
  listRule:   "@request.auth.role = 'gf' || @request.auth.role = 'sl' || id = @request.auth.employee",
  viewRule:   "@request.auth.role = 'gf' || @request.auth.role = 'sl' || id = @request.auth.employee",
  createRule: "@request.auth.role = 'gf'",
  updateRule: "@request.auth.role = 'gf'",
  deleteRule: "@request.auth.role = 'gf'",
  fields: [
    f.text('first_name',    { required: true }),
    f.text('last_name',     { required: true }),
    f.email('email',        { required: true }),
    f.text('phone'),
    f.date('birthday'),
    f.text('street'),
    f.text('zip'),
    f.text('city'),
    f.relation('department', departments.id),
    f.text('position'),
    f.select('contract_type', ['vz','tz','mj','az'], { required: true }),
    f.number('weekly_hours',  { required: true }),
    f.date('start_date',      { required: true }),
    f.date('end_date'),
    f.number('vacation_days', { required: true }),
    f.bool('active'),
  ],
})

// ── 4. users: role + employee Felder + Zugriffsregeln ───────
const existingNames = (usersCol.fields ?? []).map(fld => fld.name)
const newUserFields = []
if (!existingNames.includes('role')) {
  newUserFields.push(f.select('role', ['gf','sl','mitarbeiter'], { required: true }))
}
if (!existingNames.includes('employee')) {
  newUserFields.push(f.relation('employee', employees.id))
}
await patchCollection(usersCol.id, {
  ...(newUserFields.length > 0 ? { fields: [...(usersCol.fields ?? []), ...newUserFields] } : {}),
  listRule:   "@request.auth.role = 'gf'",
  viewRule:   "@request.auth.role = 'gf' || id = @request.auth.id",
  updateRule: "@request.auth.role = 'gf' || id = @request.auth.id",
})
console.log('✓ users-Zugriffsregeln gesetzt')

// ── 5. absences ───────────────────────────────────────
await create({
  name: 'absences', type: 'base',
  listRule:   "@request.auth.role = 'gf' || @request.auth.role = 'sl' || employee = @request.auth.employee",
  viewRule:   "@request.auth.role = 'gf' || @request.auth.role = 'sl' || employee = @request.auth.employee",
  createRule: "@request.auth.id != ''",
  updateRule: "@request.auth.role = 'gf' || @request.auth.role = 'sl' || (employee = @request.auth.employee && status = 'pending')",
  deleteRule: "@request.auth.role = 'gf'",
  fields: [
    f.relation('employee',    employees.id, { required: true, cascadeDelete: true }),
    f.date('date_from',   { required: true }),
    f.date('date_to',     { required: true }),
    f.select('type',   ['U','RU','U3','SU','K','KK','AT','S','ÜA'], { required: true }),
    f.select('status', ['pending','approved','rejected'],            { required: true }),
    f.text('note'),
    f.file('document',  { mimeTypes: ['application/pdf','image/jpeg','image/png'], maxSize: 10485760 }),
    f.relation('created_by',  USERS_ID, { required: true }),
    f.relation('approved_by', USERS_ID),
    f.date('approved_at'),
  ],
})

// ── 6. vacation_accounts ──────────────────────────────
await create({
  name: 'vacation_accounts', type: 'base',
  listRule:   "@request.auth.role = 'gf' || @request.auth.role = 'sl' || employee = @request.auth.employee",
  viewRule:   "@request.auth.role = 'gf' || @request.auth.role = 'sl' || employee = @request.auth.employee",
  createRule: "@request.auth.role = 'gf'",
  updateRule: "@request.auth.role = 'gf'",
  deleteRule: "@request.auth.role = 'gf'",
  fields: [
    f.relation('employee',         employees.id, { required: true, cascadeDelete: true }),
    f.number('year',               { required: true }),
    f.number('entitlement',        { required: true }),
    f.number('carry_over',         { required: true }),
    f.date('carry_over_expires',   { required: true }),
  ],
})

// ── 7. time_entries ───────────────────────────────────
await create({
  name: 'time_entries', type: 'base',
  listRule:   "@request.auth.role = 'gf' || @request.auth.role = 'sl' || employee = @request.auth.employee",
  viewRule:   "@request.auth.role = 'gf' || @request.auth.role = 'sl' || employee = @request.auth.employee",
  createRule: "@request.auth.id != ''",
  updateRule: "@request.auth.role = 'gf' || (employee = @request.auth.employee && end_time = '')",
  deleteRule: "@request.auth.role = 'gf'",
  fields: [
    f.relation('employee',      employees.id, { required: true, cascadeDelete: true }),
    f.date('start_time',        { required: true }),
    f.date('end_time'),
    f.number('break_minutes'),
    f.text('note'),
    f.relation('corrected_by',  USERS_ID),
  ],
})

// ── 8. documents ──────────────────────────────────────
await create({
  name: 'documents', type: 'base',
  listRule:   "@request.auth.role = 'gf' || @request.auth.role = 'sl' || employee = @request.auth.employee",
  viewRule:   "@request.auth.role = 'gf' || @request.auth.role = 'sl' || employee = @request.auth.employee",
  createRule: "@request.auth.role = 'gf'",
  updateRule: "@request.auth.role = 'gf'",
  deleteRule: "@request.auth.role = 'gf'",
  fields: [
    f.relation('employee',    employees.id, { required: true, cascadeDelete: true }),
    f.text('name',            { required: true }),
    f.select('type',         ['vertrag','lohnschein','au_schein','sonstiges'], { required: true }),
    f.file('file',           { required: true, mimeTypes: ['application/pdf','image/jpeg','image/png'], maxSize: 20971520 }),
    f.date('date',            { required: true }),
    f.relation('uploaded_by', USERS_ID, { required: true }),
  ],
})

// ── 9. notifications ──────────────────────────────────
await create({
  name: 'notifications', type: 'base',
  listRule:   "user = @request.auth.id",
  viewRule:   "user = @request.auth.id",
  createRule: "@request.auth.role = 'gf' || @request.auth.role = 'sl'",
  updateRule: "user = @request.auth.id",
  deleteRule: "user = @request.auth.id",
  fields: [
    f.relation('user',         USERS_ID, { required: true, cascadeDelete: true }),
    f.text('title',            { required: true }),
    f.text('message'),
    f.select('type', ['absence_request','absence_approved','absence_rejected','general'], { required: true }),
    f.bool('read'),
    f.text('reference_id'),
  ],
})

// ── 10. availability ──────────────────────────────────
await create({
  name: 'availability', type: 'base',
  listRule:   "@request.auth.role = 'gf' || @request.auth.role = 'sl' || employee = @request.auth.employee",
  viewRule:   "@request.auth.role = 'gf' || @request.auth.role = 'sl' || employee = @request.auth.employee",
  createRule: "@request.auth.role = 'gf' || employee = @request.auth.employee",
  updateRule: "@request.auth.role = 'gf' || employee = @request.auth.employee",
  deleteRule: "@request.auth.role = 'gf' || employee = @request.auth.employee",
  fields: [
    f.relation('employee',    employees.id, { required: true, cascadeDelete: true }),
    f.number('day_of_week',   { required: true }),
    f.text('from_time',       { required: true }),
    f.text('to_time',         { required: true }),
    f.bool('available'),
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

// ── push_notified Felder (für Push-Notifications) ─────
await addFieldIfMissing('absences',    f.bool('push_notified'))
await addFieldIfMissing('shift_plans', f.bool('push_notified'))

// ── push_subscriptions ────────────────────────────────
await create({
  name: 'push_subscriptions', type: 'base',
  listRule:   "@request.auth.id != '' && employee = @request.auth.employee",
  viewRule:   "@request.auth.id != '' && employee = @request.auth.employee",
  createRule: "@request.auth.id != ''",
  updateRule: "@request.auth.id != '' && employee = @request.auth.employee",
  deleteRule: "@request.auth.id != '' && employee = @request.auth.employee",
  fields: [
    f.relation('employee', employees.id, { required: true }),
    f.text('endpoint',  { required: true }),
    f.text('p256dh',    { required: true }),
    f.text('auth',      { required: true }),
    f.text('user_agent'),
  ],
})

console.log('\n✅ PocketBase Schema vollständig eingerichtet.')
console.log('👉 Erstelle jetzt einen GF-Nutzer unter http://127.0.0.1:8091/_/')
