// Requires Node 18+ (native fetch). Run: node scripts/setup-pb.mjs
const BASE = 'http://127.0.0.1:8091'
const EMAIL = process.argv[2] ?? 'admin@example.com'
const PASS  = process.argv[3] ?? 'Admin1234!'

// ── Auth ───────────────────────────────────────────────
const authRes = await fetch(`${BASE}/api/admins/auth-with-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identity: EMAIL, password: PASS }),
})
const { token } = await authRes.json()
if (!token) { console.error('Auth fehlgeschlagen'); process.exit(1) }
console.log('✓ Admin authentifiziert')

const H = { 'Content-Type': 'application/json', Authorization: token }

// users-Collection-ID einmalig holen (für Relation-Felder)
const usersColRes = await fetch(`${BASE}/api/collections/users`, { headers: H })
const usersCol = await usersColRes.json()
const USERS_ID = usersCol.id
console.log(`✓ users Collection ID: ${USERS_ID}`)

async function create(body) {
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

// ── 1. departments ────────────────────────────────────
const departments = await create({
  name: 'departments', type: 'base',
  listRule: "@request.auth.id != ''",
  viewRule: "@request.auth.id != ''",
  createRule: "@request.auth.record.role = 'gf'",
  updateRule: "@request.auth.record.role = 'gf'",
  deleteRule: "@request.auth.record.role = 'gf'",
  schema: [
    { name: 'name',       type: 'text',   required: true,  options: { min: 1, max: 100, pattern: '' } },
    { name: 'color',      type: 'text',   required: true,  options: { min: 7, max: 7,   pattern: '' } },
    { name: 'sort_order', type: 'number', required: false, options: { min: null, max: null, noDecimal: true } },
  ],
})

// ── 2. settings ───────────────────────────────────────
await create({
  name: 'settings', type: 'base',
  listRule: "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl'",
  viewRule: "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl'",
  createRule: "@request.auth.record.role = 'gf'",
  updateRule: "@request.auth.record.role = 'gf'",
  deleteRule: "@request.auth.record.role = 'gf'",
  schema: [
    { name: 'key',   type: 'text', required: true,  options: { min: 1, max: 100, pattern: '' } },
    { name: 'value', type: 'text', required: false, options: { min: null, max: null, pattern: '' } },
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
  schema: [
    { name: 'first_name',    type: 'text',     required: true,  options: { min: 1, max: 100, pattern: '' } },
    { name: 'last_name',     type: 'text',     required: true,  options: { min: 1, max: 100, pattern: '' } },
    { name: 'email',         type: 'email',    required: true,  options: { exceptDomains: [] } },
    { name: 'phone',         type: 'text',     required: false, options: { min: null, max: 30, pattern: '' } },
    { name: 'birthday',      type: 'date',     required: false, options: { min: '', max: '' } },
    { name: 'street',        type: 'text',     required: false, options: { min: null, max: 200, pattern: '' } },
    { name: 'zip',           type: 'text',     required: false, options: { min: null, max: 10,  pattern: '' } },
    { name: 'city',          type: 'text',     required: false, options: { min: null, max: 100, pattern: '' } },
    { name: 'department',    type: 'relation', required: false, options: { collectionId: departments.id, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: ['name'] } },
    { name: 'position',      type: 'text',     required: false, options: { min: null, max: 100, pattern: '' } },
    { name: 'contract_type', type: 'select',   required: true,  options: { maxSelect: 1, values: ['vz','tz','mj','az'] } },
    { name: 'weekly_hours',  type: 'number',   required: true,  options: { min: 0, max: 168, noDecimal: false } },
    { name: 'start_date',    type: 'date',     required: true,  options: { min: '', max: '' } },
    { name: 'end_date',      type: 'date',     required: false, options: { min: '', max: '' } },
    { name: 'vacation_days', type: 'number',   required: true,  options: { min: 0, max: 365, noDecimal: true } },
    { name: 'active',        type: 'bool',     required: false, options: {} },
  ],
})

// ── 4. users: role + employee Felder hinzufügen ───────
const newFields = [
  { name: 'role',     type: 'select',   required: true,  options: { maxSelect: 1, values: ['gf','sl','mitarbeiter'] } },
  { name: 'employee', type: 'relation', required: false, options: { collectionId: employees.id, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: ['first_name','last_name'] } },
]
const existingNames = usersCol.schema.map(f => f.name)
const fieldsToAdd = newFields.filter(f => !existingNames.includes(f.name))
if (fieldsToAdd.length > 0) {
  await patch('users', { schema: [...usersCol.schema, ...fieldsToAdd] })
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
  schema: [
    { name: 'employee',    type: 'relation', required: true,  options: { collectionId: employees.id, cascadeDelete: true,  minSelect: null, maxSelect: 1, displayFields: [] } },
    { name: 'date_from',   type: 'date',     required: true,  options: { min: '', max: '' } },
    { name: 'date_to',     type: 'date',     required: true,  options: { min: '', max: '' } },
    { name: 'type',        type: 'select',   required: true,  options: { maxSelect: 1, values: ['U','RU','U3','SU','K','KK','AT','S','ÜA'] } },
    { name: 'status',      type: 'select',   required: true,  options: { maxSelect: 1, values: ['pending','approved','rejected'] } },
    { name: 'note',        type: 'text',     required: false, options: { min: null, max: 500, pattern: '' } },
    { name: 'document',    type: 'file',     required: false, options: { maxSelect: 1, maxSize: 10485760, mimeTypes: ['application/pdf','image/jpeg','image/png'], thumbs: [], protected: false } },
    { name: 'created_by',  type: 'relation', required: true,  options: { collectionId: USERS_ID, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] } },
    { name: 'approved_by', type: 'relation', required: false, options: { collectionId: USERS_ID, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] } },
    { name: 'approved_at', type: 'date',     required: false, options: { min: '', max: '' } },
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
  schema: [
    { name: 'employee',           type: 'relation', required: true,  options: { collectionId: employees.id, cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] } },
    { name: 'year',               type: 'number',   required: true,  options: { min: 2000, max: 2100, noDecimal: true } },
    { name: 'entitlement',        type: 'number',   required: true,  options: { min: 0, max: 365, noDecimal: false } },
    { name: 'carry_over',         type: 'number',   required: true,  options: { min: 0, max: 365, noDecimal: false } },
    { name: 'carry_over_expires', type: 'date',     required: true,  options: { min: '', max: '' } },
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
  schema: [
    { name: 'employee',      type: 'relation', required: true,  options: { collectionId: employees.id, cascadeDelete: true,  minSelect: null, maxSelect: 1, displayFields: [] } },
    { name: 'start_time',    type: 'date',     required: true,  options: { min: '', max: '' } },
    { name: 'end_time',      type: 'date',     required: false, options: { min: '', max: '' } },
    { name: 'break_minutes', type: 'number',   required: false, options: { min: 0, max: 120, noDecimal: true } },
    { name: 'note',          type: 'text',     required: false, options: { min: null, max: 300, pattern: '' } },
    { name: 'corrected_by',  type: 'relation', required: false, options: { collectionId: USERS_ID, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] } },
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
  schema: [
    { name: 'employee',    type: 'relation', required: true,  options: { collectionId: employees.id, cascadeDelete: true,  minSelect: null, maxSelect: 1, displayFields: [] } },
    { name: 'name',        type: 'text',     required: true,  options: { min: 1, max: 200, pattern: '' } },
    { name: 'type',        type: 'select',   required: true,  options: { maxSelect: 1, values: ['vertrag','lohnschein','au_schein','sonstiges'] } },
    { name: 'file',        type: 'file',     required: true,  options: { maxSelect: 1, maxSize: 20971520, mimeTypes: ['application/pdf','image/jpeg','image/png'], thumbs: [], protected: false } },
    { name: 'date',        type: 'date',     required: true,  options: { min: '', max: '' } },
    { name: 'uploaded_by', type: 'relation', required: true,  options: { collectionId: USERS_ID, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] } },
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
  schema: [
    { name: 'user',         type: 'relation', required: true,  options: { collectionId: USERS_ID, cascadeDelete: true,  minSelect: null, maxSelect: 1, displayFields: [] } },
    { name: 'title',        type: 'text',     required: true,  options: { min: 1, max: 200, pattern: '' } },
    { name: 'message',      type: 'text',     required: false, options: { min: null, max: 500, pattern: '' } },
    { name: 'type',         type: 'select',   required: true,  options: { maxSelect: 1, values: ['absence_request','absence_approved','absence_rejected','general'] } },
    { name: 'read',         type: 'bool',     required: false, options: {} },
    { name: 'reference_id', type: 'text',     required: false, options: { min: null, max: 50, pattern: '' } },
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
  schema: [
    { name: 'employee',     type: 'relation', required: true,  options: { collectionId: employees.id, cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] } },
    { name: 'day_of_week',  type: 'number',   required: true,  options: { min: 0, max: 6, noDecimal: true } },
    { name: 'from_time',    type: 'text',     required: true,  options: { min: 5, max: 5, pattern: '^\\d{2}:\\d{2}$' } },
    { name: 'to_time',      type: 'text',     required: true,  options: { min: 5, max: 5, pattern: '^\\d{2}:\\d{2}$' } },
    { name: 'available',    type: 'bool',     required: false, options: {} },
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
  const existing = await fetch(`${BASE}/api/collections/settings/records?filter=(key='${s.key}')`, { headers: H })
  const { totalItems } = await existing.json()
  if (totalItems === 0) {
    await fetch(`${BASE}/api/collections/settings/records`, {
      method: 'POST', headers: H, body: JSON.stringify(s),
    })
    console.log(`✓ Setting "${s.key}" angelegt`)
  } else {
    console.log(`  Setting "${s.key}" bereits vorhanden`)
  }
}

console.log('\n✅ PocketBase Schema vollständig eingerichtet.')
console.log('👉 Erstelle jetzt einen GF-Nutzer unter http://127.0.0.1:8091/_/')
