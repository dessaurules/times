/// <reference path="../pb_data/types.d.ts" />

onRecordAfterUpdateSuccess((e) => {
  const record     = e.record
  const status     = record.get('status')
  const notified   = record.get('push_notified')
  const employeeId = record.get('employee')

  if ((status !== 'approved' && status !== 'rejected') || notified || !employeeId) return

  try {
    record.set('push_notified', true)
    $app.dao().saveRecord(record)
  } catch (err) {
    console.error('[push_absences] saveRecord fehlgeschlagen:', err)
    return
  }

  const dateFrom = record.get('date_from') ?? ''
  const dateTo   = record.get('date_to')   ?? ''

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
