/// <reference path="../pb_data/types.d.ts" />

// Neuer Antrag → In-App-Notification für alle GF-User
onRecordAfterCreateSuccess((e) => {
  const record = e.record
  if (record.get('status') !== 'pending') return

  const employeeId = record.get('employee')
  let empName = employeeId
  try {
    const emp = $app.findRecordById('employees', employeeId)
    empName = String(emp.get('name') ?? employeeId)
  } catch {}

  const dateFrom = String(record.get('date_from') ?? '')
  const dateTo   = String(record.get('date_to')   ?? '')
  const dateLabel = dateFrom === dateTo ? dateFrom.slice(0, 10) : `${dateFrom.slice(0, 10)} – ${dateTo.slice(0, 10)}`

  let gfUsers = []
  try {
    gfUsers = $app.findRecordsByFilter('users', 'role = "gf"', '', 100, 0)
  } catch (err) {
    console.error('[notify_absences] GF-User laden fehlgeschlagen:', err)
    return
  }

  for (const gfUser of gfUsers) {
    try {
      const notif = new Record($app.findCollectionByNameOrId('notifications'))
      notif.set('user',    gfUser.id)
      notif.set('title',   'Neuer Antrag')
      notif.set('message', `${empName} hat einen Antrag gestellt (${dateLabel}).`)
      notif.set('type',    'absence_request')
      notif.set('read',    false)
      notif.set('reference_id', record.id)
      $app.save(notif)
    } catch (err) {
      console.error('[notify_absences] GF-Notification fehlgeschlagen:', err)
    }
  }
}, 'absences')

// Antrag genehmigt/abgelehnt → System-Push an Mitarbeiter
onRecordAfterUpdateSuccess((e) => {
  const record     = e.record
  const status     = record.get('status')
  const notified   = record.get('push_notified')
  const employeeId = record.get('employee')

  if ((status !== 'approved' && status !== 'rejected') || notified || !employeeId) return

  try {
    record.set('push_notified', true)
    $app.save(record)
  } catch (err) {
    console.error('[push_absences] save fehlgeschlagen:', err)
    return
  }

  const dateFrom = String(record.get('date_from') ?? '')
  const dateTo   = String(record.get('date_to')   ?? '')

  try {
    $http.send({
      url:    'http://127.0.0.1:3456/send-push',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:       'antrag_status',
        employeeId,
        status,
        dateFrom: dateFrom.slice(5, 10).replace('-', '.') + '.',
        dateTo:   dateTo.slice(5, 10).replace('-', '.') + '.',
      }),
    })
  } catch (err) {
    console.error('[push_absences] HTTP-Push fehlgeschlagen:', err)
  }
}, 'absences')
