/// <reference path="../pb_data/types.d.ts" />

// ── users geändert → employees synchronisieren ───────────────────────────────
//
// Wenn first_name oder last_name eines users-Records im PocketBase-Admin
// geändert wird, wird der verknüpfte employees-Record automatisch aktualisiert.
// Loop-Schutz: Update wird übersprungen wenn der Wert bereits identisch ist.

onRecordAfterUpdateSuccess((e) => {
  const firstName = String(e.record.get('first_name') ?? '')
  const lastName  = String(e.record.get('last_name')  ?? '')
  if (!firstName && !lastName) return

  const employeeId = String(e.record.get('employee') ?? '')
  if (!employeeId) return

  try {
    const emp = $app.findRecordById('employees', employeeId)
    if (emp.get('first_name') === firstName && emp.get('last_name') === lastName) return

    emp.set('first_name', firstName)
    emp.set('last_name',  lastName)
    $app.save(emp)
    console.log(`[sync_names] users→employees: ${firstName} ${lastName}`)
  } catch (err) {
    console.error('[sync_names] users→employees fehlgeschlagen:', err)
  }
}, 'users')


// ── employees geändert → users synchronisieren ───────────────────────────────
//
// Wenn first_name oder last_name eines employees-Records im PocketBase-Admin
// geändert wird, wird der verknüpfte users-Record automatisch aktualisiert.
// Loop-Schutz: Update wird übersprungen wenn der Wert bereits identisch ist.

onRecordAfterUpdateSuccess((e) => {
  const firstName = String(e.record.get('first_name') ?? '')
  const lastName  = String(e.record.get('last_name')  ?? '')

  try {
    const matchedUsers = $app.findRecordsByFilter(
      'users',
      `employee = "${e.record.id}"`,
      '', 1, 0
    )
    if (!matchedUsers.length) return
    const user = matchedUsers[0]

    if (user.get('first_name') === firstName && user.get('last_name') === lastName) return

    user.set('first_name', firstName)
    user.set('last_name',  lastName)
    user.set('name', `${firstName} ${lastName}`.trim())
    $app.save(user)
    console.log(`[sync_names] employees→users: ${firstName} ${lastName}`)
  } catch (err) {
    console.error('[sync_names] employees→users fehlgeschlagen:', err)
  }
}, 'employees')
