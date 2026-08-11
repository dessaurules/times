/// <reference path="../pb_data/types.d.ts" />

// notifications hatte weder `created` als Tabellenspalte noch als Schema-Feld.
// Beide NotificationBell-Komponenten sortieren aber mit `sort: '-created'`,
// was PocketBase mit 400 "invalid sort field \"created\"" quittierte.
//
//   chef-app/src/components/NotificationBell.tsx:44
//   mitarbeiter-app/src/components/NotificationBell.tsx:43
//
// Hier legt PocketBase die Spalte reguler an — anders als bei den gam_*
// Collections, wo die Spalte bereits per direktem ALTER TABLE existiert.
migrate((app) => {
  const collection = app.findCollectionByNameOrId('notifications')

  collection.fields.add(new Field({
    name: 'created',
    type: 'autodate',
    onCreate: true,
    onUpdate: false,
    presentable: false,
    hidden: false,
  }))

  collection.fields.add(new Field({
    name: 'updated',
    type: 'autodate',
    onCreate: true,
    onUpdate: true,
    presentable: false,
    hidden: false,
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId('notifications')
  for (const fieldName of ['created', 'updated']) {
    const field = collection.fields.getByName(fieldName)
    if (field) collection.fields.removeById(field.id)
  }
  return app.save(collection)
})
