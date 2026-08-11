/// <reference path="../pb_data/types.d.ts" />

// Bei den gam_* Collections existieren `created`/`updated` als Tabellenspalten
// (per direktem ALTER TABLE angelegt), waren aber nie Schema-Felder. PocketBase
// validiert `sort`/`filter` gegen das Schema, deshalb schlug jeder Request mit
// `sort: '-created'` mit 400 "invalid sort field \"created\"" fehl.
//
// `fields.add()` allein geht hier nicht: PocketBase legt die Tabelle beim
// Schema-Save neu an und kollidiert mit der vorhandenen Spalte
// ("duplicate column name: created"). Auch das Admin-UI scheitert daran, es
// nutzt denselben Code-Pfad.
//
// Darum: Werte auslesen -> Spalten droppen -> Felder als autodate anlegen
// (PocketBase erzeugt die Spalten selbst) -> Werte per SQL zurueckschreiben.
// Direktes SQL umgeht die autodate-Automatik, die sonst alles auf jetzt setzt.
const COLLECTIONS = [
  'gam_tasks',
  'gam_assignments',
  'gam_submissions',
  'gam_rewards',
  'gam_orders',
  'gam_events',
  'gam_settings',
]

migrate((app) => {
  for (const name of COLLECTIONS) {
    // 1. Bestehende Zeitstempel sichern.
    const saved = arrayOf(new DynamicModel({ id: '', created: '', updated: '' }))
    app.db().newQuery(`SELECT id, created, updated FROM ${name}`).all(saved)

    // 2. Spalten entfernen, damit PocketBase sie selbst anlegen kann.
    app.db().newQuery(`ALTER TABLE ${name} DROP COLUMN created`).execute()
    app.db().newQuery(`ALTER TABLE ${name} DROP COLUMN updated`).execute()

    // 3. Als echte Schema-Felder registrieren.
    const collection = app.findCollectionByNameOrId(name)
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
    app.save(collection)

    // 4. Originalwerte zurueckschreiben.
    for (const row of saved) {
      if (!row.created && !row.updated) continue
      app.db()
        .newQuery(`UPDATE ${name} SET created={:created}, updated={:updated} WHERE id={:id}`)
        .bind({ created: row.created, updated: row.updated, id: row.id })
        .execute()
    }
  }
}, (app) => {
  // Rueckwaerts: Felder aus dem Schema entfernen. Die Spalten verschwinden
  // dabei mit — der Zustand vor dieser Migration (Spalte ohne Schema-Feld)
  // war ein Defekt und wird nicht wiederhergestellt.
  for (const name of COLLECTIONS) {
    const collection = app.findCollectionByNameOrId(name)
    for (const fieldName of ['created', 'updated']) {
      const field = collection.fields.getByName(fieldName)
      if (field) collection.fields.removeById(field.id)
    }
    app.save(collection)
  }
})
