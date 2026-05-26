/// <reference path="../pb_data/types.d.ts" />

onRecordAfterUpdateSuccess((e) => {
  const record   = e.record
  const status   = record.get('status')
  const notified = record.get('push_notified')

  if (status !== 'published' || notified) return

  try {
    record.set('push_notified', true)
    $app.dao().saveRecord(record)
  } catch (err) {
    console.error('[push_dienstplan] saveRecord fehlgeschlagen:', err)
    return
  }

  let entries
  try {
    entries = $app.dao().findRecordsByFilter(
      'shift_entries',
      `plan_id = "${record.id}" && employee != ""`,
      '', 500, 0,
    )
  } catch (err) {
    console.error('[push_dienstplan] shift_entries laden fehlgeschlagen:', err)
    return
  }

  const planName = record.get('name') ?? record.id

  const seen = new Set()
  for (const entry of entries) {
    const empId = entry.get('employee')
    if (!empId || seen.has(empId)) continue
    seen.add(empId)

    try {
      $http.send({
        url:    'http://127.0.0.1:3456/send-push',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:       'dienstplan',
          employeeId: empId,
          weekLabel:  planName,
        }),
      })
    } catch (err) {
      console.error('[push_dienstplan] HTTP-Push fehlgeschlagen für', empId, err)
    }
  }
}, 'shift_plans')
